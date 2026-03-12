// Superwhisper Remote Extension - Background Service Worker

const SUPERWHISPER_URLS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

// Find the Superwhisper tab
async function findSuperwhisperTab() {
  const tabs = await chrome.tabs.query({ url: SUPERWHISPER_URLS.map(u => `${u}/*`) });
  return tabs.find(tab => tab.url && SUPERWHISPER_URLS.some(u => tab.url.startsWith(u)));
}

// Send command to Superwhisper tab
async function sendCommand(action) {
  const tab = await findSuperwhisperTab();

  if (!tab) {
    // Try to open Superwhisper
    const newTab = await chrome.tabs.create({ url: 'http://localhost:3000', active: true });
    showNotification('Superwhisper Opened', 'Please log in and try again.');
    return;
  }

  // Execute script to trigger the action via BroadcastChannel
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (actionType) => {
        // Use the global superwhisper helper if available
        if (window.superwhisper && window.superwhisper[actionType]) {
          window.superwhisper[actionType]();
        } else {
          // Fallback: send via BroadcastChannel directly
          const channel = new BroadcastChannel('superwhisper-recording');
          channel.postMessage({ action: actionType });
          channel.close();
        }
      },
      args: [action]
    });

    // Focus the tab so user can see the result
    await chrome.tabs.update(tab.id, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });

  } catch (error) {
    console.error('Failed to send command:', error);
    showNotification('Error', 'Failed to communicate with Superwhisper');
  }
}

// Show notification
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon48.png',
    title: title,
    message: message
  });
}

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  console.log('Command received:', command);
  showNotification('Command received', command);

  switch (command) {
    case 'toggle-recording':
      await sendCommand('toggle');
      break;
    case 'start-recording':
      await sendCommand('start');
      break;
    case 'stop-recording':
      await sendCommand('stop');
      break;
  }
});

// Listen for extension icon click
chrome.action.onClicked.addListener(async () => {
  await sendCommand('toggle');
});

// Log when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('Superwhisper Remote extension installed');
  console.log('Shortcuts: Cmd/Ctrl+Shift+R (toggle), Cmd/Ctrl+Shift+S (start), Cmd/Ctrl+Shift+X (stop)');
});
