console.log("Unicorn Auctions Content Script loaded");
let isActive = true;

function removeDialog() {
  const dialog = document.querySelector(
    ".dialog-overlay, .modal, [role='dialog']"
  );
  if (dialog && dialog.parentNode) {
    console.log("Removing dialog before scraping data");
    dialog.parentNode.removeChild(dialog);
    return true;
  }
  return false;
}

function scrapePageData() {
  removeDialog();

  const h1Elements = document.querySelectorAll("h1");
  let productName = "";

  if (h1Elements.length >= 3) {
    productName = h1Elements[2].textContent
      ? h1Elements[2].textContent.trim()
      : "";
  }

  const h1Content: string[] = [];
  h1Elements.forEach((element) => {
    if (element.textContent) {
      h1Content.push(element.textContent.trim());
    }
  });

  let priceInfo = null;
  const allParagraphs = document.querySelectorAll("p");
  for (const p of allParagraphs) {
    if (
      p.classList.length === 1 &&
      p.classList.contains("font-black") &&
      p.textContent
    ) {
      priceInfo = {
        selector: "p.font-black",
        text: p.textContent.trim().replace(/\s+/g, " "),
      };
      break;
    }
  }

  return {
    success: true,
    productName,
    h1Content,
    priceInfo,
  };
}

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
    return true;
  }

  if (message.action === "domainChanged") {
    isActive = message.domain === "unicornauctions.com";
    console.log(`Unicorn script is now ${isActive ? "active" : "inactive"}`);
    sendResponse({ received: true });
    return true;
  }
});

function initializeAndScrape() {
  if (document.readyState === "complete") {
    removeDialog();
  } else {
    window.addEventListener("load", removeDialog);
  }
}

initializeAndScrape();

chrome.runtime
  .sendMessage({
    action: "contentScriptReady",
    domain: "unicornauctions.com",
  })
  .catch((error) => {
    console.log(
      "Could not connect to background script yet, which is expected on initial load",
      error
    );
  });

const observer = new MutationObserver((mutations) => {
  if (!isActive) return;

  const hasRelevantChange = mutations.some((mutation) => {
    const target = mutation.target;
    return (
      (target instanceof Element && target.tagName === "H1") ||
      (target instanceof Element &&
        target.tagName === "P" &&
        target.classList.length === 1 &&
        target.classList.contains("font-black"))
    );
  });

  if (hasRelevantChange) {
    chrome.runtime.sendMessage({ action: "contentChanged" }).catch((error) => {
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
