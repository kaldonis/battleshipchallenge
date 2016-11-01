function BattleshipMultiplayerViewModel() {
    var self = this;

    self.user = ko.observable();
    self.database = null;
    self.users = ko.observableArray([]);

    self.speed = ko.observable(10);
    self.speed.subscribe(function() {
        if(!self.gameOver()) {
            self.setIntervalTimer();
        }
    });

    self.gameOver = ko.observable(true);

    self.start = function() {
        self.gameOver(false);
        ko.utils.arrayForEach(self.users(), function(user) {
            user.start();
        });
        self.setIntervalTimer();
    };

    self.setIntervalTimer = function() {
        if (self.intervalTimer) {
            clearInterval(self.intervalTimer);
            self.intervalTimer = undefined;
        }
        self.intervalTimer = setInterval(self.gameLoop, 1000 / self.speed());
    };

    self.gameLoop = function() {
        var gameOver = true;
        self.users().forEach(function(user) {
            if (user.gameOver() == false) {
                gameOver = false;
                try {
                    var move = user.game().getMove();
                }
                catch(e) {
                    console.error(e);
                }
                user.doMove(move);
            }
        });
        self.gameOver(gameOver);

        self.sortByScore();
    };

    self.sortByScore = function() {
        $('#game-boards li').snapshotStyles();
        self.users.sort(function (a, b) {
            return a.game().score() >= b.game().score() ? -1 : 1;
        });
        $('#game-boards li').releaseSnapshot();
    };

    self.initialize = function() {
        self.database.ref('/users').on('child_added', function(snapshot) {
            var user = snapshot.val();
            var multiplayerUser = new BattleshipMultiplayerUserViewModel(user, self.users().length);
            self.users.push(multiplayerUser);
        });

        // Workaround for Webkit bug: force scroll height to be recomputed after the transition ends, not only when it starts
        $('#game-boards').on("webkitTransitionEnd", function () {
            $(this).hide().offset();
            $(this).show();
        });
        var gameBoardsWidth = $('#game-boards').width();
        var columns = Math.floor(gameBoardsWidth / 334);
        function createListStyles(rulePattern, rows, cols) {
            var rules = [], index = 0;
            for (var rowIndex = 0; rowIndex < rows; rowIndex++) {
                for (var colIndex = 0; colIndex < cols; colIndex++) {
                    var x = (colIndex * 100) + "%",
                        y = (rowIndex * 100) + "%",
                        transforms = "{ -webkit-transform: translate3d(" + x + ", " + y + ", 0); transform: translate3d(" + x + ", " + y + ", 0); }";
                    rules.push(rulePattern.replace("{0}", ++index) + transforms);
                }
            }
            var headElem = document.getElementsByTagName("head")[0],
                styleElem = $("<style>").attr("type", "text/css").appendTo(headElem)[0];
            if (styleElem.styleSheet) {
                styleElem.styleSheet.cssText = rules.join("\n");
            } else {
                styleElem.textContent = rules.join("\n");
            }
        }

        createListStyles("#game-boards li:nth-child({0})", 8, columns);

        // Snapshotting utils
        (function () {
            var stylesToSnapshot = ["transform", "-webkit-transform"];

            $.fn.snapshotStyles = function () {
                if (window.getComputedStyle) {
                    $(this).each(function () {
                        for (var i = 0; i < stylesToSnapshot.length; i++)
                            this.style[stylesToSnapshot[i]] = getComputedStyle(this)[stylesToSnapshot[i]];
                    });
                }
                return this;
            };

            $.fn.releaseSnapshot = function () {
                $(this).each(function () {
                    this.offsetHeight; // Force position to be recomputed before transition starts
                    for (var i = 0; i < stylesToSnapshot.length; i++)
                        this.style[stylesToSnapshot[i]] = "";
                });
            };
        })();
    };
}

function BattleshipMultiplayerUserViewModel(user, index) {
    var self = this;

    self.game = ko.observable();
    self.boardId = ko.observable('board' + index);
    self.user = ko.observable(user);
    self.name = self.user().displayName;
    self.score = ko.computed(function() {
        return self.game() ? self.game().score() : 0;
    });
    self.initialized = false;
    self.gameOver = ko.observable(true);

    self.start = function() {
        self.game().start();
        self.gameOver(false);
    };

    self.doMove = function(move) {
        var result = self.game().doMove(move);
        if (result == 'END') {
            self.gameOver(true);
        }
    };

    self.initialize = function() {
        if (self.initialized) {
            return;
        }
        self.initialized = true;
        self.canvas = document.getElementById(self.boardId());
        self.game(new BattleshipGameViewModel(self.canvas));
        self.game().initialize();
        self.game().setGetMoveFunction(self.user().script);
    };
}
