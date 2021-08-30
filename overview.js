var state = 0;
var observe_state = 0;

function createRatings(products, beer_info) {
    for (let i = 0; i < products.length; i++) {
        if (products[i].getElementsByClassName("product__category-name")[0].innerText.includes("ØL") &&
            products[i].getElementsByClassName("untappd").length == 0) {

            let id = products[i].getElementsByClassName("product__code")[0].innerText;

            // Construct HTML
            var untappd = document.createElement("div");
            var logo = document.createElement("img");
            var logo_user = document.createElement("img");
            var link = document.createElement("a");
            var link_checkin = document.createElement("a");
            var triangle = document.createElement("div");
            var checkmark = document.createElement("img");

            untappd.classList.add("untappd");
            triangle.classList.add("triangle");
            logo.src = chrome.runtime.getURL("assets/img/untappd.svg");
            logo_user.src = chrome.runtime.getURL("assets/img/user.svg");
            checkmark.src = chrome.runtime.getURL("assets/img/check-solid.svg");

            untappd.appendChild(logo);
            untappd.appendChild(link);

            products[i].getElementsByClassName('product-stock-status')[0].appendChild(untappd);

            if (beer_info[id].rating !== null) {
                link.innerText = beer_info[id].rating.toPrecision(3);
                link.href = beer_info[id].untpd_url;
                // If beer checked in
                if (beer_info[id].hasOwnProperty('user_checked_in') && beer_info[id].user_checked_in.length > 0) {
                    untappd.insertBefore(logo_user, untappd.childNodes[2]);
                    untappd.insertBefore(link_checkin, untappd.childNodes[3]);
                    link_checkin.href = beer_info[id].user_checked_in[0].checkin_url;
                    link_checkin.innerText = beer_info[id].user_checked_in[0].rating.toPrecision(3);
                    triangle.appendChild(checkmark);
                    products[i].prepend(triangle);
                };
            } else {
                link.innerText = "Ingen match";
            };
        };
    };
    state = 0;
};

function getBeerIds(products) {
    let ids = [];
    for (let i = 0; i < products.length; i++) {
        if (products[i].getElementsByClassName("product__category-name")[0].innerText.includes("ØL")) {
            ids.push(products[i].getElementsByClassName("product__code")[0].innerText);
        }
    }
    return ids;
}

async function getBeerInfo(beer_ids, api_token) {
    if (api_token) {
        let response = await fetch("https://api.beermonopoly.com/beers/?beers=" + beer_ids.join()
            + "&fields=vmp_id,rating,untpd_url,user_checked_in", {
            headers: {
                Authorization: `Token ${api_token}`
            }
        });
        let data = await response.json();
        return data;
    } else {
        let response = await fetch("https://api.beermonopoly.com/beers/?beers=" + beer_ids.join()
            + "&fields=vmp_id,rating,untpd_url");
        let data = await response.json();
        return data;
    };
};

function main() {
    let products = Array.from(document.getElementsByClassName("product-item"));
    let ids = getBeerIds(products);
    let beer_info = {};
    if (ids.length != 0) {
        chrome.storage.sync.get({ api_token: null }, async function (result) {
            getBeerInfo(ids, result.api_token).then(function (data) {
                for (let i = 0; i < data.results.length; i++)
                    beer_info[data.results[i].vmp_id] = data.results[i];
                createRatings(products, beer_info);
            });
        });
    } else {
        state = 0;
    };

}

// Wait for Vinmonopolet to load beers
document.arrive(".product-item__image", function () {
    let untappd = document.getElementsByClassName("untappd");
    if (untappd.length == 0 && state == 0) {
        state = 1;
        main();
    }

    // Add observers of facet changes
    if (observe_state == 0) {
        document.arrive(".facet-value--selected", function () {
            if (state == 0) {
                [...document.getElementsByClassName("untappd")].map(n => n && n.remove());
                state = 1;
                setTimeout(main, 100);
            }
        });
        document.leave(".facet-value--selected", function () {
            if (state == 0) {
                [...document.getElementsByClassName("untappd")].map(n => n && n.remove());
                state = 1;
                setTimeout(main, 100);
            }
        });
        observe_state = 1;
    }
});
