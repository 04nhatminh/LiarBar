/**
 * Join Screen Component
 * Initial screen where user enters nickname
 */

import React, { useState } from 'react';

function JoinScreen({ onJoin }) {
  const [nickname, setNickname] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nickname.trim()) {
      onJoin(nickname.trim());
    }
  };

  return (
    <div className="join-screen">
      <div className="join-container">
        <h1 className="game-title">LIAR'S BAR</h1>
        <p className="game-subtitle">Poker • Roulette • Death</p>
        
        <form onSubmit={handleSubmit} className="join-form">
          <input
            type="text"
            placeholder="Enter your nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            className="nickname-input"
            autoFocus
          />
          <button type="submit" className="join-button">
            ENTER GAME
          </button>
        </form>

        <div className="rules-brief">
          <p>🎲 1v1 Texas Hold'em with bullets</p>
          <p>💀 Loser shoots • 8 chambers • Death probability = bullets bet / 8</p>
          <p>🔫 Survive or die</p>
        </div>

        <div className="test-mode-hint">
          <p>💡 Test mode: Add <code>?test=true</code> to URL</p>
          <p>Example: <code>http://localhost:3000?test=true</code></p>
        </div>
      </div>
    </div>
  );
}

export default JoinScreen;
