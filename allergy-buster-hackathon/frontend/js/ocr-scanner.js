/**
 * OCR Scanner functionality for AllergyBuster
 * Handles camera access, image capture, and OCR processing
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
const ingredientsText = document.getElementById("ingredients-text");
const allergyMatches = document.getElementById("allergy-matches");
const scanAgainBtn = document.getElementById("scan-again");

// Global variables
let stream = null;

/**
 * Initialize the scanner
 */
function initScanner() {
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
}

/**
 * Handle file upload for OCR processing
 * @param {Event} event - The file input change event
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
      scannerCanvas.toBlob(sendImageForOCR, "image/jpeg", 0.8);
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
 * Start the camera scanner
 */
async function startScanner() {
  try {
    showLoading(true);
    scannerPlaceholder.style.display = "none";

    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });

    scannerVideo.srcObject = stream;
    scannerVideo.style.display = "block";
    startScannerBtn.textContent = "Capture Image";
    startScannerBtn.onclick = captureImage;
    cancelScanBtn.style.display = "inline-block";
    showLoading(false);
  } catch (err) {
    console.error("Camera error:", err);
    alert("Could not access camera. Please check permissions.");
    showLoading(false);
    scannerPlaceholder.style.display = "flex";
  }
}

/**
 * Capture an image from the video stream
 */
function captureImage() {
  if (!stream) return;

  const context = scannerCanvas.getContext("2d");
  scannerCanvas.width = scannerVideo.videoWidth;
  scannerCanvas.height = scannerVideo.videoHeight;
  context.drawImage(
    scannerVideo,
    0,
    0,
    scannerCanvas.width,
    scannerCanvas.height
  );

  // Convert canvas to blob and send to server
  scannerCanvas.toBlob(sendImageForOCR, "image/jpeg", 0.8);
}

/**
 * Send the captured image to the server for OCR processing
 * @param {Blob} blob - The image blob to send
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
 * @param {Object} data - The OCR results from the server
 */
function displayOCRResults(data) {
  console.log("OCR Results:", data);

  // Display the raw text in the raw text box
  const rawText = data.raw_text || "No text detected";

  // Set the raw text
  const rawTextElement = document.getElementById("raw-text");
  if (rawTextElement) {
    rawTextElement.textContent = rawText;
    console.log("Raw text set:", rawText);
  } else {
    console.error("Raw text element not found!");
  }

  // Set the ingredients text (directly accessing the element to avoid any issues)
  const ingredientsTextElement = document.getElementById("ingredients-text");
  if (ingredientsTextElement) {
    ingredientsTextElement.textContent = rawText;
    console.log("Ingredients text set:", rawText);

    // Make it more visible
    ingredientsTextElement.style.border = "3px solid #ff7e5f";
    ingredientsTextElement.style.backgroundColor = "#f0fff4";
    ingredientsTextElement.style.color = "#000";
    ingredientsTextElement.style.fontWeight = "bold";
  } else {
    console.error("Ingredients text element not found!");
  }

  // Force update with multiple delays to ensure it's displayed
  setTimeout(() => {
    if (
      ingredientsTextElement &&
      (!ingredientsTextElement.textContent ||
        ingredientsTextElement.textContent.trim() === "")
    ) {
      console.log(
        "Ingredients text is empty after 500ms delay, forcing update"
      );
      ingredientsTextElement.textContent = rawText;
    }
  }, 500);

  setTimeout(() => {
    if (
      ingredientsTextElement &&
      (!ingredientsTextElement.textContent ||
        ingredientsTextElement.textContent.trim() === "")
    ) {
      console.log(
        "Ingredients text is empty after 1000ms delay, forcing update"
      );
      ingredientsTextElement.textContent = rawText;
    }
  }, 1000);

  // Create a global variable to store the text for debugging
  window.lastRawText = rawText;

  console.log("Raw text used for ingredients:", rawText);

  // Store the ingredients text in a global variable for debugging
  window.lastIngredientsText = rawText;

  // Ensure the text is visible by checking after a short delay
  setTimeout(() => {
    if (
      !ingredientsText.textContent ||
      ingredientsText.textContent.trim() === ""
    ) {
      console.log("Ingredients text is empty after delay, forcing update");
      ingredientsText.textContent = rawText;
    }
  }, 500);

  // Create results container
  let resultsHTML = "";

  // Display detected allergens
  if (data.detected_allergens && data.detected_allergens.length > 0) {
    resultsHTML += '<div class="result-section allergens-section">';
    resultsHTML +=
      '<h3><i class="fas fa-exclamation-triangle"></i> Allergens Detected</h3>';
    resultsHTML += '<ul class="allergen-list">';
    data.detected_allergens.forEach((allergen) => {
      resultsHTML += `<li class="allergen-item warning"><i class="fas fa-exclamation-triangle"></i> ${allergen}</li>`;
    });
    resultsHTML += "</ul>";
    resultsHTML += "</div>";
  } else {
    resultsHTML += '<p class="no-allergens">No common allergens detected</p>';
  }

  // Display detected medications if available
  if (data.detected_medications && data.detected_medications.length > 0) {
    resultsHTML += '<div class="result-section medications-section">';
    resultsHTML += '<h3><i class="fas fa-pills"></i> Medications Detected</h3>';
    resultsHTML += '<ul class="medication-list">';
    data.detected_medications.forEach((medication) => {
      resultsHTML += `<li class="medication-item"><i class="fas fa-pills"></i> ${medication}</li>`;
    });
    resultsHTML += "</ul>";
    resultsHTML += "</div>";
  }

  // Display AI analysis if available
  if (data.ai_analysis) {
    resultsHTML += '<div class="result-section ai-analysis-section">';
    resultsHTML += '<h3><i class="fas fa-robot"></i> AI Analysis</h3>';
    resultsHTML += `<div class="ai-analysis">${formatAIAnalysis(
      data.ai_analysis
    )}</div>`;
    resultsHTML += "</div>";
  }

  // Add action buttons
  resultsHTML += '<div class="scan-actions">';
  resultsHTML +=
    '<button class="btn btn-outline" id="scan-again-btn"><i class="fas fa-redo"></i> Scan Again</button>';

  // Add lookup medication button if medications were detected
  if (data.detected_medications && data.detected_medications.length > 0) {
    const firstMed = data.detected_medications[0];
    resultsHTML += `<button class="btn btn-primary" id="lookup-med-btn" data-med="${firstMed}">
      <i class="fas fa-search"></i> Lookup ${firstMed}
    </button>`;
  }

  resultsHTML += "</div>";

  // Update the UI
  allergyMatches.innerHTML = resultsHTML;

  // Add event listeners to the new buttons
  document
    .getElementById("scan-again-btn")
    .addEventListener("click", resetScanner);

  const lookupMedBtn = document.getElementById("lookup-med-btn");
  if (lookupMedBtn) {
    lookupMedBtn.addEventListener("click", function () {
      const medication = this.getAttribute("data-med");
      // Navigate to medication tab and search for this medication
      const medicationTab = document.querySelector(
        '.tab-btn[data-tab="medications"]'
      );
      if (medicationTab) {
        medicationTab.click();
        const medicationInput = document.getElementById("medication-input");
        if (medicationInput) {
          medicationInput.value = medication;
          const medicationForm = document.getElementById("medication-form");
          if (medicationForm) {
            medicationForm.dispatchEvent(new Event("submit"));
          }
        }
      }
    });
  }

  scanResults.style.display = "block";
  showLoading(false);

  // Stop the camera stream
  stopCameraStream();
}

/**
 * Format the AI analysis text with markdown-like syntax
 * @param {string} text - The AI analysis text
 * @returns {string} Formatted HTML
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
 * Stop the camera stream
 */
function stopCameraStream() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
    scannerVideo.srcObject = null;
    scannerVideo.style.display = "none";
  }
}

/**
 * Reset the scanner to scan another product
 */
function resetScanner() {
  scanResults.style.display = "none";

  // Clear all result text
  document.getElementById("raw-text").textContent = "";
  ingredientsText.textContent = "";
  allergyMatches.innerHTML = "";

  // Reset UI state
  scannerPlaceholder.style.display = "flex";
  startScannerBtn.textContent = "Start Scanner";
  startScannerBtn.onclick = startScanner;
  cancelScanBtn.style.display = "none";

  // Remove any event listeners from the scan-again button
  const scanAgainBtn = document.getElementById("scan-again-btn");
  if (scanAgainBtn) {
    const newBtn = scanAgainBtn.cloneNode(true);
    scanAgainBtn.parentNode.replaceChild(newBtn, scanAgainBtn);
    newBtn.addEventListener("click", resetScanner);
  }
}

/**
 * Show or hide the loading indicator
 * @param {boolean} show - Whether to show the loading indicator
 */
function showLoading(show) {
  scannerLoading.style.display = show ? "flex" : "none";
}

// Function to directly set the ingredients text from the raw text
function updateIngredientsFromRawText() {
  const rawTextElement = document.getElementById("raw-text");
  const ingredientsTextElement = document.getElementById("ingredients-text");

  if (rawTextElement && ingredientsTextElement) {
    const rawText = rawTextElement.textContent;
    if (rawText && rawText.trim() !== "") {
      ingredientsTextElement.textContent = rawText;
      console.log("Updated ingredients text from raw text:", rawText);
    }
  }
}

// Initialize the scanner when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initScanner();

  // Set up a MutationObserver to watch for changes to the raw text
  const rawTextElement = document.getElementById("raw-text");
  if (rawTextElement) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "characterData" ||
          mutation.type === "childList"
        ) {
          updateIngredientsFromRawText();
        }
      });
    });

    observer.observe(rawTextElement, {
      characterData: true,
      childList: true,
      subtree: true,
    });
  }
});
