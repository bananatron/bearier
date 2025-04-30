// Initialize when extension is installed or updated
chrome.runtime.onInstalled.addListener(function() {
  // Initialize storage with default values if needed
  chrome.storage.local.get(['blockedSites', 'blockingEnabled'], function(data) {
    if (data.blockedSites === undefined) {
      chrome.storage.local.set({blockedSites: []});
    }
    if (data.blockingEnabled === undefined) {
      chrome.storage.local.set({blockingEnabled: true});
    }
    updateBlockingRules();
  });
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'updateBlockingRules') {
    updateBlockingRules();
  } else if (message.action === 'updateBlockingStatus') {
    updateBlockingStatus(message.enabled);
  }
});

// Handle web navigation to check if URL should be blocked
chrome.webNavigation.onBeforeNavigate.addListener(function(details) {
  if (details.frameId !== 0) return; // Only check main frame
  
  chrome.storage.local.get(['blockedSites', 'blockingEnabled'], function(data) {
    if (!data.blockingEnabled) return;
    
    const url = new URL(details.url);
    const hostname = url.hostname;
    
    // Check if the hostname or any parent domain is in the blocked list
    const shouldBlock = data.blockedSites.some(blockedSite => {
      return hostname === blockedSite ||
             hostname.endsWith('.' + blockedSite);
    });
    
    if (shouldBlock) {
      // Redirect to a blocked page or Chrome's new tab
      chrome.tabs.update(details.tabId, {url: 'blocked.html'});
    }
  });
}, {url: [{schemes: ['http', 'https']}]});

// Function to update blocking rules
function updateBlockingRules() {
  chrome.storage.local.get(['blockedSites', 'blockingEnabled'], function(data) {
    const blockedSites = data.blockedSites || [];
    const blockingEnabled = data.blockingEnabled !== false;
    
    if (!blockingEnabled || blockedSites.length === 0) {
      // Clear rules if blocking is disabled or no sites to block
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [1] // Use a consistent rule ID
      });
      return;
    }
    
    // Create URL pattern for all blocked sites
    const urlPatterns = blockedSites.map(site => {
      // Match the domain and all subdomains
      return `*://*.${site}/*`;
    });
    
    // Create a rule to block these sites
    const rule = {
      id: 1, // Use a consistent rule ID
      priority: 1,
      action: {
        type: 'redirect',
        redirect: {
          url: chrome.runtime.getURL('blocked.html')
        }
      },
      condition: {
        urlFilter: urlPatterns.join('|'),
        resourceTypes: ['main_frame']
      }
    };
    
    // Update the blocking rules
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1], // Remove old rule
      addRules: [rule]
    });
  });
}

// Function to update blocking status
function updateBlockingStatus(enabled) {
  if (enabled) {
    updateBlockingRules();
  } else {
    // Clear rules if blocking is disabled
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1]
    });
  }
}