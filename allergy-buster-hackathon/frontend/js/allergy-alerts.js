/**
 * Allergy Alerts functionality for AllergyBuster
 * Handles fetching and displaying local allergy alerts based on user location
 */

// DOM Elements
const alertsContainer = document.getElementById('alerts-container');
const alertsLoading = document.getElementById('alerts-loading');
const noAlertsMessage = document.getElementById('no-alerts-message');

// User's allergies (in a real app, this would come from the user's profile)
const userAllergies = ['pollen', 'dust', 'mold'];

/**
 * Initialize the allergy alerts functionality
 */
function initAllergyAlerts() {
  // Get user's location and fetch alerts when the alerts tab is shown
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.tab === 'alerts') {
      btn.addEventListener('click', () => {
        getUserLocationAndFetchAlerts();
      });
    }
  });
}

/**
 * Get the user's location and fetch allergy alerts
 */
function getUserLocationAndFetchAlerts() {
  showAlertsLoading(true);
  
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        fetchAllergyAlerts(latitude, longitude, userAllergies);
      },
      error => {
        console.error('Geolocation error:', error);
        // Use default location if geolocation fails
        fetchAllergyAlerts(40.7128, -74.0060, userAllergies); // New York coordinates
        showAlertsLoading(false);
      }
    );
  } else {
    console.error('Geolocation is not supported by this browser');
    // Use default location if geolocation is not supported
    fetchAllergyAlerts(40.7128, -74.0060, userAllergies); // New York coordinates
    showAlertsLoading(false);
  }
}

/**
 * Fetch allergy alerts from the API
 * @param {number} latitude - User's latitude
 * @param {number} longitude - User's longitude
 * @param {Array} allergies - User's allergies
 */
function fetchAllergyAlerts(latitude, longitude, allergies) {
  const allergiesStr = allergies.join(',');
  const url = `/api/chatbot/allergy-alerts/?latitude=${latitude}&longitude=${longitude}&allergies=${allergiesStr}`;
  
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.status === 'success') {
        displayAllergyAlerts(data);
      } else {
        throw new Error(data.message || 'Failed to get allergy alerts');
      }
    })
    .catch(error => {
      console.error('Allergy alerts error:', error);
      showNoAlertsMessage('Unable to fetch allergy alerts. Please try again later.');
    })
    .finally(() => {
      showAlertsLoading(false);
    });
}

/**
 * Display allergy alerts in the UI
 * @param {Object} data - Allergy alerts data from the API
 */
function displayAllergyAlerts(data) {
  if (!alertsContainer) return;
  
  // Clear previous alerts
  alertsContainer.innerHTML = '';
  
  // Show location and date information
  const locationInfo = document.createElement('div');
  locationInfo.className = 'location-info';
  locationInfo.innerHTML = `
    <h3>Allergy Forecast for ${data.location.city || 'Your Location'}</h3>
    <p class="date-info">${data.current_date} | ${data.season} Season</p>
    <p class="season-info">${data.general_info}</p>
  `;
  alertsContainer.appendChild(locationInfo);
  
  // Show alerts
  if (data.alerts && data.alerts.length > 0) {
    const alertsList = document.createElement('div');
    alertsList.className = 'alerts-list';
    
    data.alerts.forEach(alert => {
      const alertCard = document.createElement('div');
      alertCard.className = `alert-card ${alert.severity}`;
      
      // Set icon based on alert type
      let icon = 'fa-exclamation-circle';
      if (alert.type === 'pollen') icon = 'fa-wind';
      else if (alert.type === 'mold') icon = 'fa-cloud';
      else if (alert.type === 'dust_mites') icon = 'fa-home';
      else if (alert.type === 'pet_dander') icon = 'fa-paw';
      
      alertCard.innerHTML = `
        <div class="alert-header">
          <i class="fas ${icon}"></i>
          <h4>${alert.type.replace('_', ' ').toUpperCase()} ALERT</h4>
          <span class="severity-badge ${alert.severity}">${alert.severity}</span>
        </div>
        <p class="alert-description">${alert.description}</p>
        <div class="recommendations">
          <h5>Recommendations:</h5>
          <ul>
            ${alert.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
      `;
      
      alertsList.appendChild(alertCard);
    });
    
    alertsContainer.appendChild(alertsList);
  } else {
    showNoAlertsMessage('No allergy alerts for your location at this time.');
  }
  
  // Show seasonal allergens
  if (data.seasonal_allergens && data.seasonal_allergens.length > 0) {
    const seasonalInfo = document.createElement('div');
    seasonalInfo.className = 'seasonal-info';
    seasonalInfo.innerHTML = `
      <h4>Common Allergens This Season:</h4>
      <ul class="allergen-list">
        ${data.seasonal_allergens.map(allergen => `<li>${allergen}</li>`).join('')}
      </ul>
    `;
    alertsContainer.appendChild(seasonalInfo);
  }
}

/**
 * Show or hide the loading indicator
 * @param {boolean} show - Whether to show the loading indicator
 */
function showAlertsLoading(show) {
  if (alertsLoading) {
    alertsLoading.style.display = show ? 'flex' : 'none';
  }
  
  if (alertsContainer) {
    alertsContainer.style.display = show ? 'none' : 'block';
  }
  
  if (noAlertsMessage) {
    noAlertsMessage.style.display = 'none';
  }
}

/**
 * Show a message when no alerts are available
 * @param {string} message - The message to display
 */
function showNoAlertsMessage(message) {
  if (noAlertsMessage) {
    noAlertsMessage.textContent = message;
    noAlertsMessage.style.display = 'block';
  }
  
  if (alertsContainer) {
    alertsContainer.style.display = 'none';
  }
}

// Initialize the allergy alerts when the DOM is loaded
document.addEventListener('DOMContentLoaded', initAllergyAlerts);
