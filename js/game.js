// Othello Game Logic
export const BLACK = 1;
export const WHITE = 2;
export const EMPTY = 0;

export class OthelloGame {
    constructor() {
        this.board = [];
        this.currentPlayer = BLACK;
        this.gameOver = false;
        this.winner = null;
        this.lastMove = null;
        this.flippedDiscs = [];
        this.validMoves = [];
        this.moveHistory = [];
        this.init();
    }

    init() {
        // Initialize 8x8 board
        this.board = Array(8).fill(null).map(() => Array(8).fill(EMPTY));
        
        // Starting position
        this.board[3][3] = WHITE;
        this.board[3][4] = BLACK;
        this.board[4][3] = BLACK;
        this.board[4][4] = WHITE;
        
        this.currentPlayer = BLACK;
        this.gameOver = false;
        this.winner = null;
        this.lastMove = null;
        this.flippedDiscs = [];
        this.moveHistory = [];
        this.updateValidMoves();
    }

    reset() {
        this.init();
    }

    getBoard() {
        return this.board;
    }

    getCurrentPlayer() {
        return this.currentPlayer;
    }

    isGameOver() {
        return this.gameOver;
    }

    getWinner() {
        return this.winner;
    }

    getScore() {
        let black = 0;
        let white = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col] === BLACK) black++;
                else if (this.board[row][col] === WHITE) white++;
            }
        }
        return { black, white };
    }

    getValidMoves() {
        return this.validMoves;
    }

    updateValidMoves() {
        this.validMoves = this.findValidMoves(this.currentPlayer);
    }

    findValidMoves(player) {
        const moves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.isValidMove(row, col, player)) {
                    moves.push({ row, col });
                }
            }
        }
        return moves;
    }

    isValidMove(row, col, player) {
        if (this.board[row][col] !== EMPTY) return false;
        
        const opponent = player === BLACK ? WHITE : BLACK;
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (const [dr, dc] of directions) {
            let r = row + dr;
            let c = col + dc;
            let foundOpponent = false;

            while (r >= 0 && r < 8 && c >= 0 && c < 8 && this.board[r][c] === opponent) {
                foundOpponent = true;
                r += dr;
                c += dc;
            }

            if (foundOpponent && r >= 0 && r < 8 && c >= 0 && c < 8 && this.board[r][c] === player) {
                return true;
            }
        }

        return false;
    }

    getFlippedDiscs(row, col, player) {
        const opponent = player === BLACK ? WHITE : BLACK;
        const flipped = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (const [dr, dc] of directions) {
            let r = row + dr;
            let c = col + dc;
            const line = [];

            while (r >= 0 && r < 8 && c >= 0 && c < 8 && this.board[r][c] === opponent) {
                line.push({ row: r, col: c });
                r += dr;
                c += dc;
            }

            if (line.length > 0 && r >= 0 && r < 8 && c >= 0 && c < 8 && this.board[r][c] === player) {
                flipped.push(...line);
            }
        }

        return flipped;
    }

    makeMove(row, col) {
        if (this.gameOver) return false;
        if (!this.isValidMove(row, col, this.currentPlayer)) return false;

        const flipped = this.getFlippedDiscs(row, col, this.currentPlayer);
        
        // Place the disc
        this.board[row][col] = this.currentPlayer;
        this.lastMove = { row, col };
        
        // Flip opponent discs
        for (const disc of flipped) {
            this.board[disc.row][disc.col] = this.currentPlayer;
        }
        
        this.flippedDiscs = flipped;
        this.moveHistory.push({
            row, col,
            player: this.currentPlayer,
            flipped: [...flipped]
        });

        // Switch player
        const opponent = this.currentPlayer === BLACK ? WHITE : BLACK;
        const opponentMoves = this.findValidMoves(opponent);
        
        if (opponentMoves.length > 0) {
            this.currentPlayer = opponent;
            this.validMoves = opponentMoves;
        } else {
            // Opponent has no moves, check if current player can move
            const currentMoves = this.findValidMoves(this.currentPlayer);
            if (currentMoves.length > 0) {
                this.validMoves = currentMoves;
                // Current player moves again
            } else {
                // Neither player can move - game over
                this.gameOver = true;
                this.determineWinner();
            }
        }

        return true;
    }

    determineWinner() {
        const score = this.getScore();
        if (score.black > score.white) {
            this.winner = BLACK;
        } else if (score.white > score.black) {
            this.winner = WHITE;
        } else {
            this.winner = null; // Tie
        }
    }

    // Clone the game state for AI
    clone() {
        const copy = new OthelloGame();
        copy.board = this.board.map(row => [...row]);
        copy.currentPlayer = this.currentPlayer;
        copy.gameOver = this.gameOver;
        copy.winner = this.winner;
        copy.validMoves = [...this.validMoves];
        return copy;
    }
}

