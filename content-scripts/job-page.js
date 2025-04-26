// This is the updated job-page.js with fixed selectors
chrome.runtime.sendMessage({ type: 'getSettings' }, (settings) => {
  if (settings && settings.enabled) {
    analyzeJobPage(settings);
  }
});

function analyzeJobPage(settings) {
  // Wait for client info section to load
  setTimeout(() => {
    // Get client info section using standard selectors without jQuery syntax
    const clientInfoSection = document.querySelector('[data-test="client-info"]') || 
                             document.querySelector('.up-card-section') || 
                             document.querySelector('.job-details-card');
    
    // Verify if this section contains client info by checking its text content
    if (!clientInfoSection || 
        !(clientInfoSection.textContent.includes('About the client') || 
          clientInfoSection.textContent.includes('Payment method'))) return;
    
    // Extract client data
    const clientData = {
      hiringRate: extractHiringRate(),
      paymentVerified: checkPaymentVerification(),
      lastSeen: extractLastSeen(),
      totalJobs: extractTotalJobs(),
      totalSpending: extractTotalSpending()
    };
    
    // Log extracted data for debugging
    console.log('Upwork Client Scoring - Extracted data:', clientData);
    
    // Calculate the clients score
    const score = calculateclientsScore(clientData, settings.weights);
    
    // Display the score widget
    const titleContainer = document.querySelector('.job-title-wrapper') || 
                          document.querySelector('[data-test="job-title"]') ||
                          document.querySelector('h1');
                          
    if (titleContainer) {
      displayScoreWidget(score, settings.thresholds, titleContainer);
    } else {
      // Fallback to another container if job title not found
      const alternativeContainer = document.querySelector('div.d-flex.posted-on-line');

      if (alternativeContainer) {
        displayScoreWidget(score, settings.thresholds, alternativeContainer);
      }
    }
  }, 1500); // Increased delay to ensure page is fully loaded
}

// Updated data extraction functions

function extractHiringRate() {
  // Look for the hire rate text with pure JS
  const elements = document.querySelectorAll('*');
  for (let element of elements) {
    const text = element.textContent;
    if (text && text.match(/(\d+)%\s*hire\s*rate/i)) {
      const match = text.match(/(\d+)%\s*hire\s*rate/i);
      return parseInt(match[1]);
    }
  }
  return null;
}

function checkPaymentVerification() {
  // Check if payment method verified is present
  return document.body.textContent.includes('Payment method verified');
}

function extractLastSeen() {
  // Narrow the search to .ca-item blocks only
  const caItems = document.querySelectorAll('.ca-item');
  
  for (let item of caItems) {
    const titleEl = item.querySelector('.title');
    const valueEl = item.querySelector('.value');

    if (titleEl && titleEl.textContent.includes('Last viewed by client')) {
      return valueEl?.textContent.trim() || null;
    }
  }

  // Fallback: Look for common time references in body text
  const bodyText = document.body.textContent.toLowerCase();
  const fallbackMatches = ['yesterday', 'minutes ago', 'hours ago', 'days ago'];

  for (let keyword of fallbackMatches) {
    if (bodyText.includes(keyword)) {
      return keyword;
    }
  }

  return null;
}


function extractTotalJobs() {
  // Look for "X jobs posted" pattern
  const elements = document.querySelectorAll('*');
  for (let element of elements) {
    const text = element.textContent;
    if (text && text.match(/(\d+)\s*jobs?\s*posted/i)) {
      const match = text.match(/(\d+)\s*jobs?\s*posted/i);
      return parseInt(match[1]);
    }
  }
  
  return null;
}

function extractTotalSpending() {
    try {
        // Get the element containing the amount
        const spendElement = document.querySelector('[data-qa="client-spend"] span span');
        
        if (!spendElement) {
            console.log("Spending element not found");
            return 0; // Or return null; depending on your needs
        }

        // Extract the text (e.g., "$16K")
        const amountText = spendElement.textContent.trim();
        
        // Extract numeric value and suffix (K/M)
        const match = amountText.match(/^\$?(\d+\.?\d*)([KM]?)$/i); // Supports decimals
        
        if (!match) {
            console.log("Could not parse spending value");
            return 0; // Or return null;
        }

        const numericValue = parseFloat(match[1]);
        const suffix = match[2].toUpperCase(); // Ensure uppercase for comparison
        
        let multiplier = 1;
        if (suffix === 'K') {
            multiplier = 1000;
        } else if (suffix === 'M') {
            multiplier = 1000000;
        }
        
        const finalValue = numericValue * multiplier;
        return finalValue;
    } catch (error) {
        console.error("Error extracting total spending:", error);
        return 0; // Or return null;
    }
}