let exactFilterState = false;
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
const exactFilterButton = document.getElementById("exactfilterbutton");
const removeFilterButton = document.getElementById("removefilter");
const previousPageButton = document.getElementById("previouspage");
const nextPageButton = document.getElementById("nextpage");

// button functions
function executeFilter() {
  if (exactFilterState) {
    port.postMessage({
      type: "popuprequest",
      message: "exactFilter",
      filterValue: inputElement.value,
    });
  } else {
    port.postMessage({
      type: "popuprequest",
      message: "filter",
      filterValue: inputElement.value,
    });
  }
  port.onMessage.addListener(function (response) {
    if (response.type === "filterResponseContent")
      document.getElementById("count")!.innerText = response.value;
  });
}

function removeFilter() {
  port.postMessage({ type: "popuprequest", message: "removefilter" });
  document.getElementById("count")!.innerText = "0";
}

// adding button functionality
filterButton?.addEventListener("click", executeFilter, false);
document.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    console.log("enter works!");
    executeFilter();
  }
});

exactFilterButton?.addEventListener(
  "click",
  (e) => {
    exactFilterState = true;
    executeFilter();
    exactFilterState = false;
  },
  false
);
removeFilterButton?.addEventListener("click", removeFilter);
previousPageButton?.addEventListener("click", function (e) {
  port.postMessage({ type: "popuprequest", message: "previouspage" });
});
nextPageButton?.addEventListener("click", function (e) {
  port.postMessage({ type: "popuprequest", message: "nextpage" });
});
