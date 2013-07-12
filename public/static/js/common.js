var BOARD_WIDTH = 40;
var BOARD_HEIGHT = 30;
var BOARD_SIZE = BOARD_WIDTH * BOARD_HEIGHT;

var UP = 'up';
var LEFT = 'left';
var RIGHT = 'right';
var DOWN = 'down';

var inverseDirection = {
    'up': 'down',
    'left': 'right',
    'right': 'left',
    'down': 'up'
};

var START = 'start';
var MOVE = 'move';
var EATEN = 'eaten';
var MOVES = 'moves';
var OVER = 'over';
var SNAKE = 'snake';
var FOOD = 'food';
var CODE = 'code';
var SKIP = 'skip';
var SKIP_PROGRESS = 'skip_progress';
