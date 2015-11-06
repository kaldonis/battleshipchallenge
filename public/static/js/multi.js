function MultiGameUserViewModel(user, index) {
    var self = this;
    self.board_id = ko.observable('board' + index);
    self.user = ko.observable(user);
    self.name = self.user().get('displayName');
    self.score = ko.observable(0);
    self.skipProgress = ko.observable(0);
    self.initialized = false;

    self.init = function() {
        if (self.initialized) {
            return;
        }
        self.initialized = true;
        self.canvas = document.getElementById(self.board_id());
        self.gameViewModel = ko.observable(new GameViewModel(self.canvas));
        self.gameViewModel().displayName(self.name);
        self.gameViewModel().setCode(self.user().get('script'));
        self.gameViewModel().score.subscribe(function(newValue) {
            self.score(newValue);
        });
        self.gameViewModel().skipProgress.subscribe(function(newValue) {
            self.skipProgress(newValue);
        });
    };
}

function MultiGameViewModel() {
    var self = this;
    self.speed = ko.observable(60);
    self.speed.subscribe(function(value) {
        ko.utils.arrayForEach(self.users(), function(user) {
            user.gameViewModel().setSpeed(value);
        });
    });
    self.movesToSkip = ko.observable(5000);
    self.skipProgress = ko.observable(0);
    self.showSkipProgress = ko.observable(false);
    self.timer = undefined;
    self.showLoginAlert = ko.observable(false);
    self.user = ko.observable(Parse.User.current());
    self.users = ko.observableArray([]);
    if (!self.user()) {
        var code = localStorage.getItem('code');
        if (code) {
            var guestUser = new Parse.User();
            guestUser.set("displayName", "Anonymous");
            guestUser.set("code");
            self.users.push(new MultiGameUserViewModel(guestUser, self.users().length));
        }
        self.showLoginAlert(true); // TODO: Implement login alert
    } else {
        self.users.push(new MultiGameUserViewModel(self.user(), self.users().length));
    }
    self.showGameBoards = ko.observable(false);

    self.start = function() {
        ko.utils.arrayForEach(self.users(), function(user) {
            user.gameViewModel().start();
        });
        if (!self.timer) {
            self.timer = setTimeout(loop, 1000);
        }
    };

    self.sortByScore = function () {
        $('#game-boards li').snapshotStyles();
        self.users.sort(function (a, b) {
            return a.score() >= b.score() ? -1 : 1;
        });
        $('#game-boards li').releaseSnapshot();
    };

    self.login = function () {
//        login(self.setCode); TODO: Set code for mutliplay when user logs in
          login(function () {
              self.user(Parse.User.current());
          });
        };

    self.logout = function () {
        logout();
        self.user(undefined);
    };

    function getOpponents() {
        var query = new Parse.Query(Parse.User);
        query.limit(8 - self.users().length);
        if (Parse.User.current()) {
            query.notEqualTo("username", Parse.User.current().get('username'));
        }
        query.descending("highScore");
        query.find({
            success: function (opponents) {
                ko.utils.arrayForEach(opponents, function(opponent){
                    self.users.push(new MultiGameUserViewModel(opponent, self.users().length));
                });
                self.showGameBoards(true);
            },
            error: function(error) {
                console.log(error);
            }
        });
    }

    getOpponents();

    self.skipMoves = function() {
        self.skipProgress(0);
        self.showSkipProgress(true);
        ko.utils.arrayForEach(self.users(), function(user) {
            user.gameViewModel().skipMoves(self.movesToSkip());
        });
    };

    function loop() {
        if (!self.showSkipProgress()) {
            self.sortByScore();
        } else {
            var skipProgress = 0;
            ko.utils.arrayForEach(self.users(), function(user) {
                skipProgress += user.skipProgress();
            });
            skipProgress = skipProgress / self.users().length;
            self.skipProgress(skipProgress);
            if (skipProgress >= 100) {
                self.showSkipProgress(false);
            }
        }
        self.timer = setTimeout(loop, 1000);
    }

    function render() {
        requestAnimationFrame(render);
        ko.utils.arrayForEach(self.users(), function(user) {
            user.gameViewModel().drawGame();
        });
    }
    requestAnimationFrame(render);

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
}

ko.bindingHandlers.fadeVisible = {
    init: function(element, valueAccessor) {
        // Initially set the element to be instantly visible/hidden depending on the value
        var value = valueAccessor();
        $(element).toggle(ko.utils.unwrapObservable(value)); // Use "unwrapObservable" so we can handle values that may or may not be observable
    },
    update: function(element, valueAccessor) {
        // Whenever the value subsequently changes, slowly fade the element in or out
        var value = valueAccessor();
        ko.utils.unwrapObservable(value) ? $(element).fadeIn() : $(element).fadeOut();
    }
};
