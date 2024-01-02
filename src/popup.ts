// initialize port
let port: chrome.runtime.Port;

chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
  port = chrome.tabs.connect(tabs[0].id as number, {
    name: "MOBILE_POPUP",
  });
  port.postMessage({ message: "connectToContentScript" });
});

function getLocalStorage() {
  chrome.storage.local.get(
    ["searchKeywords", "filterAmount", "avgPrice"],
    function (result) {
      document.getElementById("keywords")!.innerText = result.searchKeywords;
      document.getElementById("count")!.innerText = result.filterAmount;
      document.getElementById("avgprice")!.innerText =
        result.avgPrice.toLocaleString("bg-BG") + " лв.";
    }
  );
}
// getLocalStorage(); // getting local storage on intial load to show last search

function getSessionStorage() {
  const idKeyMap = new Map<string, string>([
    ["keywords", "searchKeywords"],
    ["count", "filterAmount"],
    ["avgprice", "avgPrice"],
  ]);
  for (let [key, value] of idKeyMap) {
    console.log("key: ", key, "value: ", value);
    console.log(key, document.getElementById(key)!.innerText);
    console.log(value, sessionStorage.getItem(value));
    document.getElementById(key)!.innerText = sessionStorage.getItem(value)!;
  }
}

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
    if (response.message == "sessionStorageUpdated") {
      getSessionStorage();
    }
  });
}

function removeFilter() {
  port.postMessage({ type: "popuprequest", message: "removefilter" });
  const storageKeys = ["searchKeywords", "filterAmount", "avgPrice"];
  chrome.storage.local.set(
    Object.fromEntries(storageKeys.map((key) => [key, 0]))
  );
  setTimeout(() => console.log("Waiting for half a second."), 500);
  getLocalStorage(); // getting cleared local storage
}

// adding button functionality
filterButton?.addEventListener("click", executeFilter, false);
document.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    executeFilter();
  }
});

removeFilterButton?.addEventListener("click", removeFilter);
