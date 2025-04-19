// Background script to handle communication between popup and content scripts
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

      // Execute a content script directly using chrome.scripting
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => {
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
              '.product_price',
              '.special-price',
              '.now-price',
              '.woocommerce-Price-amount',
              '.product-info-price',
              '.our-price',
              '.new-price',
              '.regular-price',
              '.actual-price',
              '.price-current',
              '.price-value',
              '.price__current',
              '.product-single__price',
              '.product-price__price',
              '.price__pricing-value',
              '.product__price--reg',
              '.price-item',
              '.price-final_price',
              '.highlight-price',
              '.price_tag',
              '.js-price-display',
              '.product_variation_price',
              '.regular_price'
            ];
            
            // Try each selector until we find a price
            for (const selector of priceSelectors) {
              const elements = document.querySelectorAll(selector);
              if (elements.length > 0) {
                for (const el of elements) {
                  if (el.textContent && el.textContent.trim()) {
                    let text = el.textContent.trim();
                    
                    // Clean up the price text (remove extra spaces, newlines, etc.)
                    text = text.replace(/\s+/g, ' ');
                    
                    // Return the first price found
                    return {
                      selector: selector,
                      text: text
                    };
                  }
                }
              }
            }
            
            // Try finding elements that might contain price based on text content
            const priceTextPatterns = [
              'Price:',
              'Total:',
              'Cost:',
              'Sale Price:',
              'Our Price:',
              'Regular Price:',
              'Your Price:'
            ];
            
            for (const pattern of priceTextPatterns) {
              const xpath = `//*[contains(text(), '${pattern}')]`;
              const elements = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
              
              for (let i = 0; i < elements.snapshotLength; i++) {
                const element = elements.snapshotItem(i) as Node;
                if (element && element.textContent) {
                  // Try to extract the price part
                  const text = element.textContent.trim();
                  
                  // Check if the element itself contains the price
                  if (/(\$|€|£|¥)\s*\d+([.,]\d+)?/.test(text)) {
                    return {
                      selector: `xpath-pattern-match:${pattern}`,
                      text: text
                    };
                  }
                  
                  // Check if the next sibling might contain the price
                  if (element instanceof HTMLElement && element.nextElementSibling) {
                    const nextSibling = element.nextElementSibling;
                    if (nextSibling.textContent && /(\$|€|£|¥)\s*\d+([.,]\d+)?/.test(nextSibling.textContent)) {
                      return {
                        selector: `xpath-pattern-sibling:${pattern}`,
                        text: nextSibling.textContent.trim()
                      };
                    }
                  }
                }
              }
            }
            
            // If no prices found with selectors, try regex pattern matching on the page content
            // Look for currency symbols followed by numbers with improved pattern
            const priceRegexPatterns = [
              /(\$|€|£|¥)\s*\d+([.,]\d+)?/gi,  // $10.99, €10,99
              /(\d+([.,]\d+)?\s*(USD|EUR|GBP|JPY|CAD|AUD))/gi,  // 10.99 USD
              /(USD|EUR|GBP|JPY|CAD|AUD)\s*\d+([.,]\d+)?/gi,  // USD 10.99
              /\b(price|cost|total):\s*(\$|€|£|¥)?\s*\d+([.,]\d+)?/gi  // price: $10.99
            ];
            
            for (const regex of priceRegexPatterns) {
              const bodyText = document.body.textContent || "";
              const match = regex.exec(bodyText);
              
              if (match) {
                return {
                  selector: "regex-match",
                  text: match[0].trim()
                };
              }
            }
            
            // Last resort - look for any number that looks like a price near product information
            try {
              // Try to find price near product title/name
              if (h1Elements.length > 0) {
                // Look at parent and siblings of h1
                const h1 = h1Elements[0];
                const parent = h1.parentElement;
                
                if (parent) {
                  // Look for potential price text in parent's content
                  const pricePattern = /(\$|€|£|¥)?\s*\d+([\.,]\d{2})?\b/i;
                  const parentContent = parent.textContent || "";
                  const priceMatch = parentContent.match(pricePattern);
                  
                  if (priceMatch && priceMatch[0]) {
                    return {
                      selector: "near-product-title",
                      text: priceMatch[0].trim()
                    };
                  }
                  
                  // Check siblings of h1 within parent
                  const siblings = Array.from(parent.children).filter(el => el !== h1);
                  for (const sibling of siblings) {
                    const siblingText = sibling.textContent || "";
                    const siblingPriceMatch = siblingText.match(pricePattern);
                    
                    if (siblingPriceMatch && siblingPriceMatch[0]) {
                      return {
                        selector: "sibling-of-product-title",
                        text: siblingPriceMatch[0].trim()
                      };
                    }
                  }
                }
              }
            } catch (e) {
              console.error("Error in last resort price finding:", e);
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