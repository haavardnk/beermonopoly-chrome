document.querySelector("#sign-out").addEventListener("click", function () {
  chrome.runtime.sendMessage(
    {
      message: "logout",
    },
    function (response) {
      if (response === "success") {
        window.close();
      }
    }
  );
});
chrome.storage.sync.get(["username"], function (result) {
  document.getElementById("header").innerHTML =
    "Logget inn som " + result.username;
});
Sentry.init({
  dsn: "https://72b452d00a6b4c8a820c6f122cd717a2@o985007.ingest.sentry.io/5970536",
  tracesSampleRate: 0.2,
});
