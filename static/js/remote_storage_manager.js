var MemoryStorageManager = function(gameState, bestScore) {
  this.gameState = gameState || null;
  this.bestScore = bestScore || 0;
};

MemoryStorageManager.prototype = {
  getBestScore: function() {return this.bestScore;},
  setBestScore: function(score) {this.bestScore = score;},
  getGameState: function() {return this.gameState;},
  setGameState: function(state) {this.gameState = state;},
  clearGameState: function() {this.gameState = null;}
}

var RemoteStorageManager = function(socket) {
  MemoryStorageManager.apply(this);

  this.receivedGameState = false;
  this.receivedBestScore = false;
  this.readyCallback = null;

  this.socket = socket;
  this.listen(socket);
};

RemoteStorageManager.prototype = Object.create(MemoryStorageManager.prototype);
RemoteStorageManager.prototype.constructor = RemoteStorageManager;

RemoteStorageManager.prototype.isReady = function() {
  return this.receivedGameState && this.receivedBestScore;
}

RemoteStorageManager.prototype.onReady = function(callback) {
  this.readyCallback = callback;
  this.checkReady();
}

RemoteStorageManager.prototype.checkReady = function() {
  if (this.isReady() && this.readyCallback) {
    this.readyCallback(this);
    this.readyCallback = null;

    this.socket.removeAllListeners('gameState');
    this.socket.removeAllListeners('bestScore');
  }
}

RemoteStorageManager.prototype.listen = function(socket) {
  var self = this;
  socket.on('gameState', function(data) {
    self.setGameState(JSON.parse(data));
    self.receivedGameState = true;
    self.checkReady();
  });
  socket.on('bestScore', function(data) {
    self.setBestScore(JSON.parse(data));
    self.receivedBestScore = true;
    self.checkReady();
  });
}
