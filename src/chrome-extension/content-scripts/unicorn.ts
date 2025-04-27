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

  let spiritType = null;
  const spiritTypeElements = document.querySelectorAll(".flex.items-center.mb-6");
  for (const element of spiritTypeElements) {
    const spiritTypeSpan = element.querySelector("span.inline-block.border.border-black.py-1.px-2.font-black.uppercase.text-\\[0\\.75rem\\].mr-2");
    if (spiritTypeSpan && spiritTypeSpan.textContent) {
      spiritType = {
        selector: ".flex.items-center.mb-6 span.inline-block.border.border-black.uppercase",
        text: spiritTypeSpan.textContent.trim()
      };
      break;
    }
  }

  return {
    success: true,
    h1Content,
    priceInfo,
    spiritType,
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
        target.classList.contains("font-black")) ||
      (target instanceof Element &&
        target.classList.contains("flex") &&
        target.classList.contains("items-center") &&
        target.classList.contains("mb-6")) ||
      (target instanceof Element &&
        target.tagName === "SPAN" &&
        target.classList.contains("inline-block") &&
        target.classList.contains("border") &&
        target.classList.contains("font-black") &&
        target.classList.contains("uppercase"))
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
