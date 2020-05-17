var events = require('events');
var core   = require('./core2048.js');

var SocketInputManager = function(io) {
  this.io = io;
  this.eventEmitter = new events.EventEmitter();
  this.clientsMap = new Map();
  this.usernames = new Set();
  this.socket_callbacks = {};
}

SocketInputManager.prototype.on = function(evt, callback) {
  this.eventEmitter.on(evt, callback);
}

SocketInputManager.prototype.onJoin = function(socket) {
  this.clientsMap.set(socket.id, this.randomUsername());
  
  var callbacks = new Map();

  var self = this;
  callbacks.set('move', function(data) {
    self.onMove(socket, data);
  });
  callbacks.set('keepPlaying', function() {
    self.eventEmitter.emit('keepPlaying');
    self.io.emit('keepPlaying');
  });
  callbacks.set('restart', function() {
    self.eventEmitter.emit('restart');
  });
  callbacks.set('chatMessage', function(data) {
    self.onChatMessage(socket, data);
  });
  callbacks.set('changeUsername', function(data) {
    self.changeUsername(socket, data);
  });

  for (var entry of callbacks) {
    socket.on(entry[0], entry[1]);
  }
  this.socket_callbacks[socket.id] = callbacks;
};

SocketInputManager.prototype.onLeave = function(socket) {
  this.usernames.delete(this.clientsMap.get(socket.id));
  this.clientsMap.delete(socket.id);

  var callbacks = this.socket_callbacks[socket.id];
  for (var entry of callbacks) {
    socket.removeListener(entry[0], entry[1]);
  }
  delete this.socket_callbacks[socket.id];
};

SocketInputManager.prototype.changeUsername = function (socket, data) {
  d = JSON.parse(data);
  var msgData = null;
  if (this.usernames.has(d.username)) {
    if (d.automatic) {
      var username = this.randomUsername();
      this.usernames.add(username);
      this.clientsMap.set(socket.id, username);

      msgData = {
        msg: "Your username was already taken. Your new username is " + username,
        color: "red",
      };
      socket.emit('chatMessage', JSON.stringify(msgData));
    } else {
      msgData = {
        msg: "This username is already taken",
        color: "red",
      };
      socket.emit('chatMessage', JSON.stringify(msgData));
    }
  } else {
    this.usernames.delete(this.clientsMap.get(socket.id));
    this.usernames.add(d.username);
    msgData = {
      msg: this.clientsMap.get(socket.id) + " changed username to " + d.username,
    };
    this.clientsMap.set(socket.id, d.username);
    socket.emit('saveNickname', d.username);
    if (!d.automatic) {
      this.eventEmitter.emit('chatMessage', JSON.stringify(msgData));
    }
  }
}

SocketInputManager.prototype.getUsername = function (socket) {
  return this.clientsMap.get(socket.id);
}

SocketInputManager.prototype.randomUsername = function() {
  var max = 2 * this.clientsMap.size;
  do {
    var id = Math.round(Math.random() * max);
    var username = "guest_" + id;
  } while (this.usernames.has(username));

  this.usernames.add(username);
  return username;
}

SocketInputManager.prototype.onMove = function(socket, data) {
  var directions = [core.Direction.UP, core.Direction.LEFT, core.Direction.DOWN, core.Direction.RIGHT];
  var dir = JSON.parse(data);
  if (directions.indexOf(dir) > -1) {
    this.eventEmitter.emit('move', dir);
    var msg = null;
    switch (dir) {
      case core.Direction.UP:
        msg = "UP";
        break;
      case core.Direction.LEFT:
        msg = "LEFT";
        break;
      case core.Direction.DOWN:
        msg = "DOWN";
        break;
      case core.Direction.RIGHT:
        msg = "RIGHT";
        break;
    }
    if (msg) {
      var data = {
        msg: msg,
        username: this.clientsMap.get(socket.id),
      }
      this.eventEmitter.emit('chatMessage', JSON.stringify(data));
    }
  }
};

SocketInputManager.prototype.onChatMessage = function(socket, data) {
  var msg = JSON.parse(data);
  var trimMsg = msg.trim().toLowerCase();
  //check if the message is a move command
  switch (trimMsg) {  
    case "up":
      this.eventEmitter.emit('move', core.Direction.UP);
      break;
    case "left":
      this.eventEmitter.emit('move', core.Direction.LEFT);
      break;
    case "down":
      this.eventEmitter.emit('move', core.Direction.DOWN);
      break;
    case "right":
      this.eventEmitter.emit('move', core.Direction.RIGHT);
      break;
  }
  var msgData = {
    msg: msg,
    username: this.clientsMap.get(socket.id),
  };
  
  this.eventEmitter.emit('chatMessage', JSON.stringify(msgData));
};

var MemoryStorageManager = function(io) {
  this.gameState = null;
  this.bestScore = 0;
  this.io = io;
};

MemoryStorageManager.prototype = {
  getBestScore: function() {return this.bestScore;},
  setBestScore: function(score) {this.bestScore = score;},
  getGameState: function() {return this.gameState;},
  clearGameState: function() {this.gameState = null;}
};

MemoryStorageManager.prototype.onJoin = function(socket) {
  var data = {
    gameState: this.gameState,
    bestScore: this.bestScore,
  };
  socket.emit('gameState', JSON.stringify(data));
};

MemoryStorageManager.prototype.onLeave = function(socket) {};

MemoryStorageManager.prototype.setGameState = function(state) {
  if (this.gameState == null) {
    // this means the state has just been cleared, this will happen when the
    // game is restarted so broadcast the randomized initial state of the game
    this.io.emit('restart', JSON.stringify(state));
  }
  this.gameState = state;
};

var Actuator = function(io) {
  this.io = io;
}

Actuator.prototype.actuate = function(grid, metadata) {
  if (metadata.direction != null) {
    var data = {
        dir: metadata.direction,
        tile: metadata.addedTile.serialize()
      };
    this.io.emit('move', JSON.stringify(data));
  }
}

Actuator.prototype.continueGame = function(){}

Actuator.prototype.addChatMessage = function(data) {
  this.io.emit("chatMessage", data);
}

module.exports = function(io) {
  return {
    inputManager: SocketInputManager.bind(null, io),
    storageManager: MemoryStorageManager.bind(null, io),
    actuator: Actuator.bind(null, io)
  };
}
