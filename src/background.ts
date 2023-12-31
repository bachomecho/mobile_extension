chrome.webNavigation.onCommitted.addListener(function (details) {
  if (details.frameId === 0 && details.transitionType === "reload") {
    console.log("Page reloaded!");
    chrome.storage.local.set({ filterAmount: 0 });
  }
});
// should be no problem for other tabs as extension is only scoping mobile.bg, right?
