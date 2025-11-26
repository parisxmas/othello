// Main Game Controller
import { OthelloGame, BLACK, WHITE } from './game.js';
import { OthelloAI } from './ai.js';
import { GameRenderer } from './renderer.js';
import { AudioManager } from './audio.js';

class OthelloApp {
    constructor() {
        this.game = new OthelloGame();
        this.ai = new OthelloAI(4);
        this.audio = new AudioManager();
        this.renderer = null;
        
        this.playerColor = BLACK;
        this.aiColor = WHITE;
        this.isPlayerTurn = true;
        this.isProcessing = false;
        this.lastHoveredCell = null;
        
        this.init();
    }

    async init() {
        // Initialize audio (requires user interaction)
        await this.audio.init();
        
        // Initialize renderer
        const canvas = document.getElementById('game-canvas');
        this.renderer = new GameRenderer(canvas);
        
        // Setup VR if available
        this.renderer.setupVR();
        
        // Set up callbacks
        this.renderer.onCellClick = (row, col) => this.handleCellClick(row, col);
        this.renderer.onCellHover = (row, col) => this.handleCellHover(row, col);
        
        // Initial render
        this.updateUI();
        this.renderer.updateFromGameState(
            this.game.getBoard(),
            this.game.getValidMoves()
        );
        
        // Setup UI event listeners
        this.setupUIListeners();
        
        // Start render loop
        this.renderer.startRenderLoop();
        
        // Hide loading screen
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }, 1000);
    }

    setupUIListeners() {
        // New game button
        document.getElementById('new-game-btn').addEventListener('click', () => {
            this.audio.resume();
            this.audio.playClick();
            this.newGame();
        });
        
        // Play again button
        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.audio.playClick();
            this.newGame();
            document.getElementById('game-over-modal').classList.add('hidden');
        });
        
        // Sound toggle
        document.getElementById('sound-btn').addEventListener('click', () => {
            const enabled = this.audio.toggle();
            document.getElementById('sound-on-icon').classList.toggle('hidden', !enabled);
            document.getElementById('sound-off-icon').classList.toggle('hidden', enabled);
            if (enabled) {
                this.audio.playClick();
            }
        });
        
        // First touch/click initializes audio
        const initAudio = async () => {
            await this.audio.resume();
            document.removeEventListener('touchstart', initAudio);
            document.removeEventListener('click', initAudio);
        };
        document.addEventListener('touchstart', initAudio, { once: true });
        document.addEventListener('click', initAudio, { once: true });
    }

    handleCellClick(row, col) {
        if (this.isProcessing || !this.isPlayerTurn) return;
        if (this.game.isGameOver()) return;
        
        // Resume audio context on interaction
        this.audio.resume();
        
        const validMoves = this.game.getValidMoves();
        const isValidMove = validMoves.some(m => m.row === row && m.col === col);
        
        if (!isValidMove) {
            this.audio.playInvalid();
            return;
        }
        
        this.makeMove(row, col);
    }

    handleCellHover(row, col) {
        if (this.isProcessing || !this.isPlayerTurn) return;
        if (this.game.isGameOver()) return;
        
        // Clear previous hover
        if (this.lastHoveredCell) {
            this.renderer.highlightCell(this.lastHoveredCell.row, this.lastHoveredCell.col, false);
        }
        
        const validMoves = this.game.getValidMoves();
        const isValidMove = validMoves.some(m => m.row === row && m.col === col);
        
        if (isValidMove) {
            this.renderer.highlightCell(row, col, true);
            this.lastHoveredCell = { row, col };
            
            // Subtle hover sound
            if (!this.lastHoveredCell || 
                this.lastHoveredCell.row !== row || 
                this.lastHoveredCell.col !== col) {
                // Only play if different cell
            }
        } else {
            this.lastHoveredCell = null;
        }
    }

    async makeMove(row, col) {
        this.isProcessing = true;
        
        const player = this.game.getCurrentPlayer();
        this.game.makeMove(row, col);
        
        // Play place sound
        this.audio.playPlace();
        
        // Animate disc placement
        this.renderer.placeDisc(row, col, player, true);
        
        // Animate flipped discs with staggered timing
        const flipped = this.game.flippedDiscs;
        flipped.forEach((disc, i) => {
            setTimeout(() => {
                this.audio.playFlip(0);
                this.renderer.flipDisc(disc.row, disc.col, player);
            }, 100 + i * 80);
        });
        
        // Wait for animations
        await this.wait(100 + flipped.length * 80 + 200);
        
        // Update UI
        this.updateUI();
        
        // Check game over
        if (this.game.isGameOver()) {
            this.handleGameOver();
            this.isProcessing = false;
            return;
        }
        
        // Update valid moves display
        this.renderer.updateValidMoves(this.game.getValidMoves());
        
        // Determine next turn
        const currentPlayer = this.game.getCurrentPlayer();
        
        if (currentPlayer === this.playerColor) {
            this.isPlayerTurn = true;
            this.isProcessing = false;
        } else {
            this.isPlayerTurn = false;
            await this.aiMove();
        }
    }

    async aiMove() {
        if (this.game.isGameOver()) {
            this.isProcessing = false;
            return;
        }
        
        const move = await this.ai.getMove(this.game);
        
        if (!move) {
            // AI has no valid moves, player continues
            this.isPlayerTurn = true;
            this.renderer.updateValidMoves(this.game.getValidMoves());
            this.isProcessing = false;
            return;
        }
        
        // Make AI move
        const player = this.game.getCurrentPlayer();
        this.game.makeMove(move.row, move.col);
        
        // Play sounds
        this.audio.playPlace();
        
        // Animate
        this.renderer.placeDisc(move.row, move.col, player, true);
        
        const flipped = this.game.flippedDiscs;
        flipped.forEach((disc, i) => {
            setTimeout(() => {
                this.audio.playFlip(0);
                this.renderer.flipDisc(disc.row, disc.col, player);
            }, 100 + i * 80);
        });
        
        await this.wait(100 + flipped.length * 80 + 200);
        
        this.updateUI();
        
        // Check game over
        if (this.game.isGameOver()) {
            this.handleGameOver();
            this.isProcessing = false;
            return;
        }
        
        // Update valid moves
        this.renderer.updateValidMoves(this.game.getValidMoves());
        
        // Check whose turn
        const currentPlayer = this.game.getCurrentPlayer();
        
        if (currentPlayer === this.playerColor) {
            this.isPlayerTurn = true;
            this.isProcessing = false;
        } else {
            // AI moves again (player had no moves)
            await this.aiMove();
        }
    }

    handleGameOver() {
        this.renderer.clearValidMoveIndicators();
        
        const score = this.game.getScore();
        const winner = this.game.getWinner();
        
        let winnerText = '';
        
        if (winner === this.playerColor) {
            winnerText = 'Kazandın! 🎉';
            this.audio.playWin();
        } else if (winner === this.aiColor) {
            winnerText = 'Bilgisayar Kazandı';
            this.audio.playLose();
        } else {
            winnerText = 'Berabere!';
            this.audio.playTie();
        }
        
        // Update modal
        document.getElementById('winner-text').textContent = winnerText;
        document.getElementById('final-black').textContent = score.black;
        document.getElementById('final-white').textContent = score.white;
        
        // Show modal with delay
        setTimeout(() => {
            document.getElementById('game-over-modal').classList.remove('hidden');
        }, 500);
    }

    newGame() {
        this.game.reset();
        this.renderer.clearBoard();
        
        this.isPlayerTurn = true;
        this.isProcessing = false;
        
        // Play new game sound
        this.audio.playNewGame();
        
        // Reset UI
        this.updateUI();
        
        // Place initial discs without animation
        const board = this.game.getBoard();
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (board[row][col] !== 0) {
                    this.renderer.placeDisc(row, col, board[row][col], false);
                }
            }
        }
        
        // Update valid moves
        this.renderer.updateValidMoves(this.game.getValidMoves());
    }

    updateUI() {
        const score = this.game.getScore();
        document.getElementById('black-count').textContent = score.black;
        document.getElementById('white-count').textContent = score.white;
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Start the application
window.addEventListener('DOMContentLoaded', () => {
    new OthelloApp();
});

