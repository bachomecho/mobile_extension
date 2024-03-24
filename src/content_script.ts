// storing original page state so it can replace the filtered page when remove filter is called
const originalHTML = document.documentElement.innerHTML;
// TODO: organise in classes, include search guards (already coded out)

async function followLink(link: string): Promise<string | undefined> {
  try {
    const response = await fetch(link);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch longer title of listing: ${response.status} ${response.statusText}`
      );
    }

    const decoder = new TextDecoder("windows-1251");
    const buffer = await response.arrayBuffer();
    const htmlString = decoder.decode(buffer);
    return htmlString;
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

function parseTitleFromLink(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  // getting title from follow link
  return doc.getElementsByTagName("h1")[0].textContent!;
}

function findClosestAncestorWithClass(
  element: Element,
  className: string
): Element | null {
  if (element.classList.contains(className)) {
    return element;
  }

  // traverse the DOM tree upwards until a parent with the specified class is found
  let count = 0; // this count is needed because the first element with class tablereset is the car image and not the main parent node
  while (element.parentElement) {
    element = element.parentElement;
    if (element.classList.contains(className) && count != 0) {
      return element;
    } else count++;
  }
  return null;
}

function matchElement(
  elementArray: CarElement[],
  filterValue: string
): CarElement[] {
  const matchArray = elementArray.filter((elem) =>
    elem.title
      .split(" ")
      .map((word) => word.toLowerCase())
      .includes(filterValue.toLowerCase())
  );
  return matchArray ? matchArray : [];
}

// calculates the average price of the filtered elements in BGN
function calculateAvgPrice(elements: CarElement[]): number {
  if (!elements) return 0;
  let prices: number[] = [];
  for (let i = 0; i < elements.length; i++) {
    if (!elements[i].price.trim().startsWith("Запитване")) {
      const splitPrice = elements[i].price.trim().split(" ");
      let numPrice = parseInt(splitPrice.slice(0, 2).join(""));
      const currency = splitPrice.at(-1);
      if (currency?.toLowerCase() == "eur") {
        numPrice *= 2; // TODO: multiply by actual exchange rate
      }
      prices.push(numPrice);
    }
  }
  prices = prices.filter((elem) => elem);

  if (prices.length !== 0) {
    const avgPriceBGN = Math.round(
      prices.reduce((a, b) => a + b) / prices.length
    );
    return avgPriceBGN;
  }
  // it is possible that there are elements but they do not have prices in which case we return an everage of zero
  return 0;
}

function hidePagination(hide: "none" | "inline"): void {
  document.querySelectorAll("span.pageNumbersSelect").forEach((elem) => {
    const paginationElem = findClosestAncestorWithClass(
      elem,
      "tablereset"
    ) as HTMLElement;
    paginationElem.style.display = hide;
  });
}

function fullSearchKeywords(filterValue: string): string {
  const brandModel = document
    .querySelector('[name="search"] h1')
    ?.textContent?.split(" ")
    .slice(2)
    .join(" ");
  return brandModel + " " + filterValue;
}

class Parser {
  createPaginationUrls(): string[] {
    let pagesString: string =
      document
        .getElementsByClassName("pageNumbersInfo")[0]
        .textContent?.split(" ")
        .at(-1) ?? "0";
    const numPages = parseInt(pagesString);

    let paginationUrls = new Array<string>();
    for (let i = 1; i <= numPages; i++) {
      paginationUrls.push(window.location.href + `/p-${i}`);
    }
    return paginationUrls;
  }

  async createCarObjects(htmlText: string): Promise<CarElement[]> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");

    const titleElements = doc.getElementsByClassName("mmmL");
    const priceElements = doc.getElementsByClassName("price");
    const carObjList = new Array<CarElement>();
    for (let i = 0; i < titleElements.length; i++) {
      // first two elements with class mmm are not car elements so they are skipped over
      const titleElement = titleElements[i] as HTMLElement;
      let textContent = titleElement.textContent ?? "empty";
      if (textContent.includes("...")) {
        const link = titleElement.getAttribute("href");
        if (link) {
          const html = await followLink(link);
          textContent = parseTitleFromLink(html!); // the three dots in a title obfuscate the full title, which is why we follow the link and parse the full title from the subsequent page
        }
      }
      carObjList.push({
        element: titleElement,
        title: textContent,
        price: priceElements[i].textContent!,
      });
    }

    return carObjList;
  }

  async extractAllListings(): Promise<CarElement[]> {
    let generalCarObject: Array<CarElement[]> = [];
    const urls = this.createPaginationUrls();

    await Promise.all(
      urls.map(async (url) => {
        const response = await fetch(url);
        const decoder = new TextDecoder("windows-1251");
        const buffer = await response.arrayBuffer();
        const htmlString = decoder.decode(buffer);
        const cars = await this.createCarObjects(htmlString);
        generalCarObject.push(cars);
      })
    );
    return generalCarObject.flat(2);
  }
}

function hideFirstPage() {
  const titleElems = document.getElementsByClassName("mmmL");
  for (let i = 0; i < titleElems.length; i++) {
    const containingElement = findClosestAncestorWithClass(
      titleElems[i],
      "tablereset"
    ) as HTMLElement;
    containingElement!.style.display = "none";
  }
}

// populate first page with filtered elements
function populateWithFilteredElems(matchingElements: CarElement[]) {
  // finding ancestor elements
  const filteredElements = matchingElements
    .map((elem) => findClosestAncestorWithClass(elem.element, "tablereset"))
    .filter((elem) => elem) as Element[];

  // 'break' element before car listing begin -> append filtered elements after it
  const carTable = document.querySelector(
    ".tablereset.m-t-10 br:nth-of-type(2)"
  );

  // populate first page with filtered elements
  filteredElements.forEach((elem) =>
    carTable?.insertAdjacentElement("afterend", elem)
  );
}

async function main(request: any, port: chrome.runtime.Port) {
  const parser = new Parser();
  const cars = await parser.extractAllListings();

  const carsMatchingFilter = matchElement(cars, request.filterValue as string);

  if (carsMatchingFilter.length === 0) {
    port.postMessage({ type: "warning", message: "no listings found" });
    return;
  } else {
    hideFirstPage(); // hide elements on the first page, so we can populate it with filtered elements
    populateWithFilteredElems(carsMatchingFilter);

    const avgPrice = calculateAvgPrice(carsMatchingFilter);

    const searchKeywords = fullSearchKeywords(request.filterValue as string); // this always has length of 3

    /*
    check if parsed car listings coincide with car brand and model extracted directly from the page;
    if url structure changes, it can happen that random urls are generated and car listings are extracted for brands and models
    that have nothing to do with the car and the brand you currently have loaded in front of you
    */
    if (
      !carsMatchingFilter[0].title
        .trim()
        .toLowerCase()
        .includes(searchKeywords.split(" ").slice(0, 2).join(" ").toLowerCase())
    ) {
      throw new Error("Parsed objects do not coincide with desired search.");
    }

    const filterElementsHTML = document.documentElement.innerHTML;

    const cacheItem: SearchInfo = {
      searchValue: request.filterValue,
      keywords: searchKeywords,
      filterAmount: carsMatchingFilter.length,
      avgPrice: avgPrice,
      filteredHtmlText: filterElementsHTML,
    };

    port.postMessage({ type: "populate", message: JSON.stringify(cacheItem) });

    chrome.storage.local.get(["lastSearches"], function (result) {
      if (!result.lastSearches) {
        const cache: SearchInfo[] = [];
        cache.push(cacheItem);
        chrome.storage.local.set({ lastSearches: JSON.stringify(cache) });
      } else {
        let cachedSearches = JSON.parse(result.lastSearches);
        if (cachedSearches.length >= 3) {
          const some = cachedSearches.slice(1).concat(cacheItem);
          chrome.storage.local.set({ lastSearches: JSON.stringify(some) });
        } else {
          cachedSearches.push(cacheItem);
          chrome.storage.local.set({
            lastSearches: JSON.stringify(cachedSearches),
          });
        }
      }
    });
    hidePagination("none");
  }
}

chrome.runtime.onConnect.addListener(function (port) {
  console.assert(port.name === "MOBILE_POPUP");
  port.onMessage.addListener(async function (request) {
    // TODO: create a union type for request states (successful, error, etc.) in background script
    if (request.type === "popuprequest") {
      switch (request.message) {
        case "filter":
          chrome.storage.local.get(["lastSearches"], async function (result) {
            if (result.lastSearches) {
              const cacheArray: SearchInfo[] = JSON.parse(result.lastSearches);
              for (let item = 0; item < cacheArray.length; item++) {
                /*
                  same search value can be used for different car brands and models, so the second condition
                  ensures that there is no cache hit if same search value has been cached but for different car brand
                  */
                if (
                  cacheArray[item].keywords ===
                  fullSearchKeywords(request.filterValue)
                ) {
                  // TODO: is first condition needed?
                  document.documentElement.innerHTML =
                    cacheArray[item].filteredHtmlText;
                  port.postMessage({
                    type: "populate",
                    message: JSON.stringify(cacheArray[item]),
                  });
                  return;
                }
              }
              await main(request, port);
            } else {
              await main(request, port);
            }
          });
          break;
        case "removefilter":
          hidePagination("inline");
          document.documentElement.innerHTML = originalHTML;
          port.postMessage({ message: "restoreElements" });
          break;
        default:
          console.log("No message from popup.");
      }
    }
  });
});
