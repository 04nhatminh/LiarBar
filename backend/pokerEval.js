/**
 * Poker Hand Evaluator
 * Evaluates 5-card poker hands and compares them
 */

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUITS = ['♠', '♣', '♥', '♦'];

// Hand ranking constants (higher is better)
const HAND_RANKS = {
  HIGH_CARD: 1,
  PAIR: 2,
  TWO_PAIR: 3,
  THREE_OF_KIND: 4,
  STRAIGHT: 5,
  FLUSH: 6,
  FULL_HOUSE: 7,
  FOUR_OF_KIND: 8,
  STRAIGHT_FLUSH: 9,
  ROYAL_FLUSH: 10
};

/**
 * Create a standard 52-card deck
 * @returns {Array} Array of card objects {rank, suit, value}
 */
function createDeck() {
  const deck = [];
  for (let suit of SUITS) {
    for (let i = 0; i < RANKS.length; i++) {
      deck.push({
        rank: RANKS[i],
        suit: suit,
        value: i + 2 // 2-14 (A=14)
      });
    }
  }
  return deck;
}

/**
 * Shuffle deck using Fisher-Yates algorithm
 * @param {Array} deck - Deck to shuffle
 * @returns {Array} Shuffled deck
 */
function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Count occurrences of each rank in hand
 * @param {Array} cards - Array of cards
 * @returns {Object} Map of value -> count
 */
function countRanks(cards) {
  const counts = {};
  cards.forEach(card => {
    counts[card.value] = (counts[card.value] || 0) + 1;
  });
  return counts;
}

/**
 * Check if all cards are same suit
 * @param {Array} cards - Array of cards
 * @returns {Boolean}
 */
function isFlush(cards) {
  return cards.every(card => card.suit === cards[0].suit);
}

/**
 * Check if cards form a straight
 * @param {Array} cards - Array of cards
 * @returns {Boolean}
 */
function isStraight(cards) {
  const values = cards.map(c => c.value).sort((a, b) => a - b);
  
  // Check regular straight
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i + 1] !== values[i] + 1) {
      // Check for A-2-3-4-5 (wheel straight)
      if (values[4] === 14) { // Has Ace
        const wheel = [2, 3, 4, 5, 14];
        if (JSON.stringify(values) === JSON.stringify(wheel)) {
          return true;
        }
      }
      return false;
    }
  }
  return true;
}

/**
 * Evaluate a 5-card poker hand
 * @param {Array} cards - 5 cards to evaluate
 * @returns {Object} {rank, value, description}
 */
function evaluateHand(cards) {
  if (cards.length !== 5) {
    throw new Error('Hand must contain exactly 5 cards');
  }

  const isFlushHand = isFlush(cards);
  const isStraightHand = isStraight(cards);
  const rankCounts = countRanks(cards);
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  const uniqueValsDesc = Object.keys(rankCounts).map(Number).sort((a, b) => b - a);

  // Build groups sorted by (count desc, value desc) so we can create a tie-breaker array
  const groups = Object.keys(rankCounts).map(v => ({
    v: Number(v),
    count: rankCounts[v]
  }));
  groups.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.v - a.v;
  });

  // Helper: highest card of a straight (handle wheel A-2-3-4-5)
  const straightHigh = (cards) => {
    const vals = cards.map(c => c.value).sort((a, b) => a - b);
    const wheel = JSON.stringify([2, 3, 4, 5, 14]);
    if (JSON.stringify(vals) === wheel) return 5;
    return Math.max(...vals);
  };

  // Royal Flush: A-K-Q-J-T all same suit
  if (isFlushHand && isStraightHand && uniqueValsDesc[0] === 14 && uniqueValsDesc[4] === 10) {
    return {
      rank: HAND_RANKS.ROYAL_FLUSH,
      value: [14],
      description: 'Royal Flush'
    };
  }

  // Straight Flush
  if (isFlushHand && isStraightHand) {
    return {
      rank: HAND_RANKS.STRAIGHT_FLUSH,
      value: [straightHigh(cards)],
      description: 'Straight Flush'
    };
  }

  // Four of a Kind
  if (counts[0] === 4) {
    const quad = groups.find(g => g.count === 4).v;
    const kicker = groups.find(g => g.count === 1).v;
    return {
      rank: HAND_RANKS.FOUR_OF_KIND,
      value: [quad, kicker],
      description: 'Four of a Kind'
    };
  }

  // Full House
  if (counts[0] === 3 && counts[1] === 2) {
    const trip = groups.find(g => g.count === 3).v;
    const pair = groups.find(g => g.count === 2).v;
    return {
      rank: HAND_RANKS.FULL_HOUSE,
      value: [trip, pair],
      description: 'Full House'
    };
  }

  // Flush
  if (isFlushHand) {
    return {
      rank: HAND_RANKS.FLUSH,
      value: uniqueValsDesc,
      description: 'Flush'
    };
  }

  // Straight
  if (isStraightHand) {
    return {
      rank: HAND_RANKS.STRAIGHT,
      value: [straightHigh(cards)],
      description: 'Straight'
    };
  }

  // Three of a Kind
  if (counts[0] === 3) {
    const trip = groups.find(g => g.count === 3).v;
    const kickers = groups.filter(g => g.count === 1).map(g => g.v).sort((a, b) => b - a);
    return {
      rank: HAND_RANKS.THREE_OF_KIND,
      value: [trip, ...kickers],
      description: 'Three of a Kind'
    };
  }

  // Two Pair
  if (counts[0] === 2 && counts[1] === 2) {
    const pairs = groups.filter(g => g.count === 2).map(g => g.v).sort((a, b) => b - a);
    const kicker = groups.find(g => g.count === 1).v;
    return {
      rank: HAND_RANKS.TWO_PAIR,
      value: [pairs[0], pairs[1], kicker],
      description: 'Two Pair'
    };
  }

  // Pair
  if (counts[0] === 2) {
    const pair = groups.find(g => g.count === 2).v;
    const kickers = groups.filter(g => g.count === 1).map(g => g.v).sort((a, b) => b - a);
    return {
      rank: HAND_RANKS.PAIR,
      value: [pair, ...kickers],
      description: 'Pair'
    };
  }

  // High Card
  return {
    rank: HAND_RANKS.HIGH_CARD,
    value: uniqueValsDesc,
    description: 'High Card'
  };
}

/**
 * Find best 5-card hand from 7 cards (2 hole + 5 community)
 * @param {Array} holeCards - Player's 2 hole cards
 * @param {Array} communityCards - Up to 5 community cards
 * @returns {Object} Best hand evaluation
 */
function findBestHand(holeCards, communityCards) {
  const allCards = [...holeCards, ...communityCards];
  
  if (allCards.length < 5) {
    return null; // Not enough cards to evaluate
  }

  let bestHand = null;
  
  // Generate all 5-card combinations
  const combinations = getCombinations(allCards, 5);
  
  for (let combo of combinations) {
    const evaluation = evaluateHand(combo);
    if (!bestHand || compareHands(evaluation, bestHand) > 0) {
      bestHand = evaluation;
      bestHand.cards = combo;
    }
  }
  
  return bestHand;
}

/**
 * Get all k-length combinations from array
 * @param {Array} arr - Input array
 * @param {Number} k - Combination length
 * @returns {Array} Array of combinations
 */
function getCombinations(arr, k) {
  if (k === 1) return arr.map(el => [el]);
  if (k === arr.length) return [arr];
  
  const combinations = [];
  for (let i = 0; i <= arr.length - k; i++) {
    const head = arr[i];
    const tailCombos = getCombinations(arr.slice(i + 1), k - 1);
    tailCombos.forEach(combo => combinations.push([head, ...combo]));
  }
  return combinations;
}

/**
 * Compare two evaluated hands
 * @param {Object} hand1 - First hand evaluation
 * @param {Object} hand2 - Second hand evaluation
 * @returns {Number} 1 if hand1 wins, -1 if hand2 wins, 0 if tie
 */
function compareHands(hand1, hand2) {
  // Compare hand ranks first
  if (hand1.rank > hand2.rank) return 1;
  if (hand1.rank < hand2.rank) return -1;
  
  // Same rank, compare card values
  for (let i = 0; i < hand1.value.length; i++) {
    if (hand1.value[i] > hand2.value[i]) return 1;
    if (hand1.value[i] < hand2.value[i]) return -1;
  }
  
  return 0; // Exact tie
}

module.exports = {
  createDeck,
  shuffleDeck,
  evaluateHand,
  findBestHand,
  compareHands,
  HAND_RANKS
};
