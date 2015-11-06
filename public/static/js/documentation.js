function DocumentationViewModel() {
    var self = this;
    self.user = ko.observable(Parse.User.current());

    self.login = function () {
        login(function() { self.user(Parse.User.current()); });
    };

    self.logout = function () {
        logout();
        self.user(undefined);
    };
}
