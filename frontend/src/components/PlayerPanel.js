/**
 * Player Panel Component
 * Shows player info, bullets, and cards
 */

import React from 'react';
import Card from './Card';

function PlayerPanel({ player, isActive, position, hand, isOpponent }) {
  if (!player) {
    return (
      <div className={`player-panel player-panel-${position} empty`}>
        <div className="waiting-text">Waiting for player...</div>
      </div>
    );
  }

  return (
    <div className={`player-panel player-panel-${position} ${isActive ? 'active' : ''}`}>
      <div className="player-info">
        <div className="player-nickname">{player.nickname}</div>
        <div className="player-bullets">
          Remaining bullets: {player.bullets} / 8
        </div>
        <div className="player-committed">
          Bet: {player.committed}
        </div>
      </div>

      <div className="player-hand">
        {hand ? (
          hand.map((card, index) => (
            <Card 
              key={`${card.rank}-${card.suit}`} // Unique key để trigger animation
              card={card} 
              // Chỉ thêm hiệu ứng flip nếu là bài của đối thủ (lúc showdown)
              className={isOpponent ? "flip-in" : ""}
              // Stagger delay để lật từng lá một
              style={isOpponent ? { animationDelay: `${index * 0.15}s` } : {}}
            />
          ))
        ) : isOpponent ? (
          // Show face-down cards for opponent (Hidden state)
          <>
            <Card faceDown={true} />
            <Card faceDown={true} />
          </>
        ) : null}
      </div>

      {isActive && <div className="active-indicator">YOUR TURN</div>}
    </div>
  );
}

export default PlayerPanel;