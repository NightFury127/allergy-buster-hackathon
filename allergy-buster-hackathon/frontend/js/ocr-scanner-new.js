/**
 * Simplified OCR Scanner functionality for AllergyBuster
 * Focuses on ensuring text appears in both sections
 */

// DOM Elements
const scannerVideo = document.getElementById("scanner-video");
const scannerCanvas = document.getElementById("scanner-canvas");
const scannerPlaceholder = document.getElementById("scanner-placeholder");
const startScannerBtn = document.getElementById("start-scanner");
const uploadImageBtn = document.getElementById("upload-image");
const fileInput = document.getElementById("file-input");
const cancelScanBtn = document.getElementById("cancel-scan");
const scannerLoading = document.getElementById("scanner-loading");
const scanResults = document.getElementById("scan-results");
const rawTextElement = document.getElementById("raw-text");
const ingredientsTextElement = document.getElementById("ingredients-text");
const allergyMatches = document.getElementById("allergy-matches");
const scanAgainBtn = document.getElementById("scan-again");

// Global variables
let stream = null;
let lastRawText = "";

/**
 * Initialize the scanner
 */
function initScanner() {
  console.log("Initializing OCR scanner...");
  
  // Add event listeners
  if (startScannerBtn) {
    startScannerBtn.addEventListener("click", startScanner);
  }

  if (uploadImageBtn) {
    uploadImageBtn.addEventListener("click", () => {
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", handleFileUpload);
  }

  if (cancelScanBtn) {
    cancelScanBtn.addEventListener("click", () => {
      stopCameraStream();
      resetScanner();
    });
  }

  if (scanAgainBtn) {
    scanAgainBtn.addEventListener("click", resetScanner);
  }
  
  // Force update ingredients text if raw text already exists
  if (rawTextElement && rawTextElement.textContent) {
    forceUpdateIngredientsText(rawTextElement.textContent);
  }
}

/**
 * Force update the ingredients text with the given content
 */
function forceUpdateIngredientsText(text) {
  console.log("Forcing update of ingredients text:", text);
  
  if (ingredientsTextElement) {
    ingredientsTextElement.textContent = text;
    lastRawText = text;
    
    // Add a class to make it more visible
    ingredientsTextElement.classList.add("updated");
    
    // Log the current state
    console.log("Ingredients element after update:", 
      ingredientsTextElement.textContent,
      "Visible:", ingredientsTextElement.offsetHeight > 0);
  } else {
    console.error("Ingredients text element not found!");
  }
}

/**
 * Handle file upload for OCR processing
 */
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Check if the file is an image
  if (!file.type.match("image.*")) {
    alert("Please select an image file (jpg, png, etc.)");
    return;
  }

  showLoading(true);
  
  // Create a FileReader to read the image
  const reader = new FileReader();
  
  reader.onload = function (e) {
    // Create an image element to get dimensions
    const img = new Image();
    img.onload = function () {
      // Draw the image on the canvas
      const context = scannerCanvas.getContext("2d");
      scannerCanvas.width = img.width;
      scannerCanvas.height = img.height;
      context.drawImage(img, 0, 0, img.width, img.height);
      
      // Convert canvas to blob and send to server
      scannerCanvas.toBlob((blob) => {
        sendImageForOCR(blob);
      }, "image/jpeg", 0.8);
    };
    img.src = e.target.result;
  };
  
  reader.onerror = function () {
    alert("Error reading the file. Please try again.");
    showLoading(false);
  };
  
  // Read the file as a data URL
  reader.readAsDataURL(file);
  
  // Reset the file input so the same file can be selected again
  fileInput.value = "";
}

/**
 * Send the captured image to the server for OCR processing
 */
function sendImageForOCR(blob) {
  showLoading(true);

  const formData = new FormData();
  formData.append("image", blob, "scan.jpg");

  // Get the base URL from the current location
  const baseUrl = window.location.protocol + "//" + window.location.host;
  const apiUrl =
    baseUrl === "http://localhost:8080"
      ? "http://localhost:8000/api/chatbot/ocr/" // Development environment
      : "/api/chatbot/ocr/"; // Production environment

  console.log("Sending image to OCR API:", apiUrl);
  
  fetch(apiUrl, {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (data.status === "success") {
        displayOCRResults(data);
      } else {
        throw new Error(data.message || "OCR processing failed");
      }
    })
    .catch((error) => {
      console.error("OCR error:", error);
      alert("Error processing image: " + error.message);
      showLoading(false);
    });
}

/**
 * Display the OCR results in the UI
 */
function displayOCRResults(data) {
  console.log("OCR Results received:", data);
  
  // Get the raw text
  const rawText = data.raw_text || "No text detected";
  
  // Display the raw text in the raw text box
  if (rawTextElement) {
    rawTextElement.textContent = rawText;
    console.log("Raw text set:", rawText);
  }
  
  // Force update the ingredients text
  forceUpdateIngredientsText(rawText);
  
  // Set a timer to check again after a delay
  setTimeout(() => {
    if (!ingredientsTextElement.textContent || 
        ingredientsTextElement.textContent.trim() === "") {
      console.log("Ingredients text still empty after delay, forcing update again");
      forceUpdateIngredientsText(rawText);
    }
  }, 500);
  
  // Create results container for allergens and analysis
  let resultsHTML = "";
  
  // Display detected allergens
  if (data.detected_allergens && data.detected_allergens.length > 0) {
    resultsHTML += '<div class="result-section allergens-section">';
    resultsHTML += '<h3><i class="fas fa-exclamation-triangle"></i> Allergens Detected</h3>';
    resultsHTML += '<ul class="allergen-list">';
    data.detected_allergens.forEach((allergen) => {
      resultsHTML += `<li class="allergen-item warning"><i class="fas fa-exclamation-triangle"></i> ${allergen}</li>`;
    });
    resultsHTML += "</ul></div>";
  } else {
    resultsHTML += '<p class="no-allergens">No common allergens detected</p>';
  }
  
  // Display AI analysis if available
  if (data.ai_analysis) {
    resultsHTML += '<div class="result-section ai-analysis-section">';
    resultsHTML += '<h3><i class="fas fa-robot"></i> AI Analysis</h3>';
    resultsHTML += `<div class="ai-analysis">${formatAIAnalysis(data.ai_analysis)}</div>`;
    resultsHTML += "</div>";
  }
  
  // Add scan again button
  resultsHTML += '<div class="scan-actions">';
  resultsHTML += '<button class="btn btn-outline" id="scan-again-btn"><i class="fas fa-redo"></i> Scan Again</button>';
  resultsHTML += "</div>";
  
  // Update the UI
  allergyMatches.innerHTML = resultsHTML;
  
  // Add event listener to the scan again button
  document.getElementById("scan-again-btn").addEventListener("click", resetScanner);
  
  // Show the results
  scanResults.style.display = "block";
  showLoading(false);
  
  // Stop the camera stream
  stopCameraStream();
}

/**
 * Format the AI analysis text with markdown-like syntax
 */
function formatAIAnalysis(text) {
  if (!text) return "";
  
  // Replace newlines with <br>
  text = text.replace(/\n/g, "<br>");
  
  // Make headings bold
  text = text.replace(/^([A-Z][A-Za-z\s]+:)/gm, "<strong>$1</strong>");
  
  // Make list items
  text = text.replace(/^(\d+\.\s+)/gm, "<br>$1");
  text = text.replace(/^(-\s+)/gm, "<br>• ");
  
  return text;
}

/**
 * Reset the scanner to scan another product
 */
function resetScanner() {
  scanResults.style.display = "none";
  
  // Clear all result text
  if (rawTextElement) rawTextElement.textContent = "";
  if (ingredientsTextElement) ingredientsTextElement.textContent = "";
  if (allergyMatches) allergyMatches.innerHTML = "";
  
  // Reset UI state
  scannerPlaceholder.style.display = "flex";
  startScannerBtn.textContent = "Start Scanner";
  startScannerBtn.onclick = startScanner;
  cancelScanBtn.style.display = "none";
}

/**
 * Show or hide the loading indicator
 */
function showLoading(show) {
  if (scannerLoading) {
    scannerLoading.style.display = show ? "flex" : "none";
  }
}

// Initialize the scanner when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, initializing scanner...");
  initScanner();
  
  // Set up a global function that can be called from the console for debugging
  window.forceUpdateIngredientsText = forceUpdateIngredientsText;
  window.updateFromRawText = () => {
    if (rawTextElement && rawTextElement.textContent) {
      forceUpdateIngredientsText(rawTextElement.textContent);
    }
  };
});
