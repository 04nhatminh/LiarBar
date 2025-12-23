/**
 * Shooting Screen Component
 * Displays shooting animation and result
 */

import React from 'react';

function ShootingScreen({ result, loser }) {
  if (!result) return null;

  return (
    <div className="shooting-screen">
      <div className="shooting-container">
        <div className="revolver">🔫</div>
        
        <div className="shooting-result">
          {result.survived ? (
            <>
              <h1 className="survived">SURVIVED</h1>
              <p className="loser-name">{loser} lives to fight another hand</p>
            </>
          ) : (
            <>
              <h1 className="died">💀 DEATH 💀</h1>
              <p className="loser-name">{loser} is dead</p>
            </>
          )}
        </div>

        <div className="probability-display">
          <div>Death Probability: {(result.probability * 100).toFixed(1)}%</div>
          <div>Roll: {(result.roll * 100).toFixed(1)}%</div>
        </div>

        <div className="result-message">{result.message}</div>
      </div>
    </div>
  );
}

export default ShootingScreen;
