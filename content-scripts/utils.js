// Calculate clients score based on client data and weights
function calculateclientsScore(clientData, weights) {
  let score = 0;
  let debugInfo = {};
  
  // Hiring rate (0-40 points by default)
  if (clientData.hiringRate !== null) {
    const hiringScore = (clientData.hiringRate / 100) * weights.hiringRate;
    score += hiringScore;
    debugInfo.hiringScore = hiringScore;
  }
  
  // Payment verification (0 or 15 points by default)
  if (clientData.paymentVerified !== null) {
    const paymentScore = clientData.paymentVerified ? weights.paymentVerified : 0;
    score += paymentScore;
    debugInfo.paymentScore = paymentScore;
  }
  
  // Last seen recency (0-20 points by default)
  if (clientData.lastSeen !== null) {
    const daysSinceLastSeen = calculateDaysSinceLastSeen(clientData.lastSeen);
    // Full points if seen in last 2 days, decreases to 0 at 22 days
    const lastSeenScore = Math.max(0, weights.lastSeen - daysSinceLastSeen);
    score += lastSeenScore;
    debugInfo.lastSeenScore = lastSeenScore;
  }
  
  // Total jobs posted (0-10 points by default)
  if (clientData.totalJobs !== null) {
    // Scale: 0 jobs = 0 points, 10+ jobs = full points
    const jobsScore = Math.min(clientData.totalJobs, 10) / 10 * weights.totalJobs;
    score += jobsScore;
    debugInfo.jobsScore = jobsScore;
  }
  
  // Total spending (0-15 points by default)
  if (clientData.totalSpending !== null) {
    // Scale: $0 = 0 points, $10,000+ = full points
    const spendingNormalized = Math.min(clientData.totalSpending, 10000) / 10000;
    const spendingScore = spendingNormalized * weights.totalSpending;
    score += spendingScore;
    debugInfo.spendingScore = spendingScore;
  }
  
  console.log('Score calculation details:', debugInfo);
  return Math.round(score);
}

// Calculate days since client was last seen
function calculateDaysSinceLastSeen(lastSeenText) {
  if (!lastSeenText) return 30; // Default if no data
  
  // Handle common time phrases
  lastSeenText = lastSeenText.toLowerCase();
  
  if (lastSeenText.includes('yesterday')) {
    return 1;
  } else if (lastSeenText.includes('today') || lastSeenText.includes('hour') || 
             lastSeenText.includes('minute') || lastSeenText.includes('online now')) {
    return 0;
  } else if (lastSeenText.includes('week')) {
    const weeksMatch = lastSeenText.match(/(\d+)\s+week/);
    return weeksMatch ? parseInt(weeksMatch[1]) * 7 : 14; // Default to 2 weeks
  } else if (lastSeenText.includes('month')) {
    const monthsMatch = lastSeenText.match(/(\d+)\s+month/);
    return monthsMatch ? parseInt(monthsMatch[1]) * 30 : 30; // Default to 1 month
  } else if (lastSeenText.includes('day')) {
    const daysMatch = lastSeenText.match(/(\d+)\s+day/);
    return daysMatch ? parseInt(daysMatch[1]) : 3; // Default to 3 days
  }
  
  return 30; // Default if format is unknown
}

// Display score widget with improved styling
function displayScoreWidget(score, thresholds, container) {
  // Create score widget element with proper styling
  const widget = document.createElement('div');
  widget.className = 'upwork-client-widget';
  
  // Determine rating category and color
  let category, color;
  if (score >= thresholds.good) {
    category = 'Good';
    color = '#14a800'; // Green
  } else if (score >= thresholds.average) {
    category = 'Average';
    color = '#f39c12'; // Orange
  } else {
    category = 'Poor';
    color = '#e74c3c'; // Red
  }
  
  // Add styles to widget
  widget.style.display = 'inline-block';
  widget.style.marginLeft = '10px';
  widget.style.position = 'relative';
  widget.style.fontFamily = 'Arial, sans-serif';
  widget.style.fontSize = '14px';
  
  // Create badge
  const badge = document.createElement('div');
  badge.style.backgroundColor = color;
  badge.style.color = 'white';
  badge.style.padding = '4px 8px';
  badge.style.borderRadius = '4px';
  badge.style.fontWeight = 'bold';
  badge.style.cursor = 'pointer';
  badge.textContent = ` Score: ${score}`;
  
  // Create tooltip
const tooltip = document.createElement('div');
tooltip.className = 'upwork-analyzer-tooltip';
Object.assign(tooltip.style, {
  position: 'absolute',
  top: 'calc(100% + 5px)',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: '10000',
  backgroundColor: '#ffffff',
  border: '1px solid #e0e0e0',
  borderRadius: '6px',
  padding: '12px 16px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  width: '240px',
  opacity: '0',
  visibility: 'hidden',
  transition: 'all 0.2s ease-out',
  color: '#222',
  fontSize: '13px',
  lineHeight: '1.4',
  pointerEvents: 'none'
});

// Create arrow for tooltip
const tooltipArrow = document.createElement('div');
tooltipArrow.className = 'upwork-analyzer-tooltip-arrow';
Object.assign(tooltipArrow.style, {
  position: 'absolute',
  bottom: '100%',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '0',
  height: '0',
  borderLeft: '6px solid transparent',
  borderRight: '6px solid transparent',
  borderBottom: '6px solid #ffffff',
  filter: 'drop-shadow(0 -1px 1px rgba(0, 0, 0, 0.05))'
});
tooltip.appendChild(tooltipArrow);

// Tooltip content with improved structure
tooltip.innerHTML += `
  <div style="margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #14a800;">
    Client Score: <span style="font-weight: 700;">${score}/100</span>
  </div>
  <div style="margin-bottom: 8px; display: flex; align-items: center;">
    <span style="flex-shrink: 0;">Category:</span>
    <span style="color: ${color}; font-weight: 600; margin-left: 4px;">${category}</span>
  </div>
  <div style="margin-bottom: 8px; font-size: 12px; color: #666;">
    This score is calculated based on available client data and activity patterns.
  </div>
  <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #f0f0f0; 
               font-size: 11px; color: #999; text-align: right;">
    Upwork Client Scoring
  </div>
`;

// Add hover behavior with smooth transitions
badge.addEventListener('mouseenter', () => {
  Object.assign(tooltip.style, {
    opacity: '1',
    visibility: 'visible',
    transform: 'translateX(-50%) translateY(0)'
  });
});

badge.addEventListener('mouseleave', () => {
  Object.assign(tooltip.style, {
    opacity: '0',
    visibility: 'hidden',
    transform: 'translateX(-50%) translateY(-5px)'
  });
});

// Position tooltip above the badge (alternative positioning)
const positionTooltip = () => {
  const badgeRect = badge.getBoundingClientRect();
  Object.assign(tooltip.style, {
    left: `${badgeRect.left + badgeRect.width / 2}px`,
    top: `${badgeRect.top - tooltip.offsetHeight - 8}px`
  });
};

// Initial positioning and window resize handling
positionTooltip();
window.addEventListener('resize', positionTooltip);

// Assemble and add widget to container
widget.appendChild(badge);
widget.appendChild(tooltip);
container.appendChild(widget);

}