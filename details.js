async function getBeer(beer_id, api_token) {
    // Check if authenticated
    if (api_token) {
        let response = await fetch("https://api.beermonopoly.com/beers/" + beer_id
            + "/?fields=vmp_id,rating,checkins,untpd_url,untpd_updated,user_checked_in", {
            headers: {
                Authorization: `Token ${api_token}`
            }
        });
        let data = await response.json();
        return data
    } else {
        let response = await fetch("https://api.beermonopoly.com/beers/" + beer_id
            + "/?fields=vmp_id,rating,checkins,untpd_url,untpd_updated");
        let data = await response.json();
        return data
    };

}

function kFormatter(num) {
    return Math.abs(num) > 999 ? ((num / 1000).toFixed(0)) + 'k' : num
}

function main() {
    if (document.getElementsByClassName("product__category-name")[0].innerText.includes("ØL") ||
        document.getElementsByClassName("product__category-name")[0].innerText.includes("SIDER") ||
        document.getElementsByClassName("product__category-name")[0].innerText.includes("MJØD")) {

        // Get beer id from DOM
        var beer_id = document.getElementsByClassName("product__tab-list")[0]
            .getElementsByTagName("li")[1]
            .getElementsByTagName("span")[1].innerText;

        // Construct HTML
        var untappd = document.createElement("div");
        var logo = document.createElement("img");
        var logo_user = document.createElement("img");
        var link = document.createElement("a");
        var link_checkin = document.createElement("a");
        var updated = document.createElement("p");
        var wrong = document.createElement("a");
        var triangle = document.createElement("div");
        var checkmark = document.createElement("img");

        untappd.classList.add("untappd");
        wrong.classList.add("suggest");
        triangle.classList.add("triangle_detail");
        logo.src = chrome.runtime.getURL("assets/img/untappd.svg");
        logo_user.src = chrome.runtime.getURL("assets/img/user.svg");
        checkmark.src = chrome.runtime.getURL("assets/img/check-solid.svg");

        untappd.appendChild(logo);
        untappd.appendChild(link);
        untappd.appendChild(updated);
        untappd.appendChild(wrong);

        document.getElementsByClassName('product__layout-wrapper')[0].appendChild(untappd);

        // Get beer info
        chrome.storage.sync.get({ api_token: null }, async function (result) {
            getBeer(beer_id, result.api_token).then(function (data) {
                if (data.rating !== null) {
                    var date = new Date(data.untpd_updated);
                    link.href = data.untpd_url;
                    link.innerText = data.rating.toPrecision(3) + " (" + kFormatter(data.checkins) + ")";
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";
                    updated.innerText = "Oppdatert: " + date.toLocaleDateString('en-GB') + " " + date.toLocaleTimeString('en-GB');
                    wrong.innerText = "Feil øl?";
                    // If beer checked in
                    if (data.hasOwnProperty('user_checked_in') && data.user_checked_in.length > 0) {
                        untappd.insertBefore(logo_user, untappd.childNodes[2])
                        untappd.insertBefore(link_checkin, untappd.childNodes[3])
                        link_checkin.href = data.user_checked_in[0].checkin_url
                        link_checkin.innerText = data.user_checked_in[0].rating.toPrecision(3);
                        link_checkin.target = "_blank";
                        link_checkin.rel = "noopener noreferrer";
                        triangle.appendChild(checkmark);
                        document.getElementsByClassName('product__details--top')[0].prepend(triangle);
                    }
                }
                else {
                    link.innerText = "Ingen match";
                    wrong.innerText = "Foreslå Untappd match";
                }
            });
        });


        // Report wrong match modal
        wrong.addEventListener("click", function (e) {
            e.preventDefault();
            Swal.fire({
                title: 'Rapporter feil Untappd match',
                text: 'Legg inn riktig Untappd link. Eksempel: https://untappd.com/b/nogne-o-porter/27638',
                input: 'text',
                inputAttributes: {
                    autocapitalize: 'off'
                },
                showCancelButton: false,
                confirmButtonText: 'Send',
                confirmButtonColor: '#002025',
            }).then((result) => {
                if (result.isConfirmed && result.value) {
                    const data = JSON.stringify({ "beer": beer_id, "suggested_url": result.value })
                    const xhr = new XMLHttpRequest();
                    const baseUrl = "https://api.beermonopoly.com/wrongmatch/";

                    xhr.open("POST", baseUrl, true);
                    xhr.setRequestHeader("Content-type", "application/json");
                    xhr.send(data);

                    xhr.onreadystatechange = function () { // Call a function when the state changes.
                        console.log(xhr.status)
                        if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 201) {
                            Swal.fire({
                                title: 'Feil registrert!',
                                text: 'Ditt endringsforslag vil bli evaluert. Takk for hjelpen!',
                                icon: 'success',
                                confirmButtonColor: '#002025',
                            });
                        }
                        else {
                            Swal.fire({
                                title: 'Det oppsto en feil ved sending av forslaget...',
                                text: 'Sjekk at du har tastet inn en gyldig URL!',
                                icon: 'error',
                                confirmButtonColor: '#002025',
                            });
                        }
                    }
                }
                else if (result.isConfirmed && !result.value) {
                    Swal.fire({
                        title: 'Du må oppgi en gyldig Untappd link!',
                        text: 'Eksempel: https://untappd.com/b/nogne-o-porter/27638',
                        icon: 'error',
                        confirmButtonColor: '#002025',
                    });
                }
            })
        });
    }
}

// Wait for Vinmonopolet to load beer
document.arrive(".product__price", function () {
    main();
    Arrive.unbindAllArrive();
});
