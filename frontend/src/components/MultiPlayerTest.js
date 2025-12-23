/**
 * Multi-Player Test Component
 * Allows testing multiple players in the same browser window
 */

import React, { useState } from 'react';
import { SocketProvider } from '../context/SocketContext';
import GameScreen from './GameScreen';
import '../styles/MultiTest.css';

function MultiPlayerTest() {
  const [players, setPlayers] = useState([]);

  const addPlayer = () => {
    const playerNum = players.length + 1;
    setPlayers([...players, { id: playerNum, nickname: `Player${playerNum}` }]);
  };

  const removePlayer = (id) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  return (
    <div className="multi-test">
      <div className="test-controls">
        <h2>Multi-Player Test Mode</h2>
        <button onClick={addPlayer} className="add-player-btn">
          ➕ Add Player
        </button>
        <div className="player-count">Active Players: {players.length}</div>
      </div>

      <div className="test-grid">
        {players.map((player) => (
          <div key={player.id} className="test-player-window">
            <div className="test-player-header">
              <span>{player.nickname}</span>
              <button 
                onClick={() => removePlayer(player.id)}
                className="remove-player-btn"
              >
                ❌
              </button>
            </div>
            <SocketProvider key={player.id}>
              <GameScreen nickname={player.nickname} />
            </SocketProvider>
          </div>
        ))}
      </div>

      {players.length === 0 && (
        <div className="empty-state">
          <p>Click "Add Player" to create test players</p>
          <p>You need 2 players to start the game</p>
        </div>
      )}
    </div>
  );
}

export default MultiPlayerTest;
