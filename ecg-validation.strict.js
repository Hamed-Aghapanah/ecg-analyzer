// Define Normal and Overall Ranges for numeric inputs
const ranges = {
    pWaveDuration: { normal: [80, 110], overall: [0, 200] }, 
    prInterval: { normal: [120, 200], overall: [0, 500] }, 
    qrsDuration: { normal: [80, 100], overall: [0, 300] }, 
    qtcInterval: { normal: [350, 440], overall: [0, 700] }, 
    heartRate: { normal: [60, 100], overall: [0, 300] } 
};

// Helper function to check if a value is a valid number
function isValidNumber(value) {
    return value !== null && value !== '' && !isNaN(value);
}

// Function to update range display and flag
function updateRangeAndFlag(inputId) {
    const inputField = document.getElementById(inputId);
    const rangeInfoDiv = document.getElementById(inputId + 'Range');
    const flagMessageDiv = document.getElementById(inputId + 'Flag');
    const value = parseFloat(inputField.value);
    const range = ranges[inputId];

    if (!range) {
        rangeInfoDiv.textContent = '';
        flagMessageDiv.textContent = '';
        inputField.classList.remove('flagged');
        inputField.classList.remove('conflict-highlight', 'warning-highlight'); // Clear highlights
        return;
    }

    // Display Normal Range
    rangeInfoDiv.innerHTML = `<span class="normal-range">Normal: ${range.normal[0]}-${range.normal[1]}</span>`;

    // Display Possible Range and check if value is outside possible range
    let possibleRangeText = ` | Possible range: ${range.overall[0]}-${range.overall[1]}`;
    let isOutsidePossible = false;
    if (isValidNumber(value) && (value < range.overall[0] || value > range.overall[1])) {
        possibleRangeText = ` | <span class="overall-range error">Possible range: ${range.overall[0]}-${range.overall[1]}</span>`;
        isOutsidePossible = true;
    } else {
        possibleRangeText = ` | <span class="overall-range">Possible range: ${range.overall[0]}-${range.overall[1]}</span>`;
    }
    rangeInfoDiv.innerHTML += possibleRangeText;


    // Check for flags (outside normal range)
    if (isValidNumber(value) && (value < range.normal[0] || value > range.normal[1])) {
        if (!isOutsidePossible) {
            inputField.classList.add('flagged');
            flagMessageDiv.textContent = `${inputField.previousElementSibling.textContent.replace(':', '')} is outside the normal range.`;
            inputField.classList.remove('conflict-highlight', 'warning-highlight'); // Ensure only one highlight
        } else {
            inputField.classList.remove('flagged');
            flagMessageDiv.textContent = `Value is outside the overall expected range.`;
            inputField.classList.add('conflict-highlight'); // Treat values outside overall range as errors
            inputField.classList.remove('warning-highlight');
        }
    } else {
        inputField.classList.remove('flagged');
        flagMessageDiv.textContent = '';
        inputField.classList.remove('conflict-highlight', 'warning-highlight'); // Remove highlights if normal
    }
}

// Function to handle input validation and flagging
function setupInputValidationListeners() {
    document.getElementById('age').addEventListener('input', validateAgeVsRecordingDate);
    document.getElementById('recordingDate').addEventListener('change', validateAgeVsRecordingDate);
    
    for (const inputId in ranges) {
        const inputField = document.getElementById(inputId);
        if (inputField) {
            inputField.addEventListener('input', () => updateRangeAndFlag(inputId));
            // Initial update on load if there's a value
            if (inputField.value !== '') {
                updateRangeAndFlag(inputId);
            }
        }
    }
}

// Function to check for conflicting selections
function checkConflicts() {
    const ageRecordingConflict = validateAgeVsRecordingDate();
    if (ageRecordingConflict) conflicts.push(ageRecordingConflict);
    // Clear previous conflict highlights and messages
    clearAllConflictHighlights();
    clearAllConflictMessages();
    // Clear flags associated with range checks, as conflicts might override them
    clearAllFlagMessages();

    const conflicts = [];

    // Gather relevant form data
    const heartRate = parseFloat(document.getElementById('heartRate').value);
    const rhythm = document.getElementById('rhythm').value;
    const pWaveShape = document.getElementById('pWaveShape').value;
    // Get checked ST segment statuses
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

    // --- Conflict Rules based on user requirements ---

    // 1. تعارض‌های مرتبط با ضربان قلب (Heart Rate) و ریتم (Rhythm)
    // ضربان پایین (Bradycardia: <60 bpm):
    if (isValidNumber(heartRate) && heartRate < 60) {
        if (rhythm === 'Ventricular tachycardia') {
            conflicts.push({
                fields: ['heartRate', 'rhythm'],
                message: 'Conflict: Bradycardia (<60 bpm) is inconsistent with Ventricular Tachycardia.',
                type: 'error'
            });
        }
        // Atrial Flutter typically has a rate around 150 bpm, so it conflicts with bradycardia
        if (rhythm === 'Atrial flutter') {
            conflicts.push({
                fields: ['heartRate', 'rhythm'],
                message: 'Conflict: Bradycardia (<60 bpm) is inconsistent with typical Atrial Flutter rate (around 150 bpm).',
                type: 'error'
            });
        }
        // Disable Tachycardia rhythms if bradycardia is present
        if (rhythm === 'Sinus tachycardia' || rhythm === 'Supraventricular tachycardia' || rhythm === 'Ventricular tachycardia') {
            conflicts.push({
                fields: ['heartRate', 'rhythm'],
                message: `Conflict: Bradycardia (<60 bpm) is inconsistent with ${rhythm}.`,
                type: 'error'
            });
        }
    }
    // ضربان بالا (Tachycardia: >100 bpm):
    if (isValidNumber(heartRate) && heartRate > 100) {
        if (rhythm === 'Sinus bradycardia') {
            conflicts.push({
                fields: ['heartRate', 'rhythm'],
                message: 'Conflict: Tachycardia (>100 bpm) is inconsistent with Sinus Bradycardia.',
                type: 'error'
            });
        }
        if (rhythm === 'Junctional rhythm' || rhythm === 'Idioventricular rhythm') {
            conflicts.push({
                fields: ['heartRate', 'rhythm'],
                message: `Conflict: Tachycardia (>100 bpm) is inconsistent with ${rhythm}.`,
                type: 'error'
            });
        }
    }
    // ضربان نامنظم (Irregularly irregular):
    if (rhythm === 'Atrial fibrillation') {
        if (rhythm === 'Atrial flutter') {
            conflicts.push({
                fields: ['rhythm'],
                message: 'Conflict: Atrial Fibrillation (irregular) is inconsistent with Atrial Flutter (typically regular).',
                type: 'error'
            });
        }
        if (avBlockType === '3rd Degree') {
            conflicts.push({
                fields: ['rhythm', 'avBlockType'],
                message: 'Conflict: Atrial Fibrillation (irregular) is inconsistent with 3rd Degree AV Block (can be regular).',
                type: 'error'
            });
        }
    }

    // 2. تعارض‌های مرتبط با تغییرات ST Segment و امواج (Updated for Checkboxes)
    const stElevationChecked = stSegmentStatuses.includes('elevation');
    const stDepressionChecked = stSegmentStatuses.includes('depression');
    const stNormalChecked = stSegmentStatuses.includes('normal');
    const earlyRepolarizationChecked = stSegmentStatuses.includes('earlyRepolarization');
    const osbornJWavesChecked = stSegmentStatuses.includes('osbornJWaves');
    const nonspecificChecked = stSegmentStatuses.includes('nonspecific');

    // If "ST segment Normal" is checked, conflict with all other ST options
    if (stNormalChecked && (stElevationChecked || stDepressionChecked || earlyRepolarizationChecked || osbornJWavesChecked || nonspecificChecked)) {
        conflicts.push({
            fields: ['stNormal', 'stElevation', 'stDepression', 'earlyRepolarization', 'osbornJWaves', 'nonspecificSTTChanges'],
            message: 'Conflict: "ST segment Normal" cannot be selected with other ST segment abnormalities.',
            type: 'error'
        });
    }

    // If ST Elevation is checked, conflict with Depression, Early Repol, Non-specific
    if (stElevationChecked) {
        if (stDepressionChecked) conflicts.push({ fields: ['stElevation', 'stDepression'], message: 'Conflict: ST Elevation and ST Depression cannot coexist.', type: 'error' });
        if (earlyRepolarizationChecked) conflicts.push({ fields: ['stElevation', 'earlyRepolarization'], message: 'Conflict: ST Elevation is inconsistent with Early Repolarization.', type: 'error' });
        if (nonspecificChecked) conflicts.push({ fields: ['stElevation', 'nonspecificSTTChanges'], message: 'Conflict: ST Elevation is inconsistent with Non-specific ST/T Changes.', type: 'error' });
    }

    // If ST Depression is checked, conflict with Elevation, Osborn Waves
    if (stDepressionChecked) {
        if (stElevationChecked) conflicts.push({ fields: ['stDepression', 'stElevation'], message: 'Conflict: ST Depression and ST Elevation cannot coexist.', type: 'error' });
        if (osbornJWavesChecked) conflicts.push({ fields: ['stDepression', 'osbornJWaves'], message: 'Conflict: ST Depression is inconsistent with Osborn (J) Waves.', type: 'error' });
    }

    // If Early Repolarization is checked, conflict with Elevation, Osborn Waves, Non-specific
    if (earlyRepolarizationChecked) {
        if (stElevationChecked) conflicts.push({ fields: ['earlyRepolarization', 'stElevation'], message: 'Conflict: Early Repolarization is inconsistent with ST Elevation.', type: 'error' });
        if (osbornJWavesChecked) conflicts.push({ fields: ['earlyRepolarization', 'osbornJWaves'], message: 'Conflict: Early Repolarization and Osborn (J) Waves are distinct J point elevations.', type: 'error' });
        if (nonspecificChecked) conflicts.push({ fields: ['earlyRepolarization', 'nonspecificSTTChanges'], message: 'Conflict: Early Repolarization is inconsistent with Non-specific ST/T Changes.', type: 'error' });
    }

    // If Osborn (J) Waves are checked, conflict with Depression, Early Repol, Non-specific
    if (osbornJWavesChecked) {
        if (stElevationChecked) conflicts.push({ fields: ['osbornJWaves', 'stElevation'], message: 'Warning: Osborn (J) Waves are often inconsistent with ST Elevation (except in hypothermia).', type: 'warning' });
        if (stDepressionChecked) conflicts.push({ fields: ['osbornJWaves', 'stDepression'], message: 'Conflict: Osborn (J) Waves are inconsistent with ST Depression.', type: 'error' });
        if (earlyRepolarizationChecked) conflicts.push({ fields: ['osbornJWaves', 'earlyRepolarization'], message: 'Conflict: Osborn (J) Waves and Early Repolarization are distinct J point elevations.', type: 'error' });
        if (nonspecificChecked) conflicts.push({ fields: ['nonspecificSTTChanges', 'nonspecificSTTChanges'], message: 'Conflict: Osborn (J) Waves are inconsistent with Non-specific ST/T Changes.', type: 'error' });
    }

    // If Non-specific ST/T changes are checked, conflict with all specific ST abnormalities
    if (nonspecificChecked) {
        if (stElevationChecked) conflicts.push({ fields: ['nonspecificSTTChanges', 'stElevation'], message: 'Conflict: Non-specific ST/T Changes are inconsistent with ST Elevation.', type: 'error' });
        if (stDepressionChecked) conflicts.push({ fields: ['nonspecificSTTChanges', 'stDepression'], message: 'Conflict: Non-specific ST/T Changes are inconsistent with ST Depression.', type: 'error' });
        if (earlyRepolarizationChecked) conflicts.push({ fields: ['nonspecificSTTChanges', 'earlyRepolarization'], message: 'Conflict: Non-specific ST/T Changes are inconsistent with Early Repolarization.', type: 'error' });
        if (osbornJWavesChecked) conflicts.push({ fields: ['nonspecificSTTChanges', 'osbornJWaves'], message: 'Conflict: Non-specific ST/T Changes are inconsistent with Osborn (J) Waves.', type: 'error' });
    }

    // 3. تعارض‌های مرتبط با امواج P و هدایت الکتریکی
    // Absent P Waves:
    if (pWaveShape === 'Absent') {
        if (avBlockType === '3rd Degree') {
            conflicts.push({
                fields: ['pWaveShape', 'avBlockType'],
                message: 'Conflict: Absent P waves are inconsistent with 3rd Degree AV Block (which requires P waves).',
                type: 'error'
            });
        }
        if (pWaveShape === 'Sawtooth') {
            conflicts.push({
                fields: ['pWaveShape'],
                message: 'Conflict: P wave shape cannot be both Absent and Sawtooth.',
                type: 'error'
            });
        }
        if (rhythm === 'Atrial flutter') {
            conflicts.push({
                fields: ['pWaveShape', 'rhythm'],
                message: 'Conflict: Absent P waves are inconsistent with Atrial Flutter (which has sawtooth P waves).',
                type: 'error'
            });
        }
    }
    // Short PR Interval + Delta Wave + Wide QRS (WPW):
    const isWPWPattern = (isValidNumber(prInterval) && prInterval < 120) && qrsMorphology === 'Delta wave' && (isValidNumber(qrsDuration) && qrsDuration > 100);
    if (isWPWPattern) {
        if (isValidNumber(prInterval) && prInterval > 200) {
            conflicts.push({
                fields: ['prInterval'],
                message: 'Conflict: Short PR interval (WPW pattern) is inconsistent with Long PR interval.',
                type: 'error'
            });
        }
        if (qrsAxis === 'Left Axis Deviation') {
            conflicts.push({
                fields: ['qrsAxis'],
                message: 'Warning: WPW pattern is often associated with RAD or normal axis, less commonly LAD.',
                type: 'warning'
            });
        }
    }
    // P Waves Sawtooth (Atrial Flutter):
    if (pWaveShape === 'Sawtooth') {
        if (pWaveShape === 'Absent') {
            conflicts.push({
                fields: ['pWaveShape'],
                message: 'Conflict: P wave shape cannot be both Sawtooth and Absent.',
                type: 'error'
            });
        }
        if (rhythm === 'Atrial fibrillation') {
            conflicts.push({
                fields: ['pWaveShape', 'rhythm'],
                message: 'Conflict: Sawtooth P waves are inconsistent with Atrial Fibrillation (which has absent P waves).',
                type: 'error'
            });
        }
        if (isValidNumber(heartRate) && heartRate < 60 && rhythm === 'Atrial flutter') {
            conflicts.push({
                fields: ['heartRate', 'rhythm'],
                message: 'Warning: Bradycardia (<60 bpm) with Atrial Flutter is unusual unless there is significant AV block (e.g., 4:1 block).',
                type: 'warning'
            });
        }
    }

    // 5. تعارض‌های مرتبط با QT Interval و ریتم
    // Prolonged QTc (>450 ms):
    if (qtAbnormality === 'Prolonged') {
        if (qtAbnormality === 'Shortened') {
            conflicts.push({
                fields: ['qtAbnormality'],
                message: 'Conflict: QT abnormality cannot be both Prolonged and Shortened.',
                type: 'error'
            });
        }
        if (qtAbnormality === 'Normal') {
            conflicts.push({
                fields: ['qtAbnormality'],
                message: 'Conflict: QT abnormality cannot be both Prolonged and Normal.',
                type: 'error'
            });
        }
        if (isValidNumber(qtcInterval) && qtcInterval <= 440) {
            conflicts.push({
                fields: ['qtcInterval', 'qtAbnormality'],
                message: 'Conflict: Selected "Prolonged QTc" but entered QTc value is within normal limits.',
                type: 'error'
            });
        }
    }
    // Torsades de Pointes:
    if (qtAbnormality === 'Torsades de Pointes') {
        if (qtAbnormality === 'Normal') {
            conflicts.push({
                fields: ['qtAbnormality'],
                message: 'Conflict: Torsades de Pointes is inconsistent with Normal QT Interval.',
                type: 'error'
            });
        }
        if (isValidNumber(heartRate) && heartRate < 60 && avBlockType !== '3rd Degree') {
            conflicts.push({
                fields: ['heartRate', 'rhythm'],
                message: 'Warning: Torsades de Pointes is usually associated with prolonged QT and not bradycardia, unless due to complete AV block.',
                type: 'warning'
            });
        }
    }
    // Short QT Interval:
    if (qtAbnormality === 'Shortened') {
        if (qtAbnormality === 'Prolonged') {
            conflicts.push({
                fields: ['qtAbnormality'],
                message: 'Conflict: QT abnormality cannot be both Shortened and Prolonged.',
                type: 'error'
            });
        }
        if (qtAbnormality === 'Normal') {
            conflicts.push({
                fields: ['qtAbnormality'],
                message: 'Conflict: QT abnormality cannot be both Shortened and Normal.',
                type: 'error'
            });
        }
        if (isValidNumber(qtcInterval) && qtcInterval >= 350) {
            conflicts.push({
                fields: ['qtcInterval', 'qtAbnormality'],
                message: 'Conflict: Selected "Shortened QTc" but entered QTc value is within normal limits.',
                type: 'error'
            });
        }
    }

    // 6. تعارض‌های مرتبط با ریتم‌های خاص
    // Ventricular Tachycardia:
    if (rhythm === 'Ventricular tachycardia') {
        const regularRhythms = ['Sinus rhythm', 'Sinus bradycardia', 'Sinus tachycardia', 'Atrial flutter', 'Junctional rhythm', 'Idioventricular rhythm'];
        if (regularRhythms.includes(rhythm) && rhythm !== 'Ventricular tachycardia') {
            conflicts.push({
                fields: ['rhythm'],
                message: 'Conflict: Ventricular Tachycardia is usually irregular, inconsistent with selected regular rhythm.',
                type: 'error'
            });
        }
        if (pWaveShape === 'Normal' || pWaveShape === 'Peaked') {
            conflicts.push({
                fields: ['rhythm', 'pWaveShape'],
                message: 'Warning: Ventricular Tachycardia typically has AV dissociation (P waves not related to QRS).',
                type: 'warning'
            });
        }
    }
    // Atrial Fibrillation:
    if (rhythm === 'Atrial fibrillation') {
        const regularRhythms = ['Sinus rhythm', 'Sinus bradycardia', 'Sinus tachycardia', 'Atrial flutter', 'Junctional rhythm', 'Idioventricular rhythm'];
        if (regularRhythms.includes(rhythm) && rhythm !== 'Atrial fibrillation') {
            conflicts.push({
                fields: ['rhythm'],
                message: 'Conflict: Atrial Fibrillation is irregularly irregular, inconsistent with selected regular rhythm.',
                type: 'error'
            });
        }
        if (pWaveShape !== 'Absent' && pWaveShape !== '') {
            conflicts.push({
                fields: ['rhythm', 'pWaveShape'],
                message: 'Conflict: Atrial Fibrillation is characterized by absent P waves.',
                type: 'error'
            });
        }
    }

    // Additional Conflicts based on common ECG patterns
    // WPW pattern conflicts with LBBB/RBBB (different causes of wide QRS)
    if (isWPWPattern && (qrsMorphology === 'LBBB' || qrsMorphology === 'RBBB')) {
        conflicts.push({
            fields: ['qrsMorphology'],
            message: 'Conflict: WPW pattern (Delta wave) is inconsistent with LBBB or RBBB morphology.',
            type: 'error'
        });
    }
    // Pathologic Q waves often imply Infarct findings
    if (pathologicQWaves && !stElevationChecked && !stDepressionChecked) { // Assuming infarct findings are related to ST changes
        conflicts.push({
            fields: ['pathologicQWaves'],
            message: 'Warning: Pathologic Q waves are indicative of previous myocardial infarction. Consider related ST changes.',
            type: 'warning'
        });
    }

    // Highlight conflicting fields and display messages
    // --- Refactored for checkbox group warnings/messages ---
    // Helper: Map of group field IDs to their container class
    const groupFieldToContainer = {
        // Add more groups as needed
        stSegmentStatus: 'st-segment-checkbox-group', // Example: <div class="st-segment-checkbox-group checkbox-group">...</div>
    };
    // Helper: Track which group has already had a message inserted
    const groupMessageInserted = {};

    conflicts.forEach(conflict => {
        // If the conflict is for a checkbox group (e.g., all fields are in stSegmentStatus)
        if (
            // Check if all fields are ST segment checkboxes
            conflict.fields.every(f => [
                'stNormal', 'stElevation', 'stDepression', 'earlyRepolarization', 'osbornJWaves', 'nonspecificSTTChanges'
            ].includes(f))
        ) {
            // Only insert one message for the group
            if (!groupMessageInserted.stSegmentStatus) {
                // Remove previous group messages
                const groupContainer = document.querySelector('.st-segment-checkbox-group');
                if (groupContainer) {
                    groupContainer.querySelectorAll('.conflict-message, .warning-message').forEach(el => el.remove());
                    let messageDiv = document.createElement('div');
                    messageDiv.classList.add(conflict.type === 'error' ? 'conflict-message' : 'warning-message');
                    messageDiv.textContent = conflict.message;
                    groupContainer.appendChild(messageDiv);
                }
                groupMessageInserted.stSegmentStatus = true;
            }
            // Highlight all involved checkboxes
            conflict.fields.forEach(fieldId => {
                const element = document.getElementById(fieldId);
                if (element) {
                    element.parentElement.classList.add(conflict.type === 'error' ? 'conflict-highlight' : 'warning-highlight');
                }
            });
        } else {
            // Default: highlight and message after the first field as before
            conflict.fields.forEach(fieldId => {
                const element = document.getElementById(fieldId);
                if (element) {
                    // For radio buttons and checkboxes, highlight the label
                    if (element.type === 'radio' || element.type === 'checkbox') {
                        element.parentElement.classList.add(conflict.type === 'error' ? 'conflict-highlight' : 'warning-highlight');
                    } else {
                        element.classList.add(conflict.type === 'error' ? 'conflict-highlight' : 'warning-highlight');
                    }
                    // Display conflict/warning message below the first conflicting field (or a relevant one)
                    if (fieldId === conflict.fields[0]) {
                        let messageElement = element.nextElementSibling;
                        // Find the correct place to insert the message, after existing range/flag messages
                        while (messageElement && (messageElement.classList.contains('range-info') || messageElement.classList.contains('flag-message'))) {
                            messageElement = messageElement.nextElementSibling;
                        }

                        let messageDiv = document.createElement('div');
                        messageDiv.classList.add(conflict.type === 'error' ? 'conflict-message' : 'warning-message');
                        messageDiv.textContent = conflict.message;

                        if (messageElement) {
                            element.parentNode.insertBefore(messageDiv, messageElement);
                        } else {
                            element.parentNode.appendChild(messageDiv);
                        }
                    }
                }
            });
        }
    });

    return conflicts; // Return the list of conflicts/warnings
}

// Function to disable/enable options based on conflicts
function updateOptionStates() {
    // Re-enable all options first and remove disabled styling
    document.querySelectorAll('select option:disabled').forEach(el => {
        el.disabled = false;
    });
    document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => { // Include checkboxes
        input.disabled = false;
        // Remove disabled styling class and reset styles
        input.parentElement.classList.remove('radio-label:has(input:disabled)');
        input.parentElement.classList.remove('checkbox-label:has(input:disabled)'); // Remove checkbox disabled style
        input.parentElement.style.opacity = '';
        input.parentElement.style.cursor = '';
        input.parentElement.style.borderColor = '';
        input.parentElement.style.color = '';
    });

    // Re-apply selected class for all radio/checkbox inputs before disabling/enabling
    document.querySelectorAll('.radio-group input[type="radio"], .checkbox-group input[type="checkbox"]').forEach(input => {
        if (input.checked) {
            input.parentElement.classList.add('selected');
        } else {
            input.parentElement.classList.remove('selected');
        }
    });

    const heartRate = parseFloat(document.getElementById('heartRate').value);
    const rhythm = document.getElementById('rhythm').value;
    const pWaveShape = document.getElementById('pWaveShape').value;

    // Get checked ST segment statuses
    const stElevationChecked = document.getElementById('stElevation').checked;
    const stDepressionChecked = document.getElementById('stDepression').checked;
    const stNormalChecked = document.getElementById('stNormal').checked;
    const earlyRepolarizationChecked = document.getElementById('earlyRepolarization').checked;
    const osbornJWavesChecked = document.getElementById('osbornJWaves').checked;
    const nonspecificChecked = document.getElementById('nonspecificSTTChanges').checked;

    const avBlockType = document.getElementById('avBlockType').value;
    const qrsMorphology = document.getElementById('qrsMorphology').value;
    const qrsDuration = parseFloat(document.getElementById('qrsDuration').value);
    const qrsVoltage = document.getElementById('qrsVoltage').value;
    const qrsAxis = document.getElementById('qrsAxis').value;
    const qtAbnormality = document.getElementById('qtAbnormality').value;

    // Disable options based on Heart Rate
    if (isValidNumber(heartRate)) {
        if (heartRate < 60) { // Bradycardia
            document.querySelector('#rhythm option[value="Sinus tachycardia"]').disabled = true;
            document.querySelector('#rhythm option[value="Supraventricular tachycardia"]').disabled = true;
            document.querySelector('#rhythm option[value="Ventricular tachycardia"]').disabled = true;
        } else if (heartRate > 100) { // Tachycardia
            document.querySelector('#rhythm option[value="Sinus bradycardia"]').disabled = true;
            document.querySelector('#rhythm option[value="Junctional rhythm"]').disabled = true;
            document.querySelector('#rhythm option[value="Idioventricular rhythm"]').disabled = true;
        }
    }

    // Disable options based on Rhythm irregularity (using AFib as example)
    if (rhythm === 'Atrial fibrillation') { // Irregularly irregular
        document.querySelector('#rhythm option[value="Atrial flutter"]').disabled = true;
    }
    if (rhythm === 'Atrial flutter') { // Typically regular
        document.querySelector('#rhythm option[value="Atrial fibrillation"]').disabled = true;
    }
    if (rhythm === '3rd Degree') { // Can be regular
        document.querySelector('#rhythm option[value="Atrial fibrillation"]').disabled = true;
    }

    // Disable options based on P Wave Shape
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

    // Disable ST Segment options based on conflicts (Updated for Checkboxes)
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

    // Disable QT Abnormality options based on conflicts
    if (qtAbnormality === 'Prolonged') {
        document.querySelector('#qtAbnormality option[value="Shortened"]').disabled = true;
        document.querySelector('#qtAbnormality option[value="Normal"]').disabled = true;
    } else if (qtAbnormality === 'Shortened') {
        document.querySelector('#qtAbnormality option[value="Prolonged"]').disabled = true;
        document.querySelector('#qtAbnormality option[value="Normal"]').disabled = true;
    } else if (qtAbnormality === 'Normal') {
        document.querySelector('#qtAbnormality option[value="Prolonged"]').disabled = true;
        document.querySelector('#qtAbnormality option[value="Shortened"]').disabled = true;
        document.querySelector('#qtAbnormality option[value="Torsades de Pointes"]').disabled = true;
    } else if (qtAbnormality === 'Torsades de Pointes') {
        document.querySelector('#qtAbnormality option[value="Normal"]').disabled = true;
        document.querySelector('#qtAbnormality option[value="Shortened"]').disabled = true;
    }

    // Apply disabled styling to radio button labels
    document.querySelectorAll('input[type="radio"]:disabled, input[type="checkbox"]:disabled').forEach(input => {
        input.parentElement.classList.add(input.type === 'radio' ? 'radio-label:has(input:disabled)' : 'checkbox-label:has(input:disabled)');
        input.parentElement.style.opacity = '0.6';
        input.parentElement.style.cursor = 'not-allowed';
        input.parentElement.style.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--flag-color');
        input.parentElement.style.color = getComputedStyle(document.documentElement).getPropertyValue('--flag-color');
    });

    // Re-apply selected class for radio/checkbox inputs after disabling/enabling
    document.querySelectorAll('.radio-group input[type="radio"], .checkbox-group input[type="checkbox"]').forEach(input => {
        if (input.checked && !input.disabled) {
            input.parentElement.classList.add('selected');
        } else {
            input.parentElement.classList.remove('selected');
        }
    });
}

// Function to clear all conflict highlights
function clearAllConflictHighlights() {
    document.querySelectorAll('.conflict-highlight, .warning-highlight').forEach(element => {
        element.classList.remove('conflict-highlight', 'warning-highlight');
    });
}

// Function to clear all conflict messages
function clearAllConflictMessages() {
    document.querySelectorAll('.conflict-message, .warning-message').forEach(element => {
        element.remove();
    });
}

// Function to clear all flag messages
function clearAllFlagMessages() {
    document.querySelectorAll('.flag-message').forEach(element => {
        element.textContent = '';
    });
    document.querySelectorAll('.input-field.flagged').forEach(element => {
        element.classList.remove('flagged');
    });
}

// Function to clear all validation messages (flags and conflicts/warnings)
function clearAllValidationMessages() {
    clearAllFlagMessages();
    clearAllConflictHighlights();
    clearAllConflictMessages();
    // Also clear range error highlights
    document.querySelectorAll('.overall-range.error').forEach(span => {
        span.classList.remove('error');
    });
    document.querySelectorAll('.input-field.conflict-highlight, .input-field.warning-highlight').forEach(input => {
        input.classList.remove('conflict-highlight', 'warning-highlight');
    });
}

// Initialize validation controls
function initializeValidation() {
    setupInputValidationListeners();
    
    const relevantFields = ['heartRate', 'rhythm', 'pWaveShape', 'stElevation', 'stDepression', 'stNormal', 'earlyRepolarization', 'osbornJWaves', 'nonspecificSTTChanges', 'avBlockType', 'prInterval', 'qrsDuration', 'qrsMorphology', 'qrsVoltage', 'qtcInterval', 'qtAbnormality', 'qrsAxis', 'tWaveAbnormalities', 'uWaveProminence', 'pacemakerPresent', 'ectopicBeats', 'rsRatioAbnormal', 'pathologicQWaves', 'atrialEnlargement', 'rWaveProgression'];
    
    relevantFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            if (element.type === 'radio') {
                document.querySelectorAll(`input[name="${element.name}"]`).forEach(radio => {
                    radio.addEventListener('change', () => {
                        checkConflicts();
                        updateOptionStates();
                    });
                });
            } else if (element.type === 'checkbox') {
                element.addEventListener('change', () => {
                    checkConflicts();
                    updateOptionStates();
                });
            }
            else if (element.tagName === 'SELECT') {
                element.addEventListener('change', () => {
                    checkConflicts();
                    updateOptionStates();
                });
            } else {
                element.addEventListener('input', () => {
                    updateRangeAndFlag(fieldId);
                    checkConflicts();
                    updateOptionStates();
                });
            }
        }
    });
    
    // Run initial conflict check
    checkConflicts();
    updateOptionStates();
} 





function validateAgeVsRecordingDate() {
    const ageInput = document.getElementById('age');
    const dateInput = document.getElementById('recordingDate');
    const conflictDiv = document.getElementById('ageConflict');
    const dateConflictDiv = document.getElementById('recordingDateConflict');

    const age = parseInt(ageInput.value, 10);
    const recordingDate = new Date(dateInput.value);
    const today = new Date();

    // Reset previous states
    ageInput.classList.remove('conflict-highlight');
    dateInput.classList.remove('conflict-highlight');
    conflictDiv.textContent = '';
    dateConflictDiv.textContent = '';

    // Strict check: age must be in range 0 to 120
    if (!isNaN(age) && (age < 0 || age > 120)) {
        const msg = `Error: سن باید بین 0 تا 120 سال باشد.`;
        ageInput.classList.add('conflict-highlight');
        conflictDiv.textContent = msg;
        return {
            fields: ['age'],
            message: msg,
            type: 'error'
        };
    }

    // Additional check: estimated birth year must be logical
    if (!isNaN(age) && dateInput.value) {
        const estimatedBirthDate = new Date(recordingDate);
        estimatedBirthDate.setFullYear(recordingDate.getFullYear() - age);

        const birthYear = estimatedBirthDate.getFullYear();
        const currentYear = today.getFullYear();

        if (birthYear < 1900 || birthYear > currentYear) {
            const msg = `تاریخ ثبت (${recordingDate.toLocaleDateString('fa-IR')}) نمی‌تواند با سن ${age} سال منجر به تولدی غیرواقعی (${birthYear}) شود.`;
            ageInput.classList.add('conflict-highlight');
            dateInput.classList.add('conflict-highlight');
            conflictDiv.textContent = msg;
            dateConflictDiv.textContent = msg;
            return {
                fields: ['age', 'recordingDate'],
                message: msg,
                type: 'error'
            };
        }
    }

    return null;
}
}
}
}) نمی‌تواند قبل از تولد تقریبی بیمار (با سن {{age}} سال) باشد.`.replace('{{date}}', dateInput.value).replace('{{age}}', age);
            return {
                fields: ['age', 'recordingDate'],
                message: 'Conflict: Patient age is inconsistent with recording date.',
                type: 'error'
            };
        } else {
            ageInput.classList.remove('conflict-highlight');
            conflictDiv.textContent = '';
        }
    }
    return null;
}
