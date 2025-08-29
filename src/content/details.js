function getElement(className, index = 0) {
  return document.getElementsByClassName(className)[index] || null;
}

function isProductSupported() {
  const category = getElement("product__category-name");
  return (
    category && BEER_CATEGORIES.some((cat) => category.innerText.includes(cat))
  );
}

function createUntappdElements() {
  const elements = {};

  elements.container = document.createElement("div");
  elements.rating = document.createElement("div");
  elements.link = document.createElement("a");
  elements.updated = document.createElement("p");
  elements.wrong = document.createElement("a");
  elements.logo = document.createElement("img");

  elements.container.classList.add("untappd");
  elements.wrong.classList.add("suggest");
  elements.logo.classList.add("logo-detail");

  elements.logo.src = chrome.runtime.getURL("assets/img/untappd.svg");
  elements.link.target = "_blank";
  elements.link.rel = "noopener noreferrer";

  elements.rating.appendChild(elements.logo);
  elements.rating.appendChild(elements.link);
  elements.container.appendChild(elements.rating);
  elements.container.appendChild(elements.updated);
  elements.container.appendChild(elements.wrong);

  return elements;
}

function injectIBU(data) {
  const category = getElement("product__category-name");
  if (
    !category?.textContent.includes("ØL") &&
    !category?.textContent.includes("Øl")
  )
    return;

  const ibuContainers = document.querySelectorAll('[class^="properties-list"]');
  if (ibuContainers.length === 0) return;

  const ibuHolder = ibuContainers[ibuContainers.length - 1];

  const listItems = Array.from(ibuHolder.getElementsByTagName("li"));
  const hasIBU = listItems.some((item) => {
    const strong = item.getElementsByTagName("strong")[0];
    return strong?.innerText === "Ibu";
  });

  if (!hasIBU && listItems.length > 0) {
    const ibuItem = listItems[0].cloneNode(true);
    ibuItem.getElementsByTagName("strong")[0].innerText = "Ibu";
    ibuItem.getElementsByTagName("span")[0].innerText = data.ibu || "N/A";
    ibuItem.getElementsByTagName("span")[0].ariaLabel = data.ibu || "N/A";
    ibuHolder.appendChild(ibuItem);
  }
}

function updateStyleInfo(data) {
  const category = getElement("product__category-name");
  const tabElement = getElement("product__tab-list")
    ?.getElementsByTagName("li")[0]
    ?.getElementsByTagName("span")[1];

  if (!category || !tabElement || tabElement.textContent.includes("(")) return;

  if (
    category.textContent.includes("ØL") ||
    category.textContent.includes("Øl")
  ) {
    category.textContent = "Øl - " + data.style;
  } else {
    const stylePart = data.style.split("-")[1] || data.style;
    if (category.textContent.includes(" - ")) {
      const baseCategory = category.textContent.split(" - ")[0];
      category.textContent = baseCategory + " - " + stylePart;
    } else {
      category.textContent += " - " + stylePart;
    }
  }
  tabElement.textContent += " (" + data.style + ")";
}

function addBadges(data) {
  if (!data?.badges?.length) return;

  const layoutWrapper = getElement("product__layout-wrapper");
  const existingBadges = layoutWrapper?.getElementsByClassName("badges");

  if (!layoutWrapper || existingBadges?.length > 0) return;

  data.badges.forEach((badge) => {
    const badgeDiv = document.createElement("div");
    const badgeSpan = document.createElement("span");
    badgeDiv.classList.add("badges");
    badgeSpan.innerText = badge.text;
    badgeDiv.appendChild(badgeSpan);
    layoutWrapper.appendChild(badgeDiv);
  });
}

function setupWrongMatchHandler(wrongElement, beerId) {
  wrongElement.addEventListener("click", (e) => {
    e.preventDefault();
    Swal.fire({
      title: "Rapporter feil Untappd match",
      text: "Legg inn riktig Untappd link. Eksempel: https://untappd.com/b/nogne-o-porter/27638",
      input: "text",
      inputAttributes: { autocapitalize: "off" },
      showCancelButton: false,
      confirmButtonText: "Send",
      confirmButtonColor: "#002025",
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        fetch("https://api.olmonopolet.app/wrongmatch/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ beer: beerId, suggested_url: result.value }),
        }).then((response) => {
          const success = response.status === 201;
          Swal.fire({
            title: success
              ? "Feil registrert!"
              : "Det oppsto en feil ved sending av forslaget...",
            text: success
              ? "Ditt endringsforslag vil bli evaluert. Takk for hjelpen!"
              : "Sjekk at du har tastet inn en gyldig URL!",
            icon: success ? "success" : "error",
            confirmButtonColor: "#002025",
          });
        });
      } else if (result.isConfirmed && !result.value) {
        Swal.fire({
          title: "Du må oppgi en gyldig Untappd link!",
          text: "Eksempel: https://untappd.com/b/nogne-o-porter/27638",
          icon: "error",
          confirmButtonColor: "#002025",
        });
      }
    });
  });
}

let observersInitialized = false;

function injectBeerInfo() {
  if (
    getElement("untappd") ||
    !getElement("product__layout-wrapper") ||
    !isProductSupported()
  ) {
    return;
  }

  const beerId = getElement("product__tab-list")
    ?.getElementsByTagName("li")[1]
    ?.getElementsByTagName("span")[1]?.innerText;

  if (!beerId) return;

  const elements = createUntappdElements();
  getElement("product__layout-wrapper").appendChild(elements.container);

  getBeerById(beerId)
    .then((data) => {
      if (data?.rating !== undefined && data.rating !== null) {
        elements.rating.insertBefore(
          ratingToStars(data.rating.toPrecision(3)),
          elements.rating.childNodes[1]
        );
        elements.link.href = data.untpd_url;
        elements.link.innerText = `${data.rating.toPrecision(3)} (${kFormatter(
          data.checkins
        )})`;

        const date = new Date(data.untpd_updated);
        elements.updated.innerText = `Oppdatert: ${date.toLocaleDateString(
          "en-GB"
        )} ${date.toLocaleTimeString("en-GB")}`;
        elements.wrong.innerText = "Feil øl?";

        injectIBU(data);
        updateStyleInfo(data);
      } else if (data?.detail === "Not found.") {
        elements.link.innerText = "Ny, oppdateres ved neste kjøring";
      } else {
        elements.link.innerText = "Ingen match";
        elements.wrong.innerText = "Foreslå Untappd match";
      }

      addBadges(data);
      setupWrongMatchHandler(elements.wrong, beerId);
    })
    .catch((error) => {
      console.error("Failed to fetch beer data:", error);
      elements.link.innerText = "Feil ved lasting";
    });
}

function initializeProductDetails() {
  injectBeerInfo();

  if (!observersInitialized) {
    observersInitialized = true;
    document.arrive(".product__layout-wrapper", () =>
      setTimeout(injectBeerInfo, 100)
    );
    document.arrive(".product__category-name", () =>
      setTimeout(injectBeerInfo, 100)
    );
  }
}

initializeProductDetails();
