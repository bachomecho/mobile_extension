chrome.webNavigation.onCompleted.addListener(function (res) {
  chrome.storage.local.set({ filterAmount: 0 });
});
