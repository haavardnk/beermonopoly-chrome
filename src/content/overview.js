const state = { processing: 0, observersInitialized: 0 };

function createProductElements() {
  const elements = createBaseElements();

  elements.userRating = document.createElement("span");
  elements.logoUser = document.createElement("img");
  elements.linkCheckin = document.createElement("a");
  elements.triangle = document.createElement("div");
  elements.checkmark = document.createElement("img");
  elements.star2 = document.createElement("img");

  elements.triangle.classList.add("triangle-overview");
  elements.logoUser.classList.add("logo-overview");
  elements.star2.classList.add("star-overview");

  elements.logoUser.src = chrome.runtime.getURL("assets/img/user.svg");
  elements.checkmark.src = chrome.runtime.getURL("assets/img/check-solid.svg");
  elements.star2.src = chrome.runtime.getURL("assets/img/star-solid.svg");

  elements.linkCheckin.target = "_blank";
  elements.linkCheckin.rel = "noopener noreferrer";

  return elements;
}

function updateCategoryStyle(product, beerInfo) {
  const categoryElement = product.getElementsByClassName(
    "product__category-name"
  )[0];
  if (!categoryElement) return;

  const stylePart = categoryElement.innerText.includes("ØL")
    ? beerInfo.style
    : beerInfo.style.split("-")[1] || beerInfo.style;

  categoryElement.textContent += " - " + stylePart;
}

function addUserRating(elements, product, beerInfo) {
  if (
    !beerInfo.hasOwnProperty("user_checked_in") ||
    !beerInfo.user_checked_in.length
  )
    return;

  elements.rating.appendChild(elements.userRating);
  elements.userRating.appendChild(elements.logoUser);
  elements.userRating.appendChild(elements.linkCheckin);
  elements.userRating.appendChild(elements.star2);

  elements.linkCheckin.href = beerInfo.untpd_url + "?filter=you";
  elements.linkCheckin.innerText =
    beerInfo.user_checked_in[0].rating.toPrecision(3);

  elements.triangle.appendChild(elements.checkmark);
  const srOnly = product.getElementsByClassName("sr-only")[0];
  if (srOnly) {
    product.insertBefore(elements.triangle, srOnly);
  }
}

function createRatings(products, beer_info) {
  products.forEach((product) => {
    if (!isProductSupported(product)) return;
    if (hasExistingUntappd(product)) return;

    const id = product.getElementsByClassName("product__code")[0]?.innerText;
    if (!id || !beer_info[id]) return;

    const elements = createProductElements();
    const bottomContainer = product.getElementsByClassName(
      "product-item__bottom-container"
    )[0];
    if (!bottomContainer) return;

    bottomContainer.appendChild(elements.container);

    const beerInfo = beer_info[id];

    if (setRatingInfo(elements, beerInfo)) {
      updateCategoryStyle(product, beerInfo);
      addUserRating(elements, product, beerInfo);
    }

    if (beerInfo) {
      const badgeContainer = document.createElement("div");
      badgeContainer.classList.add("badges");

      beerInfo.badges?.forEach((badge) => {
        const badgeSpan = document.createElement("span");
        badgeSpan.innerText = badge.text;
        badgeContainer.appendChild(badgeSpan);
      });

      if (beerInfo.badges?.length > 0) {
        elements.container.appendChild(badgeContainer);
      }
    }
  });

  state.processing = 0;
}

async function processProductOverview() {
  const products = Array.from(document.getElementsByClassName("product-item"));
  const ids = getBeerIds(products.filter(isProductSupported));

  if (ids.length === 0) {
    state.processing = 0;
    return;
  }

  try {
    const data = await getBeerInfo(ids, "vmp_id,style,rating,untpd_url,badges");
    const beer_info = {};

    data.results?.forEach((beer) => {
      beer_info[beer.vmp_id] = beer;
    });

    createRatings(products, beer_info);
  } catch (error) {
    console.error("Failed to fetch beer info:", error);
    state.processing = 0;
  }
}

function resultsChanged() {
  if (state.processing === 0) {
    state.processing = 1;
    setTimeout(processProductOverview, 100);
    setTimeout(() => {
      const products = document.getElementsByClassName(
        "product__category-name"
      );
      for (let product of products) {
        if (BEER_CATEGORIES.includes(product.innerText)) {
          processProductOverview();
          break;
        }
      }
    }, 1000);
  }
}

document.arrive(".product__image-container", () => {
  const untappd = document.getElementsByClassName("untappd");
  if (untappd.length === 0 && state.processing === 0) {
    state.processing = 1;
    processProductOverview();
  }

  if (state.observersInitialized === 0) {
    document.arrive(".facet-value--selected", resultsChanged);
    document.leave(".facet-value--selected", resultsChanged);
    document.leave(".search-results__sort__list", resultsChanged);
    state.observersInitialized = 1;
  }
});
