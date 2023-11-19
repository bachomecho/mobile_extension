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
  for (let i = 2; i < elements.length; i++) {
    const element = elements[i] as HTMLElement;
    let textContent = element.textContent ?? "empty";
    let link: string | null = "";
    if (textContent.includes("...")) {
      link = element.getAttribute("href");
      const html = await followLink(link);
      textContent = parseDom(html);
    }
    titleArray.push(textContent);
    if (textContent.toLocaleLowerCase().includes(filterValue.toLowerCase())) {
      //e39 not being recognized here - if typed in bulgarian it is recognized
      const hideElement = findClosestAncestorWithClass(
        element,
        "tablereset"
      ) as HTMLElement;
      if (hideElement) {
        hideElement.style.border = "thick solid #ff0000";
      }
    }
  }
  console.log(titleArray);
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
