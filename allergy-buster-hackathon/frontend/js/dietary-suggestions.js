/**
 * Dietary Suggestions functionality for AllergyBuster
 * Handles getting personalized dietary suggestions based on allergies
 */

// DOM Elements
const dietaryForm = document.getElementById('dietary-form');
const allergiesSelect = document.getElementById('allergies-select');
const preferencesInput = document.getElementById('preferences-input');
const restrictionsInput = document.getElementById('restrictions-input');
const dietaryBtn = document.getElementById('dietary-btn');
const dietaryLoading = document.getElementById('dietary-loading');
const dietaryResults = document.getElementById('dietary-results');

/**
 * Initialize the dietary suggestions functionality
 */
function initDietarySuggestions() {
  // Add event listeners
  if (dietaryForm) {
    dietaryForm.addEventListener('submit', handleDietarySubmit);
  }
  
  // Initialize the multi-select for allergies
  initAllergiesSelect();
}

/**
 * Initialize the allergies multi-select
 */
function initAllergiesSelect() {
  if (!allergiesSelect) return;
  
  // Common food allergies
  const commonAllergies = [
    { value: 'dairy', label: 'Dairy' },
    { value: 'eggs', label: 'Eggs' },
    { value: 'peanuts', label: 'Peanuts' },
    { value: 'tree_nuts', label: 'Tree Nuts' },
    { value: 'soy', label: 'Soy' },
    { value: 'wheat', label: 'Wheat' },
    { value: 'fish', label: 'Fish' },
    { value: 'shellfish', label: 'Shellfish' },
    { value: 'sesame', label: 'Sesame' }
  ];
  
  // Add options to select
  commonAllergies.forEach(allergy => {
    const option = document.createElement('option');
    option.value = allergy.value;
    option.textContent = allergy.label;
    allergiesSelect.appendChild(option);
  });
  
  // In a real app, you would use a library like Select2 or Choices.js
  // For this demo, we'll use a simple approach
  allergiesSelect.multiple = true;
}

/**
 * Handle form submission for dietary suggestions
 * @param {Event} event - The form submit event
 */
function handleDietarySubmit(event) {
  event.preventDefault();
  
  if (!allergiesSelect || allergiesSelect.selectedOptions.length === 0) {
    alert('Please select at least one allergy');
    return;
  }
  
  // Get selected allergies
  const allergies = Array.from(allergiesSelect.selectedOptions).map(option => option.textContent);
  const preferences = preferencesInput ? preferencesInput.value : '';
  const restrictions = restrictionsInput ? restrictionsInput.value : '';
  
  // Send to API for dietary suggestions
  getDietarySuggestions(allergies, preferences, restrictions);
}

/**
 * Get dietary suggestions from the API
 * @param {Array} allergies - List of allergies
 * @param {string} preferences - Dietary preferences
 * @param {string} restrictions - Additional dietary restrictions
 */
function getDietarySuggestions(allergies, preferences, restrictions) {
  showDietaryLoading(true);
  
  fetch('/api/chatbot/dietary-suggestions/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      allergies,
      preferences,
      restrictions
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
        displayDietarySuggestions(data);
      } else {
        throw new Error(data.message || 'Failed to get dietary suggestions');
      }
    })
    .catch(error => {
      console.error('Dietary suggestions error:', error);
      alert('Error getting dietary suggestions. Please try again later.');
    })
    .finally(() => {
      showDietaryLoading(false);
    });
}

/**
 * Display dietary suggestions in the UI
 * @param {Object} data - Dietary suggestions data from the API
 */
function displayDietarySuggestions(data) {
  if (!dietaryResults) return;
  
  // Clear previous results
  dietaryResults.innerHTML = '';
  
  // Create results container
  const resultsContainer = document.createElement('div');
  resultsContainer.className = 'dietary-results-container';
  
  // Add foods to avoid
  if (data.foods_to_avoid && data.foods_to_avoid.length > 0) {
    const avoidSection = document.createElement('div');
    avoidSection.className = 'dietary-section avoid-section';
    avoidSection.innerHTML = `
      <h3><i class="fas fa-ban"></i> Foods to Avoid</h3>
      <ul class="avoid-list">
        ${data.foods_to_avoid.map(food => `<li>${food}</li>`).join('')}
      </ul>
    `;
    resultsContainer.appendChild(avoidSection);
  }
  
  // Add safe alternatives
  if (data.safe_alternatives && data.safe_alternatives.length > 0) {
    const alternativesSection = document.createElement('div');
    alternativesSection.className = 'dietary-section alternatives-section';
    alternativesSection.innerHTML = `
      <h3><i class="fas fa-exchange-alt"></i> Safe Alternatives</h3>
      <ul class="alternatives-list">
        ${data.safe_alternatives.map(alt => `<li>${alt}</li>`).join('')}
      </ul>
    `;
    resultsContainer.appendChild(alternativesSection);
  }
  
  // Add meal plan
  if (data.meal_plan && data.meal_plan.length > 0) {
    const mealPlanSection = document.createElement('div');
    mealPlanSection.className = 'dietary-section meal-plan-section';
    mealPlanSection.innerHTML = `
      <h3><i class="fas fa-utensils"></i> 3-Day Meal Plan</h3>
      <div class="meal-plan">
        ${data.meal_plan.map(meal => `<p>${meal}</p>`).join('')}
      </div>
    `;
    resultsContainer.appendChild(mealPlanSection);
  }
  
  // Add shopping list
  if (data.shopping_list && data.shopping_list.length > 0) {
    const shoppingSection = document.createElement('div');
    shoppingSection.className = 'dietary-section shopping-section';
    shoppingSection.innerHTML = `
      <h3><i class="fas fa-shopping-cart"></i> Shopping List</h3>
      <ul class="shopping-list">
        ${data.shopping_list.map(item => `<li>${item}</li>`).join('')}
      </ul>
    `;
    resultsContainer.appendChild(shoppingSection);
  }
  
  // Add eating out tips
  if (data.eating_out_tips && data.eating_out_tips.length > 0) {
    const eatingOutSection = document.createElement('div');
    eatingOutSection.className = 'dietary-section eating-out-section';
    eatingOutSection.innerHTML = `
      <h3><i class="fas fa-store"></i> Tips for Eating Out</h3>
      <ul class="eating-out-list">
        ${data.eating_out_tips.map(tip => `<li>${tip}</li>`).join('')}
      </ul>
    `;
    resultsContainer.appendChild(eatingOutSection);
  }
  
  // Add full suggestions (collapsible)
  const fullSuggestionsSection = document.createElement('div');
  fullSuggestionsSection.className = 'dietary-section full-suggestions-section';
  fullSuggestionsSection.innerHTML = `
    <div class="full-suggestions-header">
      <h3>Full Dietary Plan</h3>
      <button class="btn btn-outline toggle-suggestions"><i class="fas fa-chevron-down"></i></button>
    </div>
    <div class="full-suggestions-content" style="display: none;">
      <pre>${data.full_suggestions}</pre>
    </div>
  `;
  resultsContainer.appendChild(fullSuggestionsSection);
  
  // Add actions
  const actionsSection = document.createElement('div');
  actionsSection.className = 'dietary-actions';
  actionsSection.innerHTML = `
    <button class="btn btn-outline" id="new-dietary-btn"><i class="fas fa-redo"></i> New Plan</button>
    <button class="btn btn-primary" id="print-dietary-btn"><i class="fas fa-print"></i> Print Plan</button>
  `;
  resultsContainer.appendChild(actionsSection);
  
  // Add to results container
  dietaryResults.appendChild(resultsContainer);
  dietaryResults.style.display = 'block';
  
  // Add event listeners
  document.querySelector('.toggle-suggestions').addEventListener('click', function() {
    const content = document.querySelector('.full-suggestions-content');
    const icon = this.querySelector('i');
    
    if (content.style.display === 'none') {
      content.style.display = 'block';
      icon.className = 'fas fa-chevron-up';
    } else {
      content.style.display = 'none';
      icon.className = 'fas fa-chevron-down';
    }
  });
  
  document.getElementById('new-dietary-btn').addEventListener('click', function() {
    dietaryResults.style.display = 'none';
    dietaryForm.reset();
  });
  
  document.getElementById('print-dietary-btn').addEventListener('click', function() {
    window.print();
  });
}

/**
 * Show or hide the loading indicator
 * @param {boolean} show - Whether to show the loading indicator
 */
function showDietaryLoading(show) {
  if (dietaryLoading) {
    dietaryLoading.style.display = show ? 'flex' : 'none';
  }
  
  if (dietaryBtn) {
    dietaryBtn.disabled = show;
  }
}

// Initialize the dietary suggestions functionality when the DOM is loaded
document.addEventListener('DOMContentLoaded', initDietarySuggestions);
