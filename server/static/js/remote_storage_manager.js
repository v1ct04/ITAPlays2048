var MemoryStorageManager = function() {
  this.gameState = null;
  this.bestScore = 0;
};

MemoryStorageManager.prototype = {
  getBestScore: function() {return this.bestScore;},
  setBestScore: function(score) {this.bestScore = score;},
  getGameState: function() {return this.gameState;},
  setGameState: function(state) {this.gameState = state;},
  clearGameState: function() {this.gameState = null;}
}