// get elements
const inputElement = document.getElementById("filtervalue") as HTMLInputElement;
inputElement.focus();
const filterButton = document.getElementById("filterbutton");
const removeFilterButton = document.getElementById("removefilter");

// init port
let port: chrome.runtime.Port;
chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
  port = chrome.tabs.connect(tabs[0].id as number, { name: "MOBILE_POPUP" });
});

// button functions
function executeFilter() {
  port.postMessage({ message: "filter", filterValue: inputElement.value });
  port.onMessage.addListener(function (response) {
    document.getElementById("count")!.innerText = response.value;
  });
}
function reloadPage() {
  port.postMessage({ message: "reload" });
}

filterButton?.addEventListener("click", executeFilter, false);
document.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    console.log("enter works!");
    executeFilter();
  }
});
removeFilterButton?.addEventListener("click", reloadPage);
