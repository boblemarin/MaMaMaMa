let isActive = false;

// Called when the user clicks on the browser action.
chrome.browserAction.onClicked.addListener(function(tab) {
  if (isActive) {
    deactivate();
  } else {
    activate();
  }
});

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if( request.message === "open_new_tab" ) {
      chrome.tabs.create({"url": "docs/index.html?q=" + request.url});
      isActive = false;
      chrome.browserAction.setIcon({path:"icon.png"});
    }
  }
);

chrome.tabs.onActivated.addListener(
  function(activeInfo) {
    deactivate();
  }
);

function activate() {
  if (!isActive) {
    isActive = true;
    chrome.browserAction.setIcon({path:"icon_active.png"});
    chrome.tabs.executeScript({
      file: 'content.js'
    });
  }
}

function deactivate() {
  if (isActive) {
    isActive = false;
    chrome.browserAction.setIcon({path:"icon.png"});
  }
}