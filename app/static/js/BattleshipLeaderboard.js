function BattleshipLeaderboardViewModel() {
    var self = this;

    self.database = ko.observable();
    self.users = ko.observableArray([]);
    self.user = ko.observable();

    self.initialize = function() {
        self.database.ref('/users').orderByChild('sortableHighScore').on('child_added', function(snapshot) {
            var user = snapshot.val();
            self.users.push({
                name: user.displayName,
                score: user.highScore
            });
        });
    };

    self.gridViewModel = new ko.simpleGrid.viewModel({
        data: self.users,
        columns: [
            { headerText: "Name", rowText: "name" },
            { headerText: "Score", rowText: "score" },
        ],
        pageSize: 25
    });
}
