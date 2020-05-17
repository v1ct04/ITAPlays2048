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
exports.Grid = sandbox.Grid;
exports.GameManager = sandbox.GameManager;
exports.Direction = sandbox.Direction;
