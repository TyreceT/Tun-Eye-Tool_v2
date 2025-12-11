// content_selector.js

// --- Activate Selection Mode ---
const activateSelector = () => {
  // Optional: Small on-screen notice instead of alert
  const notice = document.createElement('div');
  notice.textContent = "Selection mode active. Highlight text or click an image.";
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
  document.body.appendChild(notice);
  setTimeout(() => notice.remove(), 3000);

  // Change cursor to indicate selection mode
  document.body.style.cursor = 'crosshair';

  // --- Cleanup function to restore defaults ---
  const cleanup = () => {
    document.body.style.cursor = 'default';
    document.removeEventListener('mouseup', textSelectHandler);
    document.removeEventListener('click', imageClickHandler, true);
  };

  // --- Handle text selection ---
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

  // --- Handle image click ---
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

  // --- Add listeners for text and image selection ---
  document.addEventListener('mouseup', textSelectHandler);
  document.addEventListener('click', imageClickHandler, true);
};

// --- Listen for activation from the extension ---
chrome.runtime.onMessage.addListener((request) => {
  if (request.type === "ACTIVATE_SELECTION_MODE") {
    activateSelector();
  }
});
