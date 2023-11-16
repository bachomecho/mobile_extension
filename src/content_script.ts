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
  return doc.getElementsByTagName("h1")[0].textContent!.toLowerCase();
}

async function getTitleElements(
  className: string,
  filterValue: string
): Promise<void> {
  const elements = document.getElementsByClassName(className);

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i] as HTMLElement;
    let textContent = element.textContent ?? "empty";
    let link: string | null = "";
    if (textContent.includes("...")) {
      link = element.getAttribute("href");
      const html = await followLink(link);
      textContent = parseDom(html);
    }
    if (textContent.includes(filterValue.toLowerCase())) {
      const parentNode = element.parentNode;
      if (parentNode) {
        (parentNode as HTMLElement).style.display = "none"; // does not hide whole element
      }
    }
  }
}

chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  if (request.message === "filter") {
    sendResponse({
      confirm: "message received by content_script",
      value: request.filterValue,
    });
    await getTitleElements("mmm", request.filterValue);
    console.log("Filtered successfully!");
  }
});
