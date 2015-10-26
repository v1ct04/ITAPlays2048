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
var clientsMap = new Map();
var usernames = new Set();
var restarted = false;
SocketInputManager.prototype.listen = function(io) {
  var self = this;
  io.on('connection', function(socket) {
    clientsMap.set(socket.id, generateRandomUsername());
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
    });
    socket.on('chatMessage', function(data){
      self.onChatMessage(socket, data);
    });
    socket.on('disconnect', function(){
      usernames.delete(clientsMap.get(socket.id));
      clientsMap.delete(socket.id);
    });
  });
};

function changeUsername(socket, newUsername) {
  usernames.delete(clientsMap.get(socket.id));
  usernames.add(newUsername);
  clientsMap.set(socket.id, newUsername);
}

function generateRandomUsername() {
  //TODO: change heuristic: max == 2 * clientsMap size
  var max = 2 * clientsMap.size;
  do {
    var id = Math.round(Math.random() * max);
    var username = "guest_" + id;
  } while (usernames.has(username));
  usernames.add(username);
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
        username: clientsMap.get(socket.id),
      }
      this.io.emit('chatMessage', JSON.stringify(data));
    }
  }
};
SocketInputManager.prototype.onChatMessage = function(socket, msg) {
  
  //check if the message is a move command
  switch (msg.toLowerCase()) {
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

  //if message is in the format "nick new_username" to change username 
  if(msg.toLowerCase().indexOf("nick") === 0) { //begins with nick
    var strArray = msg.split(" ");
    if (strArray.length === 2) {
      var newUsername = strArray[1];
      var data = {
        msg: clientsMap.get(socket.id) + " changed username to " + newUsername,
      };
      changeUsername(socket, newUsername);
      this.io.emit('chatMessage', JSON.stringify(data));
    } 
    
  } else {
    var data = {
      msg: msg,
      username: clientsMap.get(socket.id),
    };
    this.eventEmitter.emit('chatMessage', JSON.stringify(data));  
  } 
};

var MemoryStorageManager = function(io) {
  this.gameState = null;
  this.bestScore = 0;

  this.listen(io);
};

var gameState;
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

Actuator.prototype.actuate = function(grid, metadata) {
  if (metadata.direction != null) {
    var data = {
        dir: metadata.direction,
        tile: grid.lastInsertedTile.serialize()
      };
    this.io.emit('move', JSON.stringify(data));
  } 
  else if(restarted) {
    this.io.emit('restart', JSON.stringify(gameState));
  }
}

Actuator.prototype.continueGame = function(){
}

Actuator.prototype.addChatMessage = function(data) {
  this.io.emit("chatMessage", data);
}

module.exports = function(http) {
  var io = require('socket.io')(http);

  return {
    inputManager: SocketInputManager.bind(null, io),
    storageManager: MemoryStorageManager.bind(null, io),
    actuator: Actuator.bind(null, io)
  };
}
