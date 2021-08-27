document.querySelector('#sign-out').addEventListener('click', function () {
    chrome.runtime.sendMessage({ message: 'logout' }, function (response) {
        if (response === 'success') window.close();
    });
});
chrome.storage.sync.get(['username'], function (result) {
    document.getElementById("header").innerHTML = "Logget inn som " + result.username;
});
