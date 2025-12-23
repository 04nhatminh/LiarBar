/**
 * Backend Server - ExpressJS + Socket.io
 * Main server file for 1v1 Poker-Roulette game
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const {
  PHASES,
  ACTIONS,
  MAX_BULLETS,
  createGameState,
  addPlayer,
  removePlayer,
  canStartGame,
  resetGame,
  startNewHand,
  processAction,
  executeShoot,
  getAvailableActions
} = require('./gameLogic');

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// In-memory game state
const gameState = createGameState();

// Port configuration
const PORT = process.env.PORT || 3001;

/**
 * Get sanitized game state for a specific socket
 * Hides opponent's hole cards
 * @param {String} socketId - Socket ID of requester
 * @returns {Object} Sanitized game state
 */
function getGameStateForSocket(socketId) {
  const role = getPlayerRole(socketId);
  
  const state = {
    phase: gameState.phase,
    players: {
      player1: gameState.players.player1 ? {
        nickname: gameState.players.player1.nickname,
        bullets: gameState.player1Bullets,
        committed: gameState.player1Committed
      } : null,
      player2: gameState.players.player2 ? {
        nickname: gameState.players.player2.nickname,
        bullets: gameState.player2Bullets,
        committed: gameState.player2Committed
      } : null
    },
    communityCards: gameState.communityCards,
    pot: gameState.pot,
    currentBet: gameState.currentBet,
    activePlayer: gameState.activePlayer,
    winner: gameState.winner,
    loser: gameState.loser,
    yourRole: role,
    availableActions: []
  };

  // Show hole cards based on role and phase
  if (role === 'player1') {
    state.yourHand = gameState.player1Hand;
    state.availableActions = gameState.activePlayer === 'player1' ? getAvailableActions(gameState) : [];
  } else if (role === 'player2') {
    state.yourHand = gameState.player2Hand;
    state.availableActions = gameState.activePlayer === 'player2' ? getAvailableActions(gameState) : [];
  }

  // Reveal all hands at showdown or after
  if (gameState.phase === PHASES.SHOWDOWN || gameState.phase === PHASES.SHOOTING || gameState.phase === PHASES.GAME_OVER) {
    state.player1Hand = gameState.player1Hand;
    state.player2Hand = gameState.player2Hand;
    state.handResult = gameState.handResult;
  }

  return state;
}

/**
 * Get player role by socket ID
 * @param {String} socketId - Socket ID
 * @returns {String} 'player1', 'player2', or 'viewer'
 */
function getPlayerRole(socketId) {
  if (gameState.players.player1?.socketId === socketId) return 'player1';
  if (gameState.players.player2?.socketId === socketId) return 'player2';
  return 'viewer';
}

/**
 * Broadcast game state to all connected clients
 */
function broadcastGameState() {
  io.sockets.sockets.forEach((socket) => {
    const state = getGameStateForSocket(socket.id);
    socket.emit('game_state', state);
  });
}

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  /**
   * EVENT: join_game
   * Player joins the game with a nickname
   */
  socket.on('join_game', (data) => {
    const { nickname } = data;
    
    if (!nickname || nickname.trim() === '') {
      socket.emit('error', { message: 'Nickname required' });
      return;
    }

    // Check if this socket has already joined (simple check)
    if (gameState.players.player1?.socketId === socket.id || 
        gameState.players.player2?.socketId === socket.id) {
      console.log(`Socket ${socket.id} already joined, sending state`);
      const state = getGameStateForSocket(socket.id);
      socket.emit('game_state', state);
      return;
    }

    // Add new player
    const role = addPlayer(gameState, socket.id, nickname);
    console.log(`${nickname} joined as ${role} (socket: ${socket.id})`);

    // Send initial state to joining player immediately
    const state = getGameStateForSocket(socket.id);
    console.log('Sending game_state to', socket.id, state);
    socket.emit('game_state', state);

    // Notify all players
    io.emit('player_joined', {
      nickname,
      role,
      players: {
        player1: gameState.players.player1?.nickname || null,
        player2: gameState.players.player2?.nickname || null
      }
    });

    // Broadcast updated state to everyone
    setTimeout(() => {
      broadcastGameState();
    }, 100);
  });

  /**
   * EVENT: start_game
   * Start the game when both players are ready
   */
  socket.on('start_game', () => {
    if (!canStartGame(gameState)) {
      socket.emit('error', { message: 'Need 2 players to start' });
      return;
    }

    if (gameState.phase !== PHASES.WAITING) {
      socket.emit('error', { message: 'Game already in progress' });
      return;
    }

    console.log('Starting new game...');
    startNewHand(gameState);
    broadcastGameState();
  });

  /**
   * EVENT: reset_game
   * Reset game after game over
   */
  socket.on('reset_game', () => {
    if (gameState.phase !== PHASES.GAME_OVER) {
      socket.emit('error', { message: 'Can only reset after game over' });
      return;
    }

    console.log('Resetting game and starting new hand...');
    resetGame(gameState);
    
    // Automatically start new hand if both players alive
    if (canStartGame(gameState)) {
      startNewHand(gameState);
    }
    
    broadcastGameState();
  });

  /**
   * EVENT: player_action
   * Player makes an action (fold, check, call, raise, all-in)
   */
  socket.on('player_action', (data) => {
    const { action } = data;
    const role = getPlayerRole(socket.id);

    if (role === 'viewer') {
      socket.emit('error', { message: 'Viewers cannot perform actions' });
      return;
    }

    if (!Object.values(ACTIONS).includes(action)) {
      socket.emit('error', { message: 'Invalid action' });
      return;
    }

    const result = processAction(gameState, role, action);

    if (result.success) {
      console.log(result.message);
      
      // Broadcast updated state
      broadcastGameState();

      // If phase is now SHOWDOWN, evaluate after short delay
      if (gameState.phase === PHASES.SHOWDOWN) {
        setTimeout(() => {
          broadcastGameState();
        }, 2000);
      }
    } else {
      socket.emit('error', { message: result.message });
    }
  });

  /**
   * EVENT: shoot
   * Trigger the shooting mechanic (loser pulls trigger)
   */
  socket.on('shoot', () => {
    const role = getPlayerRole(socket.id);

    if (gameState.phase !== PHASES.SHOOTING) {
      socket.emit('error', { message: 'Not in shooting phase' });
      return;
    }

    if (role !== gameState.loser) {
      socket.emit('error', { message: 'Only the loser can shoot' });
      return;
    }

    const result = executeShoot(gameState);
    console.log(result.message);

    // Broadcast shooting result
    io.emit('shoot_result', result);

    // Broadcast updated game state
    setTimeout(() => {
      broadcastGameState();
    }, 3000);
  });

  /**
   * EVENT: request_state
   * Client requests current game state
   */
  socket.on('request_state', () => {
    const state = getGameStateForSocket(socket.id);
    socket.emit('game_state', state);
  });

  /**
   * EVENT: disconnect
   * Player disconnects
   */
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    const role = getPlayerRole(socket.id);
    removePlayer(gameState, socket.id);
    
    io.emit('player_left', {
      role,
      players: {
        player1: gameState.players.player1?.nickname || null,
        player2: gameState.players.player2?.nickname || null
      }
    });
    
    broadcastGameState();
  });

  socket.on('requestSwitchOptions', (roomId) => {
    const game = games[roomId];
    if (game && !game.players[socket.id].hasSwitched && canPlayerSwitch(game)) {
        // Lấy 3 lá bài ngẫu nhiên từ phần còn lại của bộ bài
        const options = game.deck.slice(0, 3); 
        socket.emit('switchOptionsReceived', options);
    }
});

socket.on('executeSwitch', ({ roomId, cardIndex, newCard }) => {
    const game = games[roomId];
    const player = game.players[socket.id];
    if (game && player && !player.hasSwitched && canPlayerSwitch(game)) {
        const oldCard = player.hand[cardIndex];
        // Thay thế bài trong tay
        player.hand[cardIndex] = newCard;
        // Cập nhật lại bộ bài (bỏ lá mới ra, cho lá cũ vào hoặc hủy)
        game.deck = game.deck.filter(c => c.rank !== newCard.rank || c.suit !== newCard.suit);
        game.deck.push(oldCard);
        player.hasSwitched = true;

        // Gửi cập nhật riêng cho người chơi đó
        socket.emit('updateMyHand', player.hand);
        // Thông báo cho phòng là người này đã đổi bài (không lộ bài)
        io.to(roomId).emit('playerActionNotify', { playerId: socket.id, action: 'switched' });
    }
});
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', players: Object.keys(io.sockets.sockets).length });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
