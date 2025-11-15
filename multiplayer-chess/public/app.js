const socket = io();
let game = null;
let roomCode = null;
let isMyTurn = false;
let myColor = null;

const boardEl = document.getElementById("board");
const moveHistoryEl = document.getElementById("moveHistory");
const overlay = document.getElementById("overlay");

// Initialize Chess game
try {
    if (typeof Chess === 'undefined') {
        console.error("Chess.js library not loaded!");
    } else {
        game = new Chess();
        console.log("Chess game initialized successfully");
    }
} catch (e) {
    console.error("Error initializing Chess:", e);
}

// Create 8×8 board
function createBoard() {
    if (!boardEl) {
        console.error("Board element not found!");
        return;
    }
    
    const files = "abcdefgh".split("");

    for (let r = 8; r >= 1; r--) {
        for (let f = 0; f < 8; f++) {
            const sq = document.createElement("div");
            sq.classList.add("square");

            const isLight = (r + f) % 2 === 0;
            sq.style.backgroundImage = `url("assets/tiles/${isLight ? "tileW" : "tileB"}.png")`;

            sq.dataset.square = files[f] + r;
            sq.addEventListener("click", () => onSquareClick(sq.dataset.square));

            boardEl.appendChild(sq);
        }
    }
    console.log("Board created with 64 squares");
}
createBoard();

// Wait for DOM to fully load before rendering
setTimeout(() => {
    if (game) {
        console.log("Rendering initial board state");
        render();
    } else {
        console.error("Game not initialized, retrying...");
        setTimeout(() => render(), 500);
    }
}, 100);

let selected = null;
let lastMove = null;

// clicking squares
function onSquareClick(square) {
    if (!game) return;
    if (!isMyTurn) return;

    // toggle selection visual
    if (!selected) {
        selected = square;
        // mark DOM
        const el = document.querySelector(`[data-square='${square}']`);
        if (el) el.classList.add('selected');
        return;
    }

    // Validate the move on a temporary game instance so we don't mutate local state
    const temp = new Chess(game.fen());
    const result = temp.move({ from: selected, to: square, promotion: "q" });

    if (result) {
        if (!roomCode) {
            alert("No room code set. Create or join a room first.");
        } else {
            // send the move request to the server; server will validate and broadcast boardUpdate
            socket.emit("move", { code: roomCode, from: selected, to: square });
        }
    } else {
        alert("Invalid move.");
    }

    // clear selection visual immediately (server will confirm move)
    const prev = document.querySelector(`[data-square='${selected}']`);
    if (prev) prev.classList.remove('selected');
    selected = null;
}

function render() {
    if (!game) {
        console.warn("render() called but game is not initialized");
        return;
    }
    
    const board = game.board();
    
    // Unicode chess pieces as fallback
    const pieces = {
        'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
        'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
    };

    // clear squares and remove highlights
    document.querySelectorAll(".square").forEach((sq) => {
        sq.innerHTML = "";
        sq.classList.remove('selected', 'last-move');
    });

    for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
            const piece = board[r][f];
            if (piece) {
                const square = "abcdefgh"[f] + (8 - r);
                const el = document.querySelector(`[data-square='${square}']`);
                
                if (!el) {
                    console.warn(`Square element not found: ${square}`);
                    continue;
                }

                const pieceFileName = `${piece.color}${piece.type.toUpperCase()}`;
                const img = document.createElement("img");
                img.className = "piece";
                img.src = `assets/pieces/${pieceFileName}.png`;
                img.draggable = false;
                
                console.log(`Loading piece: ${pieceFileName}.png at ${square}`);
                
                let imageLoaded = false;
                
                img.onerror = () => {
                    if (!imageLoaded) {
                        console.warn(`Failed to load image: assets/pieces/${pieceFileName}.png, using fallback`);
                        // Use Unicode fallback
                        const symbol = pieces[piece.type] || '?';
                        img.style.display = 'none';
                        const textSpan = document.createElement('span');
                        textSpan.textContent = symbol;
                        textSpan.style.fontSize = '50px';
                        textSpan.style.display = 'flex';
                        textSpan.style.alignItems = 'center';
                        textSpan.style.justifyContent = 'center';
                        el.appendChild(textSpan);
                    }
                };
                
                img.onload = () => {
                    imageLoaded = true;
                    console.log(`Successfully loaded: assets/pieces/${pieceFileName}.png`);
                };

                el.appendChild(img);
            }
        }
    }

    // apply last-move highlight
    if (lastMove && lastMove.from && lastMove.to) {
        const fromEl = document.querySelector(`[data-square='${lastMove.from}']`);
        const toEl = document.querySelector(`[data-square='${lastMove.to}']`);
        if (fromEl) fromEl.classList.add('last-move');
        if (toEl) toEl.classList.add('last-move');
    }

    // re-apply selected if any
    if (selected) {
        const selEl = document.querySelector(`[data-square='${selected}']`);
        if (selEl) selEl.classList.add('selected');
    }

    updateHistory();
}

function updateHistory() {
    moveHistoryEl.innerHTML = "";
    game.history().forEach((mv, i) => {
        const div = document.createElement("div");
        div.textContent = mv;
        moveHistoryEl.appendChild(div);
    });
}

/*━━━━━━━━━━━━━━━━━━━━━━━━━━
  INVITE / JOIN / SOCKET LOGIC
━━━━━━━━━━━━━━━━━━━━━━━━━━*/

document.getElementById("inviteBtn").onclick = () => {
    socket.emit("createRoom");
};

document.getElementById("joinBtn").onclick = () => {
    const code = document.getElementById("joinInput").value.trim().toUpperCase();
    if (code !== "") {
        roomCode = code; // remember locally so moves can be emitted
        socket.emit("joinRoom", { code });
    }
};

socket.on("roomCreated", ({ code }) => {
    roomCode = code;
    document.getElementById("inviteCode").textContent = code;
    myColor = "w"; // creator will be white
    isMyTurn = true;
    console.log("Room created! You are (likely) White. Code:", code);
    render();
    // show waiting status until someone joins
    const statusEl = document.getElementById('gameStatus');
    if (statusEl) statusEl.textContent = 'Waiting';
});

// gameStart now includes which socket id is white/black so each client can set its color
socket.on("gameStart", ({ fen, white, black }) => {
    roomCode = roomCode || document.getElementById("joinInput").value.trim();
    myColor = (socket.id === white) ? 'w' : 'b';
    isMyTurn = (game.turn() === myColor);

    game.load(fen);
    console.log("Game started! Your color:", myColor);
    render();
    // show playing status
    const statusEl = document.getElementById('gameStatus');
    if (statusEl) statusEl.textContent = 'Playing';
    // update turn lights immediately
    updateTurnLights();
});

socket.on("errorMessage", (msg) => {
    alert(msg);
});

socket.on("boardUpdate", ({ fen, move }) => {
    // move object has {from, to, ...}
    lastMove = move || null;
    game.load(fen);

    render();
    isMyTurn = (game.turn() === myColor);
    console.log("Board updated. Your turn:", isMyTurn, "lastMove:", lastMove);
    // update turn indicators
    updateTurnLights();
});

socket.on("invalidMove", () => {
    alert("Invalid move!");
});

// Update visual turn indicators: p1 -> white, p2 -> black
function updateTurnLights(){
    try{
        const turn = game ? game.turn() : null; // 'w' or 'b'
        const p1 = document.getElementById('p1light');
        const p2 = document.getElementById('p2light');

        if (!p1 || !p2) return;

        if (turn === 'w'){
            p1.classList.add('active'); p1.classList.remove('inactive');
            p2.classList.remove('active'); p2.classList.add('inactive');
        } else if (turn === 'b'){
            p2.classList.add('active'); p2.classList.remove('inactive');
            p1.classList.remove('active'); p1.classList.add('inactive');
        } else {
            // no game yet
            p1.classList.remove('active'); p1.classList.add('inactive');
            p2.classList.remove('active'); p2.classList.add('inactive');
        }
    }catch(e){
        console.warn('updateTurnLights error', e);
    }
}
