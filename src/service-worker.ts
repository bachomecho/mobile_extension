chrome.action.onClicked.addListener(async () => {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    // TODO: include user input here
    const response = await chrome.tabs.sendMessage(tab.id as number, {
      carmodel: "e39",
    });
    console.log(response);
  } catch (error) {
    console.error(`Script failed executing with following error: ${error}`);
  }
});
