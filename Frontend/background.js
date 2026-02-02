/* ==========================================================================
   PROGRAM: Tun-Eye Browser Extension Background Script
   FILE: background.js
   AUTHOR: G10 Tun-Eye Group
   SYSTEM: Tun-Eye Fake News Detector (Chrome Extension)
   CREATED: 10-09-2025
   LAST REVISED: 01-18-2026
   PURPOSE:
       Manages background-level behaviors of the Tun-Eye extension, including
       context menu creation, side panel control, and message coordination
       between the webpage, content selector, and side panel UI.
   DESCRIPTION:
       This script initializes the extension context menu on installation,
       controls when the side panel opens, and stores selected content for
       analysis using Chrome's local storage.
   NOTES:
       - Runs persistently in the background
       - Communicates with content_selector.js and sidepanel.js
       - Uses chrome.storage.local for cross-script data sharing
========================================================================== */

// Triggered when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {

  // Create right-click context menu for text and image analysis
  chrome.contextMenus.create({
    id: "tun-eye-analyze",
    title: "ipa-Tun-Eye | Fake News Detector",
    contexts: ["selection", "image"]
  });

  // Open side panel automatically when toolbar icon is clicked
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Listens for Right-Click Action for context menu selections
chrome.contextMenus.onClicked.addListener((info, tab) => {
  let dataToAnalyze = {};
  // Capture highlighted text
  if (info.selectionText) { 
    dataToAnalyze = { type: 'text', data: info.selectionText };
  } 
  // Capture clicked image
  else if (info.mediaType === 'image') {
    dataToAnalyze = { type: 'image', data: info.srcUrl };
  }
  
  // Store selected content and open the side panel for the active tab
  chrome.storage.local.set({ contentToAnalyze: dataToAnalyze }, () => {
    chrome.sidePanel.open({ tabId: tab.id });
  });
});

// Listen for messages from content_selector.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "CONTENT_SELECTED") {
    // Save selected content and notify the side panel via storage update
    chrome.storage.local.set({ contentToAnalyze: request.payload });
  }
});