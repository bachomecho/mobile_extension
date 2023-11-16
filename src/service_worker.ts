chrome.runtime.onConnect.addListener(function (port) {
  console.log("Connected .....");
  port.onMessage.addListener(function (msg) {
    console.log("message recieved" + msg);
    port.postMessage("Hi Popup.js");
  });
});
// chrome.windows.create({
//   url: "popup.html",
//   type: "popup",
//   width: 300,
//   height: 400,
// });
//   try {
//     const [tab] = await chrome.tabs.query({
//       active: true,
//       lastFocusedWindow: true,
//     });
//     // TODO: include user input here
//     const response = await chrome.tabs.sendMessage(tab.id as number, {
//       carmodel: userInput,
//     });
//     console.log(response);
//   } catch (error) {
//     console.error(`Script failed executing with following error: ${error}`);
//   }
