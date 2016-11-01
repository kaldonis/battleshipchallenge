var WATER = 0;
var SHIP = 1;

function BattleshipChallengeViewModel(canvas) {
    var self = this;

    self.game = new BattleshipGameViewModel(canvas);
    self.user = ko.observable();
    self.code = null;
    self.over = ko.observable(true);

    self.speed = ko.observable(10);
    self.speed.subscribe(function() {
        self.setIntervalTimer();
    });
    self.movesToSkip = ko.observable(5000);
    self.skipProgress = ko.observable(0);
    self.showSkipProgress = ko.observable(false);
    self.showSetScriptAlert = ko.observable(false);
    self.showSignIn = ko.observable(false);

    self.lastResult = null;

    self.codeMirror = CodeMirror.fromTextArea(document.getElementById('code-input'), {
        value: "function() {\nreturn [0, 0];\n}\n",
        mode: "javascript",
        lineNumbers: true,
        gutters: ["CodeMirror-lint-markers"],
        lint: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        highlightSelectionMatches: {showToken: /\w/},
        viewportMargin: Infinity
    });

    self.codeMirror.setSize('100%', ($(document).height() - 140).toString() + 'px');
    self.codeMirror.setValue("function yourScript() {\n  // Put everything in this function (inner functions allowed)" +
        "\n  // Do not put anything outside this function" +
        "\n  // Be sure to press Set Script each time you want to apply your changes" +
        "\n  return [0, 0]; \n}\n\n");

    self.codeMirror.on("change", function (cm, change) {
        if (change.origin !== 'setValue') {
            self.showSetScriptAlert(true);
        }
    });

    self.getMove = function(lastResult) {
        return self.game.getMove(lastResult);
    };

    self.setCode = function () {
        self.showSetScriptAlert(false);
        var code = self.codeMirror.getValue();
        localStorage.setItem('code', code);

        if (!self.user()) {
            self.showLoginAlert(true);
        } else {
            // save script to firebase
        }

        // This allows the user to provide a generic javascript function, without worrying what function to override.
        try {
            self.game.setGetMoveFunction(code);
            self.code = code;
            console.log('Script has been set.')
        } catch (e) {
            console.error('Set script failed: ' + e.message);
            // eval with a script that is known to be good, so that behavior is better defined
            if (self.code) {
                self.getMove = self.game.setGetMoveFunction(self.code);
                console.log('Script has been set to your last known working script.');
            }
        }
    };

    self.gameLoop = function () {
        if (self.over() == false) {
            var gameState = backupGameState();
            try {  // Wrapped in try-catch since getMove is user code
                var move = self.getMove(self.lastResult);
            } finally {
                restoreGameState(gameState);
            }

            try {
                var result = self.game.doMove(move);
            }
            catch (e) {
                alert(e + ' - Aborting game.');
                console.error(e.stack);
                self.over(true);
                self.game.gameOver();
            }
            if (result == 'END') {
                self.over(true);  // so hacky
            }
            self.lastResult = result;
        }
    };

    function backupGameState() {
        var gameState = self.game.getState();
        return Object.freeze(gameState);
    }

    function restoreGameState(gameState) {
        self.game.setState(gameState);
    }

    self.setIntervalTimer = function() {
        if (self.intervalTimer) {
            clearInterval(self.intervalTimer);
            self.intervalTimer = undefined;
        }
        self.intervalTimer = setInterval(self.gameLoop, 1000 / self.speed());
    };

    self.start = function() {
        if(self.over() && self.code) {
            self.game.start();
            self.over(false);
            self.setIntervalTimer();
        }
    };

    self.initialize = function() {
        self.game.initialize();

        if (localStorage.getItem('code')) {
            var code = localStorage.getItem('code');
            self.code = code;
            self.codeMirror.setValue(code);
            self.game.setGetMoveFunction(code);
        }
    }
}


function BattleshipGameViewModel(canvas) {
    var self = this;

    self.boardWidth = 10;
    self.boardHeight = 10;
    self.gameCanvas = new GameCanvasViewModel(canvas);
    self.gridSquareSize = self.gameCanvas.canvas.width / self.boardWidth;
    self.board = [];
    self.ships = [];
    self.moves = ko.observableArray([]);
    self.hits = ko.observable(0);

    self.initialize = function() {
        self.gameCanvas.drawMessage('PRESS START');
    };

    self.start = function() {
        self.moves([]);
        self.hits(0);
        self.gameCanvas.clear();
        self.populateBoard();
        self.drawGrid();
    };

    self.gameOver = function() {
        self.gameCanvas.drawMessage('GAME OVER');
    };

    self.gameWon = function() {
        self.gameCanvas.drawMessage('WINNER!');
    };

    self.getState = function() {
        return {
            'board': self.board,
            'ships': self.ships,
            'moves': self.moves(),
            'hits': self.hits()
        }
    };

    self.setState = function(state) {
        self.board = state.board;
        self.ships = state.ships;
        self.moves(state.moves);
        self.hits(state.hits);
    };

    self.drawGrid = function() {
        // vertical lines
        for(var i=1; i<self.boardHeight; i++) {
            self.gameCanvas.drawLine(i * self.gridSquareSize, 0, i * self.gridSquareSize, self.gameCanvas.canvas.width, 1, "#FFFFFF");
        }
        // horizontal lines
        for(i=1; i<self.boardWidth; i++) {
            self.gameCanvas.drawLine(0, i * self.gridSquareSize, self.gameCanvas.canvas.height, i * self.gridSquareSize, 1, "#FFFFFF");
        }
    };

    self.animateChange = function(tile) {
        if(tile.type == SHIP) {
            self.drawGridDot(tile.x, tile.y, 'red', '#F6F6F6')
        }
        else if(tile.type == WATER) {
            self.drawGridDot(tile.x, tile.y, 'white', '#F6F6F6')
        }
    };

    self.placeShips = function() {
        var shipSizes = [2, 3, 3, 4, 5];

        for (var i=0; i<shipSizes.length; i++) {
            do {
                // start with a random coordinate
                var x = Math.floor(Math.random() * self.boardWidth);
                var y = Math.floor(Math.random() * self.boardHeight);
                var direction = Math.floor(Math.random() * 4);
                var canPlace = true;
                var shipCoords = [];
                var j = null;
                if (direction == 0) {  // UP
                    for(j=y; j>y-shipSizes[i]; j--) {
                        if(j < 0) {
                            canPlace = false;
                            break;
                        }
                        if (self.board[j][x].type != WATER) {
                            canPlace = false;
                            break;
                        }
                        shipCoords.push([x, j]);
                    }
                }
                else if(direction == 1) {  // RIGHT
                    for(j=x; j<x+shipSizes[i]; j++) {
                        if(j >= self.boardWidth) {
                            canPlace = false;
                            break;
                        }
                        if (self.board[y][j].type != WATER) {
                            canPlace = false;
                            break;
                        }
                        shipCoords.push([j, y]);
                    }
                }
                else if(direction == 2) {  // DOWN
                    for(j=y; j<y+shipSizes[i]; j++) {
                        if(j >= self.boardHeight) {
                            canPlace = false;
                            break;
                        }
                        if (self.board[j][x].type != WATER) {
                            canPlace = false;
                            break;
                        }
                        shipCoords.push([x, j]);
                    }
                }
                else if(direction == 3) {  // LEFT
                    for(j=x; j>x-shipSizes[i]; j--) {
                        if(j < 0) {
                            canPlace = false;
                            break;
                        }
                        if (self.board[y][j].type != WATER) {
                            canPlace = false;
                            break;
                        }
                        shipCoords.push([j, y]);
                    }
                }

                if (canPlace) {
                    console.log('placing ship at ' + shipCoords + ' direction ' + direction);
                    var ship = new Ship(shipCoords);
                    self.ships.push(ship);
                    ship.parts.forEach(function(part) {
                        self.board[part.y][part.x] = part;
                    });
                    self.drawShip(ship);
                    break;
                }
            }
            while (true);
        }
    };

    self.drawShip = function(ship) {
        ship.parts.forEach(function(part) {
            var gridX = part.x;
            var gridY = part.y;

            var x = gridX * self.gridSquareSize;
            var y = gridY * self.gridSquareSize;
            self.gameCanvas.drawRect(x, y, self.gridSquareSize, self.gridSquareSize, '#666666');
        });
    };

    self.populateBoard = function() {
        // init board with all water
        for(var i=0; i<self.boardWidth; i++) {
            self.board[i] = [];
            for(var j=0; j<self.boardHeight; j++) {
                self.board[i].push(new Water(j, i));
            }
        }

        self.placeShips();

        for(i=0; i<self.boardWidth; i++) {
            for(j=0; j<self.boardHeight; j++) {
                (function() {
                    var tile = self.board[i][j];
                    tile.hit.subscribe(function () {
                        self.animateChange(tile);
                    });
                })();
            }
        }
    };

    self.checkIfDone = function() {
        var isWin = true;
        self.ships.forEach(function(ship) {
            if(!ship.isDestroyed()) {
                isWin = false;
            }
        });
        return isWin;
    };

    self.drawGridDot = function(gridX, gridY, fillColor, borderColor) {
        gridX += 1;
        gridY += 1;
        var centerX = (gridX * self.gridSquareSize) - (self.gridSquareSize / 2);
        var centerY = (gridY * self.gridSquareSize) - (self.gridSquareSize / 2);
        var radius = self.gridSquareSize / 3;
        self.gameCanvas.drawCircle(centerX, centerY, radius, fillColor, borderColor);
    };

    self.doMove = function(move) {
        var x = move[0];
        var y = move[1];
        self.moves.push([x, y]);
        console.log("["+ x +", "+ y +"]");
        var target = self.board[y][x];
        if(!target) {
            console.log("Invalid move.");
            return;
        }
        if(target.hit()) {
            console.log("Already hit.");
            return;
        }
        target.hit(true);
        if(target.type == SHIP) {
            console.log('HIT');
            self.hits(self.hits() + 1);
            if (self.checkIfDone()) {
                self.gameWon();
                return 'END';
            }
            return [true, target.ship.isDestroyed()];
        }
        else {
            console.log('MISS');
        }
    };

    self.getBoard = function() {
        var board = [];
        for(var x=0; x<self.boardHeight; x++) {
            board.push([]);
            for(var y=0; y<self.boardWidth; y++) {
                var target = self.board[y][x];
                board[x].push({
                    state: !target.hit() ? 'hidden' : target.type == WATER ? 'miss' : target.ship.isDestroyed() ? 'sunk' : 'hit',
                    isHidden: !target.hit(),
                    isMiss: target.hit() && target.type == WATER,
                    isHit: target.hit() && target.type == SHIP,
                    isSunk: target.hit() && target.type == SHIP ? target.ship.isDestroyed() : false
                })
            }
        }
        return board;
    };

    self.getShips = function() {
        var ships = [];
        self.ships.forEach(function(ship) {
            ships.push({
                size: ship.size,
                isSunk: ship.isDestroyed()
            });
        });
    };

    self.sandbox = new BattleshipGameSandbox({
        getBoardWidth: function() { return self.boardWidth; },
        getBoardHeight: function() { return self.boardHeight; },
        getMoves: function() { return self.moves() },
        getBoard: self.getBoard,
        getShips: self.getShips

    });

    self.getMove = function(lastResult) {
        var hit = lastResult ? lastResult[0] : false;
        var sunk = lastResult ? lastResult[1] : false;
        return self.sandbox.getMove(hit, sunk);
    };

    self.setGetMoveFunction = function(code) {
        return self.sandbox.setGetMoveFunction(code);
    };
}


function BattleshipGameSandbox(api) {
    var self = this;

    $.each(api, function(key, value) {
        self[key] = value;
    });

    self.getMove = function(lastResult) {};
    self.setGetMoveFunction = function(code) {
        return eval('self.getMove = ' + code + ';');
    };
}


function Ship(locations) {
    var self = this;
    self.size = locations.length;
    self.parts = [];

    for(var i=0; i<self.size; i++) {
        self.parts.push(new ShipPart(self, locations[i][0], locations[i][1]));
    }

    self.isDestroyed = function() {
        var isDestroyed = true;
        self.parts.forEach(function(part) {
            if(!part.hit()) {
                isDestroyed = false;
            }
        });
        return isDestroyed;
    };
}


function ShipPart(ship, x, y) {
    var self = this;
    self.type = SHIP;
    self.x = x;
    self.y = y;
    self.ship = ship;
    self.hit = ko.observable(false);
}


function Water(x, y) {
    var self = this;
    self.type = WATER;
    self.x = x;
    self.y = y;
    self.hit = ko.observable(false);
}
