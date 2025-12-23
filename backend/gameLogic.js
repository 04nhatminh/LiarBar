/**
 * Game Logic Module
 * Handles game state machine, betting rounds, and shooting mechanics
 */

const { createDeck, shuffleDeck, findBestHand, compareHands } = require('./pokerEval');

// Game phases
const PHASES = {
  WAITING: 'WAITING',           // Waiting for players
  ANTE: 'ANTE',                 // Collecting ante
  PREFLOP: 'PREFLOP',          // Pre-flop betting
  FLOP: 'FLOP',                // Flop betting
  TURN: 'TURN',                // Turn betting
  RIVER: 'RIVER',              // River betting
  SHOWDOWN: 'SHOWDOWN',        // Reveal hands
  SHOOTING: 'SHOOTING',        // Loser shoots
  GAME_OVER: 'GAME_OVER'       // Someone died
};

// Player actions
const ACTIONS = {
  FOLD: 'FOLD',
  CHECK: 'CHECK',
  CALL: 'CALL',
  RAISE: 'RAISE',
  ALL_IN: 'ALL_IN'
};

const MAX_BULLETS = 8;
const ANTE_AMOUNT = 1;
const RAISE_AMOUNT = 1;

/**
 * Create a new game state
 * @returns {Object} Initial game state
 */
function createGameState() {
  return {
    phase: PHASES.WAITING,
    players: {
      player1: null,
      player2: null
    },
    viewers: [],
    
    // Hand state
    deck: [],
    communityCards: [],
    pot: 0,
    currentBet: 0,
    
    // Player hands
    player1Hand: [],
    player2Hand: [],
    player1Bullets: MAX_BULLETS,
    player2Bullets: MAX_BULLETS,
    player1Committed: 0, // Bullets committed this hand
    player2Committed: 0,
    
    // Turn management
    activePlayer: null, // 'player1' or 'player2'
    lastAction: null,
    
    // Results
    winner: null,
    loser: null,
    handResult: null
  };
}

/**
 * Add player to game
 * @param {Object} gameState - Current game state
 * @param {String} socketId - Player socket ID
 * @param {String} nickname - Player nickname
 * @returns {String} Role assigned: 'player1', 'player2', or 'viewer'
 */
function addPlayer(gameState, socketId, nickname) {
  if (!gameState.players.player1) {
    gameState.players.player1 = { socketId, nickname, hasSwitched: false };
    return 'player1';
  } else if (!gameState.players.player2) {
    gameState.players.player2 = { socketId, nickname, hasSwitched: false };
    // Don't auto-start, wait for both players to be ready
    return 'player2';
  } else {
    gameState.viewers.push({ socketId, nickname });
    return 'viewer';
  }
}

/**
 * Remove player from game
 * @param {Object} gameState - Current game state
 * @param {String} socketId - Player socket ID
 */
function removePlayer(gameState, socketId) {
  if (gameState.players.player1?.socketId === socketId) {
    gameState.players.player1 = null;
    gameState.phase = PHASES.WAITING;
    gameState.player1Bullets = MAX_BULLETS;
  } else if (gameState.players.player2?.socketId === socketId) {
    gameState.players.player2 = null;
    gameState.phase = PHASES.WAITING;
    gameState.player2Bullets = MAX_BULLETS;
  } else {
    gameState.viewers = gameState.viewers.filter(v => v.socketId !== socketId);
  }
}

/**
 * Check if game can start (both players present and alive)
 * @param {Object} gameState - Current game state
 * @returns {Boolean}
 */
function canStartGame(gameState) {
  return gameState.players.player1 && 
         gameState.players.player2 && 
         gameState.player1Bullets > 0 && 
         gameState.player2Bullets > 0;
}

/**
 * Reset game state for new game
 * @param {Object} gameState - Current game state
 */
function resetGame(gameState) {
  gameState.player1Bullets = MAX_BULLETS;
  gameState.player2Bullets = MAX_BULLETS;
  gameState.phase = PHASES.WAITING;
  gameState.deck = [];
  gameState.communityCards = [];
  gameState.pot = 0;
  gameState.currentBet = 0;
  gameState.player1Hand = [];
  gameState.player2Hand = [];
  gameState.player1Committed = 0;
  gameState.player2Committed = 0;
  gameState.activePlayer = null;
  gameState.lastAction = null;
  gameState.winner = null;
  gameState.loser = null;
  gameState.handResult = null;
}

/**
 * Start a new hand
 * @param {Object} gameState - Current game state
 */
function startNewHand(gameState) {
  // Check if both players alive
  if (gameState.player1Bullets <= 0 || gameState.player2Bullets <= 0) {
    gameState.phase = PHASES.GAME_OVER;
    return;
  }

  // Reset hand state
  gameState.deck = shuffleDeck(createDeck());
  gameState.communityCards = [];
  gameState.pot = 0;
  gameState.currentBet = 0;
  gameState.player1Committed = 0;
  gameState.player2Committed = 0;
  gameState.lastAction = null;
  gameState.winner = null;
  gameState.loser = null;
  gameState.handResult = null;

  // Reset switch status
  if (gameState.players.player1) gameState.players.player1.hasSwitched = false;
  if (gameState.players.player2) gameState.players.player2.hasSwitched = false;

  // Collect ante from both players
  const anteP1 = Math.min(ANTE_AMOUNT, gameState.player1Bullets);
  const anteP2 = Math.min(ANTE_AMOUNT, gameState.player2Bullets);
  
  gameState.player1Bullets -= anteP1;
  gameState.player2Bullets -= anteP2;
  gameState.player1Committed = anteP1;
  gameState.player2Committed = anteP2;
  gameState.pot = anteP1 + anteP2;
  gameState.currentBet = anteP1; // Both ante same amount

  // Deal hole cards
  gameState.player1Hand = [gameState.deck.pop(), gameState.deck.pop()];
  gameState.player2Hand = [gameState.deck.pop(), gameState.deck.pop()];

  // Start pre-flop betting with player1
  gameState.phase = PHASES.PREFLOP;
  gameState.activePlayer = 'player1';
}

/**
 * Process player action
 * @param {Object} gameState - Current game state
 * @param {String} player - 'player1' or 'player2'
 * @param {String} action - Action type
 * @returns {Object} Result with success and message
 */
function processAction(gameState, player, action) {
  // Validate it's player's turn
  if (gameState.activePlayer !== player) {
    return { success: false, message: 'Not your turn' };
  }

  const opponent = player === 'player1' ? 'player2' : 'player1';
  const playerBullets = gameState[`${player}Bullets`];
  const opponentBullets = gameState[`${opponent}Bullets`];
  const playerCommitted = gameState[`${player}Committed`];
  const opponentCommitted = gameState[`${opponent}Committed`];

  switch (action) {
    case ACTIONS.FOLD:
      // Player folds, loses hand immediately
      gameState.loser = player;
      gameState.winner = opponent;
      gameState.phase = PHASES.SHOOTING;
      return { success: true, message: `${player} folded` };

    case ACTIONS.CHECK:
      // Can only check if bets are equal
      if (playerCommitted !== opponentCommitted) {
        return { success: false, message: 'Cannot check, must call or fold' };
      }
      gameState.lastAction = { player, action: ACTIONS.CHECK };
      
      // If both players acted, move to next phase
      if (gameState.lastAction) {
        advancePhase(gameState);
      } else {
        gameState.activePlayer = opponent;
      }
      return { success: true, message: `${player} checked` };

    case ACTIONS.CALL: {
      // Calculate how much to call
      let toCall;
      if (opponentCommitted > playerCommitted) {
        // Opponent bet more (including all-in), need to match
        toCall = opponentCommitted - playerCommitted;
      } else {
        // Bets are equal, call = +1 bullet
        toCall = 1;
      }
      
      if (playerBullets < toCall) {
        return { success: false, message: 'Not enough bullets to call' };
      }
      
      gameState[`${player}Bullets`] -= toCall;
      gameState[`${player}Committed`] += toCall;
      gameState.pot += toCall;
      gameState.lastAction = { player, action: ACTIONS.CALL };
      
      // Check if both players called - if committed amounts are now equal, advance phase
      const newPlayerCommitted = gameState[`${player}Committed`];
      const newOpponentCommitted = gameState[`${opponent}Committed`];
      
      if (newPlayerCommitted === newOpponentCommitted) {
        // Both called, advance to next phase
        advancePhase(gameState);
      } else {
        // Switch turn to opponent
        gameState.activePlayer = opponent;
      }
      
      return { success: true, message: `${player} called ${toCall} bullet(s)` };
    }

    case ACTIONS.RAISE: {
      // Raise by 1 bullet (or match + raise)
      const raiseToCall = opponentCommitted - playerCommitted;
      const totalNeeded = raiseToCall + RAISE_AMOUNT;
      
      if (playerBullets < totalNeeded) {
        return { success: false, message: 'Not enough bullets to raise' };
      }
      
      gameState[`${player}Bullets`] -= totalNeeded;
      gameState[`${player}Committed`] += totalNeeded;
      gameState.pot += totalNeeded;
      gameState.currentBet = gameState[`${player}Committed`];
      gameState.lastAction = { player, action: ACTIONS.RAISE };
      gameState.activePlayer = opponent; // Opponent must respond
      
      return { success: true, message: `${player} raised ${RAISE_AMOUNT} bullet` };
    }

    case ACTIONS.ALL_IN: {
      // Bet all remaining bullets
      if (playerBullets <= 0) {
        return { success: false, message: 'No bullets to go all-in' };
      }
      
      const allInAmount = playerBullets;
      gameState[`${player}Bullets`] = 0;
      gameState[`${player}Committed`] += allInAmount;
      gameState.pot += allInAmount;
      gameState.currentBet = gameState[`${player}Committed`];
      gameState.lastAction = { player, action: ACTIONS.ALL_IN };
      
      // Check if opponent also has 0 bullets (both all-in) → showdown
      const opponentBullets = gameState[`${opponent}Bullets`];
      if (opponentBullets === 0) {
        // Both players all-in, go to showdown
        advancePhase(gameState);
      } else {
        // Opponent still has bullets, must respond
        gameState.activePlayer = opponent;
      }
      
      return { success: true, message: `${player} went all-in with ${allInAmount} bullets` };
    }

    default:
      return { success: false, message: 'Invalid action' };
  }
}

/**
 * Advance to next betting phase
 * @param {Object} gameState - Current game state
 */
function advancePhase(gameState) {
  // Check if both players are all-in (0 bullets) → go straight to showdown
  if (gameState.player1Bullets === 0 && gameState.player2Bullets === 0) {
    // Deal all remaining community cards and go to showdown
    while (gameState.communityCards.length < 5) {
      gameState.communityCards.push(gameState.deck.pop());
    }
    gameState.phase = PHASES.SHOWDOWN;
    determineWinner(gameState);
    return;
  }

  switch (gameState.phase) {
    case PHASES.PREFLOP:
      // Deal flop (3 cards)
      gameState.communityCards = [
        gameState.deck.pop(),
        gameState.deck.pop(),
        gameState.deck.pop()
      ];
      gameState.phase = PHASES.FLOP;
      gameState.activePlayer = 'player1';
      gameState.lastAction = null;
      break;

    case PHASES.FLOP:
      // Deal turn (1 card)
      gameState.communityCards.push(gameState.deck.pop());
      gameState.phase = PHASES.TURN;
      gameState.activePlayer = 'player1';
      gameState.lastAction = null;
      break;

    case PHASES.TURN:
      // Deal river (1 card)
      gameState.communityCards.push(gameState.deck.pop());
      gameState.phase = PHASES.RIVER;
      gameState.activePlayer = 'player1';
      gameState.lastAction = null;
      break;

    case PHASES.RIVER:
      // Go to showdown
      gameState.phase = PHASES.SHOWDOWN;
      determineWinner(gameState);
      break;

    default:
      break;
  }
}

/**
 * Determine winner at showdown
 * @param {Object} gameState - Current game state
 */
function determineWinner(gameState) {
  const hand1 = findBestHand(gameState.player1Hand, gameState.communityCards);
  const hand2 = findBestHand(gameState.player2Hand, gameState.communityCards);

  const comparison = compareHands(hand1, hand2);

  if (comparison > 0) {
    gameState.winner = 'player1';
    gameState.loser = 'player2';
  } else if (comparison < 0) {
    gameState.winner = 'player2';
    gameState.loser = 'player1';
  } else {
    // Tie - both shoot? Or replay? For now, no one shoots on tie
    gameState.winner = null;
    gameState.loser = null;
  }

  gameState.handResult = {
    player1Hand: hand1,
    player2Hand: hand2
  };

  if (gameState.loser) {
    gameState.phase = PHASES.SHOOTING;
  } else {
    // Tie - start new hand
    startNewHand(gameState);
  }
}

/**
 * Execute shooting mechanic
 * @param {Object} gameState - Current game state
 * @returns {Object} Shooting result
 */
function executeShoot(gameState) {
  if (!gameState.loser) {
    return { survived: true, message: 'No one needs to shoot' };
  }

  const loserCommitted = gameState[`${gameState.loser}Committed`];
  const deathProbability = loserCommitted / MAX_BULLETS;
  const randomRoll = Math.random();

  const died = randomRoll < deathProbability;

  // Get loser's nickname from players object (will be passed from server)
  const loserNickname = gameState.players[gameState.loser]?.nickname || gameState.loser;

  if (died) {
    gameState[`${gameState.loser}Bullets`] = 0; // Dead
    gameState.phase = PHASES.GAME_OVER;
    return {
      survived: false,
      probability: deathProbability,
      roll: randomRoll,
      message: `${loserNickname} died! (${(deathProbability * 100).toFixed(1)}% chance)`
    };
  } else {
    // Survived → go to GAME_OVER (not start new hand automatically)
    gameState.phase = PHASES.GAME_OVER;
    const result = {
      survived: true,
      probability: deathProbability,
      roll: randomRoll,
      message: `${loserNickname} survived! (${(deathProbability * 100).toFixed(1)}% chance)`
    };
    
    return result;
  }
}

/**
 * Get available actions for current player
 * @param {Object} gameState - Current game state
 * @returns {Array} Array of available action strings
 */
function getAvailableActions(gameState) {
  const player = gameState.activePlayer;
  if (!player) return [];

  const opponent = player === 'player1' ? 'player2' : 'player1';
  const playerBullets = gameState[`${player}Bullets`];
  const playerCommitted = gameState[`${player}Committed`];
  const opponentCommitted = gameState[`${opponent}Committed`];

  const actions = [];

  // Always can fold
  actions.push(ACTIONS.FOLD);

  // If opponent bet more (including all-in case)
  if (opponentCommitted > playerCommitted) {
    const toCall = opponentCommitted - playerCommitted;
    
    // Can call if has enough bullets to match
    if (playerBullets >= toCall) {
      actions.push(ACTIONS.CALL);
    }
  } else {
    // If bets are equal, can call to continue (+1 bullet)
    if (playerBullets >= 1) {
      actions.push(ACTIONS.CALL);
    }
  }

  // Can always all-in if has bullets
  if (playerBullets > 0) {
    actions.push(ACTIONS.ALL_IN);
  }

  return actions;
}

module.exports = {
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
};
