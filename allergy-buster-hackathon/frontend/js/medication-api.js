/**
 * Fetch medication information from the backend API
 * @param {string} medicationName - Name of the medication to search for
 * @returns {Promise} - Promise that resolves to medication data
 */
async function fetchMedicationInfo(medicationName) {
  try {
    const response = await fetch(`/api/chatbot/medication/?name=${encodeURIComponent(medicationName)}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error('Error fetching medication data:', error);
    throw error;
  }
}

/**
 * Display medication information in the UI
 * @param {string} medicationName - Name of the medication to display
 */
async function displayMedicationInfo(medicationName) {
  const resultsContainer = document.getElementById('medication-results');
  
  try {
    resultsContainer.innerHTML = '<div class="loading">Loading medication data...</div>';
    
    const medicationData = await fetchMedicationInfo(medicationName);
    
    if (!medicationData || medicationData.length === 0) {
      resultsContainer.innerHTML = '<div class="no-results">No medication information found</div>';
      return;
    }
    
    const medication = medicationData[0];
    
    // Create HTML for medication details
    let html = `
      <div class="medication-detail">
        <h3>${medication.name}</h3>
        <div class="medication-info">
    `;
    
    // Add ingredients
    if (medication.ingredients && medication.ingredients.length > 0) {
      html += '<div class="ingredients-section"><h4>Active Ingredients:</h4><ul>';
      medication.ingredients.forEach(ingredient => {
        html += `<li>${ingredient.name}</li>`;
      });
      html += '</ul></div>';
    }
    
    // Add drug classes
    if (medication.drug_classes && medication.drug_classes.length > 0) {
      html += '<div class="drug-class-section"><h4>Drug Class:</h4><ul>';
      medication.drug_classes.forEach(drugClass => {
        html += `<li>${drugClass}</li>`;
      });
      html += '</ul></div>';
    }
    
    // Add related medications
    if (medication.related_medications && medication.related_medications.length > 0) {
      html += '<div class="related-meds-section"><h4>Related Medications:</h4><ul>';
      medication.related_medications.forEach(relatedMed => {
        html += `<li>${relatedMed.name}</li>`;
      });
      html += '</ul></div>';
    }
    
    html += '</div></div>';
    resultsContainer.innerHTML = html;
    
  } catch (error) {
    resultsContainer.innerHTML = `<div class="error">Error loading medication data: ${error.message}</div>`;
  }
}