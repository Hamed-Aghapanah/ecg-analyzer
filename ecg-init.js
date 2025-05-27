// ECG Application Initialization

// Variables to track canvas state
let currentCanvas = null;

// Main initialization function
window.onload = function() {
    // Always clear saved form data on page load
    localStorage.removeItem('ecgFormData');
    // Initialize UI controls
    initializeUIControls();
    
    // Initialize validation system
    initializeValidation();
    
    // Set up event listeners for analysis buttons
    document.getElementById('analyzeBtn').addEventListener('click', analyzeECG);
    document.getElementById('exportExcelBtn').addEventListener('click', exportToCSV);
    document.getElementById('toggleDeepInterpreterBtn').addEventListener('click', toggleDeepInterpreterSection);
    
    // Set up modal close button
    const modal = document.getElementById('myModal');
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            hideModal();
        }
    });
    
    // Make sure we're showing the first page
    showPage(currentPage);
    // Do not set any default values for form fields here. Only restore from local storage if available (handled in UI controls).
}; 