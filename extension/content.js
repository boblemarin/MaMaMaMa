console.log("MAMAMAMA: content script activated");

var styleEl = document.createElement('style');
document.head.appendChild(styleEl);
var styleSheet = styleEl.sheet;
styleSheet.insertRule('img:hover { border: 15px dotted red; cursor: crosshair; box-sizing: border-box;}', 0);
document.addEventListener("mousedown", onClickInDocument);

function onClickInDocument(event) {
  if (event.target.tagName == 'IMG' ){
    event.preventDefault();
    event.stopImmediatePropagation();
    document.removeEventListener("mousedown", onClickInDocument);
    document.head.removeChild(styleEl);
    console.log(event.target.src);
    chrome.runtime.sendMessage({"message": "open_new_tab", "url": event.target.src});
  }
}