// Background script for handling notifications and storage
chrome.runtime.onInstalled.addListener(() => {
  console.log('Phishing Detector Extension installed');
});

// Listen for suspicious activities from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'suspicious_activity') {
    handleSuspiciousActivity(message, sender.tab);
  }
});

function handleSuspiciousActivity(message, tab) {
  // Show notification for suspicious activity
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.jpg',
    title: 'Suspicious Activity Detected',
    message: `Potential threats found on ${new URL(tab.url).hostname}`
  });

  // Store in local storage for history
  chrome.storage.local.get(['detectionHistory'], (result) => {
    const history = result.detectionHistory || [];
    history.push({
      url: message.url,
      activities: message.activities,
      timestamp: Date.now()
    });
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    chrome.storage.local.set({ detectionHistory: history });
  });
}

// Badge management
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  updateBadge(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    updateBadge(tabId);
  }
});

async function updateBadge(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.url.startsWith('http')) {
      // Check if URL is in known phishing list
      chrome.storage.local.get(['detectionHistory'], (result) => {
        const history = result.detectionHistory || [];
        const hasThreats = history.some(entry => entry.url === tab.url);
        
        if (hasThreats) {
          chrome.action.setBadgeText({
            text: '!',
            tabId: tabId
          });
          chrome.action.setBadgeBackgroundColor({
            color: '#FF0000',
            tabId: tabId
          });
        } else {
          chrome.action.setBadgeText({
            text: '',
            tabId: tabId
          });
        }
      });
    }
  } catch (error) {
    console.error('Error updating badge:', error);
  }
}
