console.log("Wine Searcher Content Script loaded");

let isActive = true;

function scrapePageData() {
  const h1Elements = document.querySelectorAll("h1");
  const h1Content: string[] = [];

  if (h1Elements.length > 0) {
    h1Elements.forEach((element) => {
      if (element.textContent) {
        h1Content.push(element.textContent);
      }
    });
  }

  const priceInfo = findPriceInformation();

  return {
    success: true,
    h1Content,
    priceInfo,
  };
}

function findPriceInformation() {
  const priceSelectors = [
    ".price",
  ];

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

  const priceTextPatterns = ["Price:", "Total:", "Cost:", "Sale Price:"];

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

        if (/(\$|€|£|¥)\s*\d+([.,]\d+)?/.test(text)) {
          return {
            selector: `xpath-match:${pattern}`,
            text: text,
          };
        }
      }
    }
  }

  const bodyText = document.body.textContent || "";
  const priceMatch = bodyText.match(/(\$|€|£|¥)\s*\d+([.,]\d+)?/);

  if (priceMatch) {
    return {
      selector: "regex-match",
      text: priceMatch[0].trim(),
    };
  }

  return null;
}

chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  console.log("Wine content script received message:", message);

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
    return true;
  }
  
  if (message.action === "domainChanged") {
    isActive = message.domain === "wine-searcher.com";
    console.log(`Wine Searcher script is now ${isActive ? 'active' : 'inactive'}`);
    sendResponse({ received: true });
    return true;
  }
});

chrome.runtime.sendMessage({ 
  action: "contentScriptReady", 
  domain: "wine-searcher.com" 
}).catch(error => {
  console.log("Could not connect to background script yet, which is expected on initial load",error);
});

const observer = new MutationObserver((mutations) => {
  if (!isActive) return;
  
  const hasRelevantChange = mutations.some((mutation) => {
    const target = mutation.target as HTMLElement;
    return target.matches('h1, .price, [itemprop="price"], [data-price]');
  });

  if (hasRelevantChange) {
    chrome.runtime.sendMessage({ action: "contentChanged" })
    .catch(error => {
      console.log("Error sending content changed message:", error);
    });
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true,
  attributes: true,
});

export {};
