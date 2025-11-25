// AI Opponent using Minimax with Alpha-Beta Pruning
import { BLACK, WHITE, EMPTY } from './game.js';

export class OthelloAI {
    constructor(depth = 4) {
        this.depth = depth;
        this.nodesEvaluated = 0;
        
        // Position weights - corners are most valuable
        this.positionWeights = [
            [100, -20, 10,  5,  5, 10, -20, 100],
            [-20, -50, -2, -2, -2, -2, -50, -20],
            [ 10,  -2,  1,  1,  1,  1,  -2,  10],
            [  5,  -2,  1,  0,  0,  1,  -2,   5],
            [  5,  -2,  1,  0,  0,  1,  -2,   5],
            [ 10,  -2,  1,  1,  1,  1,  -2,  10],
            [-20, -50, -2, -2, -2, -2, -50, -20],
            [100, -20, 10,  5,  5, 10, -20, 100]
        ];
    }

    async getMove(game) {
        this.nodesEvaluated = 0;
        const validMoves = game.getValidMoves();
        
        if (validMoves.length === 0) return null;
        if (validMoves.length === 1) return validMoves[0];
        
        // Add a small delay to make the AI feel more natural
        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));
        
        let bestMove = validMoves[0];
        let bestScore = -Infinity;
        const alpha = -Infinity;
        const beta = Infinity;
        
        for (const move of validMoves) {
            const gameCopy = game.clone();
            gameCopy.makeMove(move.row, move.col);
            
            const score = this.minimax(gameCopy, this.depth - 1, alpha, beta, false, WHITE);
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        return bestMove;
    }

    minimax(game, depth, alpha, beta, isMaximizing, aiPlayer) {
        this.nodesEvaluated++;
        
        if (depth === 0 || game.isGameOver()) {
            return this.evaluate(game, aiPlayer);
        }
        
        const validMoves = game.getValidMoves();
        
        if (validMoves.length === 0) {
            // Pass turn
            return this.evaluate(game, aiPlayer);
        }
        
        if (isMaximizing) {
            let maxScore = -Infinity;
            
            for (const move of validMoves) {
                const gameCopy = game.clone();
                gameCopy.makeMove(move.row, move.col);
                
                const score = this.minimax(gameCopy, depth - 1, alpha, beta, false, aiPlayer);
                maxScore = Math.max(maxScore, score);
                alpha = Math.max(alpha, score);
                
                if (beta <= alpha) break; // Alpha-beta pruning
            }
            
            return maxScore;
        } else {
            let minScore = Infinity;
            
            for (const move of validMoves) {
                const gameCopy = game.clone();
                gameCopy.makeMove(move.row, move.col);
                
                const score = this.minimax(gameCopy, depth - 1, alpha, beta, true, aiPlayer);
                minScore = Math.min(minScore, score);
                beta = Math.min(beta, score);
                
                if (beta <= alpha) break; // Alpha-beta pruning
            }
            
            return minScore;
        }
    }

    evaluate(game, aiPlayer) {
        const humanPlayer = aiPlayer === WHITE ? BLACK : WHITE;
        const score = game.getScore();
        const board = game.getBoard();
        
        // Game over - prioritize winning
        if (game.isGameOver()) {
            const winner = game.getWinner();
            if (winner === aiPlayer) return 10000;
            if (winner === humanPlayer) return -10000;
            return 0; // Tie
        }
        
        let evaluation = 0;
        
        // 1. Disc count difference (late game importance)
        const totalDiscs = score.black + score.white;
        const discWeight = totalDiscs > 50 ? 10 : 1;
        const aiDiscs = aiPlayer === WHITE ? score.white : score.black;
        const humanDiscs = aiPlayer === WHITE ? score.black : score.white;
        evaluation += (aiDiscs - humanDiscs) * discWeight;
        
        // 2. Position-based evaluation
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (board[row][col] === aiPlayer) {
                    evaluation += this.positionWeights[row][col];
                } else if (board[row][col] === humanPlayer) {
                    evaluation -= this.positionWeights[row][col];
                }
            }
        }
        
        // 3. Mobility (number of valid moves)
        const aiMoves = game.findValidMoves(aiPlayer).length;
        const humanMoves = game.findValidMoves(humanPlayer).length;
        evaluation += (aiMoves - humanMoves) * 5;
        
        // 4. Corner occupancy
        const corners = [[0, 0], [0, 7], [7, 0], [7, 7]];
        for (const [row, col] of corners) {
            if (board[row][col] === aiPlayer) evaluation += 50;
            else if (board[row][col] === humanPlayer) evaluation -= 50;
        }
        
        // 5. Edge stability
        evaluation += this.evaluateEdges(board, aiPlayer, humanPlayer);
        
        return evaluation;
    }

    evaluateEdges(board, aiPlayer, humanPlayer) {
        let score = 0;
        const edges = [
            // Top edge
            [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7]],
            // Bottom edge
            [[7, 0], [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6], [7, 7]],
            // Left edge
            [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0]],
            // Right edge
            [[0, 7], [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7], [7, 7]]
        ];
        
        for (const edge of edges) {
            for (const [row, col] of edge) {
                if (board[row][col] === aiPlayer) score += 2;
                else if (board[row][col] === humanPlayer) score -= 2;
            }
        }
        
        return score;
    }
}

