chrome.runtime.sendMessage({ type: 'getSettings' }, (settings) => {
  if (settings && settings.enabled) {
    console.log('Extension is enabled, analyzing search results');
    analyzeSearchResults(settings);
  } else {
    console.log('Extension is disabled or settings not found');
  }
});

// Define the selectors for job cards - updated for new Upwork UI
const JOB_CARD_SELECTORS = '.job-tile, [data-test="job-tile"], [data-job-uid], [data-test="job-card"], .air3-card-section.air3-card-hover';
// Define a set to keep track of processed cards to avoid duplicates
const processedCards = new Set();
// Cache for job data to avoid repeated fetches
const jobDataCache = new Map();

async function processJobCard(card, settings) {
  // Check if card has already been processed
  if (processedCards.has(card)) {
    return;
  }
  processedCards.add(card); // Mark card as processed

  // Get job URL from the card - updated for new Upwork UI
  const jobLink = card.querySelector('a[href*="/jobs/"], a[href*="/nx/jobs/"]');
  if (!jobLink) {
    console.log('No job link found in card');
    return;
  }

  const jobUrl = new URL(jobLink.href, window.location.origin).href;
  console.log('Processing job card with URL:', jobUrl);
  
  // Check cache first
  if (jobDataCache.has(jobUrl)) {
    console.log('Using cached data for:', jobUrl);
    updateCardWithScore(card, jobDataCache.get(jobUrl), settings);
    return;
  }

  // Show loading state
  const titleElement = card.querySelector('.job-title, [data-test="job-title"], a[href*="/jobs/"], a[href*="/nx/jobs/"], h4, h5, .air3-heading');
  console.log('Title element:', titleElement);
  if (titleElement && !titleElement.parentNode.querySelector('.scoring-widget-container')) {
    const widgetContainer = document.createElement('div');
    widgetContainer.style.display = 'inline-block';
    widgetContainer.style.verticalAlign = 'middle';
    widgetContainer.style.marginLeft = '10px';
    widgetContainer.classList.add('scoring-widget-container');
    
    // Make sure the title element is properly styled for inline display
    if (titleElement.tagName === 'H3' || titleElement.tagName === 'H4' || titleElement.tagName === 'H5') {
      titleElement.style.display = 'inline-block';
      titleElement.style.margin = '0';
      titleElement.style.verticalAlign = 'middle';
    }
    
    // If the title is inside a container, make sure the container is properly styled
    const titleContainer = titleElement.closest('.job-tile-title, h3, h4, h5');
    if (titleContainer) {
      titleContainer.style.display = 'flex';
      titleContainer.style.alignItems = 'center';
      titleContainer.style.flexWrap = 'nowrap';
    }
    
    titleElement.parentNode.insertBefore(widgetContainer, titleElement.nextSibling);
    
    // Add loading indicator
    const loadingWidget = document.createElement('div');
    loadingWidget.style.display = 'inline-block';
    loadingWidget.style.marginLeft = '10px';
    loadingWidget.style.padding = '4px 8px';
    loadingWidget.style.backgroundColor = '#f0f0f0';
    loadingWidget.style.color = '#14a800';
    loadingWidget.style.borderRadius = '4px';
    loadingWidget.style.fontSize = '14px';
    loadingWidget.style.verticalAlign = 'middle';
    loadingWidget.textContent = 'Analyzing...';
    widgetContainer.appendChild(loadingWidget);
  }

  // Fetch complete job data from background
  console.log('Sending fetchJobData request for:', jobUrl);
  
  // Create the actual request promise
  const requestPromise = new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'fetchJobData', jobUrl }, (response) => {
      console.log('Received response for:', jobUrl, response);
      resolve(response);
    });
  });
  
  // Use a timeout as a fallback
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      console.log('Request timed out for:', jobUrl);
      resolve(null);
    }, 90000); // 90 second timeout as fallback
  });
  
  // Race the request against the timeout
  const clientData = await Promise.race([requestPromise, timeoutPromise]);
  
  if (clientData) {
    jobDataCache.set(jobUrl, clientData);
    updateCardWithScore(card, clientData, settings);
  } else {
    console.log('Failed to fetch data, using limited data');
    // If fetch failed, use limited data from search page
    const limitedData = {
      hiringRate: extractHiringRateFromCard(card),
      paymentVerified: checkPaymentVerificationFromCard(card),
      lastSeen: null,
      totalJobs: null,
      totalSpending: null
    };
    updateCardWithScore(card, limitedData, settings, true);
  }
}

function updateCardWithScore(card, clientData, settings, isLimitedData = false) {
  // Check if we're on a job page (not search page)
  const postedOnLineDiv = document.querySelector('.d-flex.posted-on-line');
  if (postedOnLineDiv) {
    // We're on a job page, insert the score into the posted-on-line div
    console.log('Found posted-on-line div, inserting score there');
    
    // Remove existing widget if any
    const existingWidget = postedOnLineDiv.querySelector('.scoring-widget-container');
    if (existingWidget) {
      existingWidget.remove();
    }
    
    // Calculate score
    const score = calculateclientsScore(clientData, settings.weights);
    console.log('Calculated score:', score, 'for client data:', clientData);
    
    // Apply penalty for limited data if necessary
    const finalScore = isLimitedData ? Math.max(0, score - 20) : score;
    
    // Create and add new widget
    const widgetContainer = document.createElement('div');
    widgetContainer.style.display = 'inline-block';
    widgetContainer.style.marginLeft = '10px';
    widgetContainer.classList.add('scoring-widget-container');
    
    // Add a separator before the widget
    const separator = document.createElement('span');
    separator.textContent = '•';
    separator.style.margin = '0 10px';
    separator.style.color = '#999';
    postedOnLineDiv.appendChild(separator);
    
    // Add the widget to the posted-on-line div
    postedOnLineDiv.appendChild(widgetContainer);
    
    // Display the score widget
    displayScoreWidget(finalScore, settings.thresholds, widgetContainer);
    return;
  }
  
  // Original code for search page
  const titleElement = card.querySelector('.job-title, [data-test="job-title"], a[href*="/jobs/"], a[href*="/nx/jobs/"], h4, h5, .air3-heading');
  if (!titleElement) {
    console.log('No title element found for card');
    return;
  }

  // Remove existing widget if any
  const existingWidget = titleElement.parentNode.querySelector('.scoring-widget-container');
  if (existingWidget) {
    existingWidget.remove();
  }

  // Calculate score
  const score = calculateclientsScore(clientData, settings.weights);
  console.log('Calculated score:', score, 'for client data:', clientData);
  
  // Apply penalty for limited data if necessary
  const finalScore = isLimitedData ? Math.max(0, score - 20) : score;

  // Create and add new widget
  const widgetContainer = document.createElement('div');
  widgetContainer.style.display = 'inline-block';
  widgetContainer.style.verticalAlign = 'middle';
  widgetContainer.style.marginLeft = '10px';
  widgetContainer.classList.add('scoring-widget-container');
  
  // Make sure the title element is properly styled for inline display
  if (titleElement.tagName === 'H3' || titleElement.tagName === 'H4' || titleElement.tagName === 'H5') {
    titleElement.style.display = 'inline-block';
    titleElement.style.margin = '0';
    titleElement.style.verticalAlign = 'middle';
  }
  
  // If the title is inside a container, make sure the container is properly styled
  const titleContainer = titleElement.closest('.job-tile-title, h3, h4, h5');
  if (titleContainer) {
    titleContainer.style.display = 'flex';
    titleContainer.style.alignItems = 'center';
    titleContainer.style.flexWrap = 'nowrap';
  }
  
  titleElement.parentNode.insertBefore(widgetContainer, titleElement.nextSibling);
  
  displayScoreWidget(finalScore, settings.thresholds, widgetContainer);
}

function displayScoreWidget(score, thresholds, container) {
  // Create the widget container
  const widget = document.createElement('div');
  widget.style.display = 'inline-block';
  widget.style.marginLeft = '10px';
  widget.style.position = 'relative';
  widget.style.fontFamily = 'Arial, sans-serif';
  widget.style.fontSize = '14px';
  widget.style.verticalAlign = 'middle';
  widget.classList.add('upwork-client-widget');
  
  // Determine category and color
  let category, color;
  if (score >= thresholds.excellent) {
    category = 'Excellent';
    color = '#27ae60'; // Green
  } else if (score >= thresholds.good) {
    category = 'Good';
    color = '#3498db'; // Blue
  } else if (score >= thresholds.average) {
    category = 'Average';
    color = '#f39c12'; // Orange
  } else {
    category = 'Poor';
    color = '#e74c3c'; // Red
  }
  
  // Create the score display
  const scoreDisplay = document.createElement('div');
  scoreDisplay.style.backgroundColor = color;
  scoreDisplay.style.color = 'white';
  scoreDisplay.style.padding = '4px 8px';
  scoreDisplay.style.borderRadius = '4px';
  scoreDisplay.style.fontWeight = 'bold';
  scoreDisplay.style.cursor = 'pointer';
  scoreDisplay.style.display = 'inline-block';
  scoreDisplay.style.verticalAlign = 'middle';
  scoreDisplay.textContent = `Score: ${score}`;
  
  // Create the tooltip
  const tooltip = document.createElement('div');
  tooltip.style.position = 'absolute';
  tooltip.style.top = '100%';
  tooltip.style.left = '0';
  tooltip.style.zIndex = '1000';
  tooltip.style.backgroundColor = 'white';
  tooltip.style.border = '1px solid #ddd';
  tooltip.style.borderRadius = '4px';
  tooltip.style.padding = '10px';
  tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
  tooltip.style.width = '220px';
  tooltip.style.display = 'none';
  tooltip.classList.add('upwork-analyzer-tooltip');
  
  // Add tooltip content
  tooltip.innerHTML = `
    <div style="margin-bottom: 5px; font-weight: bold;">Client Score: ${score}/100</div>
    <div style="margin-bottom: 5px;">Category: <span style="color:${color}; font-weight: bold;">${category}</span></div>
    <div style="margin-bottom: 5px; font-size: 12px;">This score is based on available client data.</div>
    <div style="margin-top: 10px; font-size: 11px; color: #777; text-align: right;">Upwork Client Scoring</div>
  `;
  
  // Add hover events
  scoreDisplay.addEventListener('mouseenter', () => {
    tooltip.style.display = 'block';
  });
  
  scoreDisplay.addEventListener('mouseleave', () => {
    tooltip.style.display = 'none';
  });
  
  // Assemble the widget
  widget.appendChild(scoreDisplay);
  widget.appendChild(tooltip);
  container.appendChild(widget);
}

function analyzeSearchResults(settings) {
  console.log('Analyzing search results with settings:', settings);
  
  // Function to process all job cards currently on the page
  const processExistingCards = () => {
    const jobCards = document.querySelectorAll(JOB_CARD_SELECTORS);
    console.log('Found', jobCards.length, 'job cards on page');
    jobCards.forEach(card => processJobCard(card, settings));
  };

  // Initial processing for any cards already loaded
  processExistingCards();

  // Set up the MutationObserver
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          // Check if the added node is an element
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the added node itself is a job card
            if (node.matches(JOB_CARD_SELECTORS)) {
              processJobCard(node, settings);
            }
            // Check if the added node contains job cards
            const newCards = node.querySelectorAll(JOB_CARD_SELECTORS);
            newCards.forEach(card => processJobCard(card, settings));
          }
        });
      }
    }
  });

  // Start observing the document body for added nodes
  observer.observe(document.body, { childList: true, subtree: true });
}

// Data extraction functions for search results - updated for current Upwork UI
function extractHiringRateFromCard(card) {
  const cardText = card.innerText;
  const hiringMatch = cardText.match(/(\d+)%\s*hire\s*rate/i);
  return hiringMatch ? parseInt(hiringMatch[1]) : null;
}

function checkPaymentVerificationFromCard(card) {
  return card.innerText.includes('Payment method verified') ||
    card.querySelector('[data-test="payment-verified"], .payment-verified-icon');
}

