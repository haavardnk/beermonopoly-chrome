// document.querySelector("#sign-in").addEventListener("click", function () {
//   chrome.runtime.sendMessage(
//     {
//       message: "login",
//     },
//     function (response) {
//       if (response === "success") {
//         window.close();
//       }
//     }
//   );
// });
Sentry.init({
  dsn: "https://72b452d00a6b4c8a820c6f122cd717a2@o985007.ingest.sentry.io/5970536",
  tracesSampleRate: 0.2,
});
