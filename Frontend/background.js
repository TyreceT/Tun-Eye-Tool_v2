// background.js

chrome.runtime.onInstalled.addListener(() => {
  // Create context menu
  chrome.contextMenus.create({
    id: "tun-eye-analyze",
    title: "ipa-Tun-Eye | Fake News Detector",
    contexts: ["selection", "image"]
  });

  // Configure the side panel to open when the toolbar icon is clicked.
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Listens for Right-Click Action
chrome.contextMenus.onClicked.addListener((info, tab) => {
  let dataToAnalyze = {};
  if (info.selectionText) {
    dataToAnalyze = { type: 'text', data: info.selectionText };
  } else if (info.mediaType === 'image') {
    dataToAnalyze = { type: 'image', data: info.srcUrl };
  }
  
  // Save the content and then open the side panel for the current tab.
  chrome.storage.local.set({ contentToAnalyze: dataToAnalyze }, () => {
    chrome.sidePanel.open({ tabId: tab.id });
  });
});

// Listens for Message from the page (from content_selector.js)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "CONTENT_SELECTED") {
    // Save the content, which will automatically update the side panel.
    chrome.storage.local.set({ contentToAnalyze: request.payload });
  }
});