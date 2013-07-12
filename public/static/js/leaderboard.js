function LeaderboardViewModel() {
    var self = this;
    self.users = ko.observableArray([]);
    self.pageSize = ko.observable(20);
    self.user = ko.observable(Parse.User.current());

    self.login = function () {
        login(function() { self.user(Parse.User.current()); });
    };

    self.logout = function () {
        logout();
        self.user(undefined);
    };

    function getHighScores() {
        var query = new Parse.Query(Parse.User);
        query.limit(20);
        query.descending("highScore");
        query.find({
            success: function (users) {
                ko.utils.arrayForEach(users, function(user) {
                    user.name = user.attributes.displayName;
                    user.score = user.attributes.highScore || 0;
                    user.eaten = user.attributes.eaten || 0;
                    user.moves = user.attributes.moves || 0;
                    self.users.push(user);
                });
            }
        });
    }

    self.sortByScore = function () {
        self.users.sort(function (a, b) {
            return a.score <= b.score ? -1 : 1;
        });
    };

    self.gridViewModel = new ko.simpleGrid.viewModel({
        data: self.users,
        columns: [
            { headerText: "Name", rowText: "name" },
            { headerText: "Score", rowText: "score" },
            { headerText: "Food Eaten", rowText: "eaten" },
            { headerText: "# of Moves", rowText: "moves" }
        ],
        pageSize: self.pageSize(),
        checkForSuccess: function(user) {
            if (self.user() && user) {
                return user.name == self.user().get("displayName");
            }
            return false;
        }
    });

    getHighScores();
}
