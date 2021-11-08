const REDIRECT_URI = encodeURIComponent('https://' + chrome.runtime.id + '.chromiumapp.org/')

chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === "install") {
        chrome.tabs.create({
            url: "https://beermonopoly.com/onboarding/"
        });
    };
});

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

async function get_api_client_info() {
    let response = await fetch('https://api.beermonopoly.com/chrome/untappd/')
    let data = response.json();
    return data;
}

async function get_untappd_token(client_id, client_secret, untappd_code) {
    let response = await fetch(`https://untappd.com/oauth/authorize/?client_id=${client_id}&client_secret=${client_secret}&response_type=code&redirect_url=${REDIRECT_URI}&code=${untappd_code}`, {
        method: 'GET',
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
            'User-Agent': 'chrome-extension:Beermonopoly',
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
        // get api credentials
        get_api_client_info().then(function (untappd_client) {
            chrome.identity.launchWebAuthFlow({
                'url': `https://untappd.com/oauth/authenticate/?client_id=${untappd_client.api_client_id}&response_type=code&redirect_url=${REDIRECT_URI}`,
                'interactive': true
            }, function (redirect_url) {
                if (chrome.runtime.lastError) {
                    // problem signing in
                } else {
                    // untappd redirect recieved
                    let untappd_code = redirect_url.substring(redirect_url.indexOf('code=') + 5);

                    get_untappd_token(untappd_client.api_client_id, untappd_client.api_client_secret, untappd_code).then(function (data) {
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
