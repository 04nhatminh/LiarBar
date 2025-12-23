/**
 * Action Buttons Component
 * Displays available player actions
 */

import React from 'react';

function ActionButtons({ availableActions, onAction, gameState, player, anybodyAllIn, onSwitchInit }) {
  if (!availableActions || availableActions.length === 0) {
    return null;
  }

  // Calculate call amount dynamically
  const getCallLabel = () => {
    if (!gameState) return '📞 Call';
    
    const playerRole = gameState.yourRole;
    const opponent = playerRole === 'player1' ? 'player2' : 'player1';
    const playerCommitted = gameState.players[playerRole]?.committed || 0;
    const opponentCommitted = gameState.players[opponent]?.committed || 0;
    
    if (opponentCommitted > playerCommitted) {
      const toCall = opponentCommitted - playerCommitted;
      return `📞 Call ${toCall}`;
    }
    return '📞 Call +1';
  };

  const buttonLabels = {
    FOLD: '❌ Fold',
    CALL: getCallLabel(),
    ALL_IN: '🔥 All-In'
  };

  // Thêm kiểm tra nếu player không tồn tại thì không render gì cả
  if (!player) return null;

  return (
    <div className="action-buttons">
      {availableActions.map((action) => (
        <button
          key={action}
          className={`action-button action-${action.toLowerCase()}`}
          onClick={() => onAction(action)}
        >
          {buttonLabels[action] || action}
        </button>
      ))}
      {/* Kiểm tra an toàn trước khi truy cập hasSwitched */}
      {!player.hasSwitched && !anybodyAllIn && (
        <button 
          className="action-button switch-button" 
          onClick={onSwitchInit}
        >
          🔄 Switch
        </button>
      )}
    </div>
  );
}

export default ActionButtons;
