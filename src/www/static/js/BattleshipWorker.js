console = {
    log: function(message) {postMessage({LOG: message})},
    error: function(message) {postMessage({ERROR: message})},
    warn: function(message) {postMessage({WARN: message})},
    debug: function(message) {postMessage({DEBUG: message})}
};


function BattleshipWorker() {
    var self = this;

    self.boardHeight = undefined;
    self.boardWidth = undefined;
    self.moves = [];
    self.board = [];
    self.ships = [];

    self.getMove = function() {
        postMessage({MOVE: self.sandbox.getMove()});
    };

    self.setGetMoveFunction = function(code) {
        self.sandbox.setGetMoveFunction(code);
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

    self.sandbox = new BattleshipSandbox({
        getBoardWidth: function() { return self.boardWidth; },
        getBoardHeight: function() { return self.boardHeight; },
        getMoves: function() { return self.moves() },
        getBoard: self.getBoard,
        getShips: self.getShips
    });
}


function BattleshipSandbox(api) {
    var self = this;

    $.each(api, function(key, value) {
        self[key] = value;
    });

    self.getMove = function() {};
    self.setGetMoveFunction = function(code) {
        eval('self.getMove = ' + code + ';');
    };
}


self.game = new BattleshipWorker();

self.addEventListener('message', function(e) {
    if (e.data.BOARD != undefined) {
        self.game.board = e.data.BOARD;
    }
    if (e.data.SHIPS != undefined) {
        self.game.ships = e.data.SHIPS;
    }
    if (e.data.BOARD_WIDTH != undefined) {
        self.game.boardWidth = e.data.BOARD_WIDTH;
    }
    if (e.data.BOARD_HEIGHT != undefined) {
        self.game.boardHeight = e.data.BOARD_HEIGHT;
    }
    if (e.data.CODE != undefined) {
        self.game.setGetMoveFunction(e.data.CODE);
    }
}, false);
