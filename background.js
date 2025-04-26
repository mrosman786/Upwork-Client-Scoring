// Initialize default settings when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({
      weights: {
        hiringRate: 40,
        paymentVerified: 15,
        lastSeen: 20,
        totalJobs: 10,
        totalSpending: 15
      },
      thresholds: {
        good: 75,
        average: 50
      },
      enabled: true
    });
  });

// Cache for job data to avoid repeated fetches
const jobDataCache = new Map();

// Function to fetch job page data
async function fetchJobPageData(jobUrl) {
  if (jobDataCache.has(jobUrl)) {
    return jobDataCache.get(jobUrl);
  }

  try {
    // Normalize URL to handle both old and new Upwork URL formats
    const normalizedUrl = normalizeUpworkUrl(jobUrl);
    
    console.log('Fetching job data from:', normalizedUrl);
    
    // Use fetch API with proper error handling
    const response = await fetch(normalizedUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    
    // Create a simple parser to extract data from HTML
    const clientData = extractDataFromHtml(html);
    
    console.log('Extracted client data:', clientData);
    jobDataCache.set(jobUrl, clientData);
    return clientData;
  } catch (error) {
    console.log('Error fetching job page:', error);
    return null;
  }
}

// Helper function to normalize Upwork URLs
function normalizeUpworkUrl(url) {
  // Convert /nx/jobs/ to /jobs/ if needed
  if (url.includes('/nx/jobs/')) {
    return url.replace('/nx/jobs/', '/jobs/');
  }
  return url;
}

// Function to extract data from HTML string
function extractDataFromHtml(html) {
  // Simple regex-based extraction instead of using DOMParser
  const clientData = {
    hiringRate: extractHiringRateFromHtml(html),
    paymentVerified: checkPaymentVerificationFromHtml(html),
    lastSeen: extractLastSeenFromHtml(html),
    totalJobs: extractTotalJobsFromHtml(html),
    totalSpending: extractTotalSpendingFromHtml(html)
  };
  
  return clientData;
}

// Helper functions to extract data from HTML string
function extractHiringRateFromHtml(html) {
  // Try to find hiring rate in HTML - updated for new Upwork UI
  const hiringRateMatch = html.match(/hire\s*rate[^>]*>([^<]*)(\d+)%/i) || 
                         html.match(/(\d+)%\s*hire\s*rate/i) ||
                         html.match(/hire\s*rate[^>]*>([^<]*)(\d+)/i) ||
                         html.match(/hire\s*rate[^>]*>([^<]*)(\d+)\s*%/i);
  
  if (hiringRateMatch) {
    return parseInt(hiringRateMatch[hiringRateMatch.length - 1]);
  }
  
  return null;
}

function checkPaymentVerificationFromHtml(html) {
  return html.includes('Payment method verified') || 
         html.includes('data-test="payment-verified"') ||
         html.includes('payment-verified-icon') ||
         html.includes('payment verified') ||
         html.includes('payment method verified');
}

function extractLastSeenFromHtml(html) {
  // Match the 'Last viewed by client' inside a .ca-item block
  const match = html.match(
    /<div[^>]*class=["'][^"']*ca-item[^"']*["'][^>]*>.*?<div[^>]*class=["'][^"']*title[^"']*["'][^>]*>Last viewed by client<\/div>.*?<div[^>]*class=["'][^"']*value[^"']*["'][^>]*>([^<]*)<\/div>.*?<\/div>/is
  );

  if (match) {
    return match[1].trim();
  }

  // Fallback: Look for common time references in text
  const bodyText = html.toLowerCase();
  const fallbackMatches = ['yesterday', 'minutes ago', 'hours ago', 'days ago'];

  for (const keyword of fallbackMatches) {
    if (bodyText.includes(keyword)) {
      return keyword;
    }
  }

  return null;
}


function extractTotalJobsFromHtml(html) {
  const jobsMatch = html.match(/jobs posted[^>]*>([^<]*)(\d+)/i) || 
                    html.match(/(\d+)\s+jobs\s+posted/i) ||
                    html.match(/posted\s+(\d+)\s+jobs/i) ||
                    html.match(/jobs\s+posted\s+(\d+)/i);
  
  if (jobsMatch) {
    return parseInt(jobsMatch[jobsMatch.length - 1]);
  }
  
  return null;
}

function extractTotalSpendingFromHtml(html) {
  // Look specifically for the "total spent" pattern
  const match = html.match(/\$([\d,.]+)([KMB]?)\s*<\/\b[^<]*total*\sspent/i);
  
  if (match) {
    let value = parseFloat(match[1].replace(/,/g, ''));
    const multiplier = match[2]?.toUpperCase();

    if (multiplier === 'K') value *= 1_000;
    else if (multiplier === 'M') value *= 1_000_000;
    else if (multiplier === 'B') value *= 1_000_000_000;

    return Math.round(value);
  }

  return null;
}



// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getSettings') {
    chrome.storage.sync.get(['weights', 'thresholds', 'enabled'], (result) => {
      sendResponse(result);
    });
    return true; // Required for async sendResponse
  }
  
  if (message.type === 'fetchJobData') {
    console.log('Received fetchJobData request for:', message.jobUrl);
    fetchJobPageData(message.jobUrl).then(data => {
      console.log('Sending response with data:', data);
      sendResponse(data);
    });
    return true; // Required for async sendResponse
  }
});