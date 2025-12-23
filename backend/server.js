/**
 * Backend Server - ExpressJS + Socket.io
 * Main server file for 1v1 Poker-Roulette game
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const { evaluateHand } = require('./pokerEval');

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

const { findBestHand } = require('./pokerEval');

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
        committed: gameState.player1Committed,
        hasSwitched: gameState.players.player1.hasSwitched,
        isAllIn: gameState.player1Bullets === 0
      } : null,
      player2: gameState.players.player2 ? {
        nickname: gameState.players.player2.nickname,
        bullets: gameState.player2Bullets,
        committed: gameState.player2Committed,
        hasSwitched: gameState.players.player2.hasSwitched,
        isAllIn: gameState.player2Bullets === 0
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
    
    // Calculate hand strength
    if (gameState.player1Hand && gameState.player1Hand.length > 0) {
      const bestHand = findBestHand(gameState.player1Hand, gameState.communityCards);
      if (bestHand) {
        state.yourHandStrength = bestHand.description;
      }
    }
  } else if (role === 'player2') {
    state.yourHand = gameState.player2Hand;
    state.availableActions = gameState.activePlayer === 'player2' ? getAvailableActions(gameState) : [];
    
    // Calculate hand strength
    if (gameState.player2Hand && gameState.player2Hand.length > 0) {
      const bestHand = findBestHand(gameState.player2Hand, gameState.communityCards);
      if (bestHand) {
        state.yourHandStrength = bestHand.description;
      }
    }
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

// Tìm hàm gửi gameState cho người chơi, thường là trong socket.on('gameStateUpdate') hoặc tương tự
const sendGameState = (roomId) => {
    const game = games[roomId];
    if (!game) return;

    Object.keys(game.players).forEach(socketId => {
        const player = game.players[socketId];
        let handStrength = "";

        // Chỉ tính toán độ mạnh nếu người chơi có bài và đã có bài trên bàn
        if (player.hand && player.hand.length === 2) {
            const evaluation = evaluateHand(player.hand, game.communityCards || []);
            handStrength = evaluation.name; // Ví dụ: "Pair", "Flush"
        }

        // Gửi gameState tùy chỉnh cho từng người (để bảo mật bài)
        const filteredState = {
            ...game,
            players: Object.keys(game.players).reduce((acc, id) => {
                acc[id] = {
                    ...game.players[id],
                    // Chỉ gửi handStrength cho chính chủ
                    handStrength: id === socketId ? handStrength : null,
                    hand: id === socketId || game.showdown ? game.players[id].hand : [null, null]
                };
                return acc;
            }, {})
        };
        io.to(socketId).emit('gameStateUpdate', filteredState);
    });
};

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
   * EVENT: requestSwitchOptions
   * Player wants to see 3 random cards to switch
   */
  socket.on('requestSwitchOptions', () => {
    const role = getPlayerRole(socket.id);
    const player = gameState.players[role];
    
    if (!player || player.hasSwitched) {
      socket.emit('error', { message: 'Cannot switch cards' });
      return;
    }

    // Check if anyone is all-in
    const anybodyAllIn = gameState.player1Bullets === 0 || gameState.player2Bullets === 0;
    if (anybodyAllIn) {
      socket.emit('error', { message: 'Cannot switch when someone is all-in' });
      return;
    }

    // Get 3 random cards from deck (don't remove them yet)
    const options = [];
    const tempDeck = [...gameState.deck];
    for (let i = 0; i < 3 && tempDeck.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * tempDeck.length);
      options.push(tempDeck.splice(randomIndex, 1)[0]);
    }
    
    socket.emit('switchOptionsReceived', options);
  });

  /**
   * EVENT: executeSwitch
   * Player confirms switching a card
   */
  socket.on('executeSwitch', (data) => {
    const { cardIndex, newCard } = data;
    const role = getPlayerRole(socket.id);
    const player = gameState.players[role];
    
    if (!player || player.hasSwitched) {
      socket.emit('error', { message: 'Cannot switch cards' });
      return;
    }

    const anybodyAllIn = gameState.player1Bullets === 0 || gameState.player2Bullets === 0;
    if (anybodyAllIn) {
      socket.emit('error', { message: 'Cannot switch when someone is all-in' });
      return;
    }

    const hand = gameState[`${role}Hand`];
    if (!hand || cardIndex < 0 || cardIndex >= hand.length) {
      socket.emit('error', { message: 'Invalid card index' });
      return;
    }

    // Perform the switch
    const oldCard = hand[cardIndex];
    hand[cardIndex] = newCard;
    
    // Remove newCard from deck and put oldCard back
    gameState.deck = gameState.deck.filter(c => c.rank !== newCard.rank || c.suit !== newCard.suit);
    gameState.deck.push(oldCard);
    
    player.hasSwitched = true;
    
    // Send success to the player
    socket.emit('switchSuccess');
    
    // Broadcast state update (to update hasSwitched status)
    broadcastGameState();
    
    // Notify others that someone switched (without revealing what)
    socket.broadcast.emit('player_action_notify', { role, action: 'switched' });
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
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', players: Object.keys(io.sockets.sockets).length });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
