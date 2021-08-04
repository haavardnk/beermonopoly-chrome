async function getBeer(beer_id) {
    let response = await fetch("https://api.beermonopoly.com/beers/" + beer_id
        + "/?fields=vmp_id,rating,checkins,untpd_url,untpd_updated");
    let data = await response.json();
    return data;
}

function main() {
    if (document.getElementsByClassName("product__category-name")[0].innerText.includes("ØL")) {

        // Get beer id from DOM
        var beer_id = document.getElementsByClassName("product__tab-list")[0]
            .getElementsByTagName("li")[1]
            .getElementsByTagName("span")[1].innerText;

        // Construct HTML
        var untappd = document.createElement("div");
        var logo = document.createElement("img");
        var link = document.createElement("a");
        var updated = document.createElement("p");
        var wrong = document.createElement("a");

        untappd.classList.add("untappd");
        wrong.classList.add("suggest");
        logo.src = chrome.runtime.getURL("assets/img/untappd.svg");

        untappd.appendChild(logo);
        untappd.appendChild(link);
        untappd.appendChild(updated);
        untappd.appendChild(wrong);

        document.getElementsByClassName('product__layout-wrapper')[0].appendChild(untappd);

        // Get beer info
        getBeer(beer_id).then(function (data) {
            if (data.rating !== null) {
                var date = new Date(data.untpd_updated);
                link.href = data.untpd_url;
                link.innerText = data.rating.toPrecision(3) + " (" + data.checkins + ")";
                updated.innerText = "Oppdatert: " + date.toLocaleDateString('en-GB') + " " + date.toLocaleTimeString('en-GB');
                wrong.innerText = "Feil øl?";
            }
            else {
                link.innerText = "Ingen match";
                wrong.innerText = "Foreslå Untappd match";
            }

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
