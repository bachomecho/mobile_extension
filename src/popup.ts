// initialize port
let port: chrome.runtime.Port;

chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
  port = chrome.tabs.connect(tabs[0].id as number, {
    name: "MOBILE_POPUP",
  });
  port.postMessage({ message: "connectToContentScript" });
});

// getting filteramount on extension startup or repeated open
chrome.storage.local.get(["filterAmount"], function (result) {
  document.getElementById("count")!.innerText = result.filterAmount;
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
    if (response.message == "filterAmountStored") {
      chrome.storage.local.get(["filterAmount"], function (result) {
        document.getElementById("count")!.innerText = result.filterAmount;
      });
    }
  });
}

function removeFilter() {
  port.postMessage({ type: "popuprequest", message: "removefilter" });
  document.getElementById("count")!.innerText = "0";
  chrome.storage.local.set({ filterAmount: 0 });
}

// adding button functionality
filterButton?.addEventListener("click", executeFilter, false);
document.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    executeFilter();
  }
});

removeFilterButton?.addEventListener("click", removeFilter);
