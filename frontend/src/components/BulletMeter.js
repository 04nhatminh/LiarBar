/**
 * Bullet Meter Component
 * Visual representation of bullets (chambers in revolver)
 */

import React from 'react';

function BulletMeter({ bullets, committed, nickname, position }) {
  const maxBullets = 8;
  
  return (
    <div className={`bullet-meter-${position}`}>
      <div className="bullet-meter-label">{nickname}</div>
      <div className="bullet-chambers">
        {Array.from({ length: maxBullets }).map((_, index) => {
          let chamberClass = 'chamber empty';
          
          if (index < bullets + committed) {
            if (index < bullets) {
              chamberClass = 'chamber full';
            } else {
              chamberClass = 'chamber committed';
            }
          }
          
          return <div key={index} className={chamberClass}></div>;
        })}
      </div>
      <div className="bullet-meter-info">
        {bullets} available • {committed} bet
      </div>
    </div>
  );
}

export default BulletMeter;