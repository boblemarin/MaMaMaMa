// Called when the user clicks on the extension icon.
chrome.action.onClicked.addListener(async (tab) => {

  await chrome.action.setIcon({path:"icon_active.png"});
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });
});

// Called on click in the page
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if( request.message === "open_new_tab" ) {
      chrome.tabs.create({"url": "docs/index.html?q=" + request.url});
      isActive = false;
      chrome.action.setIcon({path:"icon.png"});
    }
  }
);
