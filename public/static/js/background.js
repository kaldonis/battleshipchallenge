importScripts('/static/js/common.js');

function BackgroundGameViewModel() {
    var self = this;
    self.eaten = 0;
    self.moves = 0;

    self.over = false;

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
        eval('self.getDirection = ' + code + ';');
    };

    self.start = function () {
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
    };

    function stop() {
        self.over = true;
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
        return isCollision(x, y);
    };

    function move() {
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
        if (isCollision(self.head_x, self.head_y) === true) {
            stop();
        }
    }

    function isCollision(x, y) {
        return x < 0 ||
            x > (BOARD_WIDTH - 1) ||
            y < 0 ||
            y > (BOARD_HEIGHT - 1) ||
            self.snake_sections.indexOf(x + ',' + y) >= 0;
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
                if ([UP, DOWN, LEFT, RIGHT].indexOf(new_direction) >= 0
                    && new_direction != inverseDirection[self.direction]) {
                    self.direction = new_direction;
                }
            } catch (e) {
                postMessage({'error': e.message})
            }
            restoreGameState(gameState);
            move();
        }
    };

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
        self.game.gameLoop();
        postMessage({
            EATEN: self.game.eaten,
            MOVES: self.game.moves,
            OVER: self.game.over,
            SNAKE: JSON.stringify(self.game.snake_sections),
            FOOD: self.game.food_x + ',' + self.game.food_y
        });
    }
    if (e.data.CODE != undefined) {
        self.game.setCode(e.data.CODE);
    }
    if (e.data.SKIP != undefined) {
        var movesToSkip = e.data.SKIP;
        for (var i = e.data.SKIP; i > 0; i--) {
            self.game.gameLoop();
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
    }
}, false);
