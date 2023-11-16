// establish long lived connections? https://stackoverflow.com/questions/13546778/how-to-communicate-between-popup-js-and-background-js-in-chrome-extension
chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
  chrome.tabs.sendMessage(
    tabs[0].id as number,
    { message: "filter" },
    function (response) {
      alert(response);
    }
  );
});
