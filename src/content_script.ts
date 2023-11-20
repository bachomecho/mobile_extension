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

async function hideHTML(filterValue: string): Promise<void> {
  const elements = document.getElementsByClassName("mmm"); // gets title elements
  const titleArray = new Array<string>();
  let allElements = new Array<HTMLElement>();
  let filterElementsArray = new Array<HTMLElement>();

  for (let i = 2; i < elements.length; i++) {
    const element = elements[i] as HTMLElement;
    let textContent = element.textContent ?? "empty";
    let link: string | null = "";
    if (textContent.includes("...")) {
      link = element.getAttribute("href");
      const html = await followLink(link);
      // TODO: cache textcontents here: followlink requests html everytime
      textContent = parseDom(html);
    }
    titleArray.push(textContent);
    const filterElement = findClosestAncestorWithClass(
      element,
      "tablereset"
    ) as HTMLElement;
    if (filterElement) {
      allElements.push(filterElement);
    }
    if (textContent.toLowerCase().includes(filterValue.toLowerCase())) {
      //e39 not being recognized here - if typed in bulgarian it is recognized
      filterElementsArray.push(filterElement);
    }
  }
  const elementsToFilter = allElements.filter(
    (e) => !filterElementsArray.includes(e)
  ); // elements from allElements that are not present in filterElementsArray
  console.log(allElements);
  console.log(filterElementsArray);
  console.log(elementsToFilter);
  elementsToFilter.forEach((e) => (e.style.display = "none"));
}

chrome.runtime.onMessage.addListener(async function (
  request,
  _sender,
  sendResponse
) {
  // TODO: add pagination to the filtering
  if (request.message === "filter") {
    sendResponse({
      confirm: "popup message was received by content_script",
      value: request.filterValue,
    });
    await hideHTML(request.filterValue);
    console.log("Filtered successfully!");
  }
});
