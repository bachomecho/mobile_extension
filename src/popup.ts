// initialize port
let port: chrome.runtime.Port;

chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
  port = chrome.tabs.connect(tabs[0].id as number, {name: "MOBILE_POPUP",});
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

  const loading = document.getElementById("loading")!;
  loading.textContent = "Зарежда...";

  port.onMessage.addListener(function (response) {
    if (response.type === "warning" && response.message === "no listings found")
      document.getElementById("warning")!.innerText = "Nqma namereni obqvi." // TODO: push separate
    if (response.type === "populate") {
      const cachedObject: CacheInfo = JSON.parse(response.message)
      document.getElementById("warning")!.innerText = ''
      document.getElementById("keywords")!.innerText = cachedObject.keywords
      document.getElementById("count")!.innerText = cachedObject.filterAmount.toString()
      document.getElementById("avgprice")!.innerText = cachedObject.avgPrice.toLocaleString("bg-BG") + " лв.";
      loading.textContent = ""
    }
  });
}

function removeFilter() {
  port.postMessage({ type: "popuprequest", message: "removefilter" });
  const storageKeys = ["keywords", "count", "avgprice"];
  for (const key of storageKeys) 
    document.getElementById(key)!.innerText = ''
}

filterButton?.addEventListener("click", executeFilter, false);
document.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    executeFilter();
  }
});

removeFilterButton?.addEventListener("click", removeFilter);
