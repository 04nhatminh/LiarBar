/**
 * Main App Component
 */

import React, { useState, useEffect } from 'react';
import { SocketProvider } from './context/SocketContext';
import JoinScreen from './components/JoinScreen';
import GameScreen from './components/GameScreen';
import MultiPlayerTest from './components/MultiPlayerTest';
import './styles/App.css';

function App() {
  const [joined, setJoined] = useState(false);
  const [nickname, setNickname] = useState('');
  const [testMode, setTestMode] = useState(false);

  // Enable test mode with URL parameter: ?test=true
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('test') === 'true') {
      setTestMode(true);
    }
  }, []);

  const handleJoin = (name) => {
    setNickname(name);
    setJoined(true);
  };

  // Test mode: multiple players in one browser
  if (testMode) {
    return (
      <div className="App">
        <MultiPlayerTest />
      </div>
    );
  }

  // Normal mode: single player
  return (
    <SocketProvider>
      <div className="App">
        {!joined ? (
          <JoinScreen onJoin={handleJoin} />
        ) : (
          <GameScreen nickname={nickname} />
        )}
      </div>
    </SocketProvider>
  );
}

export default App;
