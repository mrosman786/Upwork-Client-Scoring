function extractDataFromHtml(html) {
  const clientData = {
    hiringRate: extractHiringRateFromHtml(html),
    paymentVerified: checkPaymentVerificationFromHtml(html),
    lastSeen: extractLastSeenFromHtml(html),
    totalJobs: extractTotalJobsFromHtml(html),
    totalSpending: extractTotalSpendingFromHtml(html),
  };
  return clientData;
}


// Helper functions to extract data from HTML string
function extractHiringRateFromHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  let hiringRate = null;
  const elements = doc.querySelectorAll('*');
  elements.forEach((element) => {
    const text = element.textContent;
    if (text && text.match(/(\d+)%\s*hire\s*rate/i)) {
      const match = text.match(/(\d+)%\s*hire\s*rate/i);
      hiringRate = parseInt(match[1]);
    }
  });
  return hiringRate;
}

function checkPaymentVerificationFromHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return doc.body.textContent.includes('Payment method verified');
}

function extractLastSeenFromHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  let lastSeen = null;
  const elements = doc.querySelectorAll('*');
  elements.forEach((element) => {
    if (element.textContent.includes('Last viewed by client')) {
      lastSeen = element.textContent.trim();
    }
  });

  if (lastSeen === null && doc.body.textContent.includes('yesterday')) {
    return 'yesterday';
  }

  return lastSeen;
}

function extractTotalJobsFromHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  let totalJobs = null;
  const elements = doc.querySelectorAll('*');
  elements.forEach((element) => {
    const text = element.textContent;
    if (text && text.match(/(\d+)\s*jobs?\s*posted/i)) {
      const match = text.match(/(\d+)\s*jobs?\s*posted/i);
      totalJobs = parseInt(match[1]);
    }
  });
  return totalJobs;
}

function extractTotalSpendingFromHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  let totalSpending = null;
  const elements = doc.querySelectorAll('*');
  elements.forEach((element) => {
    const text = element.textContent;
    if (text && text.match(/\$\s*([0-9,]+)(?:\s*total\s*spent)?/i)) {
      const match = text.match(/\$\s*([0-9,]+)(?:\s*total\s*spent)?/i);
      totalSpending = parseInt(match[1].replace(/,/g, ''));
    }
  });
  return totalSpending;
}

// Send message to background script with the extracted data
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractData') {
    const html = document.documentElement.outerHTML;
    const data = extractDataFromHtml(html);
    sendResponse(data);
  }
});