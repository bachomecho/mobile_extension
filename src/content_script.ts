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

function findClosestAncestorWithClass(
  element: Element,
  className: string
): Element | null {
  if (element.classList.contains(className)) {
    return element;
  }

  // traverse the DOM tree upwards until a parent with the specified class is found
  let count = 0;
  while (element.parentElement) {
    element = element.parentElement;
    if (element.classList.contains(className) && count != 0) {
      return element;
    } else {
      count++;
      continue;
    }
  } // this count is needed because the first element with class tablereset is the car image and not the main parent node
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
  console.log(elements);
  const prices: number[] = [];
  for (let i = 0; i < elements.length; i++) {
    const splitPrice = elements[i].price.trim().split(" ");
    console.log("split price: ", splitPrice);
    console.log("split price sliced: ", splitPrice.slice(0, 2).join(""));
    const numPrice = parseInt(splitPrice.slice(0, 2).join(""));
    const currency = splitPrice.at(-1);
    if (currency?.toLowerCase() == "eur") numPrice * 2; // multiply by exchange rate

    prices.push(numPrice);
  }
  console.log("Array of prices: ", prices);
  const avgPriceBGN = Math.round(
    prices.reduce((a, b) => a + b) / prices.length
  ); //calculating avg price
  console.log("average price is: ", avgPriceBGN);

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

chrome.runtime.onConnect.addListener(function (port) {
  console.assert(port.name === "MOBILE_POPUP");
  port.onMessage.addListener(async function (request) {
    // TODO: create a union type for request states (successful, error, etc.)
    if (request.type === "popuprequest") {
      switch (request.message) {
        case "filter":
          const urls = createPaginationUrls();
          let generalCarObject: any[] = []; // TODO: change any type
          await Promise.all(
            urls.map(async (url) => {
              const response = await fetch(url);
              const decoder = new TextDecoder("windows-1251");
              const buffer = await response.arrayBuffer();
              const htmlString = decoder.decode(buffer);
              const pageNumber: string = url.charAt(url.length - 1);
              const cars = await createCarObjects(htmlString, pageNumber);
              generalCarObject.push(cars);
            })
          );
          // organise this in a function
          generalCarObject = [].concat(...generalCarObject);
          const objectMatchingFilter = matchElement(
            generalCarObject,
            request.filterValue as string
          );

          // finding ancestor elements
          const filteredElements = objectMatchingFilter
            .map((elem) =>
              findClosestAncestorWithClass(elem.element, "tablereset")
            )
            .filter((elem) => elem) as Element[];

          // break element before car listing begin -> append filtered elements after it
          const carTable = document.querySelector(
            ".tablereset.m-t-10 br:nth-of-type(2)"
          );

          // populuate first page with filtered elements
          filteredElements.forEach((elem) =>
            carTable?.insertAdjacentElement("afterend", elem)
          );

          // delete below after testing above
          chrome.storage.local.set({ filterAmount: filteredElements.length });
          setTimeout(() => console.log("Waiting for half a second."), 500); // local storage seems to need a little bit of time to update?
          port.postMessage({ message: "filterAmountStored" });

          // send avg price to popup
          const avgPrice = calculateAvgPrice(objectMatchingFilter);
          port.postMessage({ message: "avgprice", price: avgPrice });

          // remove pagination elements
          hidePagination("none");
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
