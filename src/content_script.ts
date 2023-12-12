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

function findClosestAncestorWithClass(element: Element, className: string) {
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

  console.log(`ancestor element not found for ${element}`);
  return null;
}

interface CarElement {
  element: HTMLElement;
  title: string;
  price: string;
  currency?: string;
}

let filteredElements: Array<HTMLElement> = [];
let REMAINING_ELEMENTS = 0;
function hideElement(
  element: HTMLElement,
  title: string,
  filterValue: string
): void {
  const filterElement = findClosestAncestorWithClass(
    element,
    "tablereset"
  ) as HTMLElement;
  const titleNoWhitespace = title.replace(/\s/g, "");
  if (!titleNoWhitespace.toLowerCase().includes(filterValue.toLowerCase())) {
    //NOTE: e39 not being recognized here - if typed in bulgarian it is recognized
    filteredElements.push(filterElement);
    filterElement.style.display = "none";
  } else {
    REMAINING_ELEMENTS++;
  }
}

type HTMLMap = Record<number, string>;
let filteredHTML: HTMLMap = {};
async function createCarObjects(
  htmlText: string,
  filterValue: string,
  url: string
): Promise<void> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, "text/html");

  const titleElements = doc.getElementsByClassName("mmm"); // gets title elements
  const priceElements = doc.getElementsByClassName("price"); // gets price elements
  const carObjList = new Array<CarElement>();
  for (let i = 2; i < titleElements.length; i++) {
    // first two elements with class mmm are not car elements so they are skipped over
    const element = titleElements[i] as HTMLElement;
    let textContent = element.textContent ?? "empty";
    if (textContent.includes("...")) {
      const link = element.getAttribute("href");
      if (link) {
        const html = await followLink(link);
        textContent = parseTitleFromLink(html!);
      }
    }
    carObjList.push({
      element: element,
      title: textContent,
      price: priceElements[i - 2].textContent!,
    });
  }
  carObjList.forEach((car) => hideElement(car.element, car.title, filterValue));

  const lastUrlChar = parseInt(url.charAt(url.length - 1));

  filteredHTML[lastUrlChar] = doc.getElementsByTagName("tbody")[1].outerHTML;
}

function createPaginationUrls(): string[] {
  let paginationUrls = new Array<string>();
  for (let i = 1; i <= 3; i++) {
    paginationUrls.push(window.location.href.replace(/.$/, i.toString()));
  }
  return paginationUrls;
}

function contentBackgroundCommunication(
  port: chrome.runtime.Port,
  request_type: string,
  request_message: string | HTMLMap
): void {
  port.postMessage({ type: request_type, message: request_message });
  port.onMessage.addListener((response, _port) => {
    document.getElementsByTagName("tbody")[1].outerHTML = response.html;
  });
}

chrome.runtime.onConnect.addListener(function (port) {
  console.assert(port.name === "MOBILE_POPUP");
  const contentPort = chrome.runtime.connect({
    name: "content_background_channel",
  });
  port.onMessage.addListener(async function (request) {
    // TODO: create a union type for request states (successful, error, etc.)
    if (request.type === "popuprequest") {
      switch (request.message) {
        case "filter":
          const urls = createPaginationUrls();
          await Promise.all(
            urls.map(async (url) => {
              const response = await fetch(url);
              const decoder = new TextDecoder("windows-1251");
              const buffer = await response.arrayBuffer();
              const htmlString = decoder.decode(buffer);
              await createCarObjects(htmlString, request.filterValue, url);
            })
          );
          contentBackgroundCommunication(
            contentPort,
            "filtering",
            JSON.stringify(filteredHTML)
          );
          port.postMessage({
            type: "filterResponseContent",
            message: "filterAmount",
            value: REMAINING_ELEMENTS,
          });
          REMAINING_ELEMENTS = 0;
          break;
        case "removefilter":
          filteredElements.map((element) => (element.style.display = "block")); // TODO: needs revision
          break;
        case "previouspage": // TODO: these will probably become obsolete once all elements matching filter are shown on one page
          contentBackgroundCommunication(
            contentPort,
            "pagination",
            "decrementCurrentPage"
          );
          break;
        case "nextpage":
          contentBackgroundCommunication(
            contentPort,
            "pagination",
            "incrementCurrentPage"
          );
          break;
        default:
          console.log("No message from popup.");
      }
    }
  });
});
