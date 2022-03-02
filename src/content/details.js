async function getBeer(beer_id, api_token) {
  // Check if authenticated
  if (api_token) {
    let response = await fetch(
      "https://api.beermonopoly.com/beers/" +
        beer_id +
        "/?fields=vmp_id,ibu,style,rating,checkins,untpd_url,untpd_updated,user_checked_in,badges",
      {
        headers: {
          Authorization: `Token ${api_token}`,
        },
      }
    );
    let data = await response.json();
    return data;
  } else {
    let response = await fetch(
      "https://api.beermonopoly.com/beers/" +
        beer_id +
        "/?fields=vmp_id,ibu,style,rating,checkins,untpd_url,untpd_updated,badges"
    );
    let data = await response.json();
    return data;
  }
}

function main() {
  if (
    document
      .getElementsByClassName("product__category-name")[0]
      .innerText.includes("ØL") ||
    document
      .getElementsByClassName("product__category-name")[0]
      .innerText.includes("SIDER") ||
    document
      .getElementsByClassName("product__category-name")[0]
      .innerText.includes("MJØD")
  ) {
    // Get beer id from DOM
    let beer_id = document
      .getElementsByClassName("product__tab-list")[0]
      .getElementsByTagName("li")[1]
      .getElementsByTagName("span")[1].innerText;

    // Construct HTML
    let untappd = document.createElement("div");
    let untappd_rating = document.createElement("div");
    let user_rating = document.createElement("div");
    let logo = document.createElement("img");
    let logo_user = document.createElement("img");
    let link = document.createElement("a");
    let link_checkin = document.createElement("a");
    let updated = document.createElement("p");
    let wrong = document.createElement("a");
    let triangle = document.createElement("div");
    let checkmark = document.createElement("img");

    untappd.classList.add("untappd");
    wrong.classList.add("suggest");
    triangle.classList.add("triangle-detail");
    user_rating.classList.add("user-rating-detail");
    logo.classList.add("logo-detail");
    logo_user.classList.add("logo-detail");

    logo.src = chrome.runtime.getURL("assets/img/untappd.svg");
    logo_user.src = chrome.runtime.getURL("assets/img/user.svg");
    checkmark.src = chrome.runtime.getURL("assets/img/check-solid.svg");

    untappd.appendChild(untappd_rating);
    untappd_rating.appendChild(logo);
    untappd_rating.appendChild(link);
    untappd.appendChild(updated);
    untappd.appendChild(wrong);

    document
      .getElementsByClassName("product__layout-wrapper")[0]
      .appendChild(untappd);

    // Get beer info
    chrome.storage.sync.get(
      {
        api_token: null,
      },
      async function (result) {
        getBeer(beer_id, result.api_token).then(function (data) {
          console.log(data);
          if (
            data !== undefined &&
            data.rating !== undefined &&
            data.rating !== null
          ) {
            // Untappd rating
            untappd_rating.insertBefore(
              ratingToStars(data.rating.toPrecision(3)),
              untappd_rating.childNodes[1]
            );
            link.href = data.untpd_url;
            link.innerText =
              data.rating.toPrecision(3) +
              " (" +
              kFormatter(data.checkins) +
              ")";
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            // Updated datetime
            let date = new Date(data.untpd_updated);
            updated.innerText =
              "Oppdatert: " +
              date.toLocaleDateString("en-GB") +
              " " +
              date.toLocaleTimeString("en-GB");
            // Link to suggest untappd match
            wrong.innerText = "Feil øl?";
            // Untappd IBU for beers
            if (
              document
                .getElementsByClassName("product__category-name")[0]
                .innerText.includes("ØL")
            ) {
              ibu = document
                .getElementsByClassName("product__contents-list")[0]
                .getElementsByTagName("li")[0]
                .cloneNode((deep = true));
              ibu.firstChild.data = "Ibu";
              ibu.getElementsByTagName("span")[0].textContent = data.ibu;
              document
                .getElementsByClassName("product__contents-list")[0]
                .insertBefore(
                  ibu,
                  document.getElementsByClassName("product__contents-list")[0]
                    .childNodes[1]
                );
            }
            // Untappd style
            if (
              document
                .getElementsByClassName("product__category-name")[0]
                .innerText.includes("ØL")
            ) {
              document.getElementsByClassName(
                "product__category-name"
              )[0].textContent = "Øl - " + data.style;
              document
                .getElementsByClassName("product__tab-list")[0]
                .getElementsByTagName("li")[0]
                .getElementsByTagName("span")[1].textContent +=
                " (" + data.style + ")";
            } else {
              document.getElementsByClassName(
                "product__category-name"
              )[0].textContent += " - " + data.style.split("-")[1];
              document
                .getElementsByClassName("product__tab-list")[0]
                .getElementsByTagName("li")[0]
                .getElementsByTagName("span")[1].textContent +=
                " (" + data.style + ")";
            }

            // If beer checked in by user
            if (
              data.hasOwnProperty("user_checked_in") &&
              data.user_checked_in.length > 0
            ) {
              // User rating
              untappd.insertBefore(user_rating, untappd.childNodes[1]);
              user_rating.appendChild(logo_user);
              user_rating.appendChild(
                ratingToStars(data.user_checked_in[0].rating.toPrecision(3))
              );
              user_rating.appendChild(link_checkin);
              link_checkin.href = data.user_checked_in[0].checkin_url;
              link_checkin.innerText =
                data.user_checked_in[0].rating.toPrecision(3);
              link_checkin.target = "_blank";
              link_checkin.rel = "noopener noreferrer";
              // Checked in triangle
              triangle.appendChild(checkmark);
              document
                .getElementsByClassName("product__details--top")[0]
                .prepend(triangle);
            }

            // If beer has badges
            if (data !== undefined) {
              for (let i = 0; i < data.badges.length; i++) {
                let badges = document.createElement("div");
                let badge = document.createElement("span");

                badges.classList.add("badges");

                badge.innerText = data.badges[i].text;

                badges.appendChild(badge);
                document
                  .getElementsByClassName("product__layout-wrapper")[0]
                  .appendChild(badges);
              }
            }
          } else if (
            data.detail !== undefined &&
            data.detail === "Not found."
          ) {
            link.innerText = "Ny, oppdateres ved neste kjøring";
          } else {
            link.innerText = "Ingen match";
            wrong.innerText = "Foreslå Untappd match";

            // If beer has badges
            if (data !== undefined) {
              for (let i = 0; i < data.badges.length; i++) {
                let badges = document.createElement("div");
                let badge = document.createElement("span");

                badges.classList.add("badges");

                badge.innerText = data.badges[i].text;

                badges.appendChild(badge);
                document
                  .getElementsByClassName("product__layout-wrapper")[0]
                  .appendChild(badges);
              }
            }
          }
        });
      }
    );

    // Report wrong match modal
    wrong.addEventListener("click", function (e) {
      e.preventDefault();
      Swal.fire({
        title: "Rapporter feil Untappd match",
        text: "Legg inn riktig Untappd link. Eksempel: https://untappd.com/b/nogne-o-porter/27638",
        input: "text",
        inputAttributes: {
          autocapitalize: "off",
        },
        showCancelButton: false,
        confirmButtonText: "Send",
        confirmButtonColor: "#002025",
      }).then((result) => {
        if (result.isConfirmed && result.value) {
          const data = JSON.stringify({
            beer: beer_id,
            suggested_url: result.value,
          });
          const xhr = new XMLHttpRequest();
          const baseUrl = "https://api.beermonopoly.com/wrongmatch/";

          xhr.open("POST", baseUrl, true);
          xhr.setRequestHeader("Content-type", "application/json");
          xhr.send(data);

          xhr.onreadystatechange = function () {
            // Call a function when the state changes
            console.log(xhr.status);
            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 201) {
              Swal.fire({
                title: "Feil registrert!",
                text: "Ditt endringsforslag vil bli evaluert. Takk for hjelpen!",
                icon: "success",
                confirmButtonColor: "#002025",
              });
            } else {
              Swal.fire({
                title: "Det oppsto en feil ved sending av forslaget...",
                text: "Sjekk at du har tastet inn en gyldig URL!",
                icon: "error",
                confirmButtonColor: "#002025",
              });
            }
          };
        } else if (result.isConfirmed && !result.value) {
          Swal.fire({
            title: "Du må oppgi en gyldig Untappd link!",
            text: "Eksempel: https://untappd.com/b/nogne-o-porter/27638",
            icon: "error",
            confirmButtonColor: "#002025",
          });
        }
      });
    });
  }
}

// Wait for Vinmonopolet to load beer
document.arrive(".product__price", function () {
  main();
  Arrive.unbindAllArrive();
});

// Sentry error logging
Sentry.init({
  dsn: "https://72b452d00a6b4c8a820c6f122cd717a2@o985007.ingest.sentry.io/5970536",
  tracesSampleRate: 0.2,
});
