var events = require('events');
var core   = require('./core2048.js');

var SocketInputManager = function(io) {
  this.io = io;
  this.eventEmitter = new events.EventEmitter();

  this.listen(io);
}

SocketInputManager.prototype.on = function(evt, callback) {
  this.eventEmitter.on(evt, callback);
}

var restarted = false;
SocketInputManager.prototype.listen = function(io) {
  var self = this;
  io.on('connection', function(socket) {
    socket.on('move', function(data) {
      self.onMove(socket, data);
    });
    socket.on('keepPlaying', function() {
      self.eventEmitter.emit('keepPlaying');
      self.io.emit('keepPlaying');
    });
    socket.on('restart', function() {
      restarted = true;
      self.eventEmitter.emit('restart');
    })
  });
};

var lastDir = null;
SocketInputManager.prototype.onMove = function(socket, data) {
  var directions = [core.Direction.UP, core.Direction.LEFT, core.Direction.DOWN, core.Direction.RIGHT];
  var dir = JSON.parse(data);

  if (directions.indexOf(dir) > -1) {
    lastDir = dir;
    this.eventEmitter.emit('move', dir);
  }
};

var MemoryStorageManager = function(io) {
  this.gameState = null;
  this.bestScore = 0;

  this.listen(io);
};

var gameState = null;
MemoryStorageManager.prototype = {
  getBestScore: function() {return this.bestScore;},
  setBestScore: function(score) {this.bestScore = score;},
  getGameState: function() {return this.gameState;},
  setGameState: function(state) {gameState = this.gameState = state;},
  clearGameState: function() {this.gameState = null;}
};

MemoryStorageManager.prototype.listen = function(io) {
  var self = this;
  io.on('connection', function(socket) {
    socket.emit('gameState', JSON.stringify(self.gameState));
    socket.emit('bestScore', JSON.stringify(self.bestScore));
  });
};

var Actuator = function(io) {
  this.io = io;
}

Actuator.prototype.actuate = function(grid) {
  if (lastDir != null) {
    var data = {
        dir: lastDir,
        tile: grid.lastInsertedTile.serialize()
      };
    this.io.emit('move', JSON.stringify(data));
    lastDir = null;
  } else if (restarted) {
    this.io.emit('restart', JSON.stringify(gameState));
  }
}

Actuator.prototype.continueGame = function(){}

module.exports = function(http) {
  var io = require('socket.io')(http);

  return {
    inputManager: SocketInputManager.bind(null, io),
    storageManager: MemoryStorageManager.bind(null, io),
    actuator: Actuator.bind(null, io)
  };
}
