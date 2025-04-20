// Background script to handle communication between popup and content scripts
let currentUrl = '';

// Listen for tab updates to detect URL changes
chrome.tabs.onUpdated.addListener((_, changeInfo, tab) => {    
  if (changeInfo.url && tab.url && tab.url !== currentUrl) {
    currentUrl = tab.url;
    console.log('URL changed to:', currentUrl);
    
    // Notify popup about URL change
    chrome.runtime.sendMessage({ action: "urlChanged", url: currentUrl });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Background script received message:', message);
  
  if (message.action === 'scrapeH1') {
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
        sendResponse({ success: false, message: 'No active tab found' });
        return;
      }

      if (activeTab.url) {
        currentUrl = activeTab.url;
      }

      // Execute a content script directly using chrome.scripting
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => {
          // Get product name from h1 elements
          const h1Elements = document.querySelectorAll('h1');
          const h1Content: string[] = [];
          
          if (h1Elements.length > 0) {
            h1Elements.forEach((element) => {
              if (element.textContent) {
                h1Content.push(element.textContent);
              }
            });
            
            // Find price information
            const priceInfo = findPriceInformation();
            
            return { 
              success: true, 
              h1Content,
              priceInfo
            };
          } else {
            return { success: false, message: 'No h1 tags found on this page' };
          }
          
          // Function to find price information using multiple selectors and patterns
          function findPriceInformation() {
            // Common selectors for price elements
            const priceSelectors = [
              '.price', 
              '.product-price', 
              '.offer-price',
              '.current-price',
              '.sale-price',
              '.amount',
              '.product__price',
              '[itemprop="price"]',
              '[data-price]',
              '.money',
              '.value',
              '.prc',
              '#price',
              '.price-box',
              'span.price',
              '.product-price-amount',
              '.product_price'
            ];
            
            // Try each selector until we find a price
            for (const selector of priceSelectors) {
              const elements = document.querySelectorAll(selector);
              if (elements.length > 0) {
                for (const el of elements) {
                  if (el.textContent && el.textContent.trim()) {
                    return {
                      selector: selector,
                      text: el.textContent.trim().replace(/\s+/g, ' ')
                    };
                  }
                }
              }
            }
            
            // Try finding elements with price based on text patterns
            const priceTextPatterns = [
              'Price:', 'Total:', 'Cost:', 'Sale Price:'
            ];
            
            for (const pattern of priceTextPatterns) {
              const xpath = `//*[contains(text(), '${pattern}')]`;
              const elements = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
              
              for (let i = 0; i < elements.snapshotLength; i++) {
                const element = elements.snapshotItem(i) as Node;
                if (element && element.textContent) {
                  const text = element.textContent.trim();
                  
                  // Check if element contains price
                  if (/(\$|€|£|¥)\s*\d+([.,]\d+)?/.test(text)) {
                    return {
                      selector: `xpath-match:${pattern}`,
                      text: text
                    };
                  }
                }
              }
            }
            
            // Look for currency symbols followed by numbers
            const bodyText = document.body.textContent || "";
            const priceMatch = bodyText.match(/(\$|€|£|¥)\s*\d+([.,]\d+)?/);
            
            if (priceMatch) {
              return {
                selector: "regex-match",
                text: priceMatch[0].trim()
              };
            }
            
            // No price found
            return null;
          }
        }
      }).then((results) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, message: chrome.runtime.lastError.message });
          return;
        }
        
        if (results && results[0]?.result) {
          sendResponse(results[0].result);
        } else {
          sendResponse({ success: false, message: 'Failed to execute content script' });
        }
      }).catch(error => {
        sendResponse({ success: false, message: error.message });
      });
    });
    
    // Return true to indicate that we will send a response asynchronously
    return true;
  }
});

// Export an empty object to keep the module system happy
export {}; 