chrome.webNavigation.onCompleted.addListener(function (res) {
  console.log("what is going on?");
  chrome.storage.local.set({ filterAmount: 0 });
});
