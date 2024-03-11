// initialize port
let port: chrome.runtime.Port;

chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
  port = chrome.tabs.connect(tabs[0].id as number, { name: "MOBILE_POPUP" });
  port.postMessage({ message: "connectToContentScript" });
});

function populateData(data: SearchInfo) {
  document.getElementById("warning")!.innerText = "";
  document.getElementById("keywords")!.innerText = data.keywords;
  document.getElementById("count")!.innerText = data.filterAmount.toString();
  document.getElementById("avgprice")!.innerText =
    data.avgPrice.toLocaleString("bg-BG") + " лв.";
}

// when popup is opened, load data last searched query

chrome.storage.local.get(["lastSearches"], function (result) {
  if (result.lastSearches) {
    const lastCachedItem: SearchInfo = JSON.parse(result.lastSearches).at(-1);
    populateData(lastCachedItem);
  }
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

  const loading = document.getElementById("loading")!;
  loading.textContent = "Зарежда...";

  port.onMessage.addListener(function (response) {
    if (response.type === "warning" && response.message === "no listings found")
      document.getElementById("warning")!.innerText = "Няма намерени обяви";
    if (response.type === "populate") {
      const cachedObject: SearchInfo = JSON.parse(response.message);
      populateData(cachedObject);
      loading.textContent = "";
    }
  });
}

function removeFilter() {
  port.postMessage({ type: "popuprequest", message: "removefilter" });
  const storageKeys = ["keywords", "count", "avgprice"];
  for (const key of storageKeys) document.getElementById(key)!.innerText = "";
}

filterButton?.addEventListener("click", executeFilter, false);
document.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    executeFilter();
  }
});

removeFilterButton?.addEventListener("click", removeFilter);
