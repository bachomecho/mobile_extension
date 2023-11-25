// initialize port
let port: chrome.runtime.Port;
chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
  port = chrome.tabs.connect(tabs[0].id as number, {
    name: "MOBILE_POPUP",
  });
  port.postMessage({ message: "connectToContentScript" });
});

// get elements
const inputElement = document.getElementById("filtervalue") as HTMLInputElement;
inputElement.focus();
const filterButton = document.getElementById("filterbutton");
const removeFilterButton = document.getElementById("removefilter");

// button functions
function executeFilter() {
  port.postMessage({
    type: "popuprequest",
    message: "filter",
    filterValue: inputElement.value,
  });
  port.onMessage.addListener(function (response) {
    if (response.type === "filterResponseContent")
      document.getElementById("count")!.innerText = response.value;
  });
}
function removeFilter() {
  port.postMessage({ type: "popuprequest", message: "removefilter" });
  document.getElementById("count")!.innerText = "0";
}

filterButton?.addEventListener("click", executeFilter, false);
document.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    console.log("enter works!");
    executeFilter();
  }
});
removeFilterButton?.addEventListener("click", removeFilter);
