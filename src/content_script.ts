async function followLink(link: string | null): Promise<any> {
  try {
    const response = await fetch(link);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch longer title of listing: ${response.status} ${response.statusText}`
      );
    }

    const htmlString = await response.text();
    return htmlString;
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}
function parseDom(html: string): string {
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

  if (!title.toLowerCase().includes(filterValue.toLowerCase())) {
    //e39 not being recognized here - if typed in bulgarian it is recognized
    filteredElements.push(filterElement);
    filterElement.style.display = "none";
  } else {
    REMAINING_ELEMENTS++;
  }
}

type HTMLMap = Record<string, string>;
let filteredHTML: HTMLMap = {};
async function createCarObjects(
  html_text: string,
  filterValue: string,
  url: string
): Promise<void> {
  console.log("creating car objects");
  console.log(html_text);
  const parser = new DOMParser();
  const doc = parser.parseFromString(html_text, "text/html");
  const titleElements = doc.getElementsByClassName("mmm"); // gets title elements
  const priceElements = doc.getElementsByClassName("price"); // gets price elements
  const carObjList = new Array<CarElement>();
  for (let i = 2; i < titleElements.length; i++) {
    // first two elements with class mmm are not car elements so they are skipped over
    const element = titleElements[i] as HTMLElement;
    let textContent = element.textContent ?? "empty";
    let link: string | null = "";
    if (textContent.includes("...")) {
      link = element.getAttribute("href");
      const html = await followLink(link);
      // TODO: cache textcontents here: followlink requests html everytime
      textContent = parseDom(html);
    }
    carObjList.push({
      element: element,
      title: textContent,
      price: priceElements[i - 2].textContent!,
    });
  }
  carObjList.forEach((car) => hideElement(car.element, car.title, filterValue));
  const lastUrlChar = url.charAt(url.length - 1);
  filteredHTML[lastUrlChar] =
    document.getElementsByTagName("tbody")[1].innerHTML;
}

function createPaginationUrls(): string[] {
  let paginationUrls = new Array<string>();
  for (let i = 1; i <= 3; i++) {
    paginationUrls.push(window.location.href.replace(/.$/, i.toString()));
  }
  console.log("here are the pagination urls: ");
  return paginationUrls;
}

// async function extractHTML(urls: string[]): Promise<string[]> {
//   console.log(urls);
//   let htmlTexts: string[] = [];
//   urls.forEach(async (url) => {
//     const response = await fetch(url);
//     const html = await response.text();
//     htmlTexts.push(html);
//   });
//   console.log(htmlTexts);
//   return htmlTexts;
// }

// type filteredPage = { [pageNum: string]: HTMLElement };
// async function filterPages(request: any): Promise<filteredPage> {
//   console.log("filterPages function");
//   const filteredPages: filteredPage = {};
//   const urls = createPaginationUrls();
//   for (const url of urls) {
//     console.log(url);
//     const cars = await createCarObjects(url);
//     cars.map((car) => hideElement(car.element, car.title, request.filterValue));
//     filteredPages[url.charAt(url.length - 1)] =
//       document.querySelectorAll("tbody")[1];
//   }
//   return filteredPages;
// }

chrome.runtime.onConnect.addListener(function (port) {
  console.log("Connected");
  console.assert(port.name === "MOBILE_POPUP");
  port.onMessage.addListener(async function (request) {
    // TODO: create a union type for request states (successful, error, etc.)
    // TODO: add pagination to the filtering
    if (request.type === "popuprequest") {
      switch (request.message) {
        case "filter":
          // TODO: send object with page index and filtered page to popup.ts
          const urls = createPaginationUrls();
          await Promise.all(
            urls.map(async (url) => {
              const response = await fetch(url);
              const html = await response.text();
              await createCarObjects(html, request.filterValue, url);
            })
          );
          port.postMessage({
            type: "filterResponseContent",
            message: "filterAmount",
            filteredObj: filteredHTML,
            value: REMAINING_ELEMENTS,
          });
          REMAINING_ELEMENTS = 0;
          break;
        case "removefilter":
          filteredElements.map((element) => (element.style.display = "block"));
          break;
        default:
          console.log("No message from popup.");
      }
    }
  });
});
