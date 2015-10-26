var oldAddRandomTile = GameManager.prototype.addRandomTile; 
GameManager.prototype.addRandomTile = function() {
  if (this.tileToAdd) {
    this.grid.insertTile(this.tileToAdd);
    this.tileToAdd = null;
  } else {
    oldAddRandomTile.apply(this, arguments);
  }
}
var oldMove = GameManager.prototype.move;
GameManager.prototype.move = function(dir, randomTile) {
  if (randomTile) this.tileToAdd = randomTile;
  oldMove.apply(this, arguments);
}

var oldRestart = GameManager.prototype.restart;
GameManager.prototype.restart = function (gameState) {
  if (gameState) {
    this.storageManager.setGameState(gameState);
  } else {
    this.storageManager.clearGameState();
  }
  this.actuator.continueGame(); // Clear the game won/lost message
  this.setup();
};

var socket = io();

var remoteStorage = new RemoteStorageManager(socket);
remoteStorage.onReady(function(s) {
  var InputManager = RemoteInputManager.bind(null, socket);
  var StorageManager = MemoryStorageManager.bind(null, s.getGameState(), s.getBestScore());
  
  // Wait till the browser is ready to render the game (avoids glitches)
  window.requestAnimationFrame(function() {
    new GameManager(4, InputManager, HTMLActuator, StorageManager);

    var keyboardInput = new KeyboardInputManager();
    keyboardInput.on('move', function(dir) {
      socket.emit('move', JSON.stringify(dir));
    });
    keyboardInput.on('restart', function() {
      socket.emit('restart');
    });
    keyboardInput.on('keepPlaying', function() {
      socket.emit('keepPlaying');
    });
    keyboardInput.on('chatMessage', function(msg) {
      socket.emit('chatMessage', msg);
    });
  })
});
