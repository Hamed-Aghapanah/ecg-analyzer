// ECG Analysis Module

// Function to analyze the ECG based on form inputs
function analyzeECG() {
    clearAllValidationMessages(); // Clear messages before analysis
    clearAnalysisResults(); // Clear previous analysis results
    document.getElementById('analysisMessages').innerHTML = ''; // Clear messages below button

    const analyzeBtn = document.getElementById('analyzeBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const analysisResultsDiv = document.getElementById('analysisResults');
    const notOkRulesSection = document.getElementById('notOkRulesSection');
    const notOkRulesListUl = document.getElementById('notOkRulesList');
    const okRulesListContainerDiv = document.getElementById('okRulesListContainer');
    const toggleNotOkRulesBtn = document.getElementById('toggleNotOkRulesBtn');
    const deepInterpreterSection = document.getElementById('deepInterpreterSection');
    const deepInterpretationListUl = document.getElementById('deepInterpretationList');
    const toggleDeepInterpreterBtn = document.getElementById('toggleDeepInterpreterBtn');

    // Disable buttons and show loading indicator
    analyzeBtn.disabled = true;
    exportExcelBtn.disabled = true;
    // Removed text change, only spinner
    const spinner = document.createElement('i');
    spinner.classList.add('fas', 'fa-spinner', 'fa-spin', 'ml-2');
    analyzeBtn.appendChild(spinner);

    // Perform validation and conflict checks first
    const conflictsAndWarnings = checkConflicts();
    const validationIssues = [];

    // Collect issues from range checks (values outside overall range are errors)
    for (const inputId in ranges) {
        const inputField = document.getElementById(inputId);
        const value = parseFloat(inputField.value);
        const range = ranges[inputId];
        if (isValidNumber(value) && (value < range.overall[0] || value > range.overall[1])) {
            validationIssues.push({
                message: `${inputField.previousElementSibling.textContent.replace(':', '')}: Value (${value}) is outside the overall expected range (${range.overall[0]}-${range.overall[1]}).`,
                type: 'error'
            });
        }
    }

    // Add conflict/warning messages to validation issues
    conflictsAndWarnings.forEach(issue => {
        validationIssues.push(issue);
    });

    // Separate errors and warnings
    const errors = validationIssues.filter(issue => issue.type === 'error');

    const analysisMessagesDiv = document.getElementById('analysisMessages');
    analysisMessagesDiv.innerHTML = '';
    if (errors.length > 0) {
        const ul = document.createElement('ul');
        errors.forEach(issue => {
            const li = document.createElement('li');
            li.classList.add('error');
            li.textContent = `Error: ${issue.message}`;
            ul.appendChild(li);
        });
        analysisMessagesDiv.appendChild(ul);

        // Re-enable buttons and remove spinner
        analyzeBtn.disabled = false;
        exportExcelBtn.disabled = false;
        analyzeBtn.textContent = 'Analyze ECG';
        spinner.remove();
        return; // Only block on errors
    }

    // Gather form data (only after successful validation)
    const formData = {
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

    // --- ECG Interpretation Logic (Simplified Example Rules) ---
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

    // Run interpretation rules
    interpretationRules.forEach(rule => {
        const result = rule.check(formData);
        if (result) {
            ruleChecks.push({ rule: rule.name, status: 'OK', reason: rule.getReasonOK(formData) });
        } else {
            ruleChecks.push({ rule: rule.name, status: 'NOT OK', reason: rule.negativeMessage(formData) });
            notOkRulesListArray.push(`${rule.name}: ${rule.negativeMessage(formData)}`);
        }
    });

    // Display OK Rules as Clickable List
    okRulesListContainerDiv.innerHTML = '';
    const okRules = ruleChecks.filter(rule => rule.status === 'OK');
    if (okRules.length > 0) {
        // Remove toggle button display logic
        okRulesListContainerDiv.classList.add('rules-grid');
        
        okRules.forEach((rule, index) => {
            const ruleItem = document.createElement('div');
            ruleItem.classList.add('rule-grid-item');
            // Display the rule name and add the reason as a hover detail
            ruleItem.innerHTML = `
                <div class="rule-name">${rule.rule}</div>
                <div class="rule-reason-tooltip">${rule.reason}</div>
            `;
            okRulesListContainerDiv.appendChild(ruleItem);
        });
        // Set to display as block to make it visible initially
        okRulesListContainerDiv.style.display = 'grid';
    } else {
        okRulesListContainerDiv.innerHTML = '<p>کیس نرمال</p>';
    }

    // Display NOT OK Rules
    notOkRulesListUl.innerHTML = '';
    if (notOkRulesListArray.length > 0) {
        notOkRulesSection.style.display = 'block';
        notOkRulesListArray.forEach(rule => {
            const li = document.createElement('li');
            li.textContent = rule;
            notOkRulesListUl.appendChild(li);
        });
        // Make the list initially hidden (collapsed)
        notOkRulesListUl.style.display = 'none';
    } else {
        notOkRulesSection.style.display = 'none';
    }

    // Call deep interpretation logic
    deepInterpretECG(formData);

    analysisResultsDiv.style.display = 'block';

    // Re-enable buttons and remove spinner
    analyzeBtn.disabled = false;
    exportExcelBtn.disabled = false;
    // Ensure button text is "Analyze ECG"
    analyzeBtn.textContent = 'Analyze ECG';
    spinner.remove();
}

// Function for Deep Interpretation of ECG Findings
function deepInterpretECG(formData) {
    const deepInterpretationListUl = document.getElementById('deepInterpretationList');
    const deepInterpreterSection = document.getElementById('deepInterpreterSection');
    const toggleDeepInterpreterBtn = document.getElementById('toggleDeepInterpreterBtn');
    const deepInterpretationResults = [];

    // Interpretation of ECG Findings
    const combinedRules = [
        {
            check: (data) => data.atrialEnlargement === 'Right Atrial Enlargement' && data.qrsAxis === 'Right Axis Deviation' && data.qrsMorphology === 'RBBB',
            message: '<strong>P pulmonale + Right axis deviation + RBBB:</strong> Indicates strain on the right heart, possibly due to pulmonary embolism or COPD with right ventricular hypertrophy.'
        },
        {
            check: (data) => data.atrialEnlargement === 'Left Atrial Enlargement' && data.qrsVoltage === 'Normal' && (isValidNumber(data.qrsDuration) && data.qrsDuration > 100), // Assuming LVH is represented by normal voltage and wide QRS
            message: '<strong>P mitrale + LVH (large S in V1, R in V5/V6):</strong> Suggests enlargement of the left atrium and ventricle, often due to chronic hypertension.'
        },
        {
            check: (data) => isValidNumber(data.prInterval) && data.prInterval < 120 && data.qrsMorphology === 'Delta wave' && isValidNumber(data.qrsDuration) && data.qrsDuration > 100,
            message: '<strong>Short PR interval + Delta wave + Wide QRS:</strong> Characteristic of Wolff-Parkinson-White Syndrome.'
        },
        {
            check: (data) => isValidNumber(data.prInterval) && data.prInterval > 200 && isValidNumber(data.qrsDuration) && data.qrsDuration > 100 && data.qrsAxis === 'Left Axis Deviation',
            message: '<strong>Long PR + Wide QRS + Left axis deviation:</strong> Indicates tri-fascicular block, which poses a risk for complete heart block.'
        },
        {
            check: (data) => data.pWaveShape === 'Absent' && data.rhythm === 'Atrial fibrillation',
            message: '<strong>Absent P waves + Irregularly irregular QRS:</strong> Indicates atrial fibrillation.'
        },
        {
            check: (data) => data.pWaveShape === 'Sawtooth' && data.rhythm === 'Atrial flutter', // Assuming regular grouped QRS by atrial flutter selection
            message: '<strong>Sawtooth P waves + Regular grouped QRS:</strong> Suggests atrial flutter, such as a 2:1 block, resulting in a heart rate of 150 bpm.'
        },
        {
            check: (data) => data.avBlockType === '3rd Degree' && isValidNumber(data.heartRate) && data.heartRate < 60, // P waves unrelated to QRS is implied by 3rd degree AV block
            message: '<strong>P waves unrelated to QRS + Bradycardia:</strong> Indicates third-degree AV block (complete AV dissociation).'
        },
        {
            check: (data) => data.pathologicQWaves && data.stSegmentStatuses.includes('elevation'), // Q waves in II, III, aVF + ST elevation in the same leads (generalizing for now)
            message: '<strong>Q waves in II, III, aVF + ST elevation in the same leads:</strong> Suggests an acute inferior STEMI.'
        },
        {
            check: (data) => data.pathologicQWaves && data.rWaveProgression === 'Poor', // Q waves in V1–V4 + Poor R progression
            message: '<strong>Q waves in V1–V4 + Poor R progression:</strong> Indicates an old or acute anterior myocardial infarction (MI).'
        },
        {
            check: (data) => data.qrsVoltage === 'Tall' && data.qrsAxis === 'Right Axis Deviation' && data.tWaveAbnormalities === 'Inverted', // Tall R in V1 + Right axis deviation + T inversion V1–V3 (generalizing T inversion)
            message: '<strong>Tall R in V1 + Right axis deviation + T inversion V1–V3:</strong> Suggests right ventricular hypertrophy, possibly due to pulmonary hypertension or congenital heart disease.'
        },
        {
            check: (data) => isValidNumber(data.qrsDuration) && data.qrsDuration > 100 && isValidNumber(data.prInterval) && data.prInterval < 120 && data.qrsMorphology === 'Delta wave', // Wide QRS + Short PR + Slurred upstroke (V1/V2)
            message: '<strong>Wide QRS + Short PR + Slurred upstroke (V1/V2):</strong> Indicates Type B Wolff-Parkinson-White syndrome.'
        },
        {
            check: (data) => data.qrsMorphology === 'RBBB' && data.qrsAxis === 'Left Axis Deviation', // RBBB + Left anterior hemiblock (LAD)
            message: '<strong>RBBB + Left anterior hemiblock:</strong> Suggests high-grade conduction disease with a risk of complete block.'
        },
        {
            check: (data) => data.stSegmentStatuses.includes('elevation') && data.stSegmentStatuses.includes('depression'), // ST elevation in II, III, aVF + Reciprocal depression in I, aVL (generalizing reciprocal depression)
            message: '<strong>ST elevation in II, III, aVF + Reciprocal depression in I, aVL:</strong> Indicates an acute inferior MI with reciprocal ischemia.'
        },
        {
            check: (data) => data.qrsMorphology === 'Notching/Slurring' && data.pathologicQWaves, // S1Q3T3 pattern (simplification, as these are specific lead findings)
            message: '<strong>S1Q3T3 pattern:</strong> Classic but not specific for cor pulmonale or pulmonary embolism.'
        },
        {
            check: (data) => data.qtAbnormality === 'Torsades de Pointes' && data.qtAbnormality === 'Prolonged', // Prolonged QT + Torsades episodes on rhythm strip
            message: '<strong>Prolonged QT + Torsades episodes on rhythm strip:</strong> Indicates Torsades de Pointes.'
        }
    ];

    // Filter and add rules that are met
    combinedRules.forEach(rule => {
        if (rule.check(formData)) {
            deepInterpretationResults.push(rule.message);
        }
    });

    // Display deep interpretation results
    deepInterpretationListUl.innerHTML = '';
    if (deepInterpretationResults.length > 0) {
        deepInterpreterSection.style.display = 'block';
        toggleDeepInterpreterBtn.style.display = 'block';
        toggleDeepInterpreterBtn.textContent = `Show Deep Interpretations (${deepInterpretationResults.length})`;
        deepInterpretationResults.forEach(interpretation => {
            const li = document.createElement('li');
            li.innerHTML = interpretation; // Use innerHTML to render strong tags
            deepInterpretationListUl.appendChild(li);
        });
        deepInterpretationListUl.style.display = 'none'; // Initially hidden
    } else {
        deepInterpreterSection.style.display = 'none';
        toggleDeepInterpreterBtn.style.display = 'none';
    }
}

// Function to export data to CSV
function exportToCSV() {
    // Collect all form data
    const formData = {};
    document.querySelectorAll('.form-container input, .form-container select, .form-container textarea').forEach(element => {
        const labelElement = element.previousElementSibling;
        let label = labelElement ? labelElement.textContent.replace(':', '').trim() : element.id;

        if (element.type === 'checkbox') {
            // For checkboxes, use the label text of the checkbox itself
            label = element.parentElement.textContent.trim();
            formData[label] = element.checked ? 'Yes' : 'No';
        } else if (element.type === 'radio') {
            // For radio buttons, group by name and store the selected value
            if (element.checked) {
                // Use the label of the radio group if available, otherwise the radio name
                const radioGroupLabel = document.querySelector(`label[for="${element.name}"]`) || { textContent: element.name };
                formData[radioGroupLabel.textContent.replace(':', '').trim()] = element.value;
            }
        } else if (element.tagName === 'SELECT') {
            formData[label] = element.value;
        } else {
            formData[label] = element.value;
        }
    });

    // Prepare CSV content
    let csvContent = '';
    const headers = Object.keys(formData);
    const values = Object.values(formData);

    // Add headers
    csvContent += headers.map(header => `"${header.replace(/"/g, '""')}"`).join(',') + '\n';
    // Add values
    csvContent += values.map(value => {
        if (typeof value === 'string') {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }).join(',') + '\n';

    // Create a Blob and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'ecg_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showModal('داده‌های فرم با موفقیت به فایل CSV صادر شد.'); // Success message in Persian
}

// Function to clear previous analysis results
function clearAnalysisResults() {
    document.getElementById('notOkRulesList').innerHTML = '';
    document.getElementById('notOkRulesSection').style.display = 'none';
    document.getElementById('okRulesListContainer').innerHTML = '';
    document.getElementById('analysisResults').style.display = 'none';
    document.getElementById('deepInterpretationList').innerHTML = ''; // Clear deep interpretation results
    document.getElementById('deepInterpreterSection').style.display = 'none'; // Hide deep interpreter section
    document.getElementById('toggleDeepInterpreterBtn').style.display = 'none';
} 