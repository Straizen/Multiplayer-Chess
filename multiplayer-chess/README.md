# 🎮 Multiplayer Chess (Node.js + WebSockets)
A real-time, multiplayer chess game built with Node.js, Express, and Socket.IO.
Players can join a room and play chess against each other with smooth, realtime updates.

---

## 🚀 Features
- ♟️ Fully interactive chessboard rendered on the client
- 🔄 Real-time multiplayer using Socket.IO
- 🏠 Lobby / room-based matchmaking (if implemented)
- ⚡ Fast and lightweight server
- 🎨 Custom chess pieces and tile assets
- 📁 Clean project structure, easy to extend

---

## 📂 Project Structure
```
multiplayer-chess
├── index.js                # Main Node.js server
├── package.json
├── public/
│   ├── index.html          # Front-end UI
│   ├── app.js              # Client-side logic & socket events
│   ├── style.css           # UI styling
│   └── assets/
│       ├── pieces/         # Chess piece graphics
│       └── tiles/          # Board tile images
```
---

## 🛠️ Installation

```cd Multiplayer-Chess```
```npm install```

---

## ▶️ Running the Server
Start the Node.js server:
```node index.js```
Then open your browser and visit:
```http://localhost:3000```

---

## 🔗 How It Works
### Backend (Node.js + Socket.IO)
- Manages player connections
- Syncs moves between clients
- Handles game state events (join, leave, move, resign, etc.)

### Frontend
- Renders the chessboard using HTML/CSS/JavaScript
- Communicates with the server via Socket.IO
- Updates board state on incoming moves

## 📦 Dependencies
Core dependencies from package.json:
- express – for hosting static files
- socket.io – for real-time communication
Install them via:
```npm install```

---

## 🖼️ Assets

All chess piece and tile images are located under: public/assets/
