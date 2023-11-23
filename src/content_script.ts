interface CarElement {
  element: HTMLElement;
  title: string;
  price: string;
  currency?: string;
}

async function followLink(link: string | null): Promise<any> {
  try {
    const response = await fetch(link);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch: ${response.status} ${response.statusText}`
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

async function createCarObjects(): Promise<CarElement[]> {
  const titleElements = document.getElementsByClassName("mmm"); // gets title elements
  const priceElements = document.getElementsByClassName("price");
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
  return carObjList;
}

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
    filterElement.style.display = "none";
  }
}
async function main(request: any) {
  const cars = await createCarObjects();
  cars.map((car) => hideElement(car.element, car.title, request.filterValue));
}
let remainingElementsLength: number;

// const filterElement = findClosestAncestorWithClass(
//   element,
//   "tablereset"
// ) as HTMLElement;
// if (filterElement) {
//   allElements.push(filterElement);
// }
// if (title.toLowerCase().includes(filterValue.toLowerCase())) {
//   //e39 not being recognized here - if typed in bulgarian it is recognized
//   remainElements.push(filterElement);
// }
// remainingElementsLength = remainElements.length;
// const elementsToFilter = allElements.filter(
//   (e) => !remainElements.includes(e)
// ); // elements from allElements that are not present in filterElementsArray
// return elementsToFilter;

function realhidehtml(
  allElements: HTMLElement[],
  remainElements: HTMLElement[]
) {
  remainingElementsLength = remainElements.length;
  const elementsToFilter = allElements.filter(
    (e) => !remainElements.includes(e)
  ); // elements from allElements that are not present in filterElementsArray
  return elementsToFilter;
}

chrome.runtime.onConnect.addListener(function (port) {
  console.log("Connected");
  console.assert(port.name === "MOBILE_POPUP");
  port.onMessage.addListener(async function (request) {
    // TODO: add pagination to the filtering
    switch (request.message) {
      case "filter":
        const elementsToFilter = await hideHTML(request.filterValue);
        elementsToFilter.forEach((e) => (e.style.display = "none"));
        console.log(remainingElementsLength);
        port.postMessage({
          message: "filterAmount",
          value: remainingElementsLength,
        });
        break;
      case "reload":
        window.location.reload();
        break;
      default:
        console.log("No message from popup.");
    }
  });
});
