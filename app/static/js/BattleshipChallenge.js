var WATER = 0;
var SHIP = 1;
var HIT_WATER = 2;
var HIT_SHIP = 3;

function BattleshipChallengeViewModel(canvas) {
    var self = this;

    self.game = new BattleshipGameViewModel(canvas);
    self.user = ko.observable();

    self.speed = ko.observable(60);
    self.movesToSkip = ko.observable(5000);
    self.skipProgress = ko.observable(0);
    self.showSkipProgress = ko.observable(false);
    self.showSetScriptAlert = ko.observable(false);
    self.showSignIn = ko.observable(false);

    self.codeMirror = CodeMirror.fromTextArea(document.getElementById('code-input'), {
        value: "function() {\nreturn [1, 1];\n}\n",
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
    self.codeMirror.setValue("function yourScript() {\n\t// Put everything in this function (inner functions allowed)" +
        "\n\t// Do not put anything outside this function" +
        "\n\t// Be sure to press Set Script each time you want to apply your changes" +
        "\n\treturn [1, 2]; \n}\n\n");

    self.codeMirror.on("change", function (cm, change) {
        if (change.origin !== 'setValue') {
            self.showSetScriptAlert(true);
        }
    });

    self.start = function() {

    };

    self.skipMoves = function() {

    };

    self.setCode = function() {

    };

    self.initialize = function() {
        self.game.initialize();
    }
}


function BattleshipGameViewModel(canvas) {
    var self = this;

    self.boardWidth = 10;
    self.boardHeight = 10;
    self.gameCanvas = new GameCanvasViewModel(canvas);
    self.gridSquareSize = self.gameCanvas.canvas.width / self.boardWidth;
    self.board = [];
    self.moves = ko.observableArray([]);
    self.hits = ko.observable(0);

    self.initialize = function() {
        self.populateBoard();
        self.drawGrid();

        self.doMove(1, 2);
        self.doMove(3, 2);
        self.doMove(4, 4);
        self.doMove(5, 5);
        self.doMove(5, 6);
        self.doMove(5, 7);
        self.doMove(5, 8);
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

    self.populateBoard = function() {
        // init board with all zeroes
        for(var i=0; i<self.boardWidth; i++) {
            self.board.push(Array.apply(null, new Array(self.boardHeight)).map(Number.prototype.valueOf, WATER));
        }

        // place a couple ships statically for now
        self.board[5][5] = 1;
        self.board[5][6] = 1;
        self.board[5][7] = 1;
        self.board[5][8] = 1;

        self.board[1][2] = 1;
        self.board[2][2] = 1;
        self.board[3][2] = 1;
    };

    self.drawGridDot = function(gridX, gridY, fillColor, borderColor) {
        var centerX = (gridX * self.gridSquareSize) - (self.gridSquareSize / 2);
        var centerY = (gridY * self.gridSquareSize) - (self.gridSquareSize / 2);
        var radius = self.gridSquareSize / 3;
        self.gameCanvas.drawCircle(centerX, centerY, radius, fillColor, borderColor);
    };

    self.doMove = function(x, y) {
        self.moves.push([x, y]);
        var target = self.board[x][y];
        if(target == WATER) {
            return self.miss(x, y);
        }
        else if(target == SHIP) {
            return self.hit(x, y);
        }
    };

    self.miss = function(x, y) {
        self.drawGridDot(x, y, 'white', '#F6F6F6');
        return false;
    };

    self.hit = function(x, y) {
        self.hits(self.hits() + 1);
        self.drawGridDot(x, y, 'red', '#F6F6F6');
        return true;
    };
}
