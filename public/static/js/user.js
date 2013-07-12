function login(callback) {
    function run_callback() {
        if (callback) {
            callback(Parse.User.current());
        }
    }

    if (Parse.User.current()) {
        run_callback();
    } else {
        Parse.FacebookUtils.logIn(null, {
            success: function (user) {
                // If it's a new user, let's fetch their name from FB
                if (!user.existed()) {
                    // We make a graph request
                    FB.api('/me', function (response) {
                        if (!response.error) {
                            // We save the data on the Parse user
                            user.set("displayName", response.name);
                            user.save(null, {
                                success: function (user) {
                                    run_callback();
                                },
                                error: function (user, error) {
                                    console.log("Error saving displayName: " + error);
                                }
                            });
                        } else {
                            console.log("Error with facebook graph request: " + response.error);
                        }
                    });
                } else {
                    // TODO: Load the code into the editor? Set local storage? Provide a load saved button?
                    run_callback();
                }
            },
            error: function (user, error) {
                console.log("Error logging into facebook: " + error);
            }
        });
    }
}

function logout() {
    Parse.User.logOut();
    // TODO: Clear the local storage?
}
