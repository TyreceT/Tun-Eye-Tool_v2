/* ==========================================================================
   PROGRAM: Tun-Eye Extension UI Content Selector
   FILE: content_selector.js
   AUTHOR: G10 Tun-Eye Group
   SYSTEM: Tun-Eye Fake News Detector (Browser Extension)
   CREATED: 10-09-2025
   LAST REVISED: 01-18-2026
   PURPOSE:
       Handles content selection on web pages for analysis by the Tun-Eye
       extension. Allows users to select either highlighted text or clicked
       images and sends the selected content to the extension backend.
   DESCRIPTION:
       This script activates a temporary selection mode on the active webpage.
       During this mode, users can highlight text or click an image. The selected
       content is captured and sent to the extension using Chrome messaging.
   NOTES:
       - Selection mode is visually indicated by a cursor change and notice
       - Event listeners are cleaned up immediately after selection
       - Works in coordination with sidepanel.js
========================================================================== */

// Activate selection mode on the current webpage

const activateSelector = () => {

  // Create a temporary on-screen notice for user guidance
  const notice = document.createElement('div');
  notice.textContent = "Selection mode active. Highlight text or click an image.";
  
  // Visual Styles
  Object.assign(notice.style, {
    position: 'fixed',
    top: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#7ebfebff',
    color: '#383737ff',
    padding: '6px 12px',
    borderRadius: '5px',
    fontSize: '12px',
    zIndex: '999999',
    fontFamily: 'Poppins, sans-serif',
    transition: 'opacity 0.5s ease',
  });

  // Display notice and auto-remove after 3 seconds
  document.body.appendChild(notice);
  setTimeout(() => notice.remove(), 3000);

  // Change cursor to indicate selection mode
  document.body.style.cursor = 'crosshair';

  // Restore default behavior and remove listeners
  const cleanup = () => {
    document.body.style.cursor = 'default';
    document.removeEventListener('mouseup', textSelectHandler);
    document.removeEventListener('click', imageClickHandler, true);
  };

  // Handle highlighted text selection
  const textSelectHandler = () => {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
      chrome.runtime.sendMessage({
        type: "CONTENT_SELECTED",
        payload: { type: 'text', data: selectedText }
      });
      cleanup();
    }
  };

  // Handle image selection via click
  const imageClickHandler = (event) => {
    if (event.target.tagName === 'IMG') {
      event.preventDefault();
      event.stopPropagation();
      chrome.runtime.sendMessage({
        type: "CONTENT_SELECTED",
        payload: { type: 'image', data: event.target.src }
      });
      cleanup();
    }
  };

  // Enable listeners for text and image selection
  document.addEventListener('mouseup', textSelectHandler);
  document.addEventListener('click', imageClickHandler, true);
};

// Listen for activation command from the extension UI
chrome.runtime.onMessage.addListener((request) => {
  if (request.type === "ACTIVATE_SELECTION_MODE") {
    activateSelector();
  }
});
