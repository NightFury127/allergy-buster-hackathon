/**
 * Drug Interactions API functionality for AllergyBuster
 * Handles checking for interactions between medications
 */

// DOM Elements
const med1Select = document.getElementById('med1');
const med2Select = document.getElementById('med2');
const checkInteractionsBtn = document.getElementById('check-interactions');
const interactionResults = document.getElementById('interaction-results');
const noInteractionDiv = document.querySelector('.no-interaction');
const interactionWarningDiv = document.querySelector('.interaction-warning');
const interactionDetailsDiv = document.querySelector('.interaction-details');

/**
 * Initialize the drug interactions functionality
 */
function initDrugInteractions() {
  if (checkInteractionsBtn) {
    checkInteractionsBtn.addEventListener('click', handleCheckInteractions);
  }
}

/**
 * Handle click on the "Check Interactions" button
 */
function handleCheckInteractions() {
  if (!med1Select || !med2Select) {
    console.error('Medication select elements not found');
    return;
  }
  
  const med1 = med1Select.value;
  const med2 = med2Select.value;
  
  if (!med1 || !med2) {
    alert('Please select two medications to check');
    return;
  }
  
  // Show loading state
  if (checkInteractionsBtn) {
    checkInteractionsBtn.disabled = true;
    checkInteractionsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
  }
  
  // Hide previous results
  if (noInteractionDiv) noInteractionDiv.style.display = 'none';
  if (interactionWarningDiv) interactionWarningDiv.style.display = 'none';
  
  // Call the API to check for interactions
  fetchDrugInteractions(med1, med2);
}

/**
 * Fetch drug interactions from the API
 * @param {string} med1 - First medication name
 * @param {string} med2 - Second medication name
 */
function fetchDrugInteractions(med1, med2) {
  const url = `/api/chatbot/drug-interactions/?med1=${encodeURIComponent(med1)}&med2=${encodeURIComponent(med2)}`;
  
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.status === 'success') {
        displayInteractionResults(data);
      } else {
        throw new Error(data.message || 'Failed to check drug interactions');
      }
    })
    .catch(error => {
      console.error('Drug interactions error:', error);
      alert('Error checking drug interactions. Please try again later.');
    })
    .finally(() => {
      // Reset button state
      if (checkInteractionsBtn) {
        checkInteractionsBtn.disabled = false;
        checkInteractionsBtn.innerHTML = '<i class="fas fa-search"></i> Check Interactions';
      }
    });
}

/**
 * Display interaction results in the UI
 * @param {Object} data - Interaction data from the API
 */
function displayInteractionResults(data) {
  if (!interactionResults) return;
  
  if (!data.has_interactions || data.interactions.length === 0) {
    // No interactions found
    if (noInteractionDiv) {
      noInteractionDiv.style.display = 'flex';
    }
  } else {
    // Interactions found
    if (interactionWarningDiv) {
      interactionWarningDiv.style.display = 'flex';
      
      // Update interaction details
      if (interactionDetailsDiv) {
        const interaction = data.interactions[0]; // Get the first interaction
        
        let detailsHTML = '';
        detailsHTML += `<p><strong>Severity:</strong> ${capitalizeFirstLetter(interaction.severity)}</p>`;
        
        // Extract effect from description if possible
        let effect = 'May cause adverse effects';
        if (interaction.description.toLowerCase().includes('drowsiness')) {
          effect = 'Increased drowsiness';
        } else if (interaction.description.toLowerCase().includes('blood pressure')) {
          effect = 'May affect blood pressure';
        } else if (interaction.description.toLowerCase().includes('effectiveness')) {
          effect = 'May reduce effectiveness';
        }
        
        detailsHTML += `<p><strong>Effect:</strong> ${effect}</p>`;
        
        // Add recommendation based on severity
        let recommendation = 'Consult your doctor before taking together';
        if (interaction.severity === 'severe') {
          recommendation = 'Avoid taking together';
        } else if (interaction.severity === 'moderate') {
          recommendation = 'Space doses by at least 4 hours';
        } else if (interaction.severity === 'mild') {
          recommendation = 'Monitor for side effects';
        }
        
        detailsHTML += `<p><strong>Recommendation:</strong> ${recommendation}</p>`;
        
        // Add source information
        detailsHTML += `<p class="source-info"><small>Source: ${interaction.source}</small></p>`;
        
        interactionDetailsDiv.innerHTML = detailsHTML;
      }
      
      // Add full description if available
      const warningContent = interactionWarningDiv.querySelector('.warning-content');
      if (warningContent && data.interactions[0].description) {
        // Update the description paragraph
        const descParagraph = warningContent.querySelector('p');
        if (descParagraph) {
          descParagraph.textContent = data.interactions[0].description;
        }
      }
    }
  }
}

/**
 * Capitalize the first letter of a string
 * @param {string} string - The string to capitalize
 * @returns {string} The capitalized string
 */
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Initialize the drug interactions functionality when the DOM is loaded
document.addEventListener('DOMContentLoaded', initDrugInteractions);
