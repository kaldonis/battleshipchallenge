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
    self.numGames = ko.observable(5);
    self.shipLayouts = [];

    self.ships = [];
    self.gameOver = ko.observable(true);

    self.start = function() {
        self.shipLayouts = [];
        if(self.users().length > 0) {
            // generate as many ship layouts as we're gonna need
            var firstUser = self.users()[0];
            for(var i=0; i<self.numGames(); i++) {
                firstUser.start();
                self.shipLayouts.push(firstUser.game().ships);
            }

            ko.utils.arrayForEach(self.users(), function (user) {
                user.start(self.shipLayouts[0]);
            });
            self.gameOver(false);
            self.setIntervalTimer();
        }
    };

    self.setIntervalTimer = function() {
        if (self.intervalTimer) {
            clearInterval(self.intervalTimer);
            self.intervalTimer = undefined;
        }
        self.intervalTimer = setInterval(self.gameLoop, 1000 / self.speed());
    };

    self.gameLoop = function() {
        var allGamesOver = true;
        var koTemp = window.ko;
        self.users().forEach(function(user) {
            if (user.gameOver() == false) {
                allGamesOver = false;
                window.ko = undefined;
                try {
                    var move = user.game().getMove();
                    user.doMove(move);
                }
                catch(e) {
                    console.error(e);
                    user.game().gameOver();
                }
                finally {
                    window.ko = koTemp;
                }
            }
            else {
                if (user.gameNumber() < self.numGames() - 1) {
                    // start the next game
                    allGamesOver = false;
                    user.gameNumber(user.gameNumber() + 1);
                    user.score(user.score() + user.currentGameScore());
                    user.start(self.shipLayouts[user.gameNumber()]);
                }
            }
        });
        window.ko = koTemp;
        self.gameOver(allGamesOver);

        self.sortByScore();
    };

    self.sortByScore = function() {
        $('#game-boards li').snapshotStyles();
        self.users.sort(function (a, b) {
            return a.totalScore() >= b.totalScore() ? -1 : 1;
        });
        $('#game-boards li').releaseSnapshot();
    };

    self.initialize = function() {
        self.database.ref('/users').once('value').then(function(snapshot) {
            var users = snapshot.val();
            $.each(users, function(uid, user) {
                var multiplayerUser = new BattleshipMultiplayerUserViewModel(user, self.users().length);
                self.users.push(multiplayerUser);
            });
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
    self.gameNumber = ko.observable(0);

    self.score = ko.observable(0);
    self.currentGameScore = ko.computed(function() {
        return self.game() ? self.game().score() : 0;
    });

    self.totalScore = ko.computed(function() {
        return self.score() + self.currentGameScore();
    });

    self.initialized = false;
    self.gameOver = ko.observable(true);

    self.start = function(ships) {
        self.game().start(ships);
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
