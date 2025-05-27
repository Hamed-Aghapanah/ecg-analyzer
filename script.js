let currentPage = 1;
const totalPages = 7;
let animationFrameId = null;
let currentCanvas = null;
let currentCtx = null;

// Global object to store the validation status of each page
const pageValidationStatus = {}; // e.g., { 1: 'ok', 2: 'warning', 3: 'error', 4: 'none' }

// Define Normal and Overall Ranges for numeric inputs
const ranges = {
    pWaveDuration: { normal: [80, 110], overall: [0, 200] },
    prInterval: { normal: [120, 200], overall: [0, 500] },
    qrsDuration: { normal: [80, 100], overall: [0, 300] },
    qtcInterval: { normal: [350, 440], overall: [0, 700] },
    heartRate: { normal: [60, 100], overall: [0, 300] }
};

// Mapping of page numbers to descriptive names
const pageNames = {
    1: "Patient Information",
    2: "P Wave & PR Interval",
    3: "QRS Complex",
    4: "QT & Axis",
    5: "ST, T, U Waves",
    6: "Rhythm and Rate",
    7: "Analysis & Actions"
};

// Define required fields for each page
const requiredFields = {
    1: ['patientId', 'age', 'sex', 'recordingDate', 'clinicalHistory'],
    2: ['pWaveDuration', 'pWaveShape', 'atrialEnlargement', 'prInterval', 'avBlockType'],
    3: ['qrsDuration', 'qrsMorphology', 'qrsVoltage', 'rWaveProgression'],
    4: ['qtcInterval', 'qtAbnormality', 'qrsAxis'],
    5: ['stSegmentStatuses', 'tWaveAbnormalities'], // 'stSegmentStatuses' refers to the checkbox group
    6: ['heartRate', 'rhythm'],
    7: [] // No required fields for the analysis page itself
};


// Helper function to check if a value is a valid number
function isValidNumber(value) {
    return value !== null && value !== '' && !isNaN(value);
}

// Function to show a specific page
function showPage(pageNumber) {
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });
    const targetPage = document.getElementById('page' + pageNumber);
    if (targetPage) {
        targetPage.style.display = 'block';

        const allCanvases = document.querySelectorAll('.wavy-canvas');
        allCanvases.forEach(canvas => {
            canvas.style.display = 'none';
        });

        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        currentCtx = null;
    }
}

// Function to update pagination button states and text
function updatePaginationButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const bottomPrevBtn = document.querySelector('#page' + currentPage + ' .bottom-pagination-controls .back');
    const bottomNextBtn = document.querySelector('#page' + currentPage + ' .bottom-pagination-controls .next');

    if (currentPage === 1) {
        prevBtn.disabled = true;
    } else {
        prevBtn.disabled = false;
    }

    if (currentPage === totalPages) {
        nextBtn.disabled = true;
    } else {
        nextBtn.disabled = false;
    }

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
    updateStepButtons(); // Also update the step buttons for colors
    updateStepDropdown(); // Update the dropdown selection
}

// Function to update the step buttons (colors and text)
function updateStepButtons() {
    const stepButtonsContainer = document.getElementById('stepButtonsContainer');
    stepButtonsContainer.innerHTML = ''; // Clear existing buttons

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.classList.add('step-button');
        button.textContent = `Step ${i}`;
        button.onclick = () => goToPage(i);

        let statusClass = '';
        if (i === currentPage) {
            statusClass = 'step-blue';
        } else {
            const status = pageValidationStatus[i];
            if (status === 'ok') {
                statusClass = 'step-green';
            } else if (status === 'warning') {
                statusClass = 'step-yellow';
            } else if (status === 'error') {
                statusClass = 'step-red';
            } else {
                statusClass = 'step-white'; // 'none' status
            }
        }
        button.classList.add(statusClass);
        stepButtonsContainer.appendChild(button);
    }
}

// Function to update the step dropdown
function updateStepDropdown() {
    const stepDropdown = document.getElementById('stepDropdown');
    stepDropdown.innerHTML = ''; // Clear existing options

    for (let i = 1; i <= totalPages; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Step ${i}: ${pageNames[i]}`;
        if (i === currentPage) {
            option.selected = true;
        }
        stepDropdown.appendChild(option);
    }
}

// Function to change the current page
function changePage(direction) {
    // Validate current page before moving
    const currentValidationResult = validateCurrentPageAndSetStatus();

    if (direction === 1) { // Only check when moving forward
        if (currentValidationResult.hasErrors) {
            // If moving forward and there are errors, show modal and prevent navigation
            let errorMessage = '<strong>لطفاً خطاهای زیر را در این مرحله برطرف کنید:</strong><ul>';
            currentValidationResult.errors.forEach(err => {
                errorMessage += `<li>${err}</li>`;
            });
            errorMessage += '</ul>';
            showModal(errorMessage);
            return; // Prevent page change
        } else if (currentValidationResult.hasWarnings) {
            // If moving forward and there are only warnings, show a warning modal but allow navigation
            let warningMessage = '<strong>توجه: این مرحله دارای هشدارهایی است. می‌توانید ادامه دهید، اما لطفاً قبل از تحلیل نهایی آن‌ها را بررسی کنید:</strong><ul>';
            currentValidationResult.warnings.forEach(warn => {
                warningMessage += `<li>${warn}</li>`;
            });
            warningMessage += '</ul>';
            showModal(warningMessage);
            // DO NOT return here, allow navigation
        }
    }

    const nextPage = currentPage + direction;
    if (nextPage >= 1 && nextPage <= totalPages) {
        currentPage = nextPage;
        showPage(currentPage);
        updatePaginationButtons();
        // Re-validate the new current page to update its status immediately
        validateCurrentPageAndSetStatus();
        document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Function to go to a specific page (from dropdown or step buttons)
function goToPage(pageNumber) {
    // Validate current page before moving if navigating to a different page
    if (pageNumber !== currentPage) {
        const currentValidationResult = validateCurrentPageAndSetStatus();
        // If navigating away from a page with errors, show modal but still allow navigation for convenience
        // This is a UX choice: strict for 'Next', more lenient for direct jumps
        if (currentValidationResult.hasErrors) {
            let errorMessage = '<strong>توجه: این مرحله دارای خطاهایی است. لطفاً قبل از تحلیل نهایی آن‌ها را برطرف کنید:</strong><ul>';
            currentValidationResult.errors.forEach(err => {
                errorMessage += `<li>${err}</li>`;
            });
            errorMessage += '</ul>';
            showModal(errorMessage);
        }
    }

    if (pageNumber >= 1 && pageNumber <= totalPages) {
        currentPage = pageNumber;
        showPage(currentPage);
        updatePaginationButtons();
        // Re-validate the new current page to update its status immediately
        validateCurrentPageAndSetStatus();
        document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Function to handle checkbox/radio label selection styling
function setupCheckboxRadioListeners() {
    document.querySelectorAll('.checkbox-label input[type="checkbox"]').forEach(checkbox => {
        checkbox.parentElement.classList.toggle('selected', checkbox.checked);
        checkbox.addEventListener('change', function() {
            this.parentElement.classList.toggle('selected', this.checked);
            checkConflicts(); // Re-check conflicts on change
            updateOptionStates(); // Re-update option states
            validateCurrentPageAndSetStatus(); // Update status on change
        });
    });

    document.querySelectorAll('.radio-label input[type="radio"]').forEach(radio => {
        radio.parentElement.classList.toggle('selected', radio.checked);
        radio.addEventListener('change', function() {
            document.querySelectorAll(`input[name="${this.name}"]`).forEach(otherRadio => {
                otherRadio.parentElement.classList.remove('selected');
            });
            this.parentElement.classList.add('selected');
            checkConflicts(); // Re-check conflicts on change
            updateOptionStates(); // Re-update option states
            validateCurrentPageAndSetStatus(); // Update status on change
        });
    });
}

// Function to update range display and flag
function updateRangeAndFlag(inputId) {
    const inputField = document.getElementById(inputId);
    const rangeInfoDiv = document.getElementById(inputId + 'Range');
    const flagMessageDiv = document.getElementById(inputId + 'Flag');
    const value = parseFloat(inputField.value);
    const range = ranges[inputId];

    // Clear previous states
    inputField.classList.remove('flagged', 'conflict-highlight', 'warning-highlight', 'error-border');
    if (flagMessageDiv) flagMessageDiv.textContent = '';
    if (rangeInfoDiv) rangeInfoDiv.innerHTML = '';
    const errorDiv = document.getElementById(inputId + 'Error');
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
    }


    if (!range || !rangeInfoDiv || !flagMessageDiv) {
        return;
    }

    rangeInfoDiv.innerHTML = `<span class="normal-range">Normal: ${range.normal[0]}-${range.normal[1]}</span>`;

    let overallRangeText = ` / Overall: ${range.overall[0]}-${range.overall[1]}`;
    let isOutsideOverall = false;
    if (isValidNumber(value) && (value < range.overall[0] || value > range.overall[1])) {
        overallRangeText = ` / <span class="overall-range error">Overall: ${range.overall[0]}-${range.overall[1]}</span>`;
        isOutsideOverall = true;
    } else {
        overallRangeText = ` / <span class="overall-range">${range.overall[0]}-${range.overall[1]}</span>`;
    }
    rangeInfoDiv.innerHTML += overallRangeText;

    if (isValidNumber(value) && (value < range.normal[0] || value > range.normal[1])) {
        if (!isOutsideOverall) {
            inputField.classList.add('flagged');
            flagMessageDiv.textContent = `${inputField.previousElementSibling.textContent.replace('*', '').replace(':', '').trim()} is outside the normal range.`;
        } else {
            inputField.classList.add('conflict-highlight', 'error-border'); // Treat outside overall as error
            flagMessageDiv.textContent = `Value is outside the overall expected range.`;
        }
    }
    // Trigger conflict check and option state update after range/flag changes
    checkConflicts();
    updateOptionStates();
    validateCurrentPageAndSetStatus(); // Update status on change
}

// Function to handle input validation and flagging
function setupInputValidationListeners() {
    for (const inputId in ranges) {
        const inputField = document.getElementById(inputId);
        if (inputField) {
            inputField.addEventListener('input', () => updateRangeAndFlag(inputId));
            if (inputField.value !== '') {
                updateRangeAndFlag(inputId);
            }
        }
    }
}

// Function to clear all validation messages and highlights
function clearAllValidationFeedback() {
    // Clear range/flag messages
    document.querySelectorAll('.flag-message').forEach(element => element.textContent = '');
    document.querySelectorAll('.range-info .overall-range.error').forEach(span => span.classList.remove('error'));

    // Clear conflict messages and highlights
    document.querySelectorAll('.conflict-message, .warning-message').forEach(element => {
        element.textContent = '';
        element.style.display = 'none'; // Hide the message div
    });
    document.querySelectorAll('.conflict-highlight, .warning-highlight').forEach(element => {
        element.classList.remove('conflict-highlight', 'warning-highlight');
    });

    // Clear required field error messages and highlights
    document.querySelectorAll('.validation-message.error-message').forEach(element => {
        element.textContent = '';
        element.style.display = 'none';
    });
    document.querySelectorAll('.input-field.error-border, .select-field.error-border, textarea.input-field.error-border').forEach(element => {
        element.classList.remove('error-border');
    });
    // Clear error-border from checkbox/radio groups
    document.querySelectorAll('.checkbox-group.error-border, .radio-group.error-border').forEach(group => {
        group.classList.remove('error-border');
    });
}


// Function to check for conflicting selections
function checkConflicts() {
    clearAllConflictHighlights();
    clearAllConflictMessages();

    const conflicts = []; // Stores objects like { fields: [], message: '', type: 'error'/'warning' }

    const age = parseFloat(document.getElementById('age').value);
    const recordingDateStr = document.getElementById('recordingDate').value;
    const recordingDate = recordingDateStr ? new Date(recordingDateStr) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const heartRate = parseFloat(document.getElementById('heartRate').value);
    const rhythm = document.getElementById('rhythm').value;
    const pWaveShape = document.getElementById('pWaveShape').value;
    const stSegmentStatuses = Array.from(document.querySelectorAll('input[name="stSegmentStatus"]:checked')).map(checkbox => checkbox.value);
    const avBlockType = document.getElementById('avBlockType').value;
    const prInterval = parseFloat(document.getElementById('prInterval').value);
    const qrsDuration = parseFloat(document.getElementById('qrsDuration').value);
    const qrsMorphology = document.getElementById('qrsMorphology').value;
    const qrsVoltage = document.getElementById('qrsVoltage').value;
    const pathologicQWaves = document.getElementById('pathologicQWaves').checked;
    const qtcInterval = parseFloat(document.getElementById('qtcInterval').value);
    const qtAbnormality = document.getElementById('qtAbnormality').value;
    const qrsAxis = document.getElementById('qrsAxis').value;
    const tWaveAbnormalities = document.getElementById('tWaveAbnormalities').value;


    // --- Age and Date Validation ---
    if (isValidNumber(age)) {
        if (age <= 0 || age > 150) {
            conflicts.push({ fields: ['age'], message: 'Error: سن باید بین 1 تا 150 سال باشد.', type: 'error' });
        }
    }
    if (recordingDate) {
        if (recordingDate > today) {
            conflicts.push({ fields: ['recordingDate'], message: 'Error: تاریخ ثبت نمی‌تواند در آینده باشد.', type: 'error' });
        }
        if (isValidNumber(age)) {
            const approxBirthDate = new Date();
            approxBirthDate.setFullYear(today.getFullYear() - age);
            approxBirthDate.setHours(0, 0, 0, 0);
            if (recordingDate < approxBirthDate) {
                conflicts.push({ fields: ['recordingDate', 'age'], message: `Error: تاریخ ثبت (${recordingDateStr}) نمی‌تواند قبل از تولد تقریبی بیمار (با سن ${age} سال) باشد.`, type: 'error' });
            }
        }
    }

    // --- Heart Rate and Rhythm Conflicts ---
    if (isValidNumber(heartRate)) {
        if (heartRate < 60) { // Bradycardia
            if (rhythm === 'Ventricular tachycardia' || rhythm === 'Sinus tachycardia' || rhythm === 'Supraventricular tachycardia') {
                conflicts.push({ fields: ['heartRate', 'rhythm'], message: `Conflict: Bradycardia (<60 bpm) is inconsistent with ${rhythm}.`, type: 'error' });
            }
            if (rhythm === 'Atrial flutter') {
                conflicts.push({ fields: ['heartRate', 'rhythm'], message: 'Conflict: Bradycardia (<60 bpm) is inconsistent with typical Atrial Flutter rate (around 150 bpm).', type: 'error' });
            }
        } else if (heartRate > 100) { // Tachycardia
            if (rhythm === 'Sinus bradycardia' || rhythm === 'Junctional rhythm' || rhythm === 'Idioventricular rhythm') {
                conflicts.push({ fields: ['heartRate', 'rhythm'], message: `Conflict: Tachycardia (>100 bpm) is inconsistent with ${rhythm}.`, type: 'error' });
            }
        }
    }

    if (rhythm === 'Atrial fibrillation') {
        if (rhythm === 'Atrial flutter') {
            conflicts.push({ fields: ['rhythm'], message: 'Conflict: Atrial Fibrillation (irregular) is inconsistent with Atrial Flutter (typically regular).', type: 'error' });
        }
        if (avBlockType === '3rd Degree') {
            conflicts.push({ fields: ['rhythm', 'avBlockType'], message: 'Conflict: Atrial Fibrillation (irregular) is inconsistent with 3rd Degree AV Block (can be regular).', type: 'error' });
        }
    }


    // --- ST Segment Conflicts ---
    const stElevationChecked = stSegmentStatuses.includes('elevation');
    const stDepressionChecked = stSegmentStatuses.includes('depression');
    const stNormalChecked = stSegmentStatuses.includes('normal');
    const earlyRepolarizationChecked = stSegmentStatuses.includes('earlyRepolarization');
    const osbornJWavesChecked = stSegmentStatuses.includes('osbornJWaves');
    const nonspecificChecked = stSegmentStatuses.includes('nonspecific');

    if (stNormalChecked && (stElevationChecked || stDepressionChecked || earlyRepolarizationChecked || osbornJWavesChecked || nonspecificChecked)) {
        conflicts.push({ fields: ['stNormal', 'stElevation', 'stDepression', 'earlyRepolarization', 'osbornJWaves', 'nonspecificSTTChanges'], message: 'Conflict: "ST segment Normal" cannot be selected with other ST segment abnormalities.', type: 'error' });
    }
    if (stElevationChecked) {
        if (stDepressionChecked) conflicts.push({ fields: ['stElevation', 'stDepression'], message: 'Conflict: ST Elevation and ST Depression cannot coexist.', type: 'error' });
        if (earlyRepolarizationChecked) conflicts.push({ fields: ['stElevation', 'earlyRepolarization'], message: 'Conflict: ST Elevation is inconsistent with Early Repolarization.', type: 'error' });
        if (nonspecificChecked) conflicts.push({ fields: ['stElevation', 'nonspecificSTTChanges'], message: 'Conflict: ST Elevation is inconsistent with Non-specific ST/T Changes.', type: 'error' });
    }
    if (stDepressionChecked) {
        if (osbornJWavesChecked) conflicts.push({ fields: ['stDepression', 'osbornJWaves'], message: 'Conflict: ST Depression is inconsistent with Osborn (J) Waves.', type: 'error' });
    }
    if (earlyRepolarizationChecked) {
        if (osbornJWavesChecked) conflicts.push({ fields: ['earlyRepolarization', 'osbornJWaves'], message: 'Conflict: Early Repolarization and Osborn (J) Waves are distinct J point elevations.', type: 'error' });
        if (nonspecificChecked) conflicts.push({ fields: ['earlyRepolarization', 'nonspecificSTTChanges'], message: 'Conflict: Early Repolarization is inconsistent with Non-specific ST/T Changes.', type: 'error' });
    }
    if (osbornJWavesChecked) {
        if (stElevationChecked) conflicts.push({ fields: ['osbornJWaves', 'stElevation'], message: 'Warning: Osborn (J) Waves are often inconsistent with ST Elevation (except in hypothermia).', type: 'warning' });
        if (nonspecificChecked) conflicts.push({ fields: ['nonspecificSTTChanges', 'nonspecificSTTChanges'], message: 'Conflict: Osborn (J) Waves are inconsistent with Non-specific ST/T Changes.', type: 'error' });
    }
    if (nonspecificChecked) {
        if (stElevationChecked) conflicts.push({ fields: ['nonspecificSTTChanges', 'stElevation'], message: 'Conflict: Non-specific ST/T Changes are inconsistent with ST Elevation.', type: 'error' });
        if (stDepressionChecked) conflicts.push({ fields: ['nonspecificSTTChanges', 'stDepression'], message: 'Conflict: Non-specific ST/T Changes are inconsistent with ST Depression.', type: 'error' });
    }


    // --- P Waves and Conduction Conflicts ---
    if (pWaveShape === 'Absent') {
        if (avBlockType === '3rd Degree') {
            conflicts.push({ fields: ['pWaveShape', 'avBlockType'], message: 'Conflict: Absent P waves are inconsistent with 3rd Degree AV Block (which requires P waves).', type: 'error' });
        }
        if (pWaveShape === 'Sawtooth') {
            conflicts.push({ fields: ['pWaveShape'], message: 'Conflict: P wave shape cannot be both Absent and Sawtooth.', type: 'error' });
        }
        if (rhythm === 'Atrial flutter') {
            conflicts.push({ fields: ['pWaveShape', 'rhythm'], message: 'Conflict: Absent P waves are inconsistent with Atrial Flutter (which has sawtooth P waves).', type: 'error' });
        }
    }
    if (pWaveShape === 'Sawtooth') {
        if (rhythm === 'Atrial fibrillation') {
            conflicts.push({ fields: ['pWaveShape', 'rhythm'], message: 'Conflict: Sawtooth P waves are inconsistent with Atrial Fibrillation (which has absent P waves).', type: 'error' });
        }
        if (isValidNumber(heartRate) && heartRate < 60 && rhythm === 'Atrial flutter') {
            conflicts.push({ fields: ['heartRate', 'rhythm'], message: 'Warning: Bradycardia (<60 bpm) with Atrial Flutter is unusual unless there is significant AV block (e.g., 4:1 block).', type: 'warning' });
        }
    }

    // --- QT Interval Conflicts ---
    const qtcNormalRangeMin = ranges.qtcInterval.normal[0];
    const qtcNormalRangeMax = ranges.qtcInterval.normal[1];

    if (qtAbnormality === 'Prolonged') {
        if (qtAbnormality === 'Shortened' || qtAbnormality === 'Normal') {
            conflicts.push({ fields: ['qtAbnormality'], message: 'Conflict: QT abnormality cannot be both Prolonged and Shortened/Normal.', type: 'error' });
        }
        if (isValidNumber(qtcInterval) && qtcInterval <= qtcNormalRangeMax) {
            conflicts.push({ fields: ['qtcInterval', 'qtAbnormality'], message: 'Conflict: Selected "Prolonged QTc" but entered QTc value is within normal limits.', type: 'error' });
        }
    }
    if (qtAbnormality === 'Shortened') {
        if (qtAbnormality === 'Prolonged' || qtAbnormality === 'Normal') {
            conflicts.push({ fields: ['qtAbnormality'], message: 'Conflict: QT abnormality cannot be both Shortened and Prolonged/Normal.', type: 'error' });
        }
        if (isValidNumber(qtcInterval) && qtcInterval >= qtcNormalRangeMin) {
            conflicts.push({ fields: ['qtcInterval', 'qtAbnormality'], message: 'Conflict: Selected "Shortened QTc" but entered QTc value is within normal limits.', type: 'error' });
        }
    }
    if (qtAbnormality === 'Torsades de Pointes') {
        if (qtAbnormality === 'Normal') {
            conflicts.push({ fields: ['qtAbnormality'], message: 'Conflict: Torsades de Pointes is inconsistent with Normal QT Interval.', type: 'error' });
        }
        if (isValidNumber(heartRate) && heartRate < 60 && avBlockType !== '3rd Degree') {
            conflicts.push({ fields: ['heartRate', 'rhythm'], message: 'Warning: Torsades de Pointes is usually associated with prolonged QT and not bradycardia, unless due to complete AV block.', type: 'warning' });
        }
        if (isValidNumber(qtcInterval) && qtcInterval <= qtcNormalRangeMax) {
            conflicts.push({ fields: ['qtcInterval', 'qtAbnormality'], message: `Conflict: QTc interval (${qtcInterval} ms) is normal, but "Torsades de Pointes" is selected. Torsades de Pointes usually occurs with prolonged QTc.`, type: 'warning' });
        }
    }

    // --- QRS Complex Conflicts ---
    const isWPWPattern = (isValidNumber(prInterval) && prInterval < 120) && qrsMorphology === 'Delta wave' && (isValidNumber(qrsDuration) && qrsDuration > 100);
    if (isWPWPattern) {
        if (qrsMorphology === 'LBBB' || qrsMorphology === 'RBBB') {
            conflicts.push({ fields: ['qrsMorphology'], message: 'Conflict: WPW pattern (Delta wave) is inconsistent with LBBB or RBBB morphology.', type: 'error' });
        }
        if (qrsAxis === 'Left Axis Deviation') {
            conflicts.push({ fields: ['qrsAxis'], message: 'Warning: WPW pattern is often associated with RAD or normal axis, less commonly LAD.', type: 'warning' });
        }
    }
    if (pathologicQWaves && !stElevationChecked && !stDepressionChecked) {
        conflicts.push({ fields: ['pathologicQWaves'], message: 'Warning: Pathologic Q waves are indicative of previous myocardial infarction. Consider related ST changes.', type: 'warning' });
    }


    // Highlight conflicting fields and display messages
    conflicts.forEach(conflict => {
        conflict.fields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                if (element.type === 'radio' || element.type === 'checkbox') {
                    element.parentElement.classList.add(conflict.type === 'error' ? 'conflict-highlight' : 'warning-highlight');
                    if (fieldId === conflict.fields[0]) { // Only add message once per conflict group
                        let messageDiv = element.parentElement.nextElementSibling;
                        if (!messageDiv || !messageDiv.classList.contains('conflict-message') && !messageDiv.classList.contains('warning-message')) {
                            messageDiv = document.createElement('div');
                            element.parentElement.after(messageDiv);
                        }
                        messageDiv.classList.add(conflict.type === 'error' ? 'conflict-message' : 'warning-message');
                        messageDiv.textContent = conflict.message;
                        messageDiv.style.display = 'block';
                    }
                } else {
                    element.classList.add(conflict.type === 'error' ? 'conflict-highlight' : 'warning-highlight');
                    let messageDivId = fieldId + 'Conflict';
                    let messageDiv = document.getElementById(messageDivId);
                    if (!messageDiv) {
                        messageDiv = document.createElement('div');
                        messageDiv.id = messageDivId;
                        element.parentNode.appendChild(messageDiv);
                    }
                    messageDiv.classList.add(conflict.type === 'error' ? 'conflict-message' : 'warning-message');
                    messageDiv.textContent = conflict.message;
                    messageDiv.style.display = 'block';
                }
            }
        });
    });

    return conflicts;
}

// Function to determine and set the validation status of the current page
function validateCurrentPageAndSetStatus() {
    clearAllValidationFeedback(); // Clear all feedback before re-validating
    let hasErrors = false;
    let hasWarnings = false;
    const errorsList = []; // For specific error messages
    const warningsList = []; // For specific warning messages

    // 1. Check for empty required fields
    const currentPageRequiredFields = requiredFields[currentPage];
    if (currentPageRequiredFields) {
        currentPageRequiredFields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                let isEmpty = false;
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
                    isEmpty = element.value.trim() === '';
                } else if (fieldId === 'stSegmentStatuses') { // Special handling for checkbox group
                    const checkedCheckboxes = document.querySelectorAll('input[name="stSegmentStatus"]:checked');
                    isEmpty = checkedCheckboxes.length === 0;
                }

                if (isEmpty) {
                    hasErrors = true;
                    // Add error class and message
                    if (element.type === 'checkbox' || element.type === 'radio') {
                        const groupContainer = element.closest('.checkbox-group') || element.closest('.radio-group');
                        if (groupContainer) {
                             groupContainer.classList.add('error-border');
                        }
                        const errorDiv = document.getElementById(fieldId + 'Error');
                        if (errorDiv) {
                            errorDiv.textContent = 'این فیلد اجباری است.'; // Changed message for checkbox/radio group
                            errorDiv.style.display = 'block';
                        }
                    } else {
                        element.classList.add('error-border');
                        const errorDiv = document.getElementById(fieldId + 'Error');
                        if (errorDiv) {
                            errorDiv.textContent = 'این فیلد اجباری است.';
                            errorDiv.style.display = 'block';
                        }
                    }
                    errorsList.push(`فیلد "${element.previousElementSibling ? element.previousElementSibling.textContent.replace('*', '').replace(':', '').trim() : fieldId}" خالی است.`);
                }
            }
        });
    }

    // 2. Check for range errors/warnings
    const currentPageElements = document.getElementById(`page${currentPage}`).querySelectorAll('input, select, textarea');
    currentPageElements.forEach(element => {
        const inputId = element.id;
        if (ranges[inputId]) {
            const value = parseFloat(element.value);
            const range = ranges[inputId];
            if (isValidNumber(value) && (value < range.overall[0] || value > range.overall[1])) {
                hasErrors = true; // Value outside overall range is an error
                errorsList.push(`فیلد "${element.previousElementSibling.textContent.replace('*', '').replace(':', '').trim()}" خارج از محدوده کلی است.`);
            } else if (isValidNumber(value) && (value < range.normal[0] || value > range.normal[1])) {
                hasWarnings = true; // Value outside normal range is a warning
                warningsList.push(`فیلد "${element.previousElementSibling.textContent.replace('*', '').replace(':', '').trim()}" خارج از محدوده نرمال است.`);
            }
        }
    });

    // 3. Check for conflict errors/warnings
    const currentConflicts = checkConflicts(); // This function already applies highlights and messages
    currentConflicts.forEach(issue => {
        if (issue.type === 'error') {
            hasErrors = true;
            errorsList.push(issue.message);
        } else if (issue.type === 'warning') {
            hasWarnings = true;
            warningsList.push(issue.message);
        }
    });

    let pageOverallStatus = 'ok';
    if (hasErrors) {
        pageOverallStatus = 'error';
    } else if (hasWarnings) {
        pageOverallStatus = 'warning';
    } else {
        // If no errors or warnings, check if all required fields are truly filled
        const allRequiredFilled = currentPageRequiredFields.every(fieldId => {
            const element = document.getElementById(fieldId);
            if (!element) return true;

            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
                return element.value.trim() !== '';
            } else if (fieldId === 'stSegmentStatuses') {
                const checkedCheckboxes = document.querySelectorAll('input[name="stSegmentStatus"]:checked');
                return checkedCheckboxes.length > 0;
            }
            return true;
        });

        if (!allRequiredFilled) {
            pageOverallStatus = 'error'; // Mark as error if required fields are still empty
            errorsList.push('همه فیلدهای اجباری پر نشده‌اند.');
            hasErrors = true; // Ensure hasErrors is true if required fields are missing
        }
    }

    pageValidationStatus[currentPage] = pageOverallStatus;
    updateStepButtons(); // Update step button colors immediately

    return { hasErrors: hasErrors, hasWarnings: hasWarnings, errors: errorsList, warnings: warningsList };
}


// Function to disable/enable options based on conflicts
function updateOptionStates() {
    // Re-enable all options first
    document.querySelectorAll('select option:disabled').forEach(el => {
        el.disabled = false;
    });
    document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => {
        input.disabled = false;
        input.parentElement.classList.remove('radio-label:has(input:disabled)', 'checkbox-label:has(input:disabled)');
        input.parentElement.style.opacity = '';
        input.parentElement.style.cursor = '';
        input.parentElement.style.borderColor = '';
        input.parentElement.style.color = '';
    });

    // Apply selected class based on current checked state
    document.querySelectorAll('.radio-group input[type="radio"], .checkbox-group input[type="checkbox"]').forEach(input => {
        if (input.checked) {
            input.parentElement.classList.add('selected');
        } else {
            input.parentElement.classList.remove('selected');
        }
    });

    // Apply new disabled states based on current form data
    const heartRate = parseFloat(document.getElementById('heartRate').value);
    const rhythm = document.getElementById('rhythm').value;
    const pWaveShape = document.getElementById('pWaveShape').value;
    const stElevationChecked = document.getElementById('stElevation').checked;
    const stDepressionChecked = document.getElementById('stDepression').checked;
    const stNormalChecked = document.getElementById('stNormal').checked;
    const earlyRepolarizationChecked = document.getElementById('earlyRepolarization').checked;
    const osbornJWavesChecked = document.getElementById('osbornJWaves').checked;
    const nonspecificChecked = document.getElementById('nonspecificSTTChanges').checked;
    const avBlockType = document.getElementById('avBlockType').value;
    const qtcInterval = parseFloat(document.getElementById('qtcInterval').value);

    if (isValidNumber(heartRate)) {
        if (heartRate < 60) {
            document.querySelector('#rhythm option[value="Sinus tachycardia"]').disabled = true;
            document.querySelector('#rhythm option[value="Supraventricular tachycardia"]').disabled = true;
            document.querySelector('#rhythm option[value="Ventricular tachycardia"]').disabled = true;
        } else if (heartRate > 100) {
            document.querySelector('#rhythm option[value="Sinus bradycardia"]').disabled = true;
            document.querySelector('#rhythm option[value="Junctional rhythm"]').disabled = true;
            document.querySelector('#rhythm option[value="Idioventricular rhythm"]').disabled = true;
        }
    }

    if (rhythm === 'Atrial fibrillation') {
        document.querySelector('#rhythm option[value="Atrial flutter"]').disabled = true;
    }
    if (rhythm === 'Atrial flutter') {
        document.querySelector('#rhythm option[value="Atrial fibrillation"]').disabled = true;
    }
    if (avBlockType === '3rd Degree') { // This was 'rhythm === '3rd Degree'' which is incorrect, corrected to avBlockType
        document.querySelector('#rhythm option[value="Atrial fibrillation"]').disabled = true;
    }

    if (pWaveShape === 'Absent') {
        document.querySelector('#avBlockType option[value="3rd Degree"]').disabled = true;
        document.querySelector('#rhythm option[value="Atrial flutter"]').disabled = true;
    }
    if (pWaveShape === 'Sawtooth') {
        document.querySelector('#pWaveShape option[value="Absent"]').disabled = true;
        document.querySelector('#rhythm option[value="Atrial fibrillation"]').disabled = true;
    }
    if (pWaveShape === 'Normal' || pWaveShape === 'Peaked' || pWaveShape === 'Bifid') {
        document.querySelector('#rhythm option[value="Atrial fibrillation"]').disabled = true;
    }

    if (stNormalChecked) {
        document.getElementById('stElevation').disabled = true;
        document.getElementById('stDepression').disabled = true;
        document.getElementById('earlyRepolarization').disabled = true;
        document.getElementById('osbornJWaves').disabled = true;
        document.getElementById('nonspecificSTTChanges').disabled = true;
    }
    if (stElevationChecked) {
        document.getElementById('stNormal').disabled = true;
        document.getElementById('stDepression').disabled = true;
        document.getElementById('earlyRepolarization').disabled = true;
        document.getElementById('nonspecificSTTChanges').disabled = true;
    }
    if (stDepressionChecked) {
        document.getElementById('stNormal').disabled = true;
        document.getElementById('stElevation').disabled = true;
        document.getElementById('osbornJWaves').disabled = true;
    }
    if (earlyRepolarizationChecked) {
        document.getElementById('stNormal').disabled = true;
        document.getElementById('stElevation').disabled = true;
        document.getElementById('osbornJWaves').disabled = true;
        document.getElementById('nonspecificSTTChanges').disabled = true;
    }
    if (osbornJWavesChecked) {
        document.getElementById('stNormal').disabled = true;
        document.getElementById('stDepression').disabled = true;
        document.getElementById('earlyRepolarization').disabled = true;
        document.getElementById('nonspecificSTTChanges').disabled = true;
    }
    if (nonspecificChecked) {
        document.getElementById('stNormal').disabled = true;
        document.getElementById('stElevation').disabled = true;
        document.getElementById('stDepression').disabled = true;
        document.getElementById('earlyRepolarization').disabled = true;
        document.getElementById('osbornJWaves').disabled = true;
    }

    const qtcNormalRangeMin = ranges.qtcInterval.normal[0];
    const qtcNormalRangeMax = ranges.qtcInterval.normal[1];

    if (isValidNumber(qtcInterval)) {
        if (qtcInterval < qtcNormalRangeMin) {
            document.querySelector('#qtAbnormality option[value="Normal"]').disabled = true;
            document.querySelector('#qtAbnormality option[value="Prolonged"]').disabled = true;
            document.querySelector('#qtAbnormality option[value="Torsades de Pointes"]').disabled = true;
        } else if (qtcInterval > qtcNormalRangeMax) {
            document.querySelector('#qtAbnormality option[value="Normal"]').disabled = true;
            document.querySelector('#qtAbnormality option[value="Shortened"]').disabled = true;
        } else {
            document.querySelector('#qtAbnormality option[value="Prolonged"]').disabled = true;
            document.querySelector('#qtAbnormality option[value="Shortened"]').disabled = true;
            document.querySelector('#qtAbnormality option[value="Torsades de Pointes"]').disabled = true;
        }
    }

    // Apply disabled visual styles
    document.querySelectorAll('input[type="radio"]:disabled, input[type="checkbox"]:disabled').forEach(input => {
        input.parentElement.classList.add(input.type === 'radio' ? 'radio-label:has(input:disabled)' : 'checkbox-label:has(input:disabled)');
        input.parentElement.style.opacity = '0.6';
        input.parentElement.style.cursor = 'not-allowed';
        input.parentElement.style.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--flag-color');
        input.parentElement.style.color = getComputedStyle(document.documentElement).getPropertyValue('--flag-color');
    });
}

function clearAllConflictHighlights() {
    document.querySelectorAll('.conflict-highlight, .warning-highlight').forEach(element => {
        element.classList.remove('conflict-highlight', 'warning-highlight');
    });
}

function clearAllConflictMessages() {
    document.querySelectorAll('.conflict-message, .warning-message').forEach(element => {
        element.textContent = '';
        element.style.display = 'none'; // Hide the message div
    });
}

function clearAllFlagMessages() {
    document.querySelectorAll('.flag-message').forEach(element => {
        element.textContent = '';
    });
    document.querySelectorAll('.input-field.flagged').forEach(element => {
        element.classList.remove('flagged');
    });
}

function showModal(message) {
    const modal = document.getElementById('myModal');
    const modalMessage = document.getElementById('modalMessage');
    modalMessage.innerHTML = message;
    modal.style.display = 'block';
}

function hideModal() {
    const modal = document.getElementById('myModal');
    modal.style.display = 'none';
    document.getElementById('modalMessage').innerHTML = '';
}

function analyzeECG() {
    clearAllValidationFeedback();
    clearAnalysisResults();
    document.getElementById('analysisMessages').innerHTML = '';

    const analyzeBtn = document.getElementById('analyzeBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const deepInterpreterBtn = document.getElementById('generateDeepInterpretationBtn'); // New button
    const analysisResultsDiv = document.getElementById('analysisResults');
    const analysisSummaryDiv = document.getElementById('analysisSummary');
    const notOkRulesSection = document.getElementById('notOkRulesSection');
    const notOkRulesListUl = document.getElementById('notOkRulesList');
    const okRulesListContainerDiv = document.getElementById('okRulesListContainer');
    const toggleNotOkRulesBtn = document.getElementById('toggleNotOkRulesBtn');
    const toggleOkRulesBtn = document.getElementById('toggleOkRulesBtn');
    const firstInterpreterSection = document.getElementById('firstInterpreterSection');
    const firstInterpretationListUl = document.getElementById('firstInterpretationList');
    const toggleFirstInterpreterBtn = document.getElementById('toggleFirstInterpreterBtn');
    const deepInterpreterSection = document.getElementById('deepInterpreterSection');
    const wavyCanvas = document.getElementById('wavyCanvas7');

    analyzeBtn.disabled = true;
    exportExcelBtn.disabled = true;
    deepInterpreterBtn.disabled = true; // Disable deep interpreter button during analysis
    const spinner = document.createElement('i');
    spinner.classList.add('fas', 'fa-spinner', 'fa-spin', 'ml-2');
    analyzeBtn.appendChild(spinner);

    // Validate ALL pages before analysis
    const allPagesValidationIssues = [];
    let hasCriticalErrors = false; // Initialize here
    for (let i = 1; i <= totalPages; i++) {
        const tempCurrentPage = currentPage; // Store current page
        currentPage = i; // Temporarily set page to validate
        const validationResult = validateCurrentPageAndSetStatus();
        if (validationResult.hasErrors) {
            allPagesValidationIssues.push({ type: 'error', message: `Step ${i}: ${pageNames[i]} دارای خطا است.`, errors: validationResult.errors });
            hasCriticalErrors = true; // Set to true if any error is found
        } else if (validationResult.hasWarnings) {
            allPagesValidationIssues.push({ type: 'warning', message: `Step ${i}: ${pageNames[i]} دارای هشدار است.`, warnings: validationResult.warnings });
        }
        currentPage = tempCurrentPage; // Restore current page
    }
    updateStepButtons(); // Ensure step buttons reflect all statuses

    // Display all issues found (errors and warnings)
    if (allPagesValidationIssues.length > 0) {
        const analysisMessagesDiv = document.getElementById('analysisMessages');
        const ul = document.createElement('ul');
        ul.classList.add('error-list');

        allPagesValidationIssues.forEach(issue => {
            const li = document.createElement('li');
            li.classList.add(issue.type);
            li.textContent = `${issue.type === 'error' ? 'خطا: ' : 'هشدار: '}${issue.message}`;
            const issueDetails = issue.type === 'error' ? issue.errors : issue.warnings;
            if (issueDetails && issueDetails.length > 0) {
                const subUl = document.createElement('ul');
                subUl.style.marginLeft = '20px';
                issueDetails.forEach(msg => {
                    const subLi = document.createElement('li');
                    subLi.textContent = msg;
                    subUl.appendChild(subLi);
                });
                li.appendChild(subUl);
            }
            ul.appendChild(li);
        });
        analysisMessagesDiv.appendChild(ul);
    }

    // Now, decide whether to proceed with analysis based on hasCriticalErrors
    if (hasCriticalErrors) {
        showModal('<strong>تحلیل ECG به دلیل وجود خطا در فرم انجام نشد. لطفاً خطاهای مشخص شده را برطرف کنید.</strong>');
        // Re-enable buttons and remove spinner as analysis is aborted
        analyzeBtn.disabled = false;
        exportExcelBtn.disabled = false;
        deepInterpreterBtn.disabled = false;
        analyzeBtn.textContent = 'Analyze ECG';
        spinner.remove();
        if (wavyCanvas) wavyCanvas.style.display = 'none';
        return; // Abort analysis due to errors
    } else if (allPagesValidationIssues.length > 0) { // Only warnings exist
        showModal('<strong>تحلیل ECG با هشدارهایی انجام شد. لطفاً هشدارهای مشخص شده را بررسی کنید.</strong>');
        // Do NOT return; proceed with analysis
    }

    const formData = {
        patientId: document.getElementById('patientId').value,
        age: parseFloat(document.getElementById('age').value),
        sex: document.getElementById('sex').value,
        recordingDate: document.getElementById('recordingDate').value,
        clinicalHistory: document.getElementById('clinicalHistory').value,
        pWaveDuration: parseFloat(document.getElementById('pWaveDuration').value),
        pWaveShape: document.getElementById('pWaveShape').value,
        atrialEnlargement: document.getElementById('atrialEnlargement').value,
        prInterval: parseFloat(document.getElementById('prInterval').value),
        avBlockType: document.getElementById('avBlockType').value,
        qrsDuration: parseFloat(document.getElementById('qrsDuration').value),
        qrsMorphology: document.getElementById('qrsMorphology').value,
        qrsVoltage: document.getElementById('qrsVoltage').value,
        rWaveProgression: document.getElementById('rWaveProgression').value,
        rsRatioAbnormal: document.getElementById('rsRatioAbnormal').checked,
        pathologicQWaves: document.getElementById('pathologicQWaves').checked,
        qtcInterval: parseFloat(document.getElementById('qtcInterval').value),
        qtAbnormality: document.getElementById('qtAbnormality').value,
        qrsAxis: document.getElementById('qrsAxis').value,
        stSegmentStatuses: Array.from(document.querySelectorAll('input[name="stSegmentStatus"]:checked')).map(checkbox => checkbox.value),
        tWaveAbnormalities: document.getElementById('tWaveAbnormalities').value,
        uWaveProminence: document.getElementById('uWaveProminence').checked,
        heartRate: parseFloat(document.getElementById('heartRate').value),
        rhythm: document.getElementById('rhythm').value,
        pacemakerPresent: document.getElementById('pacemakerPresent').checked,
        ectopicBeats: document.getElementById('ectopicBeats').checked,
    };

    const analysisSummary = [];
    const ruleChecks = [];
    const notOkRulesListArray = [];

    const interpretationRules = [
        {
            name: 'Sinus Rhythm Criteria',
            check: (data) => data.rhythm === 'Sinus rhythm' && data.pWaveShape === 'Normal' && !data.pacemakerPresent && isValidNumber(data.heartRate) && data.heartRate >= 60 && data.heartRate <= 100 && isValidNumber(data.prInterval) && data.prInterval >= 120 && data.prInterval <= 200,
            getReasonOK: (data) => `Rhythm is Sinus Rhythm (${data.rhythm}), P wave shape is Normal (${data.pWaveShape}), Pacemaker not present, Heart rate (${data.heartRate} bpm) is 60-100 bpm, PR interval (${data.prInterval} ms) is 120-200 ms.`,
            negativeMessage: (data) => {
                let reason = [];
                if (data.rhythm !== 'Sinus rhythm') reason.push(`Rhythm is ${data.rhythm || 'not selected'}`);
                if (data.pWaveShape !== 'Normal') reason.push(`P wave shape is ${data.pWaveShape || 'not selected'}`);
                if (data.pacemakerPresent) reason.push('Pacemaker present');
                if (!(isValidNumber(data.heartRate) && data.heartRate >= 60 && data.heartRate <= 100)) reason.push(`Heart rate (${data.heartRate || 'N/A'}) is outside normal sinus range (60-100 bpm)`);
                if (!(isValidNumber(data.prInterval) && data.prInterval >= 120 && data.prInterval <= 200)) reason.push(`PR interval (${data.prInterval || 'N/A'}) is outside normal range (120-200 ms)`);
                return `Criteria not met (${reason.join(', ')})`;
            }
        },
        {
            name: 'Bradycardia Detection',
            check: (data) => isValidNumber(data.heartRate) && data.heartRate < 60,
            getReasonOK: (data) => `Heart rate (${data.heartRate} bpm) is less than 60 bpm.`,
            negativeMessage: (data) => isValidNumber(data.heartRate) ? `Heart rate (${data.heartRate} bpm) is not less than 60 bpm.` : 'Heart rate not entered or invalid.'
        },
        {
            name: 'Tachycardia Detection',
            check: (data) => isValidNumber(data.heartRate) && data.heartRate > 100,
            getReasonOK: (data) => `Heart rate (${data.heartRate} bpm) is greater than 100 bpm.`,
            negativeMessage: (data) => isValidNumber(data.heartRate) ? `Heart rate (${data.heartRate} bpm) is not greater than 100 bpm.` : 'Heart rate not entered or invalid.'
        },
        {
            name: 'First-Degree AV Block',
            check: (data) => isValidNumber(data.prInterval) && data.prInterval > 200 && data.avBlockType === 'None',
            getReasonOK: (data) => `PR interval (${data.prInterval} ms) is > 200ms and no higher degree AV block selected.`,
            negativeMessage: (data) => {
                let reason = [];
                if (!(isValidNumber(data.prInterval) && data.prInterval > 200)) reason.push(`PR interval (${data.prInterval || 'N/A'}) is not > 200 ms`);
                if (data.avBlockType !== 'None') reason.push(`Higher degree AV block selected (${data.avBlockType})`);
                return `Criteria not met (${reason.join(', ')})`;
            }
        },
        {
            name: 'Wide QRS Complex',
            check: (data) => isValidNumber(data.qrsDuration) && data.qrsDuration > 100,
            getReasonOK: (data) => `QRS duration (${data.qrsDuration} ms) is greater than 100 ms.`,
            negativeMessage: (data) => isValidNumber(data.qrsDuration) ? `QRS duration (${data.qrsDuration} ms) is not > 100 ms.` : 'QRS duration not entered or invalid.'
        },
        {
            name: 'Left Bundle Branch Block (LBBB)',
            check: (data) => data.qrsMorphology === 'LBBB' && isValidNumber(data.qrsDuration) && data.qrsDuration > 120,
            getReasonOK: (data) => `QRS morphology is LBBB and QRS duration (${data.qrsDuration} ms) is > 120 ms.`,
            negativeMessage: (data) => {
                let reason = [];
                if (data.qrsMorphology !== 'LBBB') reason.push(`QRS morphology is not LBBB (${data.qrsMorphology || 'not selected'})`);
                if (!(isValidNumber(data.qrsDuration) && data.qrsDuration > 120)) reason.push(`QRS duration (${data.qrsDuration || 'N/A'}) is not > 120 ms`);
                return `Criteria not met (${reason.join(', ')})`;
            }
        },
        {
            name: 'Right Bundle Branch Block (RBBB)',
            check: (data) => data.qrsMorphology === 'RBBB' && isValidNumber(data.qrsDuration) && data.qrsDuration > 120,
            getReasonOK: (data) => `QRS morphology is RBBB and QRS duration (${data.qrsDuration} ms) is > 120 ms.`,
            negativeMessage: (data) => {
                let reason = [];
                if (data.qrsMorphology !== 'RBBB') reason.push(`QRS morphology is not RBBB (${data.qrsMorphology || 'not selected'})`);
                if (!(isValidNumber(data.qrsDuration) && data.qrsDuration > 120)) reason.push(`QRS duration (${data.qrsDuration || 'N/A'}) is not > 120 ms`);
                return `Criteria not met (${reason.join(', ')})`;
            }
        },
        {
            name: 'Pathologic Q Waves',
            check: (data) => data.pathologicQWaves,
            getReasonOK: (data) => `Pathologic Q waves checkbox is checked.`,
            negativeMessage: (data) => 'Pathologic Q waves checkbox is not checked.'
        },
        {
            name: 'ST Elevation Present',
            check: (data) => data.stSegmentStatuses.includes('elevation'),
            getReasonOK: (data) => `ST elevation checkbox is checked.`,
            negativeMessage: (data) => 'ST elevation checkbox is not checked.'
        },
        {
            name: 'ST Depression Present',
            check: (data) => data.stSegmentStatuses.includes('depression'),
            getReasonOK: (data) => `ST depression checkbox is checked.`,
            negativeMessage: (data) => 'ST depression checkbox is not checked.'
        },
        {
            name: 'Prolonged QTc',
            check: (data) => data.qtAbnormality === 'Prolonged' || (isValidNumber(data.qtcInterval) && data.qtcInterval > 440),
            getReasonOK: (data) => {
                let reason = [];
                if (data.qtAbnormality === 'Prolonged') reason.push('QT abnormality selected as Prolonged');
                if (isValidNumber(data.qtcInterval) && data.qtcInterval > 440) reason.push(`QTc interval (${data.qtcInterval} ms) is > 440 ms`);
                return reason.join(' and ');
            },
            negativeMessage: (data) => {
                let reason = [];
                if (data.qtAbnormality !== 'Prolonged') reason.push(`QT abnormality is not Prolonged (${data.qtAbnormality || 'not selected'})`);
                if (isValidNumber(data.qtcInterval) && data.qtcInterval <= 440) reason.push(`QTc interval (${data.qtcInterval}) is not prolonged.`);
                return `Criteria not met (${reason.join(', ')})`;
            }
        },
        {
            name: 'Atrial Fibrillation',
            check: (data) => data.rhythm === 'Atrial fibrillation' && data.pWaveShape === 'Absent',
            getReasonOK: (data) => `Rhythm is Atrial Fibrillation and P wave shape is Absent.`,
            negativeMessage: (data) => {
                let reason = [];
                if (data.rhythm !== 'Atrial fibrillation') reason.push(`Rhythm is not Atrial Fibrillation (${data.rhythm || 'not selected'})`);
                if (data.pWaveShape !== 'Absent') reason.push(`P wave shape is not Absent (${data.pWaveShape || 'not selected'})`);
                return `Criteria not met (${reason.join(', ')})`;
            }
        }
    ];


    interpretationRules.forEach(rule => {
        const result = rule.check(formData);
        if (result) {
            ruleChecks.push({ rule: rule.name, status: 'OK', reason: rule.getReasonOK(formData) });
        } else {
            ruleChecks.push({ rule: rule.name, status: 'NOT OK', reason: rule.negativeMessage(formData) });
            notOkRulesListArray.push(`${rule.name}: ${rule.negativeMessage(formData)}`);
        }
    });

    if (isValidNumber(formData.heartRate) && formData.heartRate < 60) analysisSummary.push('Bradycardia Present');
    if (isValidNumber(formData.heartRate) && formData.heartRate > 100) analysisSummary.push('Tachycardia Present');
    if (formData.avBlockType !== 'None') analysisSummary.push(`${formData.avBlockType} AV Block Present`);
    if (formData.rhythm !== '' && formData.rhythm !== 'Sinus rhythm') analysisSummary.push(`Rhythm: ${formData.rhythm}`);
    if (isValidNumber(formData.qrsDuration) && formData.qrsDuration > 100) analysisSummary.push('Wide QRS Complex Present');
    formData.stSegmentStatuses.forEach(status => {
        let displayStatus = status;
        if (status === 'elevation') displayStatus = 'ST Elevation Present';
        else if (status === 'depression') displayStatus = 'ST Depression Present';
        else if (status === 'normal') displayStatus = 'ST segment Normal';
        else if (status === 'earlyRepolarization') displayStatus = 'Early repolarization Present';
        else if (status === 'osbornJWaves') displayStatus = 'Osborn (J) waves Present';
        else if (status === 'nonspecific') displayStatus = 'Non-specific ST/T changes Present';
        analysisSummary.push(displayStatus);
    });

    if (formData.qtAbnormality === 'Prolonged') analysisSummary.push('Prolonged QTc Present');
    if (formData.qtAbnormality === 'Shortened') analysisSummary.push('Shortened QTc Present');
    if (formData.qrsAxis !== 'Normal' && formData.qrsAxis !== '') analysisSummary.push(`QRS Axis: ${formData.qrsAxis}`);


    analysisSummaryDiv.innerHTML = '<strong>Key Findings:</strong>';
    if (analysisSummary.length > 0) {
        const ul = document.createElement('ul');
        analysisSummary.forEach(finding => {
            const li = document.createElement('li');
            li.textContent = finding;
            ul.appendChild(li);
        });
        analysisSummaryDiv.appendChild(ul);
    } else {
        analysisSummaryDiv.innerHTML += '<p>No significant findings based on selected criteria.</p>';
    }


    okRulesListContainerDiv.innerHTML = '';
    const okRules = ruleChecks.filter(rule => rule.status === 'OK');
    if (okRules.length > 0) {
        toggleOkRulesBtn.style.display = 'block';
        toggleOkRulesBtn.textContent = `Hide Rules Met (${okRules.length})`;
        okRules.forEach((rule, index) => {
            const ruleItem = document.createElement('div');
            ruleItem.classList.add('ok-rule-item-clickable');
            ruleItem.innerHTML = `<strong>${index + 1}: ${rule.rule}</strong><div class="ok-rule-reason-hidden">${rule.reason}</div>`;
            ruleItem.addEventListener('click', function() {
                const reasonDiv = this.querySelector('.ok-rule-reason-hidden');
                if (reasonDiv) {
                    reasonDiv.style.display = reasonDiv.style.display === 'block' ? 'none' : 'block';
                }
            });
            okRulesListContainerDiv.appendChild(ruleItem);
        });
        okRulesListContainerDiv.style.display = 'block';
    } else {
        okRulesListContainerDiv.innerHTML = '<p>کیس نرمال</p>';
        toggleOkRulesBtn.style.display = 'none';
    }


    notOkRulesListUl.innerHTML = '';
    if (notOkRulesListArray.length > 0) {
        notOkRulesSection.style.display = 'block';
        toggleNotOkRulesBtn.style.display = 'block';
        toggleNotOkRulesBtn.textContent = `Show Rules Not Met (${notOkRulesListArray.length})`; // Changed to "Show" by default
        notOkRulesListUl.style.display = 'none'; // Initially hidden
        notOkRulesListArray.forEach(rule => {
            const li = document.createElement('li');
            li.textContent = rule;
            notOkRulesListUl.appendChild(li);
        });
    } else {
        notOkRulesSection.style.display = 'none';
        toggleNotOkRulesBtn.style.display = 'none';
    }

    firstInterpretECG(formData); // Call the renamed function

    analysisResultsDiv.style.display = 'block';
    deepInterpreterSection.style.display = 'block'; // Show Deep Interpreter section

    if (wavyCanvas) {
        currentCanvas = wavyCanvas;
        currentCtx = wavyCanvas.getContext('2d');
        const container = wavyCanvas.parentElement;
        currentCanvas.width = container.clientWidth;
        currentCanvas.height = 150;

        ecgSpeed = Math.max(2, formData.heartRate / 10);
        currentWaveAmplitude = baseWaveAmplitude + (formData.qrsDuration / 20) + (formData.qtcInterval / 100);
        currentWaveAmplitude = Math.min(hoverWaveAmplitude, currentWaveAmplitude);

        wavyCanvas.style.display = 'block';
        if (!animationFrameId) {
            animate();
        }
        setupCanvasMouseListeners();
    }

    analyzeBtn.disabled = false;
    exportExcelBtn.disabled = false;
    deepInterpreterBtn.disabled = false;
    analyzeBtn.textContent = 'Analyze ECG';
    spinner.remove();
}

function toggleNotOkRulesSection() {
    const notOkRulesListUl = document.getElementById('notOkRulesList');
    const toggleBtn = document.getElementById('toggleNotOkRulesBtn');

    if (notOkRulesListUl.style.display === 'none') {
        notOkRulesListUl.style.display = 'block';
        toggleBtn.textContent = `Hide Rules Not Met (${notOkRulesListUl.children.length})`;
    } else {
        notOkRulesListUl.style.display = 'none';
        toggleBtn.textContent = `Show Rules Not Met (${notOkRulesListUl.children.length})`;
    }
}

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

function toggleFirstInterpreterSection() {
    const firstInterpretationList = document.getElementById('firstInterpretationList');
    const toggleBtn = document.getElementById('toggleFirstInterpreterBtn');

    if (firstInterpretationList.style.display === 'none') {
        firstInterpretationList.style.display = 'block';
        toggleBtn.textContent = 'Hide First Interpretations';
    } else {
        firstInterpretationList.style.display = 'none';
        toggleBtn.textContent = `Show First Interpretations (${firstInterpretationList.children.length})`;
    }
}

// New function for the Deep Interpreter block (for future LLM use)
async function generateDeepInterpretation() {
    const deepInterpretationContentDiv = document.getElementById('deepInterpretationContent');
    const generateBtn = document.getElementById('generateDeepInterpretationBtn');

    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    const spinner = document.createElement('i');
    spinner.classList.add('fas', 'fa-spinner', 'fa-spin', 'ml-2');
    generateBtn.appendChild(spinner);

    deepInterpretationContentDiv.innerHTML = '<p>در حال تولید تحلیل عمیق ECG توسط هوش مصنوعی...</p>';

    // Collect all form data for the LLM prompt
    const formData = {};
    document.querySelectorAll('.form-container input, .form-container select, .form-container textarea').forEach(element => {
        const labelElement = element.previousElementSibling;
        let label = labelElement ? labelElement.textContent.replace(':', '').trim() : element.id;

        if (element.type === 'checkbox') {
            label = element.parentElement.textContent.trim();
            formData[label] = element.checked ? 'Yes' : 'No';
        } else if (element.type === 'radio') {
            if (element.checked) {
                const radioGroupLabel = document.querySelector(`label[for="${element.name}"]`) || { textContent: element.name };
                formData[radioGroupLabel.textContent.replace(':', '').trim()] = element.value;
            }
        } else if (element.tagName === 'SELECT') {
            formData[label] = element.value;
        } else {
            formData[label] = element.value;
        }
    });

    const prompt = `Based on the following ECG parameters and clinical history, provide a detailed and comprehensive interpretation. Focus on potential diagnoses, severity, and immediate clinical implications. If any data is missing or out of normal range, highlight its significance.
    \nECG Data: ${JSON.stringify(formData, null, 2)}`;

    let chatHistory = [];
    chatHistory.push({ role: "user", parts: [{ text: prompt }] });

    const payload = { contents: chatHistory };
    const apiKey = ""; // Canvas will provide this at runtime
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const text = result.candidates[0].content.parts[0].text;
            deepInterpretationContentDiv.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
        } else {
            deepInterpretationContentDiv.innerHTML = '<p>خطا در دریافت تحلیل از هوش مصنوعی. لطفاً دوباره تلاش کنید.</p>';
            console.error('LLM response structure unexpected:', result);
        }
    } catch (error) {
        deepInterpretationContentDiv.innerHTML = '<p>خطا در برقراری ارتباط با هوش مصنوعی. لطفاً اتصال اینترنت خود را بررسی کرده و دوباره تلاش کنید.</p>';
        console.error('Error calling LLM:', error);
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Deep Interpretation';
        spinner.remove();
    }
}


function clearAnalysisResults() {
    document.getElementById('analysisSummary').innerHTML = '';
    document.getElementById('notOkRulesList').innerHTML = '';
    document.getElementById('notOkRulesSection').style.display = 'none';
    document.getElementById('toggleNotOkRulesBtn').style.display = 'none';
    document.getElementById('okRulesListContainer').innerHTML = '';
    document.getElementById('analysisResults').style.display = 'none';
    document.getElementById('toggleOkRulesBtn').style.display = 'none';
    document.getElementById('firstInterpretationList').innerHTML = '';
    document.getElementById('firstInterpreterSection').style.display = 'none';
    document.getElementById('toggleFirstInterpreterBtn').style.display = 'none';

    // Clear the new Deep Interpreter section
    document.getElementById('deepInterpretationContent').innerHTML = '<p>فیلدهای بالا را پر کنید تا تحلیل عمیق ECG توسط هوش مصنوعی تولید شود.</p><button id="generateDeepInterpretationBtn" class="pagination-button next mt-4" onclick="generateDeepInterpretation()">Generate Deep Interpretation</button>';
    document.getElementById('deepInterpreterSection').style.display = 'none';


    const wavyCanvas = document.getElementById('wavyCanvas7');
    if (wavyCanvas) wavyCanvas.style.display = 'none';
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    currentCtx = null;
}

// Function for First Interpretation of ECG Findings (formerly Deep Interpretation)
function firstInterpretECG(formData) {
    const firstInterpretationListUl = document.getElementById('firstInterpretationList');
    const firstInterpreterSection = document.getElementById('firstInterpreterSection');
    const toggleFirstInterpreterBtn = document.getElementById('toggleFirstInterpreterBtn');
    const firstInterpretationResults = [];

    // Define diagnostic categories and their prioritized rules
    const diagnosticCategories = [
        {
            name: 'Atrial Abnormalities',
            rules: [
                {
                    check: (data) => data.rhythm === 'Atrial fibrillation' && data.pWaveShape === 'Absent',
                    message: '<strong>Atrial Fibrillation:</strong> Irregularly irregular rhythm with absent P waves. This is a primary diagnosis.'
                },
                {
                    check: (data) => data.rhythm === 'Atrial flutter' && data.pWaveShape === 'Sawtooth',
                    message: '<strong>Atrial Flutter:</strong> Typically a regular rhythm with sawtooth P waves. This is a primary diagnosis.'
                },
                {
                    check: (data) => data.atrialEnlargement === 'Right Atrial Enlargement',
                    message: '<strong>Right Atrial Enlargement (P pulmonale):</strong> Indicates strain on the right heart, possibly due to pulmonary embolism or COPD with right ventricular hypertrophy.'
                },
                {
                    check: (data) => data.atrialEnlargement === 'Left Atrial Enlargement',
                    message: '<strong>Left Atrial Enlargement (P mitrale):</strong> Suggests enlargement of the left atrium, often due to chronic hypertension or mitral valve disease.'
                },
                {
                    check: (data) => data.ectopicBeats && data.pWaveShape !== 'Normal' && data.pWaveShape !== 'Absent' && data.pWaveShape !== 'Sawtooth',
                    message: '<strong>Ectopic Atrial Rhythm / Premature Atrial Complexes (PAC):</strong> Presence of ectopic beats with abnormal P wave morphology, suggesting an atrial origin outside the SA node.'
                },
            ]
        },
        {
            name: 'Pre-excitation Syndromes',
            rules: [
                {
                    check: (data) => isValidNumber(data.prInterval) && data.prInterval < 120 && data.qrsMorphology === 'Delta wave' && isValidNumber(data.qrsDuration) && data.qrsDuration > 100,
                    message: '<strong>Wolff-Parkinson-White (WPW) Syndrome:</strong> Characterized by short PR interval, delta wave, and wide QRS complex.'
                },
                {
                    check: (data) => isValidNumber(data.prInterval) && data.prInterval < 120 && data.qrsMorphology === 'Normal' && isValidNumber(data.qrsDuration) && data.qrsDuration <= 100,
                    message: '<strong>Lown-Ganong-Levine (LGL) Syndrome:</strong> Characterized by short PR interval and normal QRS duration, without a delta wave.'
                },
            ]
        },
        {
            name: 'AV Blocks',
            rules: [
                {
                    check: (data) => data.avBlockType === '3rd Degree',
                    message: '<strong>Complete Heart Block (Third-Degree AV Block):</strong> P waves are unrelated to QRS complexes (AV dissociation) and bradycardia is present. This is a life-threatening urgency.'
                },
                {
                    check: (data) => data.avBlockType === 'Mobitz II',
                    message: '<strong>Second-Degree AV Block Mobitz II:</strong> Consistent PR interval with intermittent dropped QRS complexes. Requires close monitoring.'
                },
                {
                    check: (data) => data.avBlockType === 'Mobitz I (Wenckebach)',
                    message: '<strong>Second-Degree AV Block Mobitz I (Wenckebach):</strong> Progressive PR prolongation until a QRS complex is dropped. Often benign.'
                },
                {
                    check: (data) => isValidNumber(data.prInterval) && data.prInterval > 200 && data.avBlockType === 'None',
                    message: '<strong>First-Degree AV Block:</strong> PR interval is prolonged (>200 ms) without dropped beats.'
                },
            ]
        },
        {
            name: 'Bundle Branch Blocks & Ventricular Rhythms',
            rules: [
                {
                    check: (data) => data.rhythm === 'Ventricular fibrillation',
                    message: '<strong>Ventricular Fibrillation (Cardiac Arrest):</strong> Chaotic ventricular activity, a medical emergency. Immediate intervention required.'
                },
                {
                    check: (data) => data.rhythm === 'Ventricular tachycardia',
                    message: '<strong>Ventricular Tachycardia:</strong> A rapid heart rhythm originating from the ventricles, often with wide QRS complexes. Potentially life-threatening.'
                },
                {
                    check: (data) => data.qrsMorphology === 'LBBB' && isValidNumber(data.qrsDuration) && data.qrsDuration > 120,
                    message: '<strong>Left Bundle Branch Block (LBBB):</strong> Wide QRS complex with characteristic LBBB morphology.'
                },
                {
                    check: (data) => data.qrsMorphology === 'RBBB' && isValidNumber(data.qrsDuration) && data.qrsDuration > 120,
                    message: '<strong>Right Bundle Branch Block (RBBB):</strong> Wide QRS complex with characteristic RBBB morphology.'
                },
                {
                    check: (data) => data.ectopicBeats && isValidNumber(data.qrsDuration) && data.qrsDuration > 120 && data.pWaveShape === 'Absent',
                    message: '<strong>Premature Ventricular Complexes (PVC):</strong> Indicated by wide, bizarre ectopic beats without preceding P waves.'
                },
                {
                    check: (data) => data.qrsMorphology === 'Notching/Slurring' && data.pathologicQWaves,
                    message: '<strong>Old MI / Conduction Block:</strong> Notching/slurring in QRS with pathologic Q waves suggests old myocardial infarction or intraventricular conduction delay.'
                },
                {
                    check: (data) => data.qrsMorphology === 'Normal' && data.qrsVoltage === 'Tall' && data.qrsAxis === 'Left Axis Deviation',
                    message: '<strong>Left Ventricular Hypertrophy (LVH):</strong> Suggested by increased QRS voltage and often left axis deviation.'
                },
                {
                    check: (data) => data.qrsMorphology === 'Normal' && data.qrsVoltage === 'Tall' && data.qrsAxis === 'Right Axis Deviation',
                    message: '<strong>Right Ventricular Hypertrophy (RVH):</strong> Suggested by increased QRS voltage and often right axis deviation.'
                },
            ]
        },
        {
            name: 'QT Interval Abnormalities',
            rules: [
                {
                    check: (data) => data.qtAbnormality === 'Torsades de Pointes',
                    message: '<strong>Torsades de Pointes:</strong> Specific polymorphic ventricular tachycardia, strongly associated with prolonged QTc. Life-threatening.'
                },
                {
                    check: (data) => data.qtAbnormality === 'Prolonged' || (isValidNumber(data.qtcInterval) && data.qtcInterval > 440),
                    message: '<strong>Long QT Syndrome:</strong> Indicated by a prolonged QTc interval, increasing risk of arrhythmias.'
                },
                {
                    check: (data) => data.qtAbnormality === 'Shortened' || (isValidNumber(data.qtcInterval) && data.qtcInterval < 350),
                    message: '<strong>Short QT Syndrome / Hypercalcemia:</strong> Suggested by a shortened QTc interval, which can be due to hypercalcemia.'
                },
            ]
        },
        {
            name: 'ST-T Wave Abnormalities & Ischemia/Infarction',
            rules: [
                {
                    check: (data) => data.stSegmentStatuses.includes('elevation') && data.tWaveAbnormalities === 'Hyperacute',
                    message: '<strong>Acute Myocardial Infarction (STEMI) - Evolving:</strong> Indicated by ST elevation and hyperacute T waves, suggesting early or evolving MI.'
                },
                {
                    check: (data) => data.stSegmentStatuses.includes('elevation') && data.pathologicQWaves,
                    message: '<strong>Acute Myocardial Infarction (STEMI) - Established:</strong> Indicated by ST elevation and pathologic Q waves, often with reciprocal changes.'
                },
                {
                    check: (data) => data.stSegmentStatuses.includes('depression') && data.tWaveAbnormalities === 'Inverted',
                    message: '<strong>Ischemia / NSTEMI / Unstable Angina:</strong> Suggested by ST depression and/or T wave inversion, without ST elevation, indicating myocardial ischemia.'
                },
                {
                    check: (data) => data.pathologicQWaves,
                    message: '<strong>Old Myocardial Infarction / Myocardial Scarring:</strong> Indicated by the presence of pathologic Q waves, suggesting prior myocardial necrosis.'
                },
                {
                    check: (data) => data.stSegmentStatuses.includes('earlyRepolarization'),
                    message: '<strong>Early Repolarization:</strong> J-point elevation and slurring, often a benign variant but can mask ischemia. Benign, or occult ischemia, must correlate clinically.'
                },
                {
                    check: (data) => data.stSegmentStatuses.includes('elevation') && !data.pathologicQWaves, // Generalizing diffuse ST elevation
                    message: '<strong>Pericarditis:</strong> Suggested by diffuse ST elevation, often without reciprocal depression or Q waves, and may be accompanied by PR depression.'
                },
                {
                    check: (data) => data.tWaveAbnormalities === 'Tall' && isValidNumber(data.qrsDuration) && data.qrsDuration > 100,
                    message: '<strong>Hyperkalemia / Hyperacute MI:</strong> Tall, peaked T waves can indicate hyperkalemia or very early (hyperacute) myocardial infarction.'
                },
            ]
        },
        {
            name: 'Rhythm Disorders',
            rules: [
                {
                    check: (data) => data.rhythm === 'Sinus tachycardia',
                    message: '<strong>Sinus Tachycardia:</strong> Heart rate > 100 bpm with normal sinus rhythm, often due to physiological or pathological stress.'
                },
                {
                    check: (data) => data.rhythm === 'Sinus bradycardia',
                    message: '<strong>Sinus Bradycardia:</strong> Heart rate < 60 bpm with normal sinus rhythm.'
                },
                {
                    check: (data) => data.rhythm === 'Multifocal atrial rhythm', // Assuming this is an option
                    message: '<strong>Multifocal Atrial Rhythm:</strong> Often benign in elderly patients, characterized by at least three different P wave morphologies and irregular PP and PR intervals.'
                },
            ]
        },
        {
            name: 'Other Conditions',
            rules: [
                {
                    check: (data) => data.qrsVoltage === 'Electrical alternans' && data.qrsVoltage === 'Low voltage',
                    message: '<strong>Cardiac Tamponade:</strong> Suggested by electrical alternans (alternating QRS amplitude) and low voltage QRS, indicating fluid around the heart.'
                },
                {
                    check: (data) => data.qrsVoltage === 'Low voltage' && data.qrsVoltage !== 'Electrical alternans',
                    message: '<strong>Pericardial Effusion / Amyloidosis / Obesity / COPD:</strong> Low voltage QRS can suggest these conditions due to increased impedance between the heart and ECG electrodes.'
                },
                {
                    check: (data) => data.rhythm === 'Sinus bradycardia' && data.osbornJWaves,
                    message: '<strong>Hypothermia:</strong> Suggested by sinus bradycardia and the presence of Osborn (J) waves.'
                },
                {
                    check: (data) => data.stSegmentStatuses.includes('elevation') && data.clinicalHistory.toLowerCase().includes('cns'), // Simplified for CNS events
                    message: '<strong>Acute CNS Events:</strong> Can cause ECG changes like diffuse T wave inversion or QT prolongation, mimicking cardiac ischemia.'
                },
            ]
        }
    ];

    // Iterate through categories and find the first matching rule
    diagnosticCategories.forEach(category => {
        for (const rule of category.rules) {
            if (rule.check(formData)) {
                firstInterpretationResults.push(rule.message);
                break; // Stop after finding the first match in this category
            }
        }
    });

    firstInterpretationListUl.innerHTML = '';
    if (firstInterpretationResults.length > 0) {
        firstInterpreterSection.style.display = 'block';
        toggleFirstInterpreterBtn.style.display = 'block';
        toggleFirstInterpreterBtn.textContent = `Hide First Interpretations (${firstInterpretationResults.length})`;
        firstInterpretationListUl.style.display = 'block';
        firstInterpretationResults.forEach(interpretation => {
            const li = document.createElement('li');
            li.innerHTML = interpretation;
            firstInterpretationListUl.appendChild(li);
        });
    } else {
        firstInterpreterSection.style.display = 'none';
        toggleFirstInterpreterBtn.style.display = 'none';
    }
}


function exportToCSV() {
    const formData = {};
    document.querySelectorAll('.form-container input, .form-container select, .form-container textarea').forEach(element => {
        const labelElement = element.previousElementSibling;
        let label = labelElement ? labelElement.textContent.replace(':', '').trim() : element.id;

        if (element.type === 'checkbox') {
            label = element.parentElement.textContent.trim();
            formData[label] = element.checked ? 'Yes' : 'No';
        } else if (element.type === 'radio') {
            if (element.checked) {
                const radioGroupLabel = document.querySelector(`label[for="${element.name}"]`) || { textContent: element.name };
                formData[radioGroupLabel.textContent.replace(':', '').trim()] = element.value;
            }
        } else if (element.tagName === 'SELECT') {
            formData[label] = element.value;
        } else {
            formData[label] = element.value;
        }
    });

    let csvContent = '';
    const headers = Object.keys(formData);
    const values = Object.values(formData);

    csvContent += headers.map(header => `"${header.replace(/"/g, '""')}"`).join(',') + '\n';
    csvContent += values.map(value => {
        if (typeof value === 'string') {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }).join(',') + '\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'ecg_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showModal('داده‌های فرم با موفقیت به فایل CSV صادر شد.');
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
        } else {
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
                } else {
                    element.value = formData[key];
                }
            }
        }
    }
}

function setupFormPersistence() {
    document.querySelectorAll('.form-container input, .form-container select, .form-container textarea').forEach(element => {
        element.addEventListener('input', () => {
            saveFormData();
            validateCurrentPageAndSetStatus(); // Validate on input
        });
        element.addEventListener('change', () => {
            saveFormData();
            validateCurrentPageAndSetStatus(); // Validate on change
        });
    });
}

// Function to reset all form data and page statuses
function resetForm() {
    // Clear all input fields
    document.querySelectorAll('.form-container input, .form-container select, .form-container textarea').forEach(element => {
        if (element.type === 'checkbox' || element.type === 'radio') {
            element.checked = false;
            element.parentElement.classList.remove('selected');
        } else if (element.tagName === 'SELECT') {
            element.value = ''; // Reset select to first option
        } else {
            element.value = '';
        }
    });

    // Clear local storage
    localStorage.removeItem('ecgFormData');

    // Reset all page validation statuses to 'none'
    for (let i = 1; i <= totalPages; i++) {
        pageValidationStatus[i] = 'none';
    }

    // Clear all validation messages and highlights
    clearAllValidationFeedback();

    // Clear analysis results and hide sections
    clearAnalysisResults();

    // Go to the first page
    currentPage = 1;
    showPage(currentPage);
    updatePaginationButtons();
    updateStepButtons();
    updateStepDropdown();
    updateOptionStates(); // Re-enable all options
}


// --- Animation Canvas Logic ---
let baseWaveAmplitude = 10;
const hoverWaveAmplitude = 50;
let currentWaveAmplitude = baseWaveAmplitude;
const waveFrequency = 0.1;
let ecgSpeed = 6;
let ecgOffset = 0;
const ecgLineWidth = 5;

const colors = [
    { r: 255, g: 0, b: 0 },
    { r: 255, g: 165, b: 0 },
    { r: 255, g: 255, b: 0 },
    { r: 0, g: 128, b: 0 },
    { r: 0, g: 0, b: 255 },
    { r: 75, g: 0, b: 130 },
    { r: 148, g: 0, b: 211 }
];
let colorTransitionSpeed = 0.001;
let currentColorTransitionSpeed = colorTransitionSpeed;
const colorTransitionSpeedHover = 0.02;
let colorPhase = 0;

const circles = [];
const maxCircleRadius = 20;
const circleDecayRate = 3;
const maxCircles = 100;

let isMouseOverCanvas = false;
let mouseX = -1;
let mouseY = -1;
let lastMouseX = -1;
let lastMouseY = -1;


function interpolateColor(colorA, colorB, factor) {
    const r = Math.round(colorA.r + factor * (colorB.r - colorA.r));
    const g = Math.round(colorA.g + factor * (colorB.g - colorA.g));
    const b = Math.round(colorA.b + factor * (colorB.b - colorA.b));
    return `rgb(${r},${g},${b})`;
}

function getECGY(x, centerLineY, scale) {
    const patternLength = 400;
    const normalizedX = (x + ecgOffset) % patternLength;

    if (normalizedX < 50) {
        return centerLineY;
    } else if (normalizedX < 70) {
        return centerLineY - Math.sin((normalizedX - 50) / 20 * Math.PI) * 10 * scale;
    } else if (normalizedX < 100) {
        return centerLineY;
    } else if (normalizedX < 110) {
        return centerLineY + (normalizedX - 100) * 3 * scale;
    } else if (normalizedX < 120) {
        return centerLineY - 30 * scale - (normalizedX - 110) * 5 * scale;
    } else if (normalizedX < 130) {
        return centerLineY + 20 * scale + (normalizedX - 120) * 5 * scale;
    } else if (normalizedX < 160) {
        return centerLineY;
    } else if (normalizedX < 200) {
        return centerLineY - Math.sin((normalizedX - 160) / 40 * Math.PI) * 15 * scale;
    } else {
        return centerLineY;
    }
}


function animate() {
    animationFrameId = requestAnimationFrame(animate);

    if (currentCanvas && currentCtx) {
        currentCtx.clearRect(0, 0, currentCanvas.width, currentCanvas.height);

        ecgOffset = (ecgOffset + ecgSpeed);
        if (ecgOffset >= 400) {
            ecgOffset = ecgOffset % 400;
        }

        if (isMouseOverCanvas) {
            currentColorTransitionSpeed = colorTransitionSpeedHover;
        } else {
            currentColorTransitionSpeed = colorTransitionSpeed;
        }

        colorPhase += currentColorTransitionSpeed;
        if (colorPhase >= colors.length) {
            colorPhase = 0;
        }

        const colorIndex1 = Math.floor(colorPhase);
        const colorIndex2 = (colorIndex1 + 1) % colors.length;
        const colorFactor = colorPhase - colorIndex1;

        const currentColor1 = interpolateColor(colors[colorIndex1], colors[colorIndex2], colorFactor);
        const nextColorForInterpolation = colors[(colorIndex2 + 1) % colors.length];
        const currentColor2 = interpolateColor(colors[colorIndex2], nextColorForInterpolation, colorFactor);

        const gradient = currentCtx.createLinearGradient(0, 0, currentCanvas.width, 0);
        gradient.addColorStop(0, currentColor1);
        gradient.addColorStop(1, currentColor2);

        currentCtx.beginPath();
        const centerLineY = currentCanvas.height / 2;
        const scale = currentWaveAmplitude / baseWaveAmplitude;

        currentCtx.moveTo(0, getECGY(0, centerLineY, scale));

        for (let x = 1; x <= currentCanvas.width; x++) {
            currentCtx.lineTo(x, getECGY(x, centerLineY, scale));
        }

        currentCtx.strokeStyle = gradient;
        currentCtx.lineWidth = ecgLineWidth;
        currentCtx.stroke();

        if (isMouseOverCanvas && (mouseX !== lastMouseX || mouseY !== lastMouseY)) {
            if (circles.length >= maxCircles) {
                circles.shift();
            }
            circles.push({
                x: mouseX,
                y: mouseY,
                initialRadius: maxCircleRadius,
                initialColor: { r: 255, g: 0, b: 0 },
                creationTime: Date.now()
            });
            lastMouseX = mouseX;
            lastMouseY = mouseY;
        }

        for (let i = circles.length - 1; i >= 0; i--) {
            const circle = circles[i];
            const timeElapsed = Date.now() - circle.creationTime;
            const currentRadius = Math.max(0, circle.initialRadius - timeElapsed * circleDecayRate / 100);

            if (currentRadius > 0) {
                const opacity = currentRadius / circle.initialRadius;
                currentCtx.fillStyle = `rgba(255, 0, 0, ${opacity})`;
                currentCtx.beginPath();
                currentCtx.arc(circle.x, circle.y, currentRadius, 0, Math.PI * 2);
                currentCtx.fill();
                currentCtx.closePath();
                circle.radius = currentRadius;
            } else {
                circles.splice(i, 1);
            }
        }
    }
}

function setupCanvasMouseListeners() {
    document.querySelectorAll('.wavy-canvas').forEach(canvasElement => {
        canvasElement.removeEventListener('mousemove', handleCanvasMouseMove);
        canvasElement.removeEventListener('mouseenter', handleCanvasMouseEnter);
        canvasElement.removeEventListener('mouseleave', handleCanvasMouseLeave);
    });

    if (currentCanvas) {
        currentCanvas.addEventListener('mousemove', handleCanvasMouseMove);
        currentCanvas.addEventListener('mouseenter', handleCanvasMouseEnter);
        currentCanvas.addEventListener('mouseleave', handleCanvasMouseLeave);
    }
}

function handleCanvasMouseMove(event) {
    const rect = currentCanvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
}

function handleCanvasMouseEnter() {
    isMouseOverCanvas = true;
    currentWaveAmplitude = hoverWaveAmplitude;
    lastMouseX = mouseX;
    lastMouseY = mouseY;
}

function handleCanvasMouseLeave() {
    isMouseOverCanvas = false;
    currentWaveAmplitude = baseWaveAmplitude;
    mouseX = -1;
    mouseY = -1;
    lastMouseX = -1;
    lastMouseY = -1;
}


// Initialize the form
window.onload = function() {
    // Reset all form data and page statuses on initial load
    resetForm();

    // Setup input validation listeners for numeric fields with ranges
    setupInputValidationListeners();

    // Setup listeners for checkbox/radio buttons
    setupCheckboxRadioListeners();

    // Event listeners for patient info and clinical history (text/date, no range/flag divs)
    document.getElementById('patientId').addEventListener('input', () => {
        checkConflicts();
        updateOptionStates();
        validateCurrentPageAndSetStatus(); // Update status on change
    });
    document.getElementById('age').addEventListener('input', () => {
        checkConflicts();
        updateOptionStates();
        validateCurrentPageAndSetStatus(); // Update status on change
    });
    document.getElementById('sex').addEventListener('change', () => {
        checkConflicts();
        updateOptionStates();
        validateCurrentPageAndSetStatus(); // Update status on change
    });
    document.getElementById('recordingDate').addEventListener('change', () => {
        checkConflicts();
        updateOptionStates();
        validateCurrentPageAndSetStatus(); // Update status on change
    });
    document.getElementById('clinicalHistory').addEventListener('input', () => {
        checkConflicts();
        updateOptionStates();
        validateCurrentPageAndSetStatus(); // Update status on change
    });
    document.getElementById('atrialEnlargement').addEventListener('change', () => {
        checkConflicts();
        updateOptionStates();
        validateCurrentPageAndSetStatus(); // Update status on change
    });
    document.getElementById('avBlockType').addEventListener('change', () => {
        checkConflicts();
        updateOptionStates();
        validateCurrentPageAndSetStatus(); // Update status on change
    });
    document.getElementById('qrsMorphology').addEventListener('change', () => {
        checkConflicts();
        updateOptionStates();
        validateCurrentPageAndSetStatus(); // Update status on change
    });
    document.getElementById('qrsVoltage').addEventListener('change', () => {
        checkConflicts();
        updateOptionStates();
        validateCurrentPageAndSetStatus(); // Update status on change
    });
    document.getElementById('rWaveProgression').addEventListener('change', () => {
        checkConflicts();
        updateOptionStates();
        validateCurrentPageAndSetStatus(); // Update status on change
    });
    document.getElementById('qtAbnormality').addEventListener('change', () => {
        checkConflicts();
        updateOptionStates();
        validateCurrentPageAndSetStatus(); // Update status on change
    });
    document.getElementById('qrsAxis').addEventListener('change', () => {
        checkConflicts();
        updateOptionStates();
        validateCurrentPageAndSetStatus(); // Update status on change
    });
    document.getElementById('tWaveAbnormalities').addEventListener('change', () => {
        checkConflicts();
        updateOptionStates();
        validateCurrentPageAndSetStatus(); // Update status on change
    });
    document.getElementById('rhythm').addEventListener('change', () => {
        checkConflicts();
        updateOptionStates();
        validateCurrentPageAndSetStatus(); // Update status on change
    });


    document.getElementById('toggleNotOkRulesBtn').addEventListener('click', toggleNotOkRulesSection);
    document.getElementById('toggleOkRulesBtn').addEventListener('click', toggleOkRulesSection);
    document.getElementById('toggleFirstInterpreterBtn').addEventListener('click', toggleFirstInterpreterSection);

    const modal = document.getElementById('myModal');
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            hideModal();
        }
    });

    // Initial validation and status update for page 1
    validateCurrentPageAndSetStatus();
};

window.addEventListener('resize', () => {
    if (currentCanvas) {
        const container = currentCanvas.parentElement;
        currentCanvas.width = container.clientWidth;
        currentCanvas.height = 150;
    }
});
