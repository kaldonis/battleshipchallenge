importScripts('/static/js/common.js');

console = {
    log: function(message) {postMessage({LOG: message})},
    error: function(message) {postMessage({ERROR: message})},
    warn: function(message) {postMessage({WARN: message})},
    debug: function(message) {postMessage({DEBUG: message})}
};

function BackgroundGameViewModel() {
    var self = this;
    self.eaten = 0;
    self.moves = 0;
    self.user = '';
    self.code_set = false;
    self.code = undefined;
    self.over = true;
    self.speed = 60;

    // Snake
    self.head_x = BOARD_WIDTH / 2;
    self.head_y = BOARD_HEIGHT / 2;
    self.direction = LEFT;
    self.snake_sections = [];
    for (var i = self.head_x + 5; i >= self.head_x; i--) {
        self.snake_sections.push(i + ',' + self.head_y);
    }

    // Food
    self.food_x = undefined;
    self.food_y = undefined;

    self.setCode = function (code) {
        // This allows the user to provide a generic javascript function, without worrying what function to override.
        try {
            eval('self.getDirection = ' + code + ';');
            self.code = code;
            console.log('Script has been set.')
        } catch (e) {
            console.error('Set script failed: ' + e.message);
            // eval with a script that is known to be good, so that behavior is better defined
            if (self.code) {
                eval('self.getDirection = ' + self.code + ';');
                console.log('Script has been set to your last known working script.');
            }
        }
    };

    self.start = function () {
        if (self.code) {
            self.over = false;
            self.eaten = 0;
            self.moves = 0;

            self.head_x = BOARD_WIDTH / 2;
            self.head_y = BOARD_HEIGHT / 2;
            self.direction = LEFT;
            self.snake_sections = [];
            for (var i = self.head_x + 5; i >= self.head_x; i--) {
                self.snake_sections.push(i + ',' + self.head_y);
            }

            setFood();

            console.log('Starting a new game...');
        } else {
            self.over = true;
            console.error('Game could not be started because a working script has not been set.')
        }
    };

    function stop() {
        self.over = true;
        console.log('Game over.')
    }

    self.getDirection = function () {
        return LEFT;
    };

    self.peekForCollision = function (direction) {
        var x = self.head_x, y = self.head_y;
        switch (direction) {
            case UP:
                y--;
                break;
            case DOWN:
                y++;
                break;
            case LEFT:
                x--;
                break;
            case RIGHT:
                x++;
                break;
        }
        return isCollision(x, y, false);
    };

    self.compare = function(a, b) {
        if (a == b) {
            return 0;
        }
        return a > b ? 1 : -1;
    };

    self.isFoodBelow = function() {
        return self.compare(self.food_y, self.head_y) > 0;
    };

    self.isFoodAbove = function() {
        return self.compare(self.food_y, self.head_y) < 0;
    };

    self.isFoodLeft = function() {
        return self.compare(self.food_x, self.head_x) < 0;
    };

    self.isFoodRight = function() {
        return self.compare(self.food_x, self.head_x) > 0;
    };

    self.isFoodInverse = function() {
        if (self.direction == LEFT) {
            return self.isFoodRight() && self.head_y == self.food_y;
        }
        if (self.direction == RIGHT) {
            return self.isFoodLeft() && self.head_y == self.food_y;
        }
        if (self.direction == UP) {
            return self.isFoodBelow() && self.head_x == self.food_x;
        }
        if (self.direction == DOWN) {
            return self.isFoodAbove() && self.head_x == self.food_x;
        }
        return false;
    };

    self.getClockwiseDirection = function(direction) {
        switch (direction) {
            case DOWN:
                return LEFT;
            case LEFT:
                return UP;
            case UP:
                return RIGHT;
            case RIGHT:
                return DOWN;
            default:
                return LEFT;
        }
    };

    self.getCounterClockwiseDirection = function(direction) {
        switch (direction) {
            case DOWN:
                return RIGHT;
            case RIGHT:
                return UP;
            case UP:
                return LEFT;
            case LEFT:
                return DOWN;
            default:
                return LEFT;
        }
    };

    self.isCellEmpty = function(x, y) {
        if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT) {
            return false;
        }
        return self.snake_sections.indexOf(x + ',' + y) < 0;
    };

    self.isCellOccupied = function(x, y) {
        return !self.isCellEmpty(x, y);
    };

    self.getOpenCellDirections = function() {
        var valid = [];
        for (var i = 0; i < DIRECTIONS.length; i++) {
            if (!self.peekForCollision(DIRECTIONS[i])) {
                valid.push(DIRECTIONS[i]);
            }
        }
        return valid;
    }

    self.move = function() {
        switch (self.direction) {
            case UP:
                self.head_y--;
                break;
            case DOWN:
                self.head_y++;
                break;
            case LEFT:
                self.head_x--;
                break;
            case RIGHT:
                self.head_x++;
                break;
        }
        checkCollision();
        self.snake_sections.push(self.head_x + ',' + self.head_y);
        checkGrowth();
    }

    function checkCollision() {
        if (isCollision(self.head_x, self.head_y, true) === true) {
            stop();
        }
    }

    function isCollision(x, y, log) {
        var collision = true;
        if (x < 0) {
            if (log) console.log('Your snake hit the left wall.');
        } else if (x >= BOARD_WIDTH) {
            if (log) console.log('Your snake hit the right wall.');
        } else if (y < 0) {
            if (log) console.log('Your snake hit the top wall.');
        } else if (y >= BOARD_HEIGHT) {
            if (log) console.log('Your snake hit the bottom wall.');
        } else if (self.snake_sections.indexOf(x + ',' + y) >= 0) {
            if (log) console.log('Your snake ran into itself.');
        } else {
            collision = false;
        }
        return collision;
    }

    function checkGrowth() {
        if (self.head_x == self.food_x && self.head_y == self.food_y) {
            self.eaten++;
            setFood();
        } else {
            self.snake_sections.shift();
        }
        self.moves++;
    }

    function setFood() {
        var possible_locations = BOARD_SIZE - self.snake_sections.length;
        var random = Math.ceil(Math.random() * possible_locations);
        for (var y_temp = 0; y_temp < BOARD_HEIGHT; y_temp++) {
            for (var x_temp = 0; x_temp < BOARD_WIDTH; x_temp++) {
                if (self.snake_sections.indexOf(x_temp + ',' + y_temp) < 0) {
                    random--;
                    if (random == 0) {
                        self.food_x = x_temp;
                        self.food_y = y_temp;
                        return;
                    }
                }
            }
        }
    }

    self.gameLoop = function () {
        if (self.over == false) {
            var gameState = backupGameState();
            try { // Wrapped in try-catch since getDirection is user code
                var new_direction = self.getDirection();
                if ([UP, DOWN, LEFT, RIGHT].indexOf(new_direction) < 0) {
                    console.error('Your script returned an invalid direction: ' + new_direction);
                } else if (new_direction == INVERSE_DIRECTIONS[self.direction]) {
                    console.error('Your script returned an invalid (inverse) direction, current: ' + self.direction +
                        ', attempted move: ' + new_direction);
                } else {
                    self.direction = new_direction;
                }
            } finally {
                restoreGameState(gameState);
                self.move();
            }
        }
    };

    self.setIntervalTimer = function() {
        if (self.intervalTimer) {
            clearInterval(self.intervalTimer);
            self.intervalTimer = undefined;
        }
        self.intervalTimer = setInterval(self.gameLoop, 1000 / self.speed);
    };
    self.setIntervalTimer();

    setInterval(function() {
        postMessage({
            EATEN: self.eaten,
            MOVES: self.moves,
            OVER: self.over,
            SNAKE: JSON.stringify(self.snake_sections),
            FOOD: self.food_x + ',' + self.food_y,
            HEAD: self.head_x + ',' + self.head_y,
            DIRECTION: self.direction
        });
    }, 1000 / 60);

    function backupGameState() {
        var gameState = {
            eaten: self.eaten,
            moves: self.moves,
            over: self.over,
            head_x: self.head_x,
            head_y: self.head_y,
            food_x: self.food_x,
            food_y: self.food_y,
            snake_sections: self.snake_sections
        };
        return Object.freeze(gameState);
    }

    function restoreGameState(gameState) {
        self.eaten = gameState.eaten;
        self.moves = gameState.moves;
        self.over = gameState.over;
        self.head_x = gameState.head_x;
        self.head_y = gameState.head_y;
        self.food_x = gameState.food_x;
        self.food_y = gameState.food_y;
        self.snake_sections = gameState.snake_sections;
    }
}

self.game = new BackgroundGameViewModel();
self.addEventListener('message', function(e) {
    if (e.data == START) {
        self.game.start();
    }
    if (e.data == MOVE) {
        try {
            self.game.gameLoop();
        } finally {
            postMessage({
                EATEN: self.game.eaten,
                MOVES: self.game.moves,
                OVER: self.game.over,
                SNAKE: JSON.stringify(self.game.snake_sections),
                FOOD: self.game.food_x + ',' + self.game.food_y,
                HEAD: self.game.head_x + ',' + self.game.head_y,
                DIRECTION: self.game.direction
            });
        }
    }
    if (e.data.CODE != undefined) {
        self.game.setCode(e.data.CODE);
    }
    if (e.data.SKIP != undefined) {
        var movesToSkip = e.data.SKIP;
        console.log('Skipping ' + movesToSkip + ' moves...');
        for (var i = e.data.SKIP; i > 0; i--) {
            try {
                self.game.gameLoop();
            } catch (e) {
            }
            var progress = 100 - ((i / movesToSkip) * 100);
            if (i % 1000 == 0) {
                postMessage({
                    SKIP_PROGRESS: progress
                });
            }
            if (self.game.over) {
                break;
            }
        }
        postMessage({
            SKIP_PROGRESS: 100
        });
        console.log('Finished skipping moves.');
    }
    if (e.data.SPEED != undefined) {
        self.game.speed = e.data.SPEED;
        self.game.setIntervalTimer();
        console.log('Speed set to ' + e.data.SPEED);
    }
}, false);
