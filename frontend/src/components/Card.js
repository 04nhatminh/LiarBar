/**
 * Card Component
 * Displays a single playing card
 */

import React from 'react';

function Card({ card, faceDown = false, className = '', style = {} }) {
  if (!card && !faceDown) return null;

  if (faceDown) {
    return (
      <div className={`card card-back ${className}`} style={style}>
        <div className="card-pattern"></div>
      </div>
    );
  }

  // Determine if red or black suit
  const isRed = card.suit === '♥' || card.suit === '♦';
  const colorClass = isRed ? 'card-red' : 'card-black';

  return (
    <div className={`card ${colorClass} ${className}`} style={style}>
      <div className="card-rank">{card.rank}</div>
      <div className="card-suit">{card.suit}</div>
    </div>
  );
}

export default Card;