const state = { processing: 0 };

function addStyleToCategory(product, style) {
  const categoryElement = product.getElementsByClassName(
    "product__category-name"
  )[0];
  if (!categoryElement || categoryElement.textContent.includes(" - ")) return;

  const categoryText = categoryElement.innerText;
  const styleText = categoryText.includes("ØL") ? style : style.split("-")[1];
  categoryElement.textContent += ` - ${styleText}`;
}

function createRatings(products, beer_info) {
  products.forEach((product) => {
    if (!isProductSupported(product)) return;
    if (hasExistingUntappd(product)) return;

    const id = product.getElementsByClassName("product__code")[0]?.innerText;
    if (!id) return;

    const elements = createBaseElements();
    const infoContainer = product.getElementsByClassName("info-container")[0];
    if (!infoContainer) return;

    infoContainer.appendChild(elements.container);

    const beerInfo = beer_info[id];

    if (setRatingInfo(elements, beerInfo) && beerInfo.style) {
      addStyleToCategory(product, beerInfo.style);
    }

    if (beerInfo) {
      addBadges(infoContainer, beerInfo.badges);
    }
  });

  state.processing = 0;
}

async function initializeWishlistPage() {
  const products = Array.from(document.getElementsByClassName("product-item"));
  const supportedProducts = products.filter(isProductSupported);
  const ids = getBeerIds(supportedProducts);

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

document.arrive(".product__image-container", () => {
  const untappd = document.getElementsByClassName("untappd");
  if (untappd.length === 0 && state.processing === 0) {
    state.processing = 1;
    initializeWishlistPage();
  }
});
