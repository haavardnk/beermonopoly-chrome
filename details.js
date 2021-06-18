async function getBeer(beer_id) {
    let response = await fetch("https://api.beermonopoly.com/beers/" + beer_id
        + "/?fields=vmp_id,rating,checkins,untpd_url,untpd_updated");
    let data = await response.json();
    return data;
}

if (document.getElementsByClassName("product__category-name")[0].innerText.includes("ØL")) {
    // Get beer information
    var beer_id = document.getElementsByClassName("product__tab-list")[0]
        .getElementsByTagName("li")[1]
        .getElementsByTagName("span")[1].innerText;

    // Construct HTML
    var untappd = document.createElement("div");
    var logo = document.createElement("img");
    var link = document.createElement("a");
    var updated = document.createElement("p");

    untappd.classList.add("untappd");
    logo.src = chrome.runtime.getURL("assets/img/untappd.svg");

    untappd.appendChild(logo);
    untappd.appendChild(link);
    untappd.appendChild(updated);

    document.getElementsByClassName('product__layout-wrapper')[0].appendChild(untappd);

    getBeer(beer_id).then(function (data) {
        var date = new Date(data.untpd_updated);
        link.href = data.untpd_url;
        link.innerText = data.rating.toPrecision(3) + " (" + data.checkins + ")";
        updated.innerText = "Oppdatert: " + date.toLocaleDateString() + " " + date.toLocaleTimeString();
    });

}
