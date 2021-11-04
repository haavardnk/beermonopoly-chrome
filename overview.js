var state = 0;
var observe_state = 0;
var categories = ["ØL", "SIDER", "MJØD"]

function createRatings(products, beer_info) {
    for (let i = 0; i < products.length; i++) {
        if (categories.includes(products[i].getElementsByClassName("product__category-name")[0].innerText) &&
            products[i].getElementsByClassName("untappd").length == 0) {

            let id = products[i].getElementsByClassName("product__code")[0].innerText;

            // Construct HTML
            let untappd = document.createElement("div");
            let untappd_rating = document.createElement("div");
            let user_rating = document.createElement("span");
            let logo = document.createElement("img");
            let logo_user = document.createElement("img");
            let link = document.createElement("a");
            let link_checkin = document.createElement("a");
            let triangle = document.createElement("div");
            let checkmark = document.createElement("img");
            let star1 = document.createElement("img");
            let star2 = document.createElement("img");

            untappd.classList.add("untappd");
            triangle.classList.add("triangle-overview");
            logo.classList.add("logo-overview")
            logo_user.classList.add("logo-overview")
            star1.classList.add("star-overview")
            star2.classList.add("star-overview")

            logo.src = chrome.runtime.getURL("assets/img/untappd.svg");
            logo_user.src = chrome.runtime.getURL("assets/img/user.svg");
            checkmark.src = chrome.runtime.getURL("assets/img/check-solid.svg");
            star1.src = chrome.runtime.getURL("assets/img/star-solid.svg");
            star2.src = chrome.runtime.getURL("assets/img/star-solid.svg");

            untappd.appendChild(untappd_rating)
            untappd_rating.appendChild(logo);
            untappd_rating.appendChild(link);
            untappd_rating.appendChild(star1);

            products[i].getElementsByClassName('product-stock-status')[0].appendChild(untappd);
            if (beer_info[id].rating !== null) {
                // Untappd rating
                link.innerText = beer_info[id].rating.toPrecision(3);
                link.href = beer_info[id].untpd_url;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                // Untappd style
                if (products[i].getElementsByClassName("product__category-name")[0].innerText.includes("ØL")) {
                    products[i].getElementsByClassName("product__category-name")[0].textContent += " - " + beer_info[id].style
                } else {
                    products[i].getElementsByClassName("product__category-name")[0].textContent += " - " + beer_info[id].style.split("-")[1]
                }

                // If beer checked in by user
                if (beer_info[id].hasOwnProperty('user_checked_in') && beer_info[id].user_checked_in.length > 0) {
                    // User rating
                    untappd_rating.appendChild(user_rating)
                    user_rating.appendChild(logo_user);
                    user_rating.appendChild(link_checkin);
                    user_rating.appendChild(star2);
                    link_checkin.href = beer_info[id].user_checked_in[0].checkin_url;
                    link_checkin.innerText = beer_info[id].user_checked_in[0].rating.toPrecision(3);
                    link_checkin.target = "_blank";
                    link_checkin.rel = "noopener noreferrer";
                    // Checked in triangle
                    triangle.appendChild(checkmark);
                    products[i].prepend(triangle);
                };

                // If beer has badges
                for (let j = 0; j < beer_info[id].badges.length; j++) {
                    let badges = document.createElement("div");
                    let badge = document.createElement("span");

                    badges.classList.add("badges");

                    badge.innerText = beer_info[id].badges[j].text;

                    badges.appendChild(badge);
                    products[i].getElementsByClassName('product-stock-status')[0].appendChild(badges);
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
        if (categories.includes(products[i].getElementsByClassName("product__category-name")[0].innerText)) {
            ids.push(products[i].getElementsByClassName("product__code")[0].innerText);
        }
    }
    return ids;
}

async function getBeerInfo(beer_ids, api_token) {
    if (api_token) {
        let response = await fetch("https://api.beermonopoly.com/beers/?beers=" + beer_ids.join()
            + "&fields=vmp_id,style,rating,untpd_url,user_checked_in,badges", {
            headers: {
                Authorization: `Token ${api_token}`
            }
        });
        let data = await response.json();
        return data;
    } else {
        let response = await fetch("https://api.beermonopoly.com/beers/?beers=" + beer_ids.join()
            + "&fields=vmp_id,style,rating,untpd_url,badges");
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

function resultsChanged() {
    if (state == 0) {
        state = 1;
        setTimeout(main, 100);
    }
};

// Wait for Vinmonopolet to load beers
document.arrive(".product-item__image", function () {
    let untappd = document.getElementsByClassName("untappd");
    if (untappd.length == 0 && state == 0) {
        state = 1;
        main();
    }

    // Add observers of facet changes
    if (observe_state == 0) {
        document.arrive(".facet-value--selected", resultsChanged);
        document.leave(".facet-value--selected", resultsChanged);
        document.leave(".search-results__sort__list", resultsChanged);
        observe_state = 1;
    }
});

// Sentry error logging
Sentry.init({
    dsn: "https://72b452d00a6b4c8a820c6f122cd717a2@o985007.ingest.sentry.io/5970536",
    tracesSampleRate: 0.2,
});
