const originalHTML = document.documentElement.cloneNode(true); // deep clone of the original DOM

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
  const doc = parser.parseFromString(htmlText, "text/html");

  const titleElements = doc.getElementsByClassName("mmm"); // gets title elements
  const priceElements = doc.getElementsByClassName("price"); // gets price elements
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
      .replace(/\s/g, "")
      .toLowerCase()
      .includes(filterValue.toLowerCase())
  );
  console.log(matchArray);
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
        console.log("Currency is eur");
        numPrice *= 2; // multiply by exchange rate
      }
      prices.push(numPrice);
    }
  }
  prices = prices.filter((elem) => elem);
  //calculating avg price
  const avgPriceBGN = Math.round(prices.reduce((a, b) => a + b) / prices.length)

  return avgPriceBGN;
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

async function main(request: any, port: chrome.runtime.Port) {
  const flatGeneralCarObject = await extractAllListings()
  const objectMatchingFilter = matchElement(
    flatGeneralCarObject,
    request.filterValue as string // do a cache check here? or before calling matchElement?
  );

  // finding ancestor elements
  const filteredElements = objectMatchingFilter
    .map((elem) =>
      findClosestAncestorWithClass(elem.element, "tablereset")
    )
    .filter((elem) => elem) as Element[];

  console.log("log filtered elements: ", filteredElements)

  // break element before car listing begin -> append filtered elements after it
  const carTable = document.querySelector(
    ".tablereset.m-t-10 br:nth-of-type(2)"
  );

  // populate first page with filtered elements
  filteredElements.forEach((elem) =>
    carTable?.insertAdjacentElement("afterend", elem)
  );
  port.postMessage({ message: "loadingdone" });

  // TODO: from here on down, make an interface for the locastorage things, group together in a function

  // send avg price to popup
  const avgPrice = calculateAvgPrice(objectMatchingFilter);

  // search keywords
  const searchKeywords = fullSearchKeywords(
    request.filterValue as string
  );

  const filterElementsHTML = document.documentElement.innerHTML;

  let lastSearchString = ""
  chrome.storage.local.get(["lastSearches"], function(result){
    if (!result.lastSearches){
      lastSearchString = `search-${request.filterValue}<divider1>${filterElementsHTML}<divider2>`
    } else {
      const arr = result.lastSearches.split("<divider2>")

      // check if cache contains 3 items or more
      if (arr.length >= 3)
        lastSearchString = arr.slice(1).join("") + `search-${request.filterValue}<divider1>${filterElementsHTML}<divider2>`
      else lastSearchString = result.lastSearches + `search-${request.filterValue}<divider1>${filterElementsHTML}<divider2>`
    }


  })
  setTimeout(() => {
    chrome.storage.local.set({
      searchKeywords: searchKeywords,
      filterAmount: filteredElements.length,
      avgPrice: avgPrice,
      lastSearches: lastSearchString
    }); //TODO: create an interface for this - or a Map type
    port.postMessage({message: "localStorageUpdated"})
    console.log("local storage set.")

    chrome.storage.local.get(["lastSearches"], function(result) {
      console.log("testing last searches: ", result.lastSearches)
    })

    // remove pagination elements
    hidePagination("none");
  }, 500) // half a second wait to set lastSearchString properly
}


chrome.runtime.onConnect.addListener(function (port) {
  console.assert(port.name === "MOBILE_POPUP");
  port.onMessage.addListener(async function (request) {
    // TODO: create a union type for request states (successful, error, etc.)
    if (request.type === "popuprequest") {
      switch (request.message) {
        case "filter":
          chrome.storage.local.get(["lastSearches"], async function(result) {
            console.log("init result check: ", result.lastSearches)
            if (result.lastSearches){
                console.log("searches exist.")
                const arr = result.lastSearches.split("<divider2>")
                for (let i = 0; i < arr.length; i++){
                  const searchValue = arr[i].split("<divider1>")[0].split("search-")[1]
                  if (searchValue === request.filterValue) {
                    document.documentElement.innerHTML = arr[i].split("<divider1>")[1] // take html string from corresponding search value
                    port.postMessage({ message: "loadingdone" });
                    console.log("return early boi")
                    return
                  }
                }
                await main(request, port)
                console.log("main called 1")
            } else {
              await main(request, port)
              console.log("main called 2")
            }
          })
          break;
        case "removefilter":
          hidePagination("inline");
          document.documentElement.replaceChild(originalHTML, document.body);
          break;
        default:
          console.log("No message from popup.");
      }
    }
  });
});
