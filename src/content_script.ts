// const template = document.createElement("template");
// template.innerHTML = `
//         <li>
//           ${[...obj]}
//         </li>`;

// class filteredCarListings extends HTMLElement {
//   constructor() {
//     super();

//     this.attachShadow({ mode: "open" });
//     this.shadowRoot?.appendChild(template.content.cloneNode(true));
//   }
//   set externalObject(obj: Element[]) {
//     if (this.shadowRoot) {
//       this.shadowRoot.innerHTML = `
//           <li>
//             ${[...obj]}
//           </li>
//         `;
//     }
//   }
// }

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

function matchElement(
  elementArray: CarElement[],
  filterValue: string
): Element[] {
  console.log(elementArray);
  const matchArray = elementArray.filter((elem) =>
    elem.title
      .replace(/\s/g, "")
      .toLowerCase()
      .includes(filterValue.toLowerCase())
  );

  const returnElems = matchArray
    .map((elem) => findClosestAncestorWithClass(elem.element, "tablereset"))
    .filter((elem) => elem) as Element[];
  console.log(returnElems);
  return returnElems;
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
  request_message: string
): void {
  port.postMessage({ type: request_type, message: request_message });
  port.onMessage.addListener((response, _port) => {
    document.getElementsByTagName("tbody")[1].outerHTML = response.html;
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
          generalCarObject = [].concat(...generalCarObject);
          const filteredElements = matchElement(
            generalCarObject,
            request.filterValue
          );
          console.log(filteredElements);

          const carTable = document.querySelector(
            ".tablereset.m-t-10 br:nth-of-type(2)"
          );

          filteredElements.forEach((elem) =>
            carTable?.insertAdjacentElement("afterend", elem)
          );

          port.postMessage({
            type: "filterResponseContent",
            message: "filterAmount",
            value: filteredElements.length,
          });

          document
            .querySelectorAll("span.pageNumbersSelect")
            .forEach((elem) => {
              const paginationElem = findClosestAncestorWithClass(
                elem,
                "tablereset"
              ) as HTMLElement;
              paginationElem.style.display = "none";
            });
          break;
        case "removefilter":
          break;
        default:
          console.log("No message from popup.");
      }
    }
  });
});
