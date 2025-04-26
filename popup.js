// Default settings
const defaultSettings = {
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
};

// DOM Elements
const extensionToggle = document.getElementById('extensionToggle');
const hiringRateInput = document.getElementById('hiringRate');
const paymentVerifiedInput = document.getElementById('paymentVerified');
const lastSeenInput = document.getElementById('lastSeen');
const totalJobsInput = document.getElementById('totalJobs');
const totalSpendingInput = document.getElementById('totalSpending');
const goodThresholdInput = document.getElementById('goodThreshold');
const averageThresholdInput = document.getElementById('averageThreshold');
const saveButton = document.getElementById('saveSettings');
const resetButton = document.getElementById('resetSettings');
const weightsSumDisplay = document.getElementById('weightsSumDisplay');
const successMessage = document.getElementById('successMessage');

// Add input event listeners to weight inputs
[hiringRateInput, paymentVerifiedInput, lastSeenInput, totalJobsInput, totalSpendingInput].forEach(input => {
    input.addEventListener('input', updateWeightsSum);
});

// Load settings when popup opens
document.addEventListener('DOMContentLoaded', loadSettings);

// Save settings when save button is clicked
saveButton.addEventListener('click', saveSettings);

// Reset settings when reset button is clicked
resetButton.addEventListener('click', resetToDefault);

// Toggle extension state when toggle is clicked
extensionToggle.addEventListener('change', toggleExtension);

// Add event listeners for threshold inputs to validate in real-time
goodThresholdInput.addEventListener('input', validateThresholds);
averageThresholdInput.addEventListener('input', validateThresholds);

// Update the weights sum display
function updateWeightsSum() {
    const sum = [hiringRateInput, paymentVerifiedInput, lastSeenInput, totalJobsInput, totalSpendingInput]
        .reduce((total, input) => total + (parseInt(input.value) || 0), 0);
    
    weightsSumDisplay.textContent = `Total: ${sum}%`;
    
    if (sum !== 100) {
        weightsSumDisplay.classList.add('error');
    } else {
        weightsSumDisplay.classList.remove('error');
    }
}

// Load current settings
async function loadSettings() {
    const settings = await chrome.storage.sync.get(['weights', 'thresholds', 'enabled']);
    
    // If no settings exist, use defaults
    if (!settings.weights) {
        await chrome.storage.sync.set(defaultSettings);
        settings.weights = defaultSettings.weights;
        settings.thresholds = defaultSettings.thresholds;
        settings.enabled = defaultSettings.enabled;
    }

    // Update UI with current settings
    extensionToggle.checked = settings.enabled;
    hiringRateInput.value = settings.weights.hiringRate;
    paymentVerifiedInput.value = settings.weights.paymentVerified;
    lastSeenInput.value = settings.weights.lastSeen;
    totalJobsInput.value = settings.weights.totalJobs;
    totalSpendingInput.value = settings.weights.totalSpending;
    goodThresholdInput.value = settings.thresholds.good;
    averageThresholdInput.value = settings.thresholds.average;
    
    updateWeightsSum();
}

// Toggle extension state
async function toggleExtension() {
    const isEnabled = extensionToggle.checked;
    
    // Get current settings
    const settings = await chrome.storage.sync.get(['weights', 'thresholds']);
    
    // Update enabled state
    const newSettings = {
        ...settings,
        enabled: isEnabled
    };
    
    // Save to storage
    await chrome.storage.sync.set(newSettings);
    
    // Show feedback
    const toggleLabel = document.querySelector('.toggle-label');
    const originalText = toggleLabel.textContent;
    toggleLabel.textContent = isEnabled ? 'Extension Enabled!' : 'Extension Disabled!';
    
    setTimeout(() => {
        toggleLabel.textContent = originalText;
    }, 1500);
}

// Validate thresholds in real-time
function validateThresholds() {
    const goodValue = parseInt(goodThresholdInput.value);
    const averageValue = parseInt(averageThresholdInput.value);
    
    if (!isNaN(goodValue)) {
        if (goodValue < 0) goodThresholdInput.value = 0;
        if (goodValue > 100) goodThresholdInput.value = 100;
    }
    
    if (!isNaN(averageValue)) {
        if (averageValue < 0) averageThresholdInput.value = 0;
        if (averageValue > 100) averageThresholdInput.value = 100;
    }
    
    if (!isNaN(goodValue) && !isNaN(averageValue)) {
        if (goodValue <= averageValue) {
            goodThresholdInput.style.borderColor = '#ff6b6b';
        } else {
            goodThresholdInput.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        }
    }
}

// Save current settings
async function saveSettings() {
    const goodValue = parseInt(goodThresholdInput.value);
    const averageValue = parseInt(averageThresholdInput.value);
    
    // Check if good threshold is higher than average threshold
    if (goodValue <= averageValue) {
        alert('Good Score Threshold must be higher than Average Score Threshold.');
        return;
    }
    
    // Calculate weights sum
    const weightsSum = [hiringRateInput, paymentVerifiedInput, lastSeenInput, totalJobsInput, totalSpendingInput]
        .reduce((total, input) => total + (parseInt(input.value) || 0), 0);
    
    // Check if weights sum to 100
    if (weightsSum !== 100) {
        alert('The sum of all weight settings must equal 100%. Current sum: ' + weightsSum + '%');
        return;
    }
    
    const newSettings = {
        weights: {
            hiringRate: parseInt(hiringRateInput.value),
            paymentVerified: parseInt(paymentVerifiedInput.value),
            lastSeen: parseInt(lastSeenInput.value),
            totalJobs: parseInt(totalJobsInput.value),
            totalSpending: parseInt(totalSpendingInput.value)
        },
        thresholds: {
            good: goodValue,
            average: averageValue
        },
        enabled: extensionToggle.checked
    };

    // Validate inputs
    if (!validateSettings(newSettings)) {
        alert('Please enter valid numbers between 0 and 100 for all fields.');
        return;
    }

    // Save to storage
    await chrome.storage.sync.set(newSettings);

    // Show success message
    successMessage.classList.add('show');
    setTimeout(() => {
        successMessage.classList.remove('show');
    }, 3000);
}

// Reset settings to default
async function resetToDefault() {
    // Update UI
    extensionToggle.checked = defaultSettings.enabled;
    hiringRateInput.value = defaultSettings.weights.hiringRate;
    paymentVerifiedInput.value = defaultSettings.weights.paymentVerified;
    lastSeenInput.value = defaultSettings.weights.lastSeen;
    totalJobsInput.value = defaultSettings.weights.totalJobs;
    totalSpendingInput.value = defaultSettings.weights.totalSpending;
    goodThresholdInput.value = defaultSettings.thresholds.good;
    averageThresholdInput.value = defaultSettings.thresholds.average;
    
    // Reset validation styling
    goodThresholdInput.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    updateWeightsSum();

    // Save to storage
    await chrome.storage.sync.set(defaultSettings);

    // Show success message
    successMessage.textContent = 'Settings reset to default!';
    successMessage.classList.add('show');
    setTimeout(() => {
        successMessage.classList.remove('show');
        successMessage.textContent = 'Settings saved successfully!';
    }, 3000);
}

// Validate settings
function validateSettings(settings) {
    const validateNumber = (num) => typeof num === 'number' && !isNaN(num) && num >= 0 && num <= 100;

    return validateNumber(settings.weights.hiringRate) &&
           validateNumber(settings.weights.paymentVerified) &&
           validateNumber(settings.weights.lastSeen) &&
           validateNumber(settings.weights.totalJobs) &&
           validateNumber(settings.weights.totalSpending) &&
           validateNumber(settings.thresholds.good) &&
           validateNumber(settings.thresholds.average);
}