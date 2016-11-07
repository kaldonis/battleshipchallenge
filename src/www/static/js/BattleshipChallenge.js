var WATER = 0;
var SHIP = 1;

function BattleshipChallengeViewModel(canvas) {
    var self = this;

    self.game = new BattleshipGameViewModel(canvas);
    self.database = null;
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
    self.showLoginAlert = ko.observable(false);
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

    self.getMove = function() {
        return self.game.getMove();
    };

    self.setCode = function () {
        self.showSetScriptAlert(false);
        var code = self.codeMirror.getValue();

        if (!self.user()) {
            localStorage.setItem('code', code);
            self.showLoginAlert(true);
        } else {
            self.database.ref('users/' + self.user().uid).update({
                email: self.user().email,
                displayName: self.user().displayName,
                script: code
            });
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

    self.updateHighScore = function(score) {
        if(self.user()) {
            self.database.ref('users/' + self.user().uid).once('value').then(function(snapshot) {
                var value = snapshot.val();
                var shouldUpdate = true;
                if(value) {
                    if(value.highScore && value.highScore > score) {
                        shouldUpdate = false;
                    }
                }
                if (shouldUpdate) {
                    self.database.ref('users/' + self.user().uid).update({
                        highScore: score,
                        sortableHighScore: 0 - score
                    });
                }
            })
        }
    };

    self.gameLoop = function () {
        if (self.over() == false) {
            var gameState = backupGameState();
            var koTemp = window.ko;
            try {  // Wrapped in try-catch since getMove is user code
                var move = self.getMove();
            } finally {
                window.ko = koTemp;
                restoreGameState(gameState);
            }

            var result = self.game.doMove(move);
            if (result == 'END') {  // so hacky
                self.over(true);
                clearInterval(self.intervalTimer);
                self.updateHighScore(self.game.score());
            }
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

    self.updateCode = function(code) {
        self.code = code;
        self.codeMirror.setValue(code);
        self.game.setGetMoveFunction(code);
    };

    self.initialize = function() {
        self.game.initialize();

        if (self.user()) {
            self.database.ref('users/' + self.user().uid).once('value').then(function (snapshot) {
                var value = snapshot.val();
                if (value.script) {
                    self.updateCode(value.script);
                }
            });
        }
        else if (localStorage.getItem('code')) {
            self.updateCode(localStorage.getItem('code'));
        }
    };
}


function BattleshipGameViewModel(canvas, gridSize, numShips) {
    var self = this;

    self.boardWidth = gridSize || 10;
    self.boardHeight = gridSize || 10;
    self.numShips = numShips || 5;

    self.gameCanvas = new GameCanvasViewModel(canvas);
    self.gridSquareSize = self.gameCanvas.canvas.width / self.boardWidth;
    self.board = [];
    self.ships = [];
    self.moves = ko.observableArray([]);
    self.hits = ko.observable(0);
    self.score = ko.computed(function() {
        return self.moves().length == 0 ? 0 : parseInt(self.hits() * 50 - (self.moves().length * 5));
    });
    self.code = null;

    self.initialize = function() {
        self.gameCanvas.drawMessage('PRESS START');
    };

    self.start = function(ships) {
        self.moves([]);
        self.hits(0);
        self.gameCanvas.clear();
        self.populateBoard(ships);
        self.drawGrid();
        self.sandbox = new BattleshipGameSandbox({
            getBoardWidth: function() { return self.boardWidth; },
            getBoardHeight: function() { return self.boardHeight; },
            getMoves: function() { return self.moves() },
            getBoard: self.getBoard,
            getShips: self.getShips
        });
        self.setGetMoveFunction(self.code);
    };

    self.gameWon = function() {
        self.gameOver();
        //self.gameCanvas.drawMessage('SCORE: ' + self.score());
    };

    self.gameOver = function() {
        self.gameCanvas.drawMessage('GAME OVER');
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

    self.animateTileHit = function(tile) {
        if(tile.type == SHIP) {
            self.drawGridDot(tile.x, tile.y, 'red', '#F6F6F6')
        }
        else if(tile.type == WATER) {
            self.drawGridDot(tile.x, tile.y, 'white', '#F6F6F6')
        }
    };

    self.placeShip = function(shipCoords) {
        var ship = new Ship(shipCoords);
        self.ships.push(ship);
        ship.parts.forEach(function(part) {
            self.board[part.y][part.x] = part;
        });
        self.drawShip(ship);
    };

    self.createAndPlaceShips = function() {
        var shipSizes = [2, 3, 3, 4, 5];

        for (var i=0; i<self.numShips; i++) {
            do {
                // start with a random coordinate
                var x = Math.floor(Math.random() * self.boardWidth);
                var y = Math.floor(Math.random() * self.boardHeight);
                var direction = Math.floor(Math.random() * 4);
                var canPlace = true;
                var shipCoords = [];
                var j = null;
                if (direction == 0) {  // UP
                    for(j=y; j>y-shipSizes[i % shipSizes.length]; j--) {
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
                    for(j=x; j<x+shipSizes[i % shipSizes.length]; j++) {
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
                    for(j=y; j<y+shipSizes[i % shipSizes.length]; j++) {
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
                    for(j=x; j>x-shipSizes[i % shipSizes.length]; j--) {
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
                    self.placeShip(shipCoords);
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

    self.populateBoard = function(ships) {
        self.ships = [];

        // init board with all water
        for(var i=0; i<self.boardWidth; i++) {
            self.board[i] = [];
            for(var j=0; j<self.boardHeight; j++) {
                self.board[i].push(new Water(j, i));
            }
        }

        if(ships && ships.length > 0) {
            ships.forEach(function(ship) {
                self.placeShip(ship.locations);
            });
        }
        else {
            self.createAndPlaceShips();
        }

        for(i=0; i<self.boardWidth; i++) {
            for(j=0; j<self.boardHeight; j++) {
                (function() {
                    var tile = self.board[i][j];
                    tile.hit.subscribe(function () {
                        self.animateTileHit(tile);
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
        try {
            var x = move[0];
            var y = move[1];
        }
        catch(e) {
            console.error(e);
            self.gameOver();
            return 'END';
        }
        console.log("["+ x +", "+ y +"]");
        var target = self.board[y][x];
        if(!target) {
            console.log("Invalid move - game over.");
            self.gameWon();
            return 'END';
        }
        if(target.hit()) {
            console.log("Already hit - game over.");
            self.gameWon();
            return 'END';
        }
        self.moves.push([x, y]);
        target.hit(true);
        if(target.type == SHIP) {
            console.log('HIT');
            self.hits(self.hits() + 1);
            if (self.checkIfDone()) {
                self.gameWon();
                return 'END';
            }
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
                    isSunk: target.hit() && target.type == SHIP ? target.ship.isDestroyed() : false,
                    x: x,
                    y: y
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

    self.getMove = function() {
        return self.sandbox.getMove();
    };

    self.setGetMoveFunction = function(code) {
        self.code = code;
        return self.sandbox.setGetMoveFunction(code);
    };
}


function BattleshipGameSandbox(api) {
    var self = this;

    $.each(api, function(key, value) {
        self[key] = value;
    });

    self.getMove = function() {};
    self.setGetMoveFunction = function(code) {
        return eval('self.getMove = ' + code + ';');
    };
}


function Ship(locations) {
    var self = this;
    self.size = locations.length;
    self.locations = locations;
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
