var requestAnimationFrame = window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame;


function GameViewModel(canvas) {
    var self = this;
    self.canvas = canvas;
    self.context = canvas.getContext("2d");
    self.square_size = self.canvas.width / BOARD_WIDTH;
    self.snake_color = "rgba(204, 204, 153, 0.8)";
    self.food_color = "rgba(255, 255, 255, 0.8)";
    self.message = ko.observable('CLICK START');
    self.skipProgress = ko.observable(0);
    self.displayName = ko.observable(undefined);
    self.data = undefined;

    self.eaten = ko.observable(0);
    self.moves = ko.observable(0);
    self.score = ko.computed(function () {
        return self.eaten() + (self.eaten() / self.moves());
    });

    self.over = ko.observable(true);

    // Snake
    self.head_x = ko.observable(BOARD_WIDTH / 2);
    self.head_y = ko.observable(BOARD_HEIGHT / 2);
    self.head = ko.computed(function () {
        return self.head_x() + ', ' + self.head_y();
    });
    self.direction = ko.observable(LEFT);
    self.snake_sections = ko.observableArray([]);
    for (var i = self.head_x() + 5; i >= self.head_x(); i--) {
        self.snake_sections.push(i + ',' + self.head_y());
    }
    self.length = ko.computed(function () {
        return self.snake_sections().length;
    });
    self.percentComplete = ko.computed(function () {
        return (self.snake_sections().length / BOARD_SIZE) * 100;
    });

    // Food
    self.food_x = ko.observable(undefined);
    self.food_y = ko.observable(undefined);
    self.food = ko.computed(function () {
        return self.food_x() + ', ' + self.food_y();
    });

    self.setCode = function (code) {
        self.worker.postMessage({CODE: code});
    };

    self.setSpeed = function(speed) {
        self.worker.postMessage({SPEED: speed});
    };

    function formatLog(message) {
        if (self.displayName()) {
            message = self.displayName() + ': ' + message;
        }
        return message;
    }

    self.worker = new Worker('/static/js/background.js');
    self.worker.addEventListener('message', function (e) {
        if (e.data.EATEN !== undefined) {
            self.data = e.data;
        }
        if (e.data.SKIP_PROGRESS !== undefined) {
            self.skipProgress(e.data.SKIP_PROGRESS);
        }
        if (e.data.LOG !== undefined) {
            console.log(formatLog(e.data.LOG));
        }
        if (e.data.ERROR !== undefined) {
            console.error(formatLog(e.data.ERROR));
        }
        if (e.data.WARN !== undefined) {
            console.warn(formatLog(e.data.WARN));
        }
        if (e.data.DEBUG !== undefined) {
            console.debug(formatLog(e.data.DEBUG));
        }
    }, false);
    self.worker.addEventListener('error', function (e) {
        console.error(formatLog(e.message));
    });

    self.start = function () {
        self.over(false);
        self.worker.postMessage(START);
    };

    function drawBox(x, y, size, color) {
        x = x * self.square_size;
        y = y * self.square_size;
        self.context.fillStyle = color;
        self.context.beginPath();
        self.context.moveTo(x, y);
        self.context.lineTo(x + size, y);
        self.context.lineTo(x + size, y + size);
        self.context.lineTo(x, y + size);
        self.context.closePath();
        self.context.fill();
    }

    function drawScore() {
        self.context.fillStyle = "rgba(204, 204, 204, 0.2)";
        self.context.font = (self.canvas.height) + 'px Impact, sans-serif';
        self.context.textAlign = 'center';
        self.context.fillText(self.eaten(), self.canvas.width / 2, self.canvas.height * 0.9, self.canvas.width);
    }

    function drawMessage() {
        if (self.message() !== undefined) {
            self.context.fillStyle = '#00F';
            self.context.strokeStyle = '#FFF';
            self.context.font = (self.canvas.height / 10) + 'px Impact';
            self.context.textAlign = 'center';
            self.context.fillText(self.message(), self.canvas.width / 2, self.canvas.height / 2);
            self.context.strokeText(self.message(), self.canvas.width / 2, self.canvas.height / 2);
        }
    }

    function resetCanvas() {
        self.context.clearRect(0, 0, self.canvas.width, self.canvas.height);
    }

    function drawSnake() {
        for (var i = 0; i < self.snake_sections().length; i++) {
            drawSection(self.snake_sections()[i].split(','));
        }
    }

    function drawSection(section) {
        drawBox(parseInt(section[0]), parseInt(section[1]), self.square_size, self.snake_color);
    }

    function drawFood() {
        drawBox(self.food_x(), self.food_y(), self.square_size, self.food_color);
    }

    self.skipMoves = function(movesToSkip) {
        self.worker.postMessage({SKIP: movesToSkip});
    };

    self.drawGame = function() {
        if (self.data !== undefined) {
            self.eaten(self.data.EATEN);
            self.moves(self.data.MOVES);
            self.over(self.data.OVER);
            var head_temp = self.data.HEAD.split(',');
            self.head_x(parseInt(head_temp[0]));
            self.head_y(parseInt(head_temp[1]));
            var food_temp = self.data.FOOD.split(',');
            self.food_x(parseInt(food_temp[0]));
            self.food_y(parseInt(food_temp[1]));
            self.snake_sections(JSON.parse(self.data.SNAKE));
            self.direction(self.data.DIRECTION);
            self.data = undefined;
        }
        resetCanvas();
        if (!self.over() || self.moves()) {
            drawScore();
            drawFood();
            drawSnake();
        }
        if (self.over()) {
            drawMessage();
        }
    };
}

function SingleGameViewModel(canvas) {
    var self = this;
    self.game = ko.observable(new GameViewModel(canvas));
    self.speed = ko.observable(60);
    self.speed.subscribe(function(value) {
        self.game().setSpeed(value);
    });
    self.movesToSkip = ko.observable(5000);
    self.skipProgress = ko.observable(0);
    self.showSkipProgress = ko.observable(false);
    self.showLoginAlert = ko.observable(false);
    self.showSetScriptAlert = ko.observable(false);
    self.timer = undefined;
    self.user = ko.observable(Parse.User.current());
    if (self.user()) {
        self.user().fetch(); // Refreshes the current user
    }

    self.code_mirror = CodeMirror.fromTextArea(document.getElementById('code-input'), {
        value: "function() {\nreturn LEFT;\n}\n",
        mode: "javascript",
        lineNumbers: true,
        gutters: ["CodeMirror-lint-markers"],
        lint: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        highlightSelectionMatches: {showToken: /\w/},
        viewportMargin: Infinity
    });

    self.code_mirror.setSize('100%', ($(document).height() - 140).toString() + 'px');
    self.code_mirror.setValue("function yourScript() {\n\t// Put everything in this function (inner functions allowed)" +
        "\n\t// Do not put anything outside this function" +
        "\n\t// Be sure to press Set Script each time you want to apply your changes" +
        "\n\treturn LEFT; // or RIGHT, UP, DOWN\n}\n\n");

    self.code_mirror.on("change", function (cm, change) {
        if (change.origin !== 'setValue') {
            self.showSetScriptAlert(true);
        }
    });

    function validateCode(code) {
        // TODO: Actually validate
        return true;
    }

    self.setCode = function () {
        self.showSetScriptAlert(false);
        var code = self.code_mirror.getValue();
        if (!validateCode(code)) {
            // TODO: Warn the user
            return;
        }

        localStorage.setItem('code', code);
        self.game().setCode(code);

        if (!Parse.User.current()) {
            self.showLoginAlert(true);
        } else {
            function saveScript(user) {
                self.user(user);
                if (user) {
                    self.showLoginAlert(false);
                } else {
                    self.showLoginAlert(true);
                    return;
                }
                user.set('script', self.code_mirror.getValue());
                user.save(null, {
                    success: function (user) {

                    },
                    error: function (user, error) {

                    }
                })
            }

            login(saveScript);
        }
    };

    self.login = function () {
        login(self.setCode);
    };

    self.logout = function() {
        logout();
        self.user(undefined);
    };

    if (localStorage.getItem('code')) {
        self.code_mirror.setValue(localStorage.getItem('code'));
        self.game().setCode(self.code_mirror.getValue());
    }

    function loop() {
        if (self.game().over()) {
            self.timer = clearTimeout(self.timer);
            if (self.game().score() > 0) {
                function saveHighScore(user) {
                    self.user(user);
                    if (user) {
                        self.showLoginAlert(false);
                    } else {
                        self.showLoginAlert(true);
                        return;
                    }

                    var currentUsersHighScore = user.get("highScore");
                    if (currentUsersHighScore === undefined || currentUsersHighScore === null) {
                        currentUsersHighScore = 0;
                    }
                    if (self.game().score() > currentUsersHighScore) {
                        compareAllTimeHighScore(self.game().score());
                        user.set("highScore", self.game().score());
                        user.set("eaten", self.game().eaten());
                        user.set("moves", self.game().moves());
                        user.save(null, {
                            success: function (user) {

                            },
                            error: function (user, error) {

                            }
                        });
                    }
                }

                // Only prompt the user to login on end of game if the login alert has not been dismissed by the user
                // (which removes it from the document)
                if (document.getElementById('login-alert')) {
                    login(saveHighScore);
                }
            }
            return;
        }
        self.timer = setTimeout(loop, 1000);
    }

    function render() {
        requestAnimationFrame(render);
        self.game().drawGame();
    }
    requestAnimationFrame(render);

    self.start = function() {
        self.game().start();
        if (!self.timer) {
            self.timer = setTimeout(function() {
                loop();
            }, 0);
        }
    };

    self.skipMoves = function () {
        self.timer = clearTimeout(self.timer);
        self.skipProgress(0);
        self.showSkipProgress(true);
        self.game().skipMoves(self.movesToSkip());
    };

    self.game().skipProgress.subscribe(function(newValue) {
        self.skipProgress(newValue);
        if (newValue >= 100) {
            self.showSkipProgress(false);
            loop();
        }
    }, false);

    function compareAllTimeHighScore(score) {
        var query = new Parse.Query(Parse.User);
        query.descending("highScore");
        query.first({
            success: function (user) {
                var highScore = user.get("highScore");
                if (score > highScore) {
                    $.pnotify({
                        type: 'success',
                        title: 'Congratulations!',
                        text: 'You set the new all-time high score!'
                    });
                    console.log('Set a new all-time high score.');
                } else {
                    $.pnotify({
                        type: 'success',
                        title: 'Congratulations!',
                        text: 'You set a new personal-best high score!'
                    });
                    console.log('Set a new personal-best high score.');
                }
            }
        });
    }
}
