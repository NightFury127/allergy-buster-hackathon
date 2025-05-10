/**
 * Nearby Doctors functionality for AllergyBuster
 * Handles finding and displaying nearby allergy specialists
 */

// DOM Elements
const doctorsContainer = document.getElementById('doctors-container');
const doctorsLoading = document.getElementById('doctors-loading');
const noDoctorsMessage = document.getElementById('no-doctors-message');
const locationInput = document.getElementById('location-input');
const distanceSelect = document.getElementById('distance-select');
const findDoctorsBtn = document.getElementById('find-doctors-btn');
const useCurrentLocationBtn = document.getElementById('use-current-location');

/**
 * Initialize the nearby doctors functionality
 */
function initNearbyDoctors() {
  // Add event listeners
  if (findDoctorsBtn) {
    findDoctorsBtn.addEventListener('click', handleFindDoctorsClick);
  }
  
  if (useCurrentLocationBtn) {
    useCurrentLocationBtn.addEventListener('click', handleUseCurrentLocationClick);
  }
  
  // Initialize the map if available
  initMap();
}

/**
 * Handle click on the "Find Doctors" button
 */
function handleFindDoctorsClick() {
  if (!locationInput || !locationInput.value.trim()) {
    alert('Please enter a location');
    return;
  }
  
  const location = locationInput.value.trim();
  const distance = distanceSelect ? distanceSelect.value : '10';
  
  // In a real app, you would geocode the location to get coordinates
  // For this demo, we'll use New York coordinates
  fetchNearbyDoctors(40.7128, -74.0060, distance);
}

/**
 * Handle click on the "Use Current Location" button
 */
function handleUseCurrentLocationClick() {
  showDoctorsLoading(true);
  
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        
        // Update the location input
        if (locationInput) {
          locationInput.value = 'Current Location';
        }
        
        // Fetch nearby doctors
        fetchNearbyDoctors(latitude, longitude, distanceSelect ? distanceSelect.value : '10');
      },
      error => {
        console.error('Geolocation error:', error);
        alert('Could not get your location. Please enter it manually.');
        showDoctorsLoading(false);
      }
    );
  } else {
    console.error('Geolocation is not supported by this browser');
    alert('Geolocation is not supported by your browser. Please enter your location manually.');
    showDoctorsLoading(false);
  }
}

/**
 * Fetch nearby doctors from the API
 * @param {number} latitude - User's latitude
 * @param {number} longitude - User's longitude
 * @param {string} distance - Search radius in miles
 */
function fetchNearbyDoctors(latitude, longitude, distance) {
  showDoctorsLoading(true);
  
  const url = `/api/chatbot/nearby-doctors/?latitude=${latitude}&longitude=${longitude}&distance=${distance}&specialty=allergist`;
  
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.status === 'success') {
        displayNearbyDoctors(data);
        updateMap(data);
      } else {
        throw new Error(data.message || 'Failed to find nearby doctors');
      }
    })
    .catch(error => {
      console.error('Nearby doctors error:', error);
      showNoDoctorsMessage('Unable to find nearby doctors. Please try again later.');
    })
    .finally(() => {
      showDoctorsLoading(false);
    });
}

/**
 * Display nearby doctors in the UI
 * @param {Object} data - Nearby doctors data from the API
 */
function displayNearbyDoctors(data) {
  if (!doctorsContainer) return;
  
  // Clear previous results
  doctorsContainer.innerHTML = '';
  
  // Show results summary
  const resultsSummary = document.createElement('div');
  resultsSummary.className = 'results-summary';
  resultsSummary.innerHTML = `
    <h3>Results for ${data.location.city}, ${data.location.region}</h3>
    <p>Found ${data.total_results} providers within ${data.search_params.distance} miles</p>
  `;
  doctorsContainer.appendChild(resultsSummary);
  
  // Show doctors
  if (data.doctors && data.doctors.length > 0) {
    const doctorsList = document.createElement('div');
    doctorsList.className = 'doctors-list';
    
    data.doctors.forEach(doctor => {
      const doctorCard = document.createElement('div');
      doctorCard.className = 'doctor-card nearby';
      
      doctorCard.innerHTML = `
        <div class="doctor-info">
          <div class="doctor-avatar">
            <i class="fas fa-user-md"></i>
          </div>
          <div class="doctor-details">
            <h3>${doctor.name}</h3>
            <p class="specialty">${doctor.specialty}</p>
            <p class="location"><i class="fas fa-map-marker-alt"></i> ${doctor.address} <span class="distance">(${doctor.distance})</span></p>
            <p class="rating">
              <i class="fas fa-star"></i> ${doctor.rating} (${doctor.reviews_count} reviews)
              ${doctor.accepting_new_patients ? '<span class="accepts-insurance"><i class="fas fa-check-circle"></i> Accepting new patients</span>' : ''}
            </p>
          </div>
        </div>
        <div class="doctor-actions">
          <a href="tel:${doctor.phone}" class="btn btn-outline"><i class="fas fa-phone"></i> Call</a>
          <button class="btn btn-primary book-btn" data-id="${doctor.id}"><i class="fas fa-calendar-alt"></i> Book</button>
        </div>
      `;
      
      doctorsList.appendChild(doctorCard);
    });
    
    doctorsContainer.appendChild(doctorsList);
    
    // Add event listeners to book buttons
    document.querySelectorAll('.book-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        alert('Booking functionality would be implemented here.');
      });
    });
  }
  
  // Show hospitals
  if (data.hospitals && data.hospitals.length > 0) {
    const hospitalsSection = document.createElement('div');
    hospitalsSection.className = 'hospitals-section';
    hospitalsSection.innerHTML = '<h3>Nearby Hospitals with Allergy Departments</h3>';
    
    const hospitalsList = document.createElement('div');
    hospitalsList.className = 'hospitals-list';
    
    data.hospitals.forEach(hospital => {
      const hospitalCard = document.createElement('div');
      hospitalCard.className = 'doctor-card hospital';
      
      hospitalCard.innerHTML = `
        <div class="doctor-info">
          <div class="doctor-avatar hospital">
            <i class="fas fa-hospital"></i>
          </div>
          <div class="doctor-details">
            <h3>${hospital.name}</h3>
            <p class="location"><i class="fas fa-map-marker-alt"></i> ${hospital.address} <span class="distance">(${hospital.distance})</span></p>
            <p class="rating">
              <i class="fas fa-star"></i> ${hospital.rating}
              ${hospital.emergency ? '<span class="emergency"><i class="fas fa-ambulance"></i> Emergency Services</span>' : ''}
            </p>
          </div>
        </div>
        <div class="doctor-actions">
          <a href="tel:${hospital.phone}" class="btn btn-outline"><i class="fas fa-phone"></i> Call</a>
          <a href="#" class="btn btn-primary"><i class="fas fa-info-circle"></i> Details</a>
        </div>
      `;
      
      hospitalsList.appendChild(hospitalCard);
    });
    
    hospitalsSection.appendChild(hospitalsList);
    doctorsContainer.appendChild(hospitalsSection);
  }
  
  // Show pagination if needed
  if (data.total_results > 5) {
    const pagination = document.createElement('div');
    pagination.className = 'pagination';
    pagination.innerHTML = `
      <button class="btn btn-outline"><i class="fas fa-chevron-left"></i> Previous</button>
      <span>Page 1 of ${Math.ceil(data.total_results / 5)}</span>
      <button class="btn btn-outline">Next <i class="fas fa-chevron-right"></i></button>
    `;
    doctorsContainer.appendChild(pagination);
  }
}

/**
 * Initialize the map
 */
function initMap() {
  // In a real app, you would initialize a map here
  // For this demo, we'll just show a placeholder
  const mapContainer = document.querySelector('.map-container');
  if (mapContainer) {
    mapContainer.innerHTML = `
      <div class="map-placeholder">
        <i class="fas fa-map-marked-alt"></i>
        <p>Map would be displayed here</p>
      </div>
      <div class="map-legend">
        <div class="legend-item"><span class="legend-icon clinic"></span> Clinic</div>
        <div class="legend-item"><span class="legend-icon doctor"></span> Doctor</div>
        <div class="legend-item"><span class="legend-icon hospital"></span> Hospital</div>
      </div>
    `;
  }
}

/**
 * Update the map with doctor locations
 * @param {Object} data - Nearby doctors data from the API
 */
function updateMap(data) {
  // In a real app, you would update the map with doctor locations
  // For this demo, we'll just update the placeholder
  const mapPlaceholder = document.querySelector('.map-placeholder');
  if (mapPlaceholder) {
    mapPlaceholder.innerHTML = `
      <i class="fas fa-map-marked-alt"></i>
      <p>Map showing ${data.total_results} providers in ${data.location.city}, ${data.location.region}</p>
    `;
  }
}

/**
 * Show or hide the loading indicator
 * @param {boolean} show - Whether to show the loading indicator
 */
function showDoctorsLoading(show) {
  if (doctorsLoading) {
    doctorsLoading.style.display = show ? 'flex' : 'none';
  }
  
  if (doctorsContainer) {
    doctorsContainer.style.display = show ? 'none' : 'block';
  }
  
  if (noDoctorsMessage) {
    noDoctorsMessage.style.display = 'none';
  }
}

/**
 * Show a message when no doctors are found
 * @param {string} message - The message to display
 */
function showNoDoctorsMessage(message) {
  if (noDoctorsMessage) {
    noDoctorsMessage.textContent = message;
    noDoctorsMessage.style.display = 'block';
  }
  
  if (doctorsContainer) {
    doctorsContainer.style.display = 'none';
  }
}

// Initialize the nearby doctors functionality when the DOM is loaded
document.addEventListener('DOMContentLoaded', initNearbyDoctors);
