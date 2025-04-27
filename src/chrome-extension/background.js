// Map of domains to content script files
const domainScriptMap = {
  'unicornauctions.com': 'content-scripts/unicorn.js',
  'reservebar.com': 'content-scripts/reserve.js',
  'sothebys.com': 'content-scripts/sothebys.js',
  'wine-searcher.com': 'content-scripts/wine.js'
};

// Track currently active tab and its script
let currentTabId = null;
let currentDomain = null;

// Track which content scripts are ready in which tabs
const readyContentScripts = new Map();

// Listen for content script ready messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "contentScriptReady" && sender.tab) {
    const tabId = sender.tab.id;
    const domain = message.domain;
    
    console.log(`Content script for ${domain} is ready on tab ${tabId}`);
    
    // Initialize the map entry if it doesn't exist
    if (!readyContentScripts.has(tabId)) {
      readyContentScripts.set(tabId, new Set());
    }
    
    // Mark this script as ready
    readyContentScripts.get(tabId).add(domain);
    
    // Respond to the content script
    sendResponse({ received: true });
    
    // If we're already tracking a current domain, update the content scripts
    if (currentTabId === tabId && currentDomain) {
      notifyDomainChange(tabId, currentDomain);
    }
    
    return true;
  }
  
  // Handle other messages here if needed
  return false;
});

// Listen for tab updates (including URL changes)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    handleTabUpdate(tabId, tab.url);
  }
});

// Listen for tab activation (switching between tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      handleTabUpdate(tab.id, tab.url);
    }
  } catch (error) {
    console.error('Error getting tab:', error);
  }
});

// Listen for tab removal to clean up our tracking
chrome.tabs.onRemoved.addListener((tabId) => {
  if (readyContentScripts.has(tabId)) {
    readyContentScripts.delete(tabId);
    console.log(`Cleaned up tracking for closed tab ${tabId}`);
  }
  
  if (currentTabId === tabId) {
    currentTabId = null;
    currentDomain = null;
  }
});

// Handle tab URL updates
async function handleTabUpdate(tabId, url) {
  try {
    // Extract domain from URL
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Find matching domain from our map (partial match)
    const matchedDomain = Object.keys(domainScriptMap).find(domain => 
      hostname.includes(domain)
    );
    
    // If domain changed, update current domain
    if (matchedDomain && (tabId !== currentTabId || matchedDomain !== currentDomain)) {
      console.log(`Switching to domain: ${matchedDomain} on tab ${tabId}`);
      currentTabId = tabId;
      currentDomain = matchedDomain;
      
      // Notify all content scripts about the domain change
      notifyDomainChange(tabId, matchedDomain);
    }
  } catch (error) {
    console.error('Error handling tab update:', error);
  }
}

// Function to notify content scripts about domain changes
async function notifyDomainChange(tabId, domain) {
  // Only notify if we know content scripts are ready
  if (!readyContentScripts.has(tabId)) {
    console.log(`No ready content scripts for tab ${tabId}`);
    return;
  }
  
  console.log(`Notifying content scripts in tab ${tabId} that domain is now ${domain}`);
  
  // Send the message to the tab
  try {
    await chrome.tabs.sendMessage(tabId, { 
      action: 'domainChanged', 
      domain: domain 
    });
  } catch (error) {
    console.log(`Error sending domain change notification: ${error.message}`);
  }
} 