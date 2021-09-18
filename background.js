const CLIENT_ID = encodeURIComponent('2439C553FA0E38D8C6A337335092D2C934890E82');
const CLIENT_SECRET = encodeURIComponent('CBBA2DB04C6CC3D3309D27F3B9A8EEE75693DB92');
const REDIRECT_URI = encodeURIComponent('https://' + chrome.runtime.id + '.chromiumapp.org/')

chrome.storage.sync.get({ user_signed_in: false }, function (result) {
    if (result.user_signed_in == true) {
        chrome.action.setPopup({ popup: 'popup-signed-in.html' })
    } else {
        chrome.action.setPopup({ popup: 'popup.html' })
    }
});

function is_user_signed_in() {
    chrome.storage.sync.get({ user_signed_in: false }, async function (result) {
        return await result.user_signed_in
    });
}

function create_auth_endpoint() {
    let oauth_endpoint =
        `https://untappd.com/oauth/authenticate/?client_id=${CLIENT_ID}&response_type=code&redirect_url=${REDIRECT_URI}`;
    return oauth_endpoint;
}

function create_auth_callback(untappd_code) {
    let oauth_callback =
        `https://untappd.com/oauth/authorize/?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&response_type=code&redirect_url=${REDIRECT_URI}&code=${untappd_code}`;
    return oauth_callback;
}

async function get_untappd_token(untappd_code) {
    let response = await fetch(create_auth_callback(untappd_code), {
        method: 'GET',
        mode: 'no-cors',
        headers: {
            'User-Agent': 'chrome-extension:Beermonopoly'
        },
    })
    let data = response.json();
    return data;
}

async function get_untappd_username(untappd_token) {
    let response = await fetch(`https://api.untappd.com/v4/user/info/?access_token=${untappd_token}`, {
        headers: {
            'User-Agent': 'chrome-extension:Beermonopoly'
        },
    })
    return response.json()
}

async function api_auth(untappd_code, untappd_token) {
    let json = { access_token: untappd_token, code: untappd_code }
    let response = await fetch(`https://api.beermonopoly.com/auth/untappd/?access_token=${untappd_token}&code=${untappd_code}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(json)
    })
    let data = response.json();
    return data;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === 'login') {
        chrome.identity.launchWebAuthFlow({
            'url': create_auth_endpoint(),
            'interactive': true
        }, function (redirect_url) {
            if (chrome.runtime.lastError) {
                // problem signing in
            } else {
                // untappd redirect recieved
                let untappd_code = redirect_url.substring(redirect_url.indexOf('code=') + 5);

                get_untappd_token(untappd_code).then(function (data) {
                    if (data.meta.http_code == 200) {
                        // untappd code returned and access token received
                        let untappd_token = data.response.access_token;

                        api_auth(untappd_code, untappd_token).then(function (data) {
                            // sign in to API success, save tokens in storage
                            if (data.key) {
                                let api_token = data.key;

                                // store information in storage
                                chrome.storage.sync.set({ api_token: api_token }, function () {
                                    console.log('API Token is saved in sync storage');
                                });
                                chrome.storage.sync.set({ untappd_token: untappd_token }, function () {
                                    console.log('Untappd Token is saved in sync storage');
                                });
                                chrome.storage.sync.set({ untappd_code: untappd_code }, function () {
                                    console.log('Untappd Code is saved in sync storage');
                                });
                                get_untappd_username(untappd_token).then(function (data) {
                                    let username = data.response.user.user_name;
                                    chrome.storage.sync.set({ username: username }, function () {
                                        console.log('Username is set to ' + username);
                                    });
                                });
                                chrome.storage.sync.set({ user_signed_in: true }, function () {
                                    console.log('User successfully signed in');
                                });

                                chrome.action.setPopup({ popup: 'popup-signed-in.html' }, () => {
                                    sendResponse('success');
                                });

                            } else {
                                // problem with API auth
                                console.log("API authorization failed.");
                            };

                        });

                    } else {
                        // invalid credentials
                        console.log("Untappd authorization failed.");

                    };
                });
            };
        });

        return true;

    } else if (request.message === 'logout') {
        chrome.storage.sync.get({ api_token: null }, function (result) {
            if (result.api_token) {
                fetch(`https://api.beermonopoly.com/auth/logout/`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Token ${result.api_token}`
                    }
                });
            };
            chrome.storage.sync.clear(() => {
                console.log('User successfully signed out');
            });
            chrome.action.setPopup({ popup: 'popup.html' }, () => {
                sendResponse('success');
            });

        });
        return true;
    };
});
