var socket = io();

var InputManager = RemoteInputManager.bind(null, socket);
var StorageManager = MemoryStorageManager.bind(null);
var gameManager = new GameManager(4, InputManager, HTMLActuator, StorageManager);
var keyboardInput = new KeyboardInputManager(socket);

socket.on('gameState', function(data) {
  var d = JSON.parse(data);
  // Wait till the browser is ready to render the game (avoids glitches)
  window.requestAnimationFrame(function() {
    gameManager.storageManager.setBestScore(d.bestScore);
    gameManager.restart(d.gameState);
    if (windowStorage().getItem("nickname")) {
      var data = {
        username: windowStorage().getItem("nickname"),
        automatic: true,
      };
      socket.emit('changeUsername', JSON.stringify(data));
    }
  })
});