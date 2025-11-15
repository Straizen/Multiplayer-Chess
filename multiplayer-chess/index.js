// index.js — Node.js + Socket.IO chess server
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const Chess = require("chess.js").Chess;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let rooms = {};  // roomCode → { players: [], game: Chess() }

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
}

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("createRoom", () => {
        const code = generateRoomCode();
        const game = new Chess();

        rooms[code] = {
            players: [socket.id],
            game: game,
            turn: 'w'
        };

        socket.join(code);
        socket.emit("roomCreated", { code });
        console.log("Room created:", code);
    });

    socket.on("joinRoom", ({ code }) => {
        if (!rooms[code]) {
            socket.emit("errorMessage", "Room does not exist.");
            return;
        }
        if (rooms[code].players.length >= 2) {
            socket.emit("errorMessage", "Room full.");
            return;
        }

        rooms[code].players.push(socket.id);
        socket.join(code);

        // Inform both clients the game is starting and which socket id is white/black
        const players = rooms[code].players; // [whiteSocketId, blackSocketId]
        io.to(code).emit("gameStart", {
            fen: rooms[code].game.fen(),
            white: players[0],
            black: players[1]
        });

        console.log("Player joined room:", code, "players:", players);
    });

    socket.on("move", ({ code, from, to }) => {
        const room = rooms[code];
        if (!room) return;

        const game = room.game;

        // Determine player color from socket id
        const players = room.players; // [whiteSocketId, blackSocketId]
        const playerColor = (socket.id === players[0]) ? 'w' : 'b';

        // Enforce turn-taking
        if (game.turn() !== playerColor) {
            socket.emit("errorMessage", "Not your turn.");
            return;
        }

        const result = game.move({ from, to, promotion: "q" });

        if (result === null) {
            socket.emit("invalidMove");
            return;
        }

        // Broadcast the updated board to everyone in the room
        io.to(code).emit("boardUpdate", {
            fen: game.fen(),
            move: result
        });
    });

    socket.on("undoMove", ({ code }) => {
        const room = rooms[code];
        if (!room) return;

        const game = room.game;
        game.undo();

        io.to(code).emit("boardUpdate", {
            fen: game.fen()
        });
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);

        // Remove socket from any rooms and clean up empty rooms
        for (const code of Object.keys(rooms)) {
            const room = rooms[code];
            const idx = room.players.indexOf(socket.id);
            if (idx !== -1) {
                room.players.splice(idx, 1);
                // If room empty, delete it
                if (room.players.length === 0) {
                    delete rooms[code];
                    console.log("Deleted empty room:", code);
                } else {
                    // notify remaining player
                    io.to(code).emit("errorMessage", "Opponent disconnected.");
                }
            }
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log("Server running → http://localhost:" + PORT);
});
