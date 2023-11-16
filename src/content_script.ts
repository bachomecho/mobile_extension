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
function parseDom(html: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  // getting title from follow link
  return doc.getElementsByTagName("h1")[0].textContent!;
}

async function getTextContentByClassName(className: string): Promise<string[]> {
  const elements = document.getElementsByClassName(className);
  const textContents: string[] = [];

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i] as HTMLElement;
    let textContent = element.textContent ?? "empty";
    let link: string | null = "";
    if (textContent.includes("...")) {
      link = element.getAttribute("href");
      const html = await followLink(link);
      textContent = parseDom(html);
    }
    textContents.push(textContent);
  }

  return textContents;
}

chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  if (request.message === "filter") {
    sendResponse({ confirm: "message received by content_script" });
    let classTextContents = await getTextContentByClassName("mmm");
    classTextContents = classTextContents
      .slice(2)
      .map((item) => item.toLowerCase());
    console.log(classTextContents);
  }
});
