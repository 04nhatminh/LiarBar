# LiarBar - 1v1 Poker Roulette Game

Play here: [Clone Liar Bar by Kaizen]([https://clone-liar-bar.vercel.app/)

A real-time multiplayer poker game combining Texas Hold'em mechanics with Russian Roulette death mechanics.

## Game Rules

- **Players**: 1v1 (additional users become viewers)
- **Currency**: Bullets (each player starts with 8)
- **Betting**: Players bet bullets each hand
- **Death Mechanic**: Loser shoots with death probability = (bullets_committed / 8)
- **Rounds**: Ante → Pre-flop → Flop → Turn → River
- **Max bet per hand**: 5 bullets normally, 8 if all-in

## Project Structure

```
LiarBar/
├── backend/          # ExpressJS + Socket.io server
│   ├── server.js     # Main server file
│   ├── gameLogic.js  # Game state machine and logic
│   └── pokerEval.js  # Poker hand evaluator
├── frontend/         # React + Socket.io client
│   ├── public/
│   └── src/
│       ├── App.js
│       ├── components/
│       └── styles/
└── README.md
```

## Setup Instructions

### Backend
```bash
cd backend
npm install
npm run dev
```
Server runs on `http://localhost:3001`

### Frontend
```bash
cd frontend
npm install
npm start
```
Client runs on `http://localhost:3000`

## Tech Stack

- **Backend**: Node.js, Express, Socket.io
- **Frontend**: React, Socket.io-client
- **Storage**: In-memory (no database for v1)

## Game Flow

1. User enters nickname → joins room
2. First user becomes Player 1 (waiting)
3. Second user becomes Player 2 (game starts)
4. Additional users become Viewers
5. Game loops until one player dies

## Color Theme

- Black and white minimalistic design
- Card suits displayed in red (♥♦) and black (♠♣)
