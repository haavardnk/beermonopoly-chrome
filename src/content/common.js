const API_BASE_URL = "https://api.olmonopolet.app";
const BEER_CATEGORIES = ["ØL", "SIDER", "MJØD"];

async function getBeerInfo(
  beer_ids,
  fields = "vmp_id,rating,untpd_url,badges"
) {
  const url = `${API_BASE_URL}/beers/?beers=${beer_ids.join()}&fields=${fields}`;
  const response = await fetch(url);
  return await response.json();
}

async function getBeerById(
  beer_id,
  fields = "vmp_id,ibu,style,rating,checkins,untpd_url,untpd_updated,badges"
) {
  const response = await fetch(
    `${API_BASE_URL}/beers/${beer_id}/?fields=${fields}`
  );
  return await response.json();
}

function getBeerIds(products, selector = "product__code") {
  return products
    .map((product) => product.getElementsByClassName(selector)[0]?.innerText)
    .filter((id) => id);
}

function addBadges(container, badges) {
  if (!badges?.length) return;

  badges.forEach((badge) => {
    const badgeDiv = document.createElement("div");
    const badgeSpan = document.createElement("span");
    badgeDiv.classList.add("badges");
    badgeSpan.innerText = badge.text;
    badgeDiv.appendChild(badgeSpan);
    container.appendChild(badgeDiv);
  });
}

function createBaseElements(
  logoClass = "logo-overview",
  starClass = "star-overview"
) {
  const elements = {};

  elements.container = document.createElement("div");
  elements.rating = document.createElement("div");
  elements.link = document.createElement("a");
  elements.logo = document.createElement("img");
  elements.star = document.createElement("img");

  elements.container.classList.add("untappd");
  elements.logo.classList.add(logoClass);
  elements.star.classList.add(starClass);

  elements.logo.src = chrome.runtime.getURL("assets/img/untappd.svg");
  elements.star.src = chrome.runtime.getURL("assets/img/star-solid.svg");

  elements.link.target = "_blank";
  elements.link.rel = "noopener noreferrer";

  elements.container.appendChild(elements.rating);
  elements.rating.appendChild(elements.logo);
  elements.rating.appendChild(elements.link);
  elements.rating.appendChild(elements.star);

  return elements;
}

function isProductSupported(product) {
  const categoryElement = product.getElementsByClassName(
    "product__category-name"
  )[0];
  return (
    categoryElement &&
    BEER_CATEGORIES.some((cat) => categoryElement.innerText.includes(cat))
  );
}

function hasExistingUntappd(product) {
  return product.getElementsByClassName("untappd").length > 0;
}

function setRatingInfo(elements, beerInfo) {
  if (beerInfo && beerInfo.rating !== null) {
    elements.link.innerText = beerInfo.rating.toPrecision(3);
    elements.link.href = beerInfo.untpd_url;
    return true;
  } else {
    elements.link.innerText = "Ingen match";
    return false;
  }
}
