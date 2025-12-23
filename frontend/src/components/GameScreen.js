/**
 * Main Game Screen Component
 * Handles socket events and renders game UI
 */

import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import Table from './Table';
import PlayerPanel from './PlayerPanel';
import ActionButtons from './ActionButtons';
import BulletMeter from './BulletMeter';
import ShootingScreen from './ShootingScreen';
import Card from './Card';

function GameScreen({ nickname }) {
  const { socket, connected } = useSocket();
  const [gameState, setGameState] = useState(null);
  const [shootResult, setShootResult] = useState(null);
  const [message, setMessage] = useState('');
  const [switchStep, setSwitchStep] = useState(null); // 'select_hand' | 'select_option'
  const [selectedHandIdx, setSelectedHandIdx] = useState(null);
  const [switchOptions, setSwitchOptions] = useState([]);
  const hasJoinedRef = React.useRef(false);

  // Set up socket listeners (only once)
  useEffect(() => {
    if (!socket) return;

    console.log('Setting up socket listeners');

    // Listen for game state updates
    const handleGameState = (state) => {
      console.log('Received game state:', state);
      setGameState(state);
      setShootResult(null);
    };

    // Listen for player joined
    const handlePlayerJoined = (data) => {
      setMessage(`${data.nickname} joined as ${data.role}`);
      setTimeout(() => setMessage(''), 3000);
    };

    // Listen for player left
    const handlePlayerLeft = (data) => {
      setMessage('A player left the game');
      setTimeout(() => setMessage(''), 3000);
    };

    // Listen for shoot result
    const handleShootResult = (result) => {
      setShootResult(result);
    };

    // Listen for errors
    const handleError = (error) => {
      console.error('Server error:', error);
      setMessage(error.message);
      setTimeout(() => setMessage(''), 3000);
    };

    socket.on('game_state', handleGameState);
    socket.on('player_joined', handlePlayerJoined);
    socket.on('player_left', handlePlayerLeft);
    socket.on('shoot_result', handleShootResult);
    socket.on('error', handleError);

    return () => {
      socket.off('game_state', handleGameState);
      socket.off('player_joined', handlePlayerJoined);
      socket.off('player_left', handlePlayerLeft);
      socket.off('shoot_result', handleShootResult);
      socket.off('error', handleError);
    };
  }, [socket]);

  // Join game (only once when connected)
  useEffect(() => {
    if (!socket || !connected || hasJoinedRef.current) return;

    console.log('Joining game as:', nickname);
    socket.emit('join_game', { nickname });
    hasJoinedRef.current = true;
  }, [socket, connected, nickname]);

  const handleAction = (action) => {
    if (socket) {
      socket.emit('player_action', { action });
    }
  };

  const handleShoot = () => {
    if (socket) {
      socket.emit('shoot');
    }
  };

  const handleStartGame = () => {
    if (socket) {
      socket.emit('start_game');
    }
  };

  const handleResetGame = () => {
    if (socket) {
      socket.emit('reset_game');
    }
  };

  const handleSwitchInit = () => setSwitchStep('select_hand');

  const handleHandCardClick = (idx) => {
    if (switchStep === 'select_hand') {
      setSelectedHandIdx(idx);
      socket.emit('requestSwitchOptions');
      setSwitchStep('loading');
    }
  };

  useEffect(() => {
    if (!socket) return;
    socket.on('switchOptionsReceived', (options) => {
      setSwitchOptions(options);
      setSwitchStep('select_option');
    });
    socket.on('switchSuccess', () => setSwitchStep(null));
    return () => {
      socket.off('switchOptionsReceived');
      socket.off('switchSuccess');
    };
  }, [socket]);

  if (!connected) {
    return (
      <div className="game-screen">
        <div className="connecting">Connecting to server...</div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="game-screen">
        <div className="connecting">Loading game...</div>
      </div>
    );
  }

  // Determine if we're a player or viewer
  const isPlayer = gameState.yourRole === 'player1' || gameState.yourRole === 'player2';
  const isViewer = gameState.yourRole === 'viewer';

  // Show shooting screen if in shooting phase
  if (gameState.phase === 'SHOOTING' && shootResult) {
    const loserNickname = gameState.players[gameState.loser]?.nickname || gameState.loser;
    return <ShootingScreen result={shootResult} loser={loserNickname} />;
  }

  // Get current player info
  const currentPlayer = gameState.players[gameState.yourRole];
  const anybodyAllIn = Object.values(gameState.players || {}).some(p => p && p.isAllIn);

  return (
    <div className="game-screen">
      {/* Top message bar */}
      {message && <div className="message-bar">{message}</div>}

      {/* Viewer indicator */}
      {isViewer && (
        <div className="viewer-badge">
          👁️ VIEWER MODE
        </div>
      )}

      {/* Main game layout */}
      <div className="game-layout">
        
        {/* Opponent panel (top) - Always show the OTHER player */}
        {(() => {
          const opponentRole = gameState.yourRole === 'player1' ? 'player2' : 'player1';
          const opponent = gameState.players[opponentRole];
          
          return opponent ? (
            <PlayerPanel
              player={opponent}
              isActive={gameState.activePlayer === opponentRole}
              position="top"
              hand={
                (gameState.phase === 'SHOWDOWN' || gameState.phase === 'SHOOTING' || gameState.phase === 'GAME_OVER') 
                  ? gameState[`${opponentRole}Hand`] 
                  : null
              }
              isOpponent={true}
            />
          ) : null;
        })()}

        {/* Table with community cards */}
        <Table
          communityCards={gameState.communityCards}
          pot={gameState.pot}
          phase={gameState.phase}
        />

        {/* Your panel (bottom) - Always show YOUR player */}
        {(() => {
          const yourRole = gameState.yourRole;
          const you = gameState.players[yourRole];
          
          return you ? (
            <PlayerPanel
              player={you}
              isActive={gameState.activePlayer === yourRole}
              position="bottom"
              hand={gameState.yourHand}
              isOpponent={false}
            />
          ) : null;
        })()}

        {/* Action buttons (only for active player) */}
        {isPlayer && gameState.activePlayer === gameState.yourRole && (
          <ActionButtons
            availableActions={gameState.availableActions}
            onAction={handleAction}
            gameState={gameState}
            player={currentPlayer}
            anybodyAllIn={anybodyAllIn}
            onSwitchInit={handleSwitchInit}
          />
        )}

        {/* Shoot button (only for loser in shooting phase) */}
        {gameState.phase === 'SHOOTING' && gameState.loser === gameState.yourRole && !shootResult && (
          <div className="shoot-container">
            <button className="shoot-button" onClick={handleShoot}>
              🔫 PULL TRIGGER
            </button>
            <div className="shoot-info">
              {gameState.players[gameState.yourRole]?.nickname}, Death Probability: {((gameState.players[gameState.loser].committed / 8) * 100).toFixed(1)}%
            </div>
          </div>
        )}

        {/* Bullet meters */}
        <div className="bullet-meters">
          {(() => {
            const opponentRole = gameState.yourRole === 'player1' ? 'player2' : 'player1';
            const opponent = gameState.players[opponentRole];
            const you = gameState.players[gameState.yourRole];
            
            return (
              <>
                {opponent && (
                  <BulletMeter
                    bullets={opponent.bullets}
                    committed={opponent.committed}
                    nickname={opponent.nickname}
                    position="top"
                  />
                )}
                {you && (
                  <BulletMeter
                    bullets={you.bullets}
                    committed={you.committed}
                    nickname={you.nickname}
                    position="bottom"
                  />
                )}
              </>
            );
          })()}
        </div>

        {/* Phase indicator */}
        <div className="phase-indicator">
          {gameState.phase === 'WAITING' && 'Waiting for players...'}
          {gameState.phase === 'ANTE' && 'Collecting ante...'}
          {gameState.phase === 'PREFLOP' && `Pre-Flop${gameState.activePlayer ? ` - ${gameState.players[gameState.activePlayer]?.nickname}'s turn` : ''}`}
          {gameState.phase === 'FLOP' && `Flop${gameState.activePlayer ? ` - ${gameState.players[gameState.activePlayer]?.nickname}'s turn` : ''}`}
          {gameState.phase === 'TURN' && `Turn${gameState.activePlayer ? ` - ${gameState.players[gameState.activePlayer]?.nickname}'s turn` : ''}`}
          {gameState.phase === 'RIVER' && `River${gameState.activePlayer ? ` - ${gameState.players[gameState.activePlayer]?.nickname}'s turn` : ''}`}
          {gameState.phase === 'SHOWDOWN' && 'Showdown!'}
          {gameState.phase === 'SHOOTING' && `🔫 ${gameState.players[gameState.loser]?.nickname} must shoot`}
          {gameState.phase === 'GAME_OVER' && '💀 Game Over'}
        </div>

        {/* Start Game button (when both players ready) */}
        {gameState.phase === 'WAITING' && 
         gameState.players.player1 && 
         gameState.players.player2 && 
         isPlayer && (
          <div className="start-game-container">
            <button className="start-game-button" onClick={handleStartGame}>
              ▶️ START GAME
            </button>
            <div className="start-info">Both players ready!</div>
          </div>
        )}

        {/* Reset Game button (when game over) */}
        {gameState.phase === 'GAME_OVER' && isPlayer && (
          <div className="reset-game-container">
            <button className="reset-game-button" onClick={handleResetGame}>
              🔄 NEW GAME
            </button>
          </div>
        )}

        {/* Hand result at showdown */}
        {gameState.handResult && (
          <div className="hand-result">
            <div>
              {gameState.players.player1?.nickname || 'Player 1'}: {gameState.handResult.player1Hand?.description}
            </div>
            <div>
              {gameState.players.player2?.nickname || 'Player 2'}: {gameState.handResult.player2Hand?.description}
            </div>
            {gameState.winner && (
              <div className="winner">
                Winner: {gameState.players[gameState.winner]?.nickname || gameState.winner}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Switch Card UI */}
      {switchStep && (
        <div className="switch-overlay">
          <div className="switch-modal">
            <h3>{switchStep === 'select_hand' ? "Chọn 1 lá bài của bạn để đổi" : "Chọn 1 lá bài mới"}</h3>
            
            {/* Hiển thị Pool bài trên bàn (Community Cards) */}
            <div className="reference-section">
              <p>Bài trên bàn (Pool):</p>
              <div className="card-row">
                {gameState.communityCards && gameState.communityCards.length > 0 ? (
                  gameState.communityCards.map((card, i) => (
                    <div key={i} className="card-wrapper">
                      <Card card={card} />
                    </div>
                  ))
                ) : (
                  <div className="no-cards">Chưa có bài trên bàn</div>
                )}
              </div>
            </div>

            {/* Hiển thị bài hiện tại của người chơi */}
            <div className="reference-section">
              <p>Bài của bạn:</p>
              <div className="card-row">
                {gameState.yourHand && gameState.yourHand.map((card, i) => (
                  <div 
                    key={i} 
                    className={`card-wrapper ${selectedHandIdx === i ? 'selected' : ''} ${switchStep === 'select_hand' ? 'clickable' : ''}`}
                    onClick={() => handleHandCardClick(i)}
                  >
                    <Card card={card} />
                  </div>
                ))}
              </div>
            </div>

            {/* Hiển thị 3 lá bài ngẫu nhiên để chọn */}
            {switchStep === 'select_option' && (
              <div className="reference-section">
                <p>Chọn 1 lá bài mới từ bộ bài:</p>
                <div className="card-row">
                  {switchOptions.map((card, i) => (
                    <div key={i} className="card-wrapper clickable" onClick={() => socket.emit('executeSwitch', { cardIndex: selectedHandIdx, newCard: card })}>
                      <Card card={card} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="switch-actions">
              <button className="action-button cancel-button" onClick={() => setSwitchStep(null)}>Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameScreen;
