// establish long lived connections? https://stackoverflow.com/questions/13546778/how-to-communicate-between-popup-js-and-background-js-in-chrome-extension
const inputElement = document.getElementById("filtervalue") as HTMLInputElement;
inputElement.focus();
const filterButton = document.getElementById("filterbutton");
const removeFilterButton = document.getElementById("removefilter");
function executeFilter() {
  chrome.tabs.query(
    { active: true, currentWindow: true },
    async function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id as number, {
        message: "filter",
        filterValue: inputElement?.value,
      });
    }
  );
}
function reloadPage() {
  chrome.tabs.query(
    { active: true, currentWindow: true },
    async function (tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id as number,
        { message: "reload" },
        function (response) {
          console.log(response);
        }
      );
    }
  );
}
filterButton?.addEventListener("click", executeFilter, false);
document.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    console.log("enter works!");
    executeFilter();
  }
});
removeFilterButton?.addEventListener("click", reloadPage);
