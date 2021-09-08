function kFormatter(num) {
    return Math.abs(num) > 999 ? ((num / 1000).toFixed(0)) + 'k' : num
}

function ratingToStars(rating) {
    let star_rating = document.createElement("span");
    let star1 = document.createElement("img");
    let star2 = document.createElement("img");
    let star3 = document.createElement("img");
    let star4 = document.createElement("img");
    let star5 = document.createElement("img");

    star_rating.classList.add("stars")

    stars = [star1, star2, star3, star4, star5]

    for (let i = 0; i < stars.length; i++) {
        if (rating > i + 0.75) {
            stars[i].src = chrome.runtime.getURL("assets/img/star-solid.svg");
        }
        else if (rating > i + 0.25) {
            stars[i].src = chrome.runtime.getURL("assets/img/star-half.svg");
        }
        else {
            stars[i].src = chrome.runtime.getURL("assets/img/star-hollow.svg");
        }
        star_rating.appendChild(stars[i])
    }

    return star_rating
}
