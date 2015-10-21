var fs    = require('fs');
var path  = require('path');
var vm    = require('vm');

var jsdir = path.join(__dirname, '..', 'static', 'js');
var sandbox = vm.createContext();

function execFile(filename, sandbox) {
  var filepath = path.join(jsdir, filename);
  var code = fs.readFileSync(filepath).toString();
  vm.runInContext(code, sandbox);
}

execFile('tile.js', sandbox);
execFile('grid.js', sandbox);
execFile('game_manager.js', sandbox);

exports.Tile = sandbox.Tile;

var oldInsertTile = sandbox.Grid.prototype.insertTile;
sandbox.Grid.prototype.insertTile = function(tile) {
  oldInsertTile.apply(this, arguments);
  this.lastInsertedTile = tile;
}
exports.Grid = sandbox.Grid;

function createDummyClass() {
  var dummyClass = function(){};
  for (var i = 0; i < arguments.length; i++) {
    dummyClass.prototype[arguments[i]] = function(){};
  }
  return dummyClass;
}

exports.DummyInputManager = createDummyClass('on');
exports.DummyActuator = createDummyClass('actuate', 'continueGame');
exports.DummyStorageManager = createDummyClass('getBestScore', 'setBestScore', 'getGameState', 'setGameState', 'clearGameState');

// Add default arguments to GameManager constructor
function GameManager(size, InputManager, Actuator, StorageManager) {
  sandbox.GameManager.call(this, size, 
                                 InputManager || exports.DummyInputManager, 
                                 Actuator || exports.DummyActuator, 
                                 StorageManager || exports.DummyStorageManager);
}
GameManager.prototype = Object.create(sandbox.GameManager.prototype);
GameManager.prototype.constructor = GameManager;

exports.GameManager = GameManager;

exports.Direction = Object.freeze({
  UP: 0,
  RIGHT: 1,
  DOWN: 2,
  LEFT: 3
});
