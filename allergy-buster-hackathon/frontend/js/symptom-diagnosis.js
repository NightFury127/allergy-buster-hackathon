/**
 * Symptom Diagnosis functionality for AllergyBuster
 * Handles symptom input and diagnosis using AI
 */

// DOM Elements
const diagnosisForm = document.getElementById('diagnosis-form');
const symptomsInput = document.getElementById('symptoms-input');
const ageInput = document.getElementById('age-input');
const genderSelect = document.getElementById('gender-select');
const medicalHistoryInput = document.getElementById('medical-history-input');
const diagnosisBtn = document.getElementById('diagnosis-btn');
const diagnosisLoading = document.getElementById('diagnosis-loading');
const diagnosisResults = document.getElementById('diagnosis-results');

/**
 * Initialize the symptom diagnosis functionality
 */
function initSymptomDiagnosis() {
  // Add event listeners
  if (diagnosisForm) {
    diagnosisForm.addEventListener('submit', handleDiagnosisSubmit);
  }
  
  // Add symptom suggestions
  addSymptomSuggestions();
}

/**
 * Handle form submission for diagnosis
 * @param {Event} event - The form submit event
 */
function handleDiagnosisSubmit(event) {
  event.preventDefault();
  
  if (!symptomsInput || !symptomsInput.value.trim()) {
    alert('Please describe your symptoms');
    return;
  }
  
  const symptoms = symptomsInput.value.trim();
  const age = ageInput ? ageInput.value : '';
  const gender = genderSelect ? genderSelect.value : '';
  const medicalHistory = medicalHistoryInput ? medicalHistoryInput.value : '';
  
  // Send to API for diagnosis
  getDiagnosis(symptoms, age, gender, medicalHistory);
}

/**
 * Get diagnosis from the API
 * @param {string} symptoms - Description of symptoms
 * @param {string} age - User's age
 * @param {string} gender - User's gender
 * @param {string} medicalHistory - User's medical history
 */
function getDiagnosis(symptoms, age, gender, medicalHistory) {
  showDiagnosisLoading(true);
  
  fetch('/api/chatbot/diagnose/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      symptoms,
      age,
      gender,
      medical_history: medicalHistory
    })
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.status === 'success') {
        displayDiagnosisResults(data);
      } else {
        throw new Error(data.message || 'Failed to get diagnosis');
      }
    })
    .catch(error => {
      console.error('Diagnosis error:', error);
      alert('Error getting diagnosis. Please try again later.');
    })
    .finally(() => {
      showDiagnosisLoading(false);
    });
}

/**
 * Display diagnosis results in the UI
 * @param {Object} data - Diagnosis data from the API
 */
function displayDiagnosisResults(data) {
  if (!diagnosisResults) return;
  
  // Clear previous results
  diagnosisResults.innerHTML = '';
  
  // Create results container
  const resultsContainer = document.createElement('div');
  resultsContainer.className = 'diagnosis-results-container';
  
  // Add disclaimer
  const disclaimer = document.createElement('div');
  disclaimer.className = 'diagnosis-disclaimer';
  disclaimer.innerHTML = `
    <i class="fas fa-exclamation-triangle"></i>
    <p>${data.disclaimer}</p>
  `;
  resultsContainer.appendChild(disclaimer);
  
  // Add possible conditions
  if (data.possible_conditions && data.possible_conditions.length > 0) {
    const conditionsSection = document.createElement('div');
    conditionsSection.className = 'diagnosis-section';
    conditionsSection.innerHTML = `
      <h3>Possible Conditions</h3>
      <ul class="conditions-list">
        ${data.possible_conditions.map(condition => `<li>${condition}</li>`).join('')}
      </ul>
    `;
    resultsContainer.appendChild(conditionsSection);
  }
  
  // Add next steps
  if (data.next_steps && data.next_steps.length > 0) {
    const nextStepsSection = document.createElement('div');
    nextStepsSection.className = 'diagnosis-section';
    nextStepsSection.innerHTML = `
      <h3>Recommended Next Steps</h3>
      <ul class="next-steps-list">
        ${data.next_steps.map(step => `<li>${step}</li>`).join('')}
      </ul>
    `;
    resultsContainer.appendChild(nextStepsSection);
  }
  
  // Add relief suggestions
  if (data.relief_suggestions && data.relief_suggestions.length > 0) {
    const reliefSection = document.createElement('div');
    reliefSection.className = 'diagnosis-section';
    reliefSection.innerHTML = `
      <h3>Immediate Relief Suggestions</h3>
      <ul class="relief-list">
        ${data.relief_suggestions.map(relief => `<li>${relief}</li>`).join('')}
      </ul>
    `;
    resultsContainer.appendChild(reliefSection);
  }
  
  // Add precautions
  if (data.precautions && data.precautions.length > 0) {
    const precautionsSection = document.createElement('div');
    precautionsSection.className = 'diagnosis-section';
    precautionsSection.innerHTML = `
      <h3>Precautions to Take</h3>
      <ul class="precautions-list">
        ${data.precautions.map(precaution => `<li>${precaution}</li>`).join('')}
      </ul>
    `;
    resultsContainer.appendChild(precautionsSection);
  }
  
  // Add full analysis (collapsible)
  const fullAnalysisSection = document.createElement('div');
  fullAnalysisSection.className = 'diagnosis-section full-analysis-section';
  fullAnalysisSection.innerHTML = `
    <div class="full-analysis-header">
      <h3>Full Analysis</h3>
      <button class="btn btn-outline toggle-analysis"><i class="fas fa-chevron-down"></i></button>
    </div>
    <div class="full-analysis-content" style="display: none;">
      <pre>${data.full_analysis}</pre>
    </div>
  `;
  resultsContainer.appendChild(fullAnalysisSection);
  
  // Add actions
  const actionsSection = document.createElement('div');
  actionsSection.className = 'diagnosis-actions';
  actionsSection.innerHTML = `
    <button class="btn btn-outline" id="new-diagnosis-btn"><i class="fas fa-redo"></i> New Diagnosis</button>
    <button class="btn btn-primary" id="find-doctor-btn"><i class="fas fa-user-md"></i> Find a Doctor</button>
  `;
  resultsContainer.appendChild(actionsSection);
  
  // Add to results container
  diagnosisResults.appendChild(resultsContainer);
  diagnosisResults.style.display = 'block';
  
  // Add event listeners
  document.querySelector('.toggle-analysis').addEventListener('click', function() {
    const content = document.querySelector('.full-analysis-content');
    const icon = this.querySelector('i');
    
    if (content.style.display === 'none') {
      content.style.display = 'block';
      icon.className = 'fas fa-chevron-up';
    } else {
      content.style.display = 'none';
      icon.className = 'fas fa-chevron-down';
    }
  });
  
  document.getElementById('new-diagnosis-btn').addEventListener('click', function() {
    diagnosisResults.style.display = 'none';
    diagnosisForm.reset();
  });
  
  document.getElementById('find-doctor-btn').addEventListener('click', function() {
    // Switch to the doctors tab
    const doctorsTab = document.querySelector('.tab-btn[data-tab="doctors"]');
    if (doctorsTab) {
      doctorsTab.click();
    }
  });
}

/**
 * Add symptom suggestions to the UI
 */
function addSymptomSuggestions() {
  const suggestionsContainer = document.querySelector('.symptom-suggestions');
  if (!suggestionsContainer) return;
  
  // Common allergy symptoms
  const commonSymptoms = [
    'Sneezing', 'Runny nose', 'Itchy eyes', 'Coughing',
    'Rash', 'Hives', 'Shortness of breath', 'Wheezing'
  ];
  
  // Add suggestion chips
  commonSymptoms.forEach(symptom => {
    const chip = document.createElement('div');
    chip.className = 'symptom-chip';
    chip.textContent = symptom;
    chip.addEventListener('click', () => {
      if (symptomsInput) {
        if (symptomsInput.value) {
          symptomsInput.value += ', ' + symptom.toLowerCase();
        } else {
          symptomsInput.value = symptom.toLowerCase();
        }
        symptomsInput.focus();
      }
    });
    
    suggestionsContainer.appendChild(chip);
  });
}

/**
 * Show or hide the loading indicator
 * @param {boolean} show - Whether to show the loading indicator
 */
function showDiagnosisLoading(show) {
  if (diagnosisLoading) {
    diagnosisLoading.style.display = show ? 'flex' : 'none';
  }
  
  if (diagnosisBtn) {
    diagnosisBtn.disabled = show;
  }
}

// Initialize the symptom diagnosis functionality when the DOM is loaded
document.addEventListener('DOMContentLoaded', initSymptomDiagnosis);
