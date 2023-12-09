let htmlObjects: HTMLMap = {};
let currentUrl: string | undefined = "";
let currentPage: number;

function sendHtml(page: number, port: chrome.runtime.Port) {
  const currentHtml = htmlObjects[page];
  port.postMessage({ type: "background_content", html: currentHtml });
}
chrome.runtime.onConnect.addListener(function (port) {
  console.log("Connected content to background..");
  console.assert(port.name === "content_background_channel");
  port.onMessage.addListener(async function (request) {
    if (request.type === "toBackground") {
      htmlObjects = request.objects;
      console.log(htmlObjects);
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        currentUrl = tabs[0].url;
        if (currentUrl) {
          currentPage = parseInt(currentUrl.charAt(currentUrl.length - 1));
          sendHtml(currentPage, port);
        }
      });
    }
    if (request.type === "pagination") {
      if (request.message === "incrementCurrentPage") {
        if (currentPage >= 3) {
          console.log("Already at last page.");
        } else {
          console.log("Current page is: ", currentPage.toString());
          currentPage++;
          sendHtml(currentPage, port);
        }
      }
      if (request.message === "decrementCurrentPage") {
        if (currentPage <= 1) {
          console.log("Already at first page.");
        } else {
          console.log("Current page is: ", currentPage.toString());
          currentPage--;
          sendHtml(currentPage, port);
        }
      }
    }
  });
});
