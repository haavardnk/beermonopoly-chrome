const REDIRECT_URI = encodeURIComponent(
  "https://" + chrome.runtime.id + ".chromiumapp.org/"
);

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === "install") {
    chrome.tabs.create({
      url: "https://beermonopoly.com/onboarding/",
    });
  }
});

chrome.storage.sync.get(
  {
    user_signed_in: false,
  },
  function (result) {
    if (result.user_signed_in === true) {
      chrome.action.setPopup({
        popup: "src/popup/popup-signed-in.html",
      });
    } else {
      chrome.action.setPopup({
        popup: "src/popup/popup.html",
      });
    }
  }
);

function isUserSignedIn() {
  chrome.storage.sync.get(
    {
      user_signed_in: false,
    },
    async function (result) {
      return await result.user_signed_in;
    }
  );
}

async function getUntappdUsername(untappd_token) {
  let response = await fetch(
    `https://api.untappd.com/v4/user/info/?access_token=${untappd_token}`,
    {
      headers: {
        "User-Agent": "chrome-extension:Beermonopoly",
      },
    }
  );
  return response.json();
}

async function apiAuth(untappd_token) {
  let json = {
    access_token: untappd_token,
  };
  let response = await fetch(
    `https://api.beermonopoly.com/auth/untappd/?access_token=${untappd_token}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(json),
    }
  );
  let data = response.json();
  return data;
}

function getParameterByName(name, url) {
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
  if (!results) { return null; }
  if (!results[2]) { return ""; }
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "login") {
    // get api credentials
    chrome.identity.launchWebAuthFlow(
      {
        url: `https://auth.beermonopoly.com/connect/untappd?callback=${REDIRECT_URI}`,
        interactive: true,
      },
      function (redirect_url) {
        if (chrome.runtime.lastError) {
          // problem signing in
          console.log("There was a problem with Untappd Oauth");
        } else {
          // untappd redirect recieved
          let untappd_token = getParameterByName("access_token", redirect_url);

          apiAuth(untappd_token).then(function (data) {
            // sign in to API success, save tokens in storage
            if (data.key) {
              let api_token = data.key;

              // store information in storage
              chrome.storage.sync.set(
                {
                  api_token: api_token,
                },
                function () {
                  console.log("API Token is saved in sync storage");
                }
              );
              chrome.storage.sync.set(
                {
                  untappd_token: untappd_token,
                },
                function () {
                  console.log("Untappd Token is saved in sync storage");
                }
              );
              getUntappdUsername(untappd_token).then(function (data) {
                let username = data.response.user.user_name;
                chrome.storage.sync.set(
                  {
                    username: username,
                  },
                  function () {
                    console.log("Username is set to " + username);
                  }
                );
              });
              chrome.storage.sync.set(
                {
                  user_signed_in: true,
                },
                function () {
                  console.log("User successfully signed in");
                }
              );

              chrome.action.setPopup(
                {
                  popup: "src/popup/popup-signed-in.html",
                },
                () => {
                  sendResponse("success");
                }
              );
            } else {
              // problem with API auth
              console.log("API authorization failed.");
            }
          });
        }
      }
    );
    return true;
  } else if (request.message === "logout") {
    chrome.storage.sync.get(
      {
        api_token: null,
      },
      function (result) {
        if (result.api_token) {
          fetch("https://api.beermonopoly.com/auth/logout/", {
            method: "POST",
            headers: {
              Authorization: `Token ${result.api_token}`,
            },
          });
        }
        chrome.storage.sync.clear(() => {
          console.log("User successfully signed out");
        });
        chrome.action.setPopup(
          {
            popup: "src/popup/popup.html",
          },
          () => {
            sendResponse("success");
          }
        );
      }
    );
    return true;
  }
});
