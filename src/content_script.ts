const originalHTML = document.documentElement.innerHTML // TODO: push separate

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

function findClosestAncestorWithClass(element: Element, className: string): Element | null {
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

interface CarElement {
  element: HTMLElement;
  title: string;
  price: string;
  currency?: "лв" | "EUR";
}

async function createCarObjects(
  htmlText: string,
  pageNumber: string
): Promise<CarElement[]> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, "text/html")

  const titleElements = doc.getElementsByClassName("mmm");
  const priceElements = doc.getElementsByClassName("price");
  const carObjList = new Array<CarElement>();
  for (let i = 2; i < titleElements.length; i++) {
    // first two elements with class mmm are not car elements so they are skipped over
    const titleElement = titleElements[i] as HTMLElement;
    let textContent = titleElement.textContent ?? "empty";
    if (textContent.includes("...")) {
      const link = titleElement.getAttribute("href");
      if (link) {
        const html = await followLink(link);
        textContent = parseTitleFromLink(html!);
      }
    }
    carObjList.push({
      element: titleElement,
      title: textContent,
      price: priceElements[i - 2].textContent!,
    });
  }

  // hide all car listings from first page (page will later be populated with listings that match filter)
  if (pageNumber === "1") {
    const titleElems = document.getElementsByClassName("mmm"); // standard DOM is manipulated
    for (let i = 2; i < titleElems.length; i++) {
      const containingElement = findClosestAncestorWithClass(
        titleElems[i],
        "tablereset"
      ) as HTMLElement;
      containingElement!.style.display = "none";
    }
  }

  return carObjList;
}

function matchElement(
  elementArray: CarElement[],
  filterValue: string
): CarElement[] {
  const matchArray = elementArray.filter((elem) =>
    elem.title
      .replace(/\s/g, "") //TODO: if search has spaces, this will be a problem
      .toLowerCase()
      .includes(filterValue.toLowerCase())
  );
  return matchArray;
}

/**calculates the average price of the filtered elements in BGN */
function calculateAvgPrice(elements: CarElement[]): number {
  if (!elements) return 0
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
  //calculating avg price
  console.log("avg prices called: ", prices)
  if (prices) {
    const avgPriceBGN = Math.round(prices.reduce((a, b) => a + b) / prices.length)
    return avgPriceBGN;
  }
  console.log("prices empty/ undefined")
  return 21
}

function createPaginationUrls(): string[] {
  let pagesString: string =
    document
      .getElementsByClassName("pageNumbersInfo")[0]
      .textContent?.split(" ")
      .at(-1) ?? "0";
  const numPages = parseInt(pagesString);

  let paginationUrls = new Array<string>();
  for (let i = 1; i <= numPages; i++) {
    paginationUrls.push(window.location.href.replace(/.$/, i.toString()));
  }
  return paginationUrls;
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

async function extractAllListings(): Promise<CarElement[]>{
  const urls = createPaginationUrls();
  let generalCarObject: Array<CarElement[]> = [];
  await Promise.all(
    urls.map(async (url) => {
      const response = await fetch(url);
      const decoder = new TextDecoder("windows-1251");
      const buffer = await response.arrayBuffer();
      const htmlString = decoder.decode(buffer);
      const cars = await createCarObjects(htmlString, url.charAt(url.length - 1));
      generalCarObject.push(cars);
    })
  );
  return generalCarObject.flat(2);
}

// populate first page with filtered elements
function populateWithFilteredElems(matchingElements: CarElement[]){
  // finding ancestor elements
  const filteredElements = matchingElements
    .map((elem) =>
      findClosestAncestorWithClass(elem.element, "tablereset")
    )
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
  const flatGeneralCarObject = await extractAllListings()
  const objectMatchingFilter = matchElement(
    flatGeneralCarObject,
    request.filterValue as string
  );

  populateWithFilteredElems(objectMatchingFilter)
  port.postMessage({ message: "loadingdone" });

  const avgPrice = calculateAvgPrice(objectMatchingFilter);

  const searchKeywords = fullSearchKeywords(
    request.filterValue as string
  );

  const filterElementsHTML = document.documentElement.innerHTML;

  const cacheItem: CacheInfo = {
    searchValue: request.filterValue,
    keywords: searchKeywords,
    filterAmount: objectMatchingFilter.length,
    avgPrice: avgPrice,
    filteredHtmlText: filterElementsHTML
  }

  chrome.storage.local.get(["lastSearches"], function(result){
    if (!result.lastSearches){
      const cache: CacheInfo[] = []
      cache.push(cacheItem)
      chrome.storage.local.set({lastSearches: JSON.stringify(cache)});
    } else {
      let cachedSearches = JSON.parse(result.lastSearches)
      console.log("CACHED searches: ", cachedSearches)
      if (cachedSearches.length >= 3) {
        cachedSearches.slice(1).push(cacheItem)
        chrome.storage.local.set({lastSearches: JSON.stringify(cachedSearches)});
        console.log("cached searches after FIFO: ", cachedSearches)
      } else {
        console.log("look at else")
        cachedSearches.push(cacheItem)
        console.log("cached sEaRches: ", cachedSearches)
        chrome.storage.local.set({lastSearches: JSON.stringify(cachedSearches)});
      }
    }
  })

  hidePagination("none");
}


chrome.runtime.onConnect.addListener(function (port) {
  console.assert(port.name === "MOBILE_POPUP");
  port.onMessage.addListener(async function (request) {
    // TODO: create a union type for request states (successful, error, etc.) in background script
    if (request.type === "popuprequest") {
      switch (request.message) {
        case "filter":
          chrome.storage.local.get(["lastSearches"], async function(result) {
            if (result.lastSearches){
                console.log("lastsearches: ", result.lastSearches)
                const cacheArray: CacheInfo[] = JSON.parse(result.lastSearches)
                console.log("cache array length", cacheArray.length)
                for (let item = 0; item < cacheArray.length; item++){
                  if (request.filterValue === cacheArray[item].searchValue &&
                    cacheArray[item].keywords === fullSearchKeywords(request.filterValue)) {
                    document.documentElement.innerHTML = cacheArray[item].filteredHtmlText
                    port.postMessage({ type : 'populate', message : JSON.stringify(cacheArray[item])})
                    return
                  }
                }
                console.log("call 1")
                await main(request, port)
            } else {
              console.log("call 2")
              await main(request, port)
            }
          })
          break;
        case "removefilter":
          hidePagination("inline");
          document.documentElement.innerHTML = originalHTML // TODO: push separate
          break;
        default:
          console.log("No message from popup.");
      }
    }
  });
});
