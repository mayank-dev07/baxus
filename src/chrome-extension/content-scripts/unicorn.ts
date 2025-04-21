// Content script for unicornauctions.com
console.log("Unicorn Auctions Content Script loaded");

let isActive = true;

function scrapePageData() {
  let productName = "";
  
  // Log the beginning of scraping to help debug
  console.log("Starting product name scraping");
  
  // Method 1: Try direct attribute selector for the element with exact class list
  const directSelector = 'h1[class="text-[1.5rem] md:text-[2rem] font-black mb-3"]';
  const directH1 = document.querySelector(directSelector);
  console.log("Direct selector match:", directH1?.textContent || "No match");
  
  // Method 2: Try multiple attribute selectors
  const attributeSelector = 'h1[class*="text-[1.5rem]"][class*="md:text-[2rem]"][class*="font-black"][class*="mb-3"]';
  const attributeH1 = document.querySelector(attributeSelector);
  console.log("Attribute selector match:", attributeH1?.textContent || "No match");
  
  // Method 3: Try basic text content match
  const allH1s = document.querySelectorAll('h1');
  const textContentMatches: HTMLHeadingElement[] = [];
  
  allH1s.forEach((h1Element) => {
    const element = h1Element as HTMLHeadingElement;
    if (element.textContent && element.textContent.includes("Van Winkle")) {
      textContentMatches.push(element);
      console.log("Text content match found:", element.textContent);
    }
  });
  
  const textMatchH1 = textContentMatches.length > 0 ? textContentMatches[0] : null;
  
  // Try CSS.escape but with individual classes instead of joined
  const classes = ['text-[1.5rem]', 'md:text-[2rem]', 'font-black', 'mb-3'];
  let escapedSelector = 'h1';
  for (const cls of classes) {
    escapedSelector += `[class*="${CSS.escape(cls)}"]`;
  }
  const escapedH1 = document.querySelector(escapedSelector);
  console.log("Escaped selector match:", escapedH1?.textContent || "No match");
  
  // Use the first match from any method
  if (textMatchH1 && textMatchH1.textContent) {
    productName = textMatchH1.textContent.trim();
    console.log("Using text match:", productName);
  } else if (directH1 && directH1.textContent) {
    productName = directH1.textContent.trim();
    console.log("Using direct match:", productName);
  } else if (attributeH1 && attributeH1.textContent) {
    productName = attributeH1.textContent.trim();
    console.log("Using attribute match:", productName);
  } else if (escapedH1 && escapedH1.textContent) {
    productName = escapedH1.textContent.trim();
    console.log("Using escaped match:", productName);
  } else {
    // Fall back to original selectors
    const productH1 = document.querySelector('h1.product-title, h1.item-title, h1.auction-title');
    const containerH1 = document.querySelector('.product-details h1, .product-info h1, .item-details h1, .auction-item h1');
    
    if (productH1 && productH1.textContent) {
      productName = productH1.textContent.trim();
      console.log("Using product class match:", productName);
    } else if (containerH1 && containerH1.textContent) {
      productName = containerH1.textContent.trim();
      console.log("Using container match:", productName);
    }
  }
  
  // If we still don't have a product name, try the first h1
  const h1Elements = document.querySelectorAll("h1");
  const h1Content: string[] = [];

  if (h1Elements.length > 0) {
    if (!productName && h1Elements[0].textContent) {
      productName = h1Elements[0].textContent.trim();
      console.log("Using first h1 fallback:", productName);
    }
    
    h1Elements.forEach((element) => {
      if (element.textContent) {
        h1Content.push(element.textContent.trim());
      }
    });
    console.log("All h1 content:", h1Content);
  }

  const priceInfo = findPriceInformation();

  return {
    success: true,
    productName, // The specific product name from best match
    h1Content,   // Array of all h1 content as fallback
    priceInfo,
  };
}

// Function to find price information using multiple selectors and patterns
function findPriceInformation() {
  // Common selectors for price elements
  const priceSelectors = [
    ".price",
    ".product-price",
    ".offer-price",
    ".current-price",
    ".sale-price",
    ".amount",
    ".product__price",
    '[itemprop="price"]',
    "[data-price]",
    ".money",
    ".value",
    ".prc",
    "#price",
    ".price-box",
    "span.price",
    ".product-price-amount",
    ".product_price",
    // Unicorn auction specific selectors
    ".auction-price",
    ".bid-amount",
    ".current-bid",
    ".highest-bid",
  ];

  // Try each selector until we find a price
  for (const selector of priceSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      for (const el of elements) {
        if (el.textContent && el.textContent.trim()) {
          return {
            selector: selector,
            text: el.textContent.trim().replace(/\s+/g, " "),
          };
        }
      }
    }
  }

  // Try finding elements with price based on text patterns
  const priceTextPatterns = [
    "Price:",
    "Total:",
    "Cost:",
    "Sale Price:",
    "Current Bid:",
    "Starting Bid:",
    "Estimated Value:",
  ];

  for (const pattern of priceTextPatterns) {
    const xpath = `//*[contains(text(), '${pattern}')]`;
    const elements = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );

    for (let i = 0; i < elements.snapshotLength; i++) {
      const element = elements.snapshotItem(i) as Node;
      if (element && element.textContent) {
        const text = element.textContent.trim();

        // Check if element contains price
        if (/(\$|€|£|¥)\s*\d+([.,]\d+)?/.test(text)) {
          return {
            selector: `xpath-match:${pattern}`,
            text: text,
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
      text: priceMatch[0].trim(),
    };
  }

  // No price found
  return null;
}

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  console.log("Unicorn content script received message:", message);

  if (message.action === "scrapeH1") {
    try {
      const results = scrapePageData();
      sendResponse(results);
    } catch (error) {
      sendResponse({
        success: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return true; // Will respond asynchronously
  }

  // Handle domain change notifications from background script
  if (message.action === "domainChanged") {
    isActive = message.domain === "unicornauctions.com";
    console.log(`Unicorn script is now ${isActive ? "active" : "inactive"}`);
    sendResponse({ received: true });
    return true;
  }
});

// Let the background script know this content script is ready
chrome.runtime
  .sendMessage({
    action: "contentScriptReady",
    domain: "unicornauctions.com",
  })
  .catch((error) => {
    // It's okay if this fails when the background script isn't ready yet
    console.log(
      "Could not connect to background script yet, which is expected on initial load",
      error
    );
  });

// Set up a MutationObserver to detect when content changes
const observer = new MutationObserver((mutations) => {
  // Only process changes if this script is active
  if (!isActive) return;

  // Check if any mutation affects the content we care about
  const hasRelevantChange = mutations.some((mutation) => {
    const target = mutation.target as HTMLElement;
    
    // Check if the target is an h1 with our target product name content
    if (target.tagName === 'H1' && target.textContent && 
        (target.textContent.includes("Van Winkle") || 
         target.textContent.includes("Bourbon"))) {
      return true;
    }
    
    // Check if the target matches our other selectors
    return target.matches(
      'h1, ' +
      'h1[class*="text-"][class*="font-"], ' +
      'h1.product-title, h1.item-title, h1.auction-title, ' +
      '.product-details h1, .product-info h1, .item-details h1, .auction-item h1, ' +
      '.price, [itemprop="price"], [data-price]'
    );
  });

  if (hasRelevantChange) {
    chrome.runtime.sendMessage({ action: "contentChanged" }).catch((error) => {
      console.log("Error sending content changed message:", error);
    });
  }
});

// Start observing the document
observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true,
  attributes: true,
});

// Export an empty object to keep the module system happy
export {};
