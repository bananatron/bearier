document.addEventListener('DOMContentLoaded', function() {
  const addSiteButton = document.getElementById('addSite');
  const siteInput = document.getElementById('siteInput');
  const blockedSitesList = document.getElementById('blockedSites');
  const blockingToggle = document.getElementById('blockingToggle');
  
  // Load saved blocked sites and blocking status
  loadBlockedSites();
  loadBlockingStatus();
  
  // Add site button click event
  addSiteButton.addEventListener('click', function() {
    addBlockedSite();
  });
  
  // Enter key to add site
  siteInput.addEventListener('keyup', function(e) {
    if (e.key === 'Enter') {
      addBlockedSite();
    }
  });
  
  // Toggle blocking status
  blockingToggle.addEventListener('change', function() {
    chrome.storage.local.set({blockingEnabled: blockingToggle.checked}, function() {
      // Update blocking rules in background
      chrome.runtime.sendMessage({action: 'updateBlockingStatus', enabled: blockingToggle.checked});
    });
  });
  
  // Function to add a new blocked site
  function addBlockedSite() {
    let site = siteInput.value.trim();
    
    if (site === '') return;
    
    // Clean up the URL (remove http://, https://, www. and paths)
    site = site.replace(/^(https?:\/\/)?(www\.)?/i, '');
    site = site.split('/')[0]; // Remove any paths
    
    // Check if site already exists
    chrome.storage.local.get('blockedSites', function(data) {
      let blockedSites = data.blockedSites || [];
      
      if (!blockedSites.includes(site)) {
        blockedSites.push(site);
        chrome.storage.local.set({blockedSites: blockedSites}, function() {
          loadBlockedSites();
          siteInput.value = '';
          // Update blocking rules in background
          chrome.runtime.sendMessage({action: 'updateBlockingRules'});
        });
      } else {
        alert('This site is already blocked!');
      }
    });
  }
  
  // Function to load blocked sites from storage
  function loadBlockedSites() {
    chrome.storage.local.get('blockedSites', function(data) {
      const blockedSites = data.blockedSites || [];
      
      // Clear current list
      blockedSitesList.innerHTML = '';
      
      // Add each site to the list
      blockedSites.forEach(function(site) {
        const li = document.createElement('li');
        
        const siteText = document.createElement('span');
        siteText.textContent = site;
        li.appendChild(siteText);
        
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'X';
        deleteButton.className = 'delete-btn';
        deleteButton.addEventListener('click', function() {
          removeSite(site);
        });
        li.appendChild(deleteButton);
        
        blockedSitesList.appendChild(li);
      });
    });
  }
  
  // Function to remove a site from blocked list
  function removeSite(site) {
    chrome.storage.local.get('blockedSites', function(data) {
      let blockedSites = data.blockedSites || [];
      
      const index = blockedSites.indexOf(site);
      if (index > -1) {
        blockedSites.splice(index, 1);
        chrome.storage.local.set({blockedSites: blockedSites}, function() {
          loadBlockedSites();
          // Update blocking rules in background
          chrome.runtime.sendMessage({action: 'updateBlockingRules'});
        });
      }
    });
  }
  
  // Function to load blocking status
  function loadBlockingStatus() {
    chrome.storage.local.get('blockingEnabled', function(data) {
      // Default to enabled if not set
      if (data.blockingEnabled === undefined) {
        blockingToggle.checked = true;
        chrome.storage.local.set({blockingEnabled: true});
      } else {
        blockingToggle.checked = data.blockingEnabled;
      }
    });
  }
});