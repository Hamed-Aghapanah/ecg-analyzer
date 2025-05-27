// Global variables
let currentPage = 1;
const totalPages = 7; // Updated total pages

// Function to show a specific page
function showPage(pageNumber) {
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });
    const targetPage = document.getElementById('page' + pageNumber);
    if (targetPage) {
        targetPage.style.display = 'block';
    }
    // Sync dropdown selector
    const stepDropdown = document.getElementById('stepDropdown');
    if (stepDropdown) {
        stepDropdown.value = String(pageNumber);
    }
}

// Function to update pagination button states and text
function updatePaginationButtons() {
    // Only update bottom pagination buttons now
    const bottomPrevBtn = document.querySelector('#page' + currentPage + ' .bottom-pagination-controls .back');
    const bottomNextBtn = document.querySelector('#page' + currentPage + ' .bottom-pagination-controls .next');

    if (bottomPrevBtn) {
        if (currentPage === 1) {
            bottomPrevBtn.style.display = 'none';
        } else {
            bottomPrevBtn.style.display = 'inline-flex';
        }
    }

    if (bottomNextBtn) {
        if (currentPage === totalPages) {
            bottomNextBtn.style.display = 'none';
        } else {
            bottomNextBtn.style.display = 'inline-flex';
        }
    }
}

// Function to change the current page
function changePage(direction) {
    const nextPage = currentPage + direction;
    if (nextPage >= 1 && nextPage <= totalPages) {
        currentPage = nextPage;
        showPage(currentPage);
        updatePaginationButtons();
        // Scroll to the top of the form container on page change
        document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Function to handle checkbox/radio label selection styling
function setupCheckboxRadioListeners() {
    document.querySelectorAll('.checkbox-label input[type="checkbox"]').forEach(checkbox => {
        checkbox.parentElement.classList.toggle('selected', checkbox.checked);
        checkbox.addEventListener('change', function() {
            this.parentElement.classList.toggle('selected', this.checked);
        });
    });

    document.querySelectorAll('.radio-label input[type="radio"]').forEach(radio => {
        // Initial state
        radio.parentElement.classList.toggle('selected', radio.checked);

        radio.addEventListener('change', function() {
            // Deselect all other radio buttons in the same group
            document.querySelectorAll(`input[name="${this.name}"]`).forEach(otherRadio => {
                otherRadio.parentElement.classList.remove('selected');
            });
            // Select the current radio button
            this.parentElement.classList.add('selected');
        });
    });
}

// Function to show the modal with a message (now unused for validation errors)
function showModal(message) {
    const modal = document.getElementById('myModal');
    const modalMessage = document.getElementById('modalMessage');
    modalMessage.innerHTML = message;

    modal.style.display = 'block';
}

// Function to hide the modal
function hideModal() {
    const modal = document.getElementById('myModal');
    modal.style.display = 'none';
    // Clear modal content on close
    document.getElementById('modalMessage').innerHTML = '';
}

// Function to toggle the display of the NOT OK rules section
function toggleNotOkRulesSection() {
    const notOkRulesListUl = document.getElementById('notOkRulesList');
    if (notOkRulesListUl.style.display === 'none') {
        notOkRulesListUl.style.display = 'block';
    } else {
        notOkRulesListUl.style.display = 'none';
    }
}

// Function to toggle the display of the OK rules list
function toggleOkRulesSection() {
    const okRulesListContainerDiv = document.getElementById('okRulesListContainer');
    const toggleBtn = document.getElementById('toggleOkRulesBtn');

    if (okRulesListContainerDiv.style.display === 'none') {
        okRulesListContainerDiv.style.display = 'block';
        toggleBtn.textContent = 'Hide Rules Met';
    } else {
        okRulesListContainerDiv.style.display = 'none';
        toggleBtn.textContent = `Show Rules Met (${okRulesListContainerDiv.children.length})`;
    }
}

// Function to toggle the display of the Deep Interpreter section
function toggleDeepInterpreterSection() {
    const deepInterpretationList = document.getElementById('deepInterpretationList');
    const toggleBtn = document.getElementById('toggleDeepInterpreterBtn');

    if (deepInterpretationList.style.display === 'none') {
        deepInterpretationList.style.display = 'block';
        toggleBtn.textContent = 'Hide Deep Interpretations';
    } else {
        deepInterpretationList.style.display = 'none';
        toggleBtn.textContent = `Show Deep Interpretations (${deepInterpretationList.children.length})`;
    }
}

// Function to save form data to local storage
function saveFormData() {
    const formData = {};
    document.querySelectorAll('.form-container input, .form-container select, .form-container textarea').forEach(element => {
        if (element.type === 'checkbox') {
            formData[element.id] = element.checked;
        } else if (element.type === 'radio') {
            if (element.checked) {
                formData[element.name] = element.value;
            }
        }
        else {
            formData[element.id] = element.value;
        }
    });
    localStorage.setItem('ecgFormData', JSON.stringify(formData));
}

// Function to load form data from local storage
function loadFormData() {
    const savedData = localStorage.getItem('ecgFormData');
    if (savedData) {
        const formData = JSON.parse(savedData);
        for (const key in formData) {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = formData[key];
                    element.parentElement.classList.toggle('selected', element.checked);
                } else if (element.type === 'radio') {
                    document.querySelectorAll(`input[name="${element.name}"]`).forEach(radio => {
                        if (radio.value === formData[element.name]) {
                            radio.checked = true;
                            radio.parentElement.classList.add('selected');
                        } else {
                            radio.parentElement.classList.remove('selected');
                        }
                    });
                }
                else {
                    element.value = formData[key];
                }
            }
        }
    }
}

// Setup form persistence (save on input change)
function setupFormPersistence() {
    document.querySelectorAll('.form-container input, .form-container select, .form-container textarea').forEach(element => {
        element.addEventListener('input', saveFormData);
        element.addEventListener('change', saveFormData);
    });
}

// Add event listener for step dropdown
function setupStepDropdown() {
    const stepDropdown = document.getElementById('stepDropdown');
    if (stepDropdown) {
        stepDropdown.addEventListener('change', function() {
            const selectedStep = parseInt(this.value, 10);
            if (!isNaN(selectedStep) && selectedStep >= 1 && selectedStep <= totalPages) {
                currentPage = selectedStep;
                showPage(currentPage);
                updatePaginationButtons();
                document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }
}

// Initialize the form - moved window.onload to a separate init.js file
function initializeUIControls() {
    showPage(currentPage);
    updatePaginationButtons();
    setupCheckboxRadioListeners();
    setupFormPersistence();
    loadFormData();
    setupStepDropdown();
    // Remove toggleNotOkRulesBtn event listener, add to notOkRulesSection instead
    const notOkRulesSection = document.getElementById('notOkRulesSection');
    if (notOkRulesSection) {
        notOkRulesSection.addEventListener('click', toggleNotOkRulesSection);
    }
}

window.addEventListener('resize', () => {
    if (currentCanvas) {
        const container = currentCanvas.parentElement;
        currentCanvas.width = container.clientWidth;
        currentCanvas.height = 150;
    }
}); 