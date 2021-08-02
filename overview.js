var state = 0;

function createRatings(products, beer_info) {
    for (let i = 0; i < products.length; i++) {
        if (products[i].getElementsByClassName("product__category-name")[0].innerText.includes("ØL") &&
            products[i].getElementsByClassName("untappd").length == 0) {

            let id = products[i].getElementsByClassName("product__code")[0].innerText;

            // Construct HTML
            var untappd = document.createElement("div");
            var logo = document.createElement("img");
            var link = document.createElement("a");
            untappd.classList.add("untappd");
            logo.src = chrome.runtime.getURL("assets/img/untappd.svg");
            if (beer_info[id].rating !== null) {
                link.innerText = beer_info[id].rating.toPrecision(3);
                link.href = beer_info[id].untpd_url;
            }
            else {
                link.innerText = "No match";
            }

            untappd.appendChild(logo);
            untappd.appendChild(link);

            products[i].getElementsByClassName('product-stock-status')[0].appendChild(untappd);
        }
    }
    state = 0;
}

function getBeerIds(products) {
    let ids = [];
    for (let i = 0; i < products.length; i++) {
        if (products[i].getElementsByClassName("product__category-name")[0].innerText.includes("ØL")) {
            ids.push(products[i].getElementsByClassName("product__code")[0].innerText);
        }
    }
    return ids;
}

async function getBeerInfo(beer_ids) {
    let response = await fetch("https://api.beermonopoly.com/beers/?beers=" + beer_ids.join()
        + "&fields=vmp_id,rating,untpd_url");
    let data = await response.json();
    return data;
}

function main() {
    let products = Array.from(document.getElementsByClassName("product-item"));
    let ids = getBeerIds(products);
    let beer_info = {};
    if (ids.length != 0) {
        getBeerInfo(ids).then(function (data) {
            for (let i = 0; i < data.results.length; i++)
                beer_info[data.results[i].vmp_id] = data.results[i];
            createRatings(products, beer_info);
        });
    }
    else {
        state = 0
    };

}

// Wait for Vinmonopolet to load beers
let observer = new MutationObserver(function (mutations, observer) {
    let products = document.getElementsByClassName("product-item");
    let untappd = document.getElementsByClassName("untappd");
    if (products.length == 24 && untappd.length == 0 && state == 0) {
        state = 1;
        main();
        return;
    }
});


// Start observing DOM
const targetNode = document.querySelector(".site");
observer.observe(targetNode, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,

});