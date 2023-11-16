// establish long lived connections? https://stackoverflow.com/questions/13546778/how-to-communicate-between-popup-js-and-background-js-in-chrome-extension
const inputElement = document.getElementById("filtervalue") as HTMLInputElement;
const filterButton = document.getElementById("filterbutton");
function executeFilter() {
  chrome.tabs.query(
    { active: true, currentWindow: true },
    async function (tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id as number,
        { message: "filter", filterValue: inputElement?.value },
        function (response) {
          console.log(response);
        }
      );
    }
  );
}

filterButton?.addEventListener("click", executeFilter);
