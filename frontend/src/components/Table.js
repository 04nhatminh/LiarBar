/**
 * Table Component
 * Displays community cards and pot
 */

import React from 'react';
import Card from './Card';

function Table({ communityCards, pot, phase }) {
  return (
    <div className="table">
      <div className="community-cards">
        {communityCards && communityCards.length > 0 ? (
          communityCards.map((card, index) => (
            <Card 
              key={`${card.rank}-${card.suit}`} // Use unique key based on card data to trigger animation on new cards
              card={card} 
              className="flip-in"
              style={{ animationDelay: `${index * 0.15}s` }} // Stagger effect: 0s, 0.15s, 0.3s...
            />
          ))
        ) : (
          <div className="no-cards">Waiting for cards...</div>
        )}
      </div>
    </div>
  );
}

export default Table;