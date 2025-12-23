/**
 * Player Panel Component
 * Shows player info, bullets, and cards
 */

import React from 'react';
import Card from './Card';

const PlayerPanel = ({ player, isMe, isCurrentTurn, hand, handStrength }) => {
    if (!player) {
        return (
            <div className={`player-panel empty`}>
                <div className="waiting-text">Waiting for player...</div>
            </div>
        );
    }

    // Use the hand prop if provided, otherwise fallback to player.hand (if it exists)
    const displayHand = hand || player.hand || [];

    return (
        <div className={`player-panel ${isCurrentTurn ? 'active' : ''}`}>
            <div className="player-info">
                <div className="player-nickname">{player.nickname}</div>
                <div className="player-bullets">
                    Remaining bullets: {player.bullets} / 8
                </div>
                <div className="player-committed">
                    Bet: {player.committed}
                </div>
            </div>

            <div className="hand-container">
                <div className="cards-row">
                    {displayHand.map((card, i) => (
                        <Card key={i} card={card} faceDown={!card} />
                    ))}
                </div>
            </div>

            {/* Hiển thị độ mạnh bài (nằm trong DOM nhưng sẽ dùng CSS đưa ra ngoài) */}
            {handStrength && (
                <div className="hand-strength-badge">
                    {handStrength}
                </div>
            )}

            {isCurrentTurn && <div className="active-indicator">YOUR TURN</div>}
        </div>
    );
}

export default PlayerPanel;