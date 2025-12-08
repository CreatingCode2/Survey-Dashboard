document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION: DEMO MODE - LOADS FROM LOCAL CSV ---
    // This demo version loads from mock_survey_data.csv instead of Google Sheets
    const SHEET_URL = 'mock_survey_data.csv';  // Local mock data file
    // -------------------------------------------------------

    // --- CONFIGURATION: DATE FORMATTING ---
    const DATE_FORMATS = {
        'us': { locale: 'en-US', options: { year: '2-digit', month: '2-digit', day: '2-digit', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' } }, // 12/31/23, 4:09 PM EST
        'euro': { locale: 'en-GB', options: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' } }, // 31/12/2023, 16:09
        'iso': { locale: 'sv-SE', options: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' } } // 2023-12-31 16:09
    };
    // ----------------------------------------

    let rawResponses = [];
    let triageDetails = {};
    let charts = {};
    let customerMasterData = {}; // Store loaded CSV data

    let state = {
        industry: 'all',
        date: 'all',
        dateFormat: 'us',
        timezone: 'local',
        sort: 'newest'
    };
    let currentView = 'dashboard';
    // ... (skipping unchanged code) ...
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        const formatConfig = DATE_FORMATS[state.dateFormat] || DATE_FORMATS['us'];
        const options = { ...formatConfig.options }; // Create a copy to modify

        // Apply timezone if not local
        if (state.timezone && state.timezone !== 'local') {
            options.timeZone = state.timezone;
        }

        if (state.dateFormat === 'iso') {
            return date.toLocaleString('sv-SE', options);
        }

        return date.toLocaleString(formatConfig.locale, options);
    }
    // ... [REMAINING CODE OMITTED FOR BREVITY, WILL TARGET SPECIFIC BLOCKS NEXT]
    let currentView = 'dashboard';
    const views = {
        dashboard: document.getElementById('view-dashboard'),
        triage: document.getElementById('view-triage'),
        data: document.getElementById('view-data'),
    };

    const INDUSTRIES = ['Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Technology', 'Education'];
    let CSMs = ['Misty Wilmore', 'Tonja Jones']; // Now mutable so we can add/remove
    const ALL_STATUS_OPTIONS = ['New Response', 'Followed Up - Low Risk', 'Followed Up - High Risk', 'Archived'];

    const COLUMN_MAP = {
        'Timestamp': 'date',
        'Email Address': 'email',
        'What is the name of your organization and the name of the person completing this survey?': 'org_user_name_Q1',
        'How has CLEAN_Address been working for your organization?': 'health_raw_Q2',
        'Do you feel you are getting a return on your investment?': 'roi_raw_Q4',
        'Do you feel you are getting a return on your investment?  ': 'roi_raw_Q4',
        'Can you confirm who should receive renewal quotes/invoices for your organization? Please add their name(s) and email address below.': 'renewal_contact_Q6',
        'Can you confirm who should receive renewal quotes/invoices for your organization? Please add their name(s) and email address below.  ': 'renewal_contact_Q6',
        'Can you confirm the Bill To and Ship To addresses? Please add the address below.': 'bill_ship_Q7',
        'Can you confirm the Bill To and Ship To addresses? Please add the address below.  ': 'bill_ship_Q7',
        'Who are the end user(s) or functional user(s) at your organization? If your organization has multiple users please list the top 5. Please add their name(s) and email address(es). Note: The end user or functional user would be the person responsible for entering data into your system.': 'end_users_Q8',
        'Who are the end user(s) or functional user(s) at your organization? If your organization has multiple users please list the top 5. Please add their name(s) and email address(es). Note: The end user or functional user would be the person responsible for entering data into your system.  ': 'end_users_Q8',
        'How often do you download and update the new data files?': 'update_frequency_Q9',
        'How often do you download and update the new data files?  ': 'update_frequency_Q9',
        'Do you or your end user(s) use the Support Portal or the Knowledge Base (My Runner EDQ)?': 'support_portal_Q10',
        'Do you or your end user(s) use the Support Portal or the Knowledge Base (My Runner EDQ)?  ': 'support_portal_Q10',
        'Are you aware of the file processing application included with your CLEAN_Address subscription called CLEAN_File? Note: This utility allows you to process a flat file before loading data into your system(s).': 'clean_file_Q12',
        'Are you using Batch Processing included with your subscription to keep your database up to date?': 'batch_proc_Q14',
        'Have you upgraded to CLEAN_Address version 5x?': 'upgrade_5x_Q17',
        'Have you upgraded to CLEAN_Address version 5x?  ': 'upgrade_5x_Q17',
        'Do you have any plans for migration to the cloud?': 'cloud_plan_Q16',
        'Do you have any plans for migration to the cloud?  ': 'cloud_plan_Q16',
        'Are there any suggestions to improve our processes and help with customer success (e.g. Would you like us to provide more product knowledge or training on our products and/or services?) If yes, please provide details in the "Comment" box.': 'suggestions_Q18',
        'Are there any suggestions to improve our processes and help with customer success (e.g. Would you like us to provide more product knowledge or training on our products and/or services?) If yes, please provide details in the "Comment" box.  ': 'suggestions_Q18',
        'Are there other data "types" or "sets" you are interested in acquiring or appending to your existing records? If yes, please add the details in the "Comment" box. (Examples of data "types" or "sets" are cell phone, email, household income, gender, occupation, etc.)': 'data_types_Q20',
        'Are there other data "types" or "sets" you are interested in acquiring or appending to your existing records? If yes, please add the details in the "Comment" box. (Examples of data "types" or "sets" are cell phone, email, household income, gender, occupation, etc.)  ': 'data_types_Q20',
        'Would Demographic Data associated with address records be beneficial for your organization?(Examples of Demographic Data would be Political Party, Date of Birth, Date of Death, Occupation, Homeowner or Renter, Income)': 'demographic_Q22',
        'Would Demographic Data associated with address records be beneficial for your organization?(Examples of Demographic Data would be Political Party, Date of Birth, Date of Death, Occupation, Homeowner or Renter, Income)  ': 'demographic_Q22',
        'Are there any other systems (e.g. PeopleSoft, Banner, Advance, EBS, JD Edwards, or CRM Recruit) in your organization that could use address validation? Are there any other Departments in your organization (e.g. A/P/A/R, Payroll, Alumni, or HR) that could use CLEAN_Address? If so, please list them in the "Comment" box.': 'other_systems_Q24',
        'Are there any other systems (e.g. PeopleSoft, Banner, Advance, EBS, JD Edwards, or CRM Recruit) in your organization that could use address validation? Are there any other Departments in your organization (e.g. A/P/A/R, Payroll, Alumni, or HR) that could use CLEAN_Address? If so, please list them in the "Comment" box.  ': 'other_systems_Q24',
        'Do you use Salesforce?': 'salesforce_Q26',
        'Do you use Microsoft Dynamics?': 'ms_dynamics_Q28',
        'Do you use Microsoft Dynamics?  ': 'ms_dynamics_Q28',
        'Are you willing to be a reference for RunnerEDQ and CLEAN_Address?': 'reference_Q30',
        'Can you refer any other organization you feel would benefit from our products and services? If yes, please list the organization(s) in the "Comment" box?': 'refer_org_Q32',
        'Can you refer any other organization you feel would benefit from our products and services? If yes, please list the organization(s) in the "Comment" box?  ': 'refer_org_Q32',
        'Are there any other details that you would like to provide?': 'other_details_Q34',
        'Explain or provide additional feedback below': 'feedback_Q3'
    };

    // Feedback fields mapping
    const FEEDBACK_POSITIONS = {
        4: 'feedback_Q3',
        6: 'feedback_Q5',
        10: 'feedback_Q11',
        12: 'feedback_Q13',
        14: 'feedback_Q15',
        16: 'feedback_Q17',
        18: 'feedback_Q19',
        20: 'feedback_Q21',
        22: 'feedback_Q23',
        24: 'feedback_Q25',
        26: 'feedback_Q27',
        28: 'feedback_Q29',
        30: 'feedback_Q31',
        32: 'feedback_Q33'
    };


    const HEALTH_SCORE_MAP = {
        'Very Satisfied': 5, 'Satisfied': 4, 'Ok': 3, 'Dissatisfied': 2, 'Very Dissatisfied': 1
    };

    const ROI_SCORE_MAP = { 'Yes': 5, 'No': 1 };
    const YES_NO_SCORE_MAP = { 'Yes': 5, 'No': 1 };

    const FREQUENCY_MAP = {
        'Monthly': 5, 'Bi-Monthly': 4, 'Quarterly': 3, 'Semi-Annually': 2, 'Other': 1
    };

    function getUniqueId(record) {
        return (record.org_user_name_Q1 + record.email).toLowerCase().replace(/[^a-z0-9]/g, '_');
    }

    function mapHealthToScore(raw) { return HEALTH_SCORE_MAP[raw] || 3; }
    function mapRoiToScore(raw) {
        if (!raw) return 1;
        const cleaned = raw.trim();
        return ROI_SCORE_MAP[cleaned] || 1;
    }
    function mapYesNoToScore(raw) {
        if (!raw) return 1;
        const cleaned = raw.trim();
        return YES_NO_SCORE_MAP[cleaned] || 1;
    }
    function mapFrequencyToScore(label) {
        if (!label) return 1;
        const cleaned = label.trim();
        return FREQUENCY_MAP[cleaned] || 1;
    }

    function parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 1) return [];

        function parseCSVLine(line) {
            const result = [];
            let current = '';
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const nextChar = line[i + 1];

                if (char === '"') {
                    if (inQuotes && nextChar === '"') {
                        current += '"';
                        i++;
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        }

        const headers = parseCSVLine(lines[0]);
        const results = [];

        console.log("CSV Headers:", headers.length);
        console.log("Data rows:", lines.length - 1);

        // Log unmapped headers
        const unmappedHeaders = headers.filter(h => !COLUMN_MAP[h] && h !== 'Explain or provide additional feedback below');
        if (unmappedHeaders.length > 0) {
            console.log("Unmapped headers found:", unmappedHeaders);
        }

        let rejectedRows = [];

        for (let i = 1; i < lines.length; i++) {
            const data = parseCSVLine(lines[i]);

            // Skip only if row has almost no data (empty rows)
            if (data.length < 2 || (data.length === 1 && data[0].trim() === '')) {
                continue;
            }

            const row = {};
            let isValidRow = false;
            let feedbackCounter = 0;

            for (let j = 0; j < Math.min(headers.length, data.length); j++) {
                const header = headers[j];
                const value = (data[j] || '').trim();

                if (COLUMN_MAP[header]) {
                    row[COLUMN_MAP[header]] = value;
                    if (COLUMN_MAP[header] === 'org_user_name_Q1' && value.length > 0) {
                        isValidRow = true;
                    }
                }
            }

            if (!isValidRow) {
                rejectedRows.push({
                    rowNum: i,
                    orgValue: row.org_user_name_Q1,
                    email: row.email,
                    date: row.date
                });
            }

            if (isValidRow) {
                results.push(row);
            }
        }

        if (rejectedRows.length > 0) {
            console.log("Rejected rows (first 5):", rejectedRows.slice(0, 5));
            console.log("Total rejected:", rejectedRows.length);
        }

        console.log("Valid rows parsed:", results.length);
        let rejectedCount = 0;

        const processed = results.map((d, index) => {
            const rawDate = d.date.replace(/["']/g, '');

            let parsedDate;
            try {
                parsedDate = new Date(rawDate);
                if (isNaN(parsedDate.getTime())) {
                    parsedDate = new Date();
                }
            } catch (e) {
                parsedDate = new Date();
            }

            const healthScore = mapHealthToScore(d.health_raw_Q2);
            const roiScore = mapRoiToScore(d.roi_raw_Q4);
            const supportScore = mapYesNoToScore(d.support_portal_Q10);

            const batch_usage_score = mapYesNoToScore(d.batch_proc_Q14);
            const clean_awareness_score = mapYesNoToScore(d.clean_file_Q12);
            const roi_for_adoption = roiScore;
            const adoption = Math.round((roi_for_adoption + batch_usage_score + clean_awareness_score) / 3);

            let companyName = d.org_user_name_Q1 || '';

            // Clean company name by removing contact names after separators
            // Only split on / and , since many legitimate org names contain dashes
            // (e.g., "South Texas College of Law - Houston")
            if (companyName.includes('/')) {
                companyName = companyName.split('/')[0].trim();
            } else if (companyName.includes(',')) {
                companyName = companyName.split(',')[0].trim();
            }

            const uniqueId = getUniqueId(d);

            if (!triageDetails[uniqueId]) {
                const initialStatus = healthScore <= 3 ? 'New Response' : 'N/A';
                const initialCsm = 'Unassigned';
                const initialTimestamp = parsedDate.toISOString();

                triageDetails[uniqueId] = {
                    status: initialStatus,
                    assignedCsm: initialCsm,
                    history: [{
                        status: initialStatus,
                        csm: initialCsm,
                        timestamp: initialTimestamp,
                        user: 'System Init'
                    }]
                };
            }

            // Look up by email domain first, then company name
            let masterData = null;
            let correctedName = companyName;
            let matchMethod = 'none';

            console.log(`\n🔎 [DEBUG] Processing record ${index + 1}:`);
            console.log(`   Original company name: "${companyName}"`);
            console.log(`   Email: "${d.email || 'NO EMAIL'}"`);

            if (d.email && d.email.includes('@')) {
                const domain = d.email.split('@')[1].toLowerCase();
                const domainKey = `domain:${domain}`;
                console.log(`   🌐 Attempting domain lookup with key: "${domainKey}"`);

                masterData = customerMasterData[domainKey];
                if (masterData) {
                    correctedName = masterData.name;
                    matchMethod = 'domain';
                    console.log(`   ✅ DOMAIN MATCH FOUND!`);
                    console.log(`      → Corrected name: "${correctedName}"`);
                    console.log(`      → Industry: "${masterData.industry}"`);
                    console.log(`      → ERP: "${masterData.erp}"`);
                } else {
                    console.log(`   ❌ No domain match found for "${domain}"`);
                    console.log(`      Available domain keys sample:`, Object.keys(customerMasterData).filter(k => k.startsWith('domain:')).slice(0, 5));
                }
            } else {
                console.log(`   ⚠️ No valid email found, skipping domain lookup`);
            }

            if (!masterData) {
                const nameKey = companyName.toLowerCase();
                console.log(`   🏢 Attempting company name lookup with key: "${nameKey}"`);

                masterData = customerMasterData[nameKey];
                if (masterData) {
                    correctedName = masterData.name;
                    matchMethod = 'name';
                    console.log(`   ✅ COMPANY NAME MATCH FOUND!`);
                    console.log(`      → Corrected name: "${correctedName}"`);
                    console.log(`      → Industry: "${masterData.industry}"`);
                    console.log(`      → ERP: "${masterData.erp}"`);
                } else {
                    console.log(`   ❌ No company name match found for "${nameKey}"`);
                    console.log(`      Available company keys sample:`, Object.keys(customerMasterData).filter(k => !k.startsWith('domain:')).slice(0, 5));
                }
            }

            if (!masterData) {
                console.log(`   ⚠️ NO MATCH FOUND - Will use defaults (Unknown Industry/ERP)`);
            }

            const finalRecord = {
                id: index + 1,
                uniqueId: uniqueId,
                company: correctedName,
                industry: masterData?.industry || 'Unknown',
                erp: masterData?.erp || 'Unknown',
                date: parsedDate.toISOString(),

                ...d,

                happiness: healthScore,
                roi: roiScore,
                support: supportScore,
                adoption: adoption,

                status: triageDetails[uniqueId].status,
                assignedCsm: triageDetails[uniqueId].assignedCsm,
                triageHistory: triageDetails[uniqueId].history,
            };

            console.log(`   📝 Final record created:`);
            console.log(`      Company: "${finalRecord.company}"`);
            console.log(`      Industry: "${finalRecord.industry}"`);
            console.log(`      ERP: "${finalRecord.erp}"`);
            console.log(`      Match method: ${matchMethod}`);

            return finalRecord;
        }).filter(r => {
            const isValid = r.company && r.company.trim().length > 0;
            if (!isValid) {
                rejectedCount++;
                if (rejectedCount <= 5) {
                    console.log(`Filtered out row ${r.id}: company="${r.company}"`);
                }
            }
            return isValid;
        });

        console.log("processData output:", processed.length, "rows | Rejected:", rejectedCount);
        return processed;
    }

    // Helper function to parse a single CSV line (handles quoted fields)
    function parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }

    async function fetchCustomerData() {
        try {
            console.log('🔍 [DEMO] Loading mock_customer_data.csv...');
            // Load from local mock file instead of customer_data.csv
            const timestamp = new Date().getTime();
            const response = await fetch(`mock_customer_data.csv?t=${timestamp}`);
            if (!response.ok) {
                console.warn('⚠️ [DEBUG] Could not load customer_data.csv, using defaults');
                return;
            }

            const csvText = await response.text();
            const lines = csvText.trim().split('\n');
            console.log(`📄 [DEBUG] CSV loaded: ${lines.length} total lines (including header)`);

            // Parse header
            const header = parseCSVLine(lines[0]);
            console.log('📋 [DEBUG] CSV Header columns:', header.length);
            console.log('📋 [DEBUG] Header:', header);

            let domainCount = 0;
            let companyCount = 0;

            // Parse data rows
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                // Use proper CSV parsing to handle quoted fields
                const parts = parseCSVLine(line);
                if (parts.length >= 7) {
                    const companyOriginal = parts[0].trim();
                    const domain = parts[1].trim().toLowerCase();
                    const industry = parts[5].trim();
                    const erp = parts[6].trim();

                    // Log first few entries for verification
                    if (i <= 3) {
                        console.log(`📊 [DEBUG] Row ${i}: Company="${companyOriginal}", Domain="${domain}", Industry="${industry}", ERP="${erp}"`);
                    }

                    // Index by domain for email matching
                    if (domain) {
                        customerMasterData[`domain:${domain}`] = {
                            name: companyOriginal,
                            industry: industry,
                            erp: erp
                        };
                        domainCount++;
                    }

                    // Also index by company name as fallback
                    customerMasterData[companyOriginal.toLowerCase()] = {
                        name: companyOriginal,
                        industry: industry,
                        erp: erp
                    };
                    companyCount++;
                }
            }

            console.log(`✅ [DEBUG] Customer master data loaded: ${Object.keys(customerMasterData).length} total keys`);
            console.log(`   - ${domainCount} domain entries`);
            console.log(`   - ${companyCount} company name entries`);
            console.log('🔑 [DEBUG] Sample keys:', Object.keys(customerMasterData).slice(0, 10));

            // Log all domain keys for debugging
            const allDomainKeys = Object.keys(customerMasterData).filter(k => k.startsWith('domain:'));
            console.log(`🌐 [DEBUG] All ${allDomainKeys.length} domain keys loaded:`, allDomainKeys.slice(0, 20));
            console.log(`🔍 [DEBUG] Looking for bokf.com:`, customerMasterData['domain:bokf.com'] ? 'FOUND' : 'NOT FOUND');
            console.log(`🔍 [DEBUG] Looking for suno.edu:`, customerMasterData['domain:suno.edu'] ? 'FOUND' : 'NOT FOUND');
        } catch (error) {
            console.error('❌ [DEBUG] Error loading customer master data:', error);
        }
    }

    async function fetchData() {
        const loadingSpinner = document.getElementById('loading-spinner');
        const dashboardContent = document.getElementById('dashboard-content');

        loadingSpinner.classList.remove('hidden');

        console.log("Fetching from:", SHEET_URL);

        try {
            const response = await fetch(SHEET_URL);

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }

            const csvText = await response.text();

            if (csvText.length < 50) {
                throw new Error("Response too short. The sheet may be empty.");
            }

            if (csvText.toLowerCase().includes('<!doctype html') || csvText.toLowerCase().includes('<html')) {
                throw new Error("Received HTML instead of CSV. Check Apps Script deployment settings.");
            }

            console.log('\n═══════════════════════════════════════════════════');
            console.log('🚀 [DEBUG] Starting data processing pipeline');
            console.log('═══════════════════════════════════════════════════\n');

            // Load master data FIRST before parsing survey data
            console.log('📥 [DEBUG] Step 1: Loading customer master data...');
            await fetchCustomerData();

            console.log('\n📊 [DEBUG] Step 2: Parsing survey CSV data...');
            const parsedData = parseCSV(csvText);

            if (parsedData.length === 0) {
                throw new Error("No data rows found.");
            }

            rawResponses = parsedData;

            console.log('\n═══════════════════════════════════════════════════');
            console.log(`✅ [DEBUG] Data loaded successfully: ${rawResponses.length} responses`);
            console.log('═══════════════════════════════════════════════════\n');

            // Summary statistics
            const unknownIndustry = rawResponses.filter(r => r.industry === 'Unknown').length;
            const unknownErp = rawResponses.filter(r => r.erp === 'Unknown').length;
            console.log(`📈 [DEBUG] Summary:`);
            console.log(`   - Total responses: ${rawResponses.length}`);
            console.log(`   - Unknown Industry: ${unknownIndustry} (${((unknownIndustry / rawResponses.length) * 100).toFixed(1)}%)`);
            console.log(`   - Unknown ERP: ${unknownErp} (${((unknownErp / rawResponses.length) * 100).toFixed(1)}%)`);

            dashboardContent.classList.remove('hidden');

        } catch (error) {
            console.error('ERROR:', error);

            document.getElementById('kpi-total-responses').textContent = 'ERROR';
            document.getElementById('kpi-total-responses').classList.add('text-red-500');
            dashboardContent.innerHTML = `<div class="text-center py-12 space-y-6">
        <div class="text-red-600 font-semibold space-y-2">
            <p class="text-xl">❌ Failed to load data</p>
            <p class="text-sm text-gray-700">Error: ${error.message}</p>
        </div>
    </div>`;
        } finally {
            loadingSpinner.classList.add('hidden');
            updateDashboard();
        }
    }
    let isLoggedIn = false;
    let currentUser = { id: 'guest', name: 'Guest User' };

    window.promptLogin = function () {
        console.log('Inside promptLogin function');
        const userName = prompt("Enter your name to log in and enable editing:");
        if (userName && userName.trim() !== '') {
            currentUser.id = userName.toLowerCase().replace(/\s/g, '_');
            currentUser.name = userName.trim();
            isLoggedIn = true;
            updateUIForAuth();
        }
    }

    function updateUIForAuth() {
        const loginBtn = document.getElementById('login-btn');
        loginBtn.textContent = isLoggedIn ? `Logged in: ${currentUser.name}` : 'Login for Editing';
        // loginBtn.onclick handler removed to avoid conflict with addEventListener
        loginBtn.classList.toggle('bg-indigo-600', !isLoggedIn);
        loginBtn.classList.toggle('bg-gray-400', isLoggedIn);
        loginBtn.disabled = isLoggedIn;

        renderTriageList();
    }

    const triageState = {
        csm: 'all',
        status: 'all'
    };

    const tableState = {
        status: 'all'
    };

    const drillDownState = {
        active: false,
        key: null,
        value: null
    };

    window.clearDrillDown = function () {
        drillDownState.active = false;
        drillDownState.key = null;
        drillDownState.value = null;
        updateDashboard();
    }

    function openModal(data) {
        const modal = document.getElementById('details-modal');
        const contentEl = document.getElementById('modal-content');

        let history = data.triageHistory.map(h => `
    <p class="text-xs text-gray-700">
        <span class="font-bold">${h.status}</span> set by ${h.user} 
        <span class="text-gray-500">on ${new Date(h.timestamp).toLocaleDateString()}</span>
    </p>
`).join('');

        let html = `
    <h4 class="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Score Summary</h4>
    <div class="grid grid-cols-2 gap-4 mb-6">
        <div><p class="text-xs text-gray-500">Company</p><p class="font-bold">${data.company}</p></div>
        <div><p class="text-xs text-gray-500">Email</p><p class="font-bold">${data.email}</p></div>
        <div><p class="text-xs text-gray-500">Health Score</p><p class="font-bold text-${data.happiness <= 2 ? 'red' : 'green'}-600">${data.happiness}</p></div>
        <div><p class="text-xs text-gray-500">ROI</p><p class="font-bold">${data.roi === 5 ? 'Yes' : 'No'}</p></div>
        <div><p class="text-xs text-gray-500">Adoption</p><p class="font-bold">${data.adoption}</p></div>
        <div><p class="text-xs text-gray-500">Support</p><p class="font-bold">${data.support === 5 ? 'Yes' : 'No'}</p></div>
    </div>

    <h4 class="text-lg font-bold text-gray-800 mt-6 mb-3 border-b pb-2">All 34 Survey Questions & Responses</h4>
    <div class="space-y-4">
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q1: What is the name of your organization and the name of the person completing this survey?</p><p class="text-sm text-gray-700 p-2">${data.org_user_name_Q1 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q2: How has the product been working for your organization?</p><p class="text-sm text-gray-700 p-2">${data.health_raw_Q2 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q3: Explain or provide additional feedback below</p><p class="text-sm text-gray-700 p-2">${data.feedback_Q3 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q4: Do you feel you are getting a return on your investment?</p><p class="text-sm text-gray-700 p-2">${data.roi_raw_Q4 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q5: Explain or provide additional feedback below</p><p class="text-sm text-gray-700 p-2">${data.feedback_Q5 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q6: Can you confirm who should receive renewal quotes/invoices for your organization?</p><p class="text-sm text-gray-700 p-2">${data.renewal_contact_Q6 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q7: Can you confirm the Bill To and Ship To addresses?</p><p class="text-sm text-gray-700 p-2">${data.bill_ship_Q7 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q8: Who are the end user(s) or functional user(s) at your organization?</p><p class="text-sm text-gray-700 p-2">${data.end_users_Q8 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q9: How often do you download and update the new data files?</p><p class="text-sm text-gray-700 p-2">${data.update_frequency_Q9 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q10: Do you or your end user(s) use the Support Portal or the Knowledge Base (My Runner EDQ)?</p><p class="text-sm text-gray-700 p-2">${data.support_portal_Q10 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q11: Explain or provide additional feedback below</p><p class="text-sm text-gray-700 p-2">${data.feedback_Q11 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q12: Are you aware of the file processing application CLEAN_File?</p><p class="text-sm text-gray-700 p-2">${data.clean_file_Q12 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q13: Explain or provide additional feedback below</p><p class="text-sm text-gray-700 p-2">${data.feedback_Q13 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q14: Are you using Batch Processing included with your subscription?</p><p class="text-sm text-gray-700 p-2">${data.batch_proc_Q14 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q15: Explain or provide additional feedback below</p><p class="text-sm text-gray-700 p-2">${data.feedback_Q15 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q16: Do you have any plans for migration to the cloud?</p><p class="text-sm text-gray-700 p-2">${data.cloud_plan_Q16 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q17: Have you upgraded to the latest version?</p><p class="text-sm text-gray-700 p-2">${data.upgrade_5x_Q17 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q17 Feedback: Explain or provide additional feedback below</p><p class="text-sm text-gray-700 p-2">${data.feedback_Q17 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q18: Are there any suggestions to improve our processes and help with customer success?</p><p class="text-sm text-gray-700 p-2">${data.suggestions_Q18 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q19: Explain or provide additional feedback below</p><p class="text-sm text-gray-700 p-2">${data.feedback_Q19 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q20: Are there other data types or sets you are interested in acquiring?</p><p class="text-sm text-gray-700 p-2">${data.data_types_Q20 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q21: Explain or provide additional feedback below</p><p class="text-sm text-gray-700 p-2">${data.feedback_Q21 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q22: Would Demographic Data associated with address records be beneficial?</p><p class="text-sm text-gray-700 p-2">${data.demographic_Q22 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q23: Explain or provide additional feedback below</p><p class="text-sm text-gray-700 p-2">${data.feedback_Q23 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q24: Are there any other systems or departments that could use our product?</p><p class="text-sm text-gray-700 p-2">${data.other_systems_Q24 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q25: Explain or provide additional feedback below</p><p class="text-sm text-gray-700 p-2">${data.feedback_Q25 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q26: Do you use Salesforce?</p><p class="text-sm text-gray-700 p-2">${data.salesforce_Q26 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q27: Explain or provide additional feedback below</p><p class="text-sm text-gray-700 p-2">${data.feedback_Q27 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q28: Do you use Microsoft Dynamics?</p><p class="text-sm text-gray-700 p-2">${data.ms_dynamics_Q28 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q29: Explain or provide additional feedback below</p><p class="text-sm text-gray-700 p-2">${data.feedback_Q29 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q30: Are you willing to be a reference for us?</p><p class="text-sm text-gray-700 p-2">${data.reference_Q30 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q31: Explain or provide additional feedback below</p><p class="text-sm text-gray-700 p-2">${data.feedback_Q31 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q32: Can you refer any other organization you feel would benefit from our products and services?</p><p class="text-sm text-gray-700 p-2">${data.refer_org_Q32 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q33: Explain or provide additional feedback below</p><p class="text-sm text-gray-700 p-2">${data.feedback_Q33 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q34: Are there any other details that you would like to provide?</p><p class="text-sm text-gray-700 p-2">${data.other_details_Q34 || 'N/A'}</p></div>
    </div>
`;

        contentEl.innerHTML = html;
        modal.classList.remove('invisible', 'opacity-0');
        modal.classList.add('visible', 'opacity-100');
    }

    function closeModal() {
        const modal = document.getElementById('details-modal');
        modal.classList.remove('visible', 'opacity-100');
        modal.classList.add('invisible', 'opacity-0');
    }

    window.closeModal = closeModal;
    window.showDetailsModal = (id) => {
        const record = rawResponses.find(d => d.id === id);
        if (record) {
            renderCsmList();
            updateCsmDropdowns();
            renderTriageList();
        }
    }

    function renderCsmList() {
        const listEl = document.getElementById('csm-list');
        listEl.innerHTML = '';

        if (CSMs.length === 0) {
            listEl.innerHTML = '<p class="text-gray-500 text-sm">No CSMs configured yet.</p>';
            return;
        }

        CSMs.forEach((csm, index) => {
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
            item.innerHTML = `
        <span class="text-sm font-medium text-gray-800">${csm}</span>
        <button type="button" onclick="removeCsm(${index})" class="px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded hover:bg-red-600 transition">
            Remove
        </button>
    `;
            listEl.appendChild(item);
        });
    }

    window.openCsmManager = function () {
        const modal = document.getElementById('csm-modal');
        renderCsmList();
        const statusMsg = document.getElementById('csm-status-msg');
        if (statusMsg) statusMsg.textContent = '';

        modal.classList.remove('invisible', 'opacity-0');
        modal.classList.add('visible', 'opacity-100');

        // Auto-focus the input field
        setTimeout(() => {
            const input = document.getElementById('new-csm-name');
            if (input) input.focus();
        }, 100);
    }

    window.addNewCsm = function () {
        const input = document.getElementById('new-csm-name');
        const statusMsg = document.getElementById('csm-status-msg');
        const name = input.value.trim();

        // Helper to set status
        const setStatus = (msg, isError = false) => {
            if (statusMsg) {
                statusMsg.textContent = msg;
                statusMsg.className = isError ? 'text-sm mt-2 h-5 text-red-600 font-medium' : 'text-sm mt-2 h-5 text-green-600 font-medium';
                // Auto clear after 3 seconds
                setTimeout(() => {
                    if (statusMsg.textContent === msg) {
                        statusMsg.textContent = '';
                    }
                }, 3000);
            }
        };

        if (name === '') {
            setStatus('Please enter a CSM name', true);
            input.focus();
            return;
        }

        if (CSMs.includes(name)) {
            setStatus('This CSM already exists', true);
            input.focus();
            return;
        }

        CSMs.push(name);
        input.value = '';
        renderCsmList();
        updateCsmDropdowns();
        setStatus(`CSM "${name}" added successfully!`);
        input.focus();
    }



    window.removeCsm = function (index) {
        const csmName = CSMs[index];
        if (confirm(`Remove "${csmName}"?`)) {
            CSMs.splice(index, 1);
            renderCsmList();
            updateCsmDropdowns();
            renderTriageList();
        }
    }

    function updateCsmDropdowns() {
        const triageCsmFilter = document.getElementById('triageCsmFilter');
        const currentValue = triageCsmFilter.value;
        triageCsmFilter.innerHTML = '<option value="all">All CSMs</option>';
        CSMs.forEach(csm => {
            const option = document.createElement('option');
            option.value = csm;
            option.textContent = csm;
            triageCsmFilter.appendChild(option);
        });
        triageCsmFilter.value = currentValue;
    }

    window.handleTriageUpdate = (id, field, value) => {
        if (!isLoggedIn) {
            alert("Please log in to make changes.");
            return;
        }

        const record = rawResponses.find(d => d.id === id);
        if (record) {
            const uniqueId = record.uniqueId;
            if (field === 'csm') {
                triageDetails[uniqueId].assignedCsm = value;
            } else if (field === 'status') {
                triageDetails[uniqueId].status = value;
            }

            triageDetails[uniqueId].history.push({
                status: triageDetails[uniqueId].status,
                csm: triageDetails[uniqueId].assignedCsm,
                timestamp: new Date().toISOString(),
                user: currentUser.name,
                change: `${field} updated to ${value}`
            });

            rawResponses = rawResponses.map(r => r.uniqueId === uniqueId ? { ...r, ...triageDetails[uniqueId] } : r);
            renderTriageList();
        }
    }

    window.handleDrillDownClick = function (event, elements, chart) {
        if (!elements || elements.length === 0 || !chart) return;

        const clickedElement = elements[0];
        const chartId = chart.canvas.id;
        let filterKey = null;
        let filterValue = null;
        let index = clickedElement.index;

        if (['happinessChart', 'roiChart', 'adoptionChart', 'erpHealthChart'].includes(chartId)) {
            if (typeof index === 'number' && index >= 0) {
                filterKey = chartId === 'happinessChart' ? 'happiness' : (chartId === 'roiChart' ? 'roi' : 'adoption');
                filterKey = chartId === 'happinessChart' ? 'happiness' : (chartId === 'roiChart' ? 'roi' : (chartId === 'adoptionChart' ? 'adoption' : 'erp'));
                filterValue = chartId === 'erpHealthChart' ? chart.data.labels[index] : index + 1;
            }
        }

        if (filterKey && filterValue !== null && filterValue !== undefined) {
            drillDownState.active = true;
            drillDownState.key = filterKey;
            drillDownState.value = filterValue;

            navigateTo('data');
        }
    }

    const navButtons = {
        dashboard: document.getElementById('nav-dashboard'),
        triage: document.getElementById('nav-triage'),
        data: document.getElementById('nav-data'),
    };

    function navigateTo(viewName) {
        currentView = viewName;

        Object.keys(views).forEach(key => {
            views[key].classList.toggle('hidden', key !== viewName);
            navButtons[key].classList.toggle('active', key === viewName);
        });

        if (viewName === 'triage' && rawResponses.length > 0) {
            renderTriageList();
        } else if (viewName === 'data' && rawResponses.length > 0) {
            updateDashboard();
        }
    }

    navButtons.dashboard.addEventListener('click', () => navigateTo('dashboard'));
    navButtons.triage.addEventListener('click', () => navigateTo('triage'));
    navButtons.data.addEventListener('click', () => navigateTo('data'));

    document.getElementById('tierFilter').addEventListener('change', (e) => {
        state.industry = e.target.value;
        updateDashboard();
    });

    const dateFilterEl = document.getElementById('dateFilter');
    const customRangeWrapper = document.getElementById('customRangeWrapper');

    dateFilterEl.addEventListener('change', (e) => {
        state.date = e.target.value;
        if (state.date === 'custom') {
            customRangeWrapper.classList.remove('hidden');
        } else {
            customRangeWrapper.classList.add('hidden');
            updateDashboard();
        }
    });

    const dateFormatEl = document.getElementById('dateFormatFilter');
    if (dateFormatEl) {
        dateFormatEl.addEventListener('change', (e) => {
            state.dateFormat = e.target.value;
            renderDataTable(getFilteredData());
        });
    }

    const timezoneEl = document.getElementById('timezoneFilter');
    if (timezoneEl) {
        timezoneEl.addEventListener('change', (e) => {
            state.timezone = e.target.value;
            renderDataTable(getFilteredData());
        });
    }

    function getFilteredData() {
        let filtered = [...rawResponses];

        if (state.industry !== 'all') {
            filtered = filtered.filter(d => d.industry === state.industry);
        }

        if (state.date !== 'all') {
            const days = parseInt(state.date, 10);
            const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            filtered = filtered.filter(d => new Date(d.date) >= cutoff);
        }

        if (drillDownState.active && currentView === 'data') {
            filtered = filtered.filter(d => d[drillDownState.key] === drillDownState.value);
        }

        // Sort by date descending (newest first) for the table and general view
        return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    function calculateKPIs(data) {
        document.getElementById('kpi-total-responses').textContent = data.length;

        const atRisk = data.filter(d => d.happiness <= 2).length;
        document.getElementById('kpi-at-risk').textContent = atRisk;

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const newToday = data.filter(d => new Date(d.date) >= oneDayAgo).length;
        document.getElementById('kpi-new-today').textContent = newToday;

        if (data.length > 0) {
            const avgHappiness = data.reduce((sum, d) => sum + d.happiness, 0) / data.length;
            document.getElementById('kpi-avg-happiness').textContent = avgHappiness.toFixed(1);
        } else {
            document.getElementById('kpi-avg-happiness').textContent = 'N/A';
        }

        const triageCount = rawResponses.filter(d => d.happiness <= 3).filter(d => d.status !== 'Archived').length;
        document.getElementById('triage-count').textContent = triageCount;
    }

    const clickableOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 20, font: { size: 12 } } } },
        onClick: (event, elements, chart) => handleDrillDownClick(event, elements, chart)
    };

    const trendChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 20, font: { size: 12 } } } },
    };

    const scatterChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, padding: 20, font: { size: 12 } } },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        const company = context.raw.label;
                        return `${company} | Health: ${context.parsed.x}, ROI: ${context.parsed.y}`;
                    }
                }
            }
        },
        scales: {
            x: {
                title: { display: true, text: 'Customer Health Score' },
                min: 0.5, max: 5.5, ticks: { stepSize: 1 }
            },
            y: {
                title: { display: true, text: 'ROI Score' },
                min: 0.5, max: 5.5, ticks: { stepSize: 1 }
            },
        },
        onClick: (event, elements, chart) => handleDrillDownClick(event, elements, chart)
    };

    function createCharts() {
        charts.healthTrend = new Chart(document.getElementById('healthTrendChart'), {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Avg Customer Health Score', data: [], borderColor: '#4A5C6A', backgroundColor: '#4A5C6A20', fill: true, tension: 0.3 }] },
            options: trendChartOptions
        });

        charts.happiness = new Chart(document.getElementById('happinessChart'), {
            type: 'doughnut',
            data: { labels: ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'], datasets: [{ data: [], backgroundColor: ['#e53e3e', '#dd6b20', '#d69e2e', '#38a169', '#2f855a'] }] },
            options: clickableOptions
        });

        charts.adoption = new Chart(document.getElementById('adoptionChart'), {
            type: 'doughnut',
            data: { labels: ['1', '2', '3', '4', '5'], datasets: [{ data: [], backgroundColor: ['#E9D8A6', '#EE9B00', '#CA6702', '#BB3E03', '#9B2226'] }] },
            options: clickableOptions
        });

        charts.support = new Chart(document.getElementById('supportChart'), {
            type: 'doughnut',
            data: { labels: ['1', '2', '3', '4', '5'], datasets: [{ data: [], backgroundColor: ['#CAF0F8', '#90E0EF', '#00B4D8', '#0077B6', '#03045E'] }] },
            options: trendChartOptions
        });

        charts.roi = new Chart(document.getElementById('roiChart'), {
            type: 'doughnut',
            data: { labels: ['1', '2', '3', '4', '5'], datasets: [{ data: [], backgroundColor: ['#5E2B97', '#9D4EDD', '#C77DFF', '#E0AAFF', '#F3D0FF'] }] },
            options: clickableOptions
        });

        charts.roiVsHappiness = new Chart(document.getElementById('roiVsHappinessChart'), {
            type: 'scatter',
            data: { datasets: [] },
            options: scatterChartOptions,
        });

        charts.erpHealth = new Chart(document.getElementById('erpHealthChart'), {
            type: 'bar',
            data: { labels: [], datasets: [{ label: 'Avg Health Score', data: [], backgroundColor: [], borderRadius: 4 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, max: 5 } },
                onClick: (event, elements, chart) => handleDrillDownClick(event, elements, chart)
            }
        });
    }

    function updateCharts(data) {
        const happinessCounts = [0, 0, 0, 0, 0];
        const adoptionCounts = [0, 0, 0, 0, 0];
        const supportCounts = [0, 0, 0, 0, 0];
        const roiCounts = [0, 0, 0, 0, 0];

        const scatterData = data.map(d => ({
            x: d.happiness,
            y: d.roi,
            label: d.company,
            risk: d.happiness <= 2 && d.roi <= 2 ? 'High Risk (Health ≤ 2 & ROI ≤ 2)' : (d.happiness >= 4 && d.roi >= 4 ? 'Champions (Health ≥ 4 & ROI ≥ 4)' : 'Mid-Range'),
        }));

        const riskGroups = {
            'High Risk (Health ≤ 2 & ROI ≤ 2)': { data: [], color: '#e53e3e', label: 'High Risk (Health ≤ 2 & ROI ≤ 2)' },
            'Champions (Health ≥ 4 & ROI ≥ 4)': { data: [], color: '#38a169', label: 'Champions (Health ≥ 4 & ROI ≥ 4)' },
            'Mid-Range': { data: [], color: '#4A5C6A60', label: 'Mid-Range' },
        };

        scatterData.forEach(item => {
            riskGroups[item.risk].data.push({ x: item.x, y: item.y, label: item.label });
        });

        const scatterDatasets = Object.keys(riskGroups).map(key => {
            const group = riskGroups[key];
            return {
                label: group.label,
                data: group.data,
                backgroundColor: group.color,
                pointRadius: 6,
                pointHoverRadius: 8,
            };
        });

        data.forEach(d => {
            happinessCounts[d.happiness - 1]++;
            adoptionCounts[d.adoption - 1]++;
            supportCounts[d.support - 1]++;
            roiCounts[d.roi - 1]++;
        });

        charts.happiness.data.datasets[0].data = happinessCounts;
        charts.happiness.update();

        charts.adoption.data.datasets[0].data = adoptionCounts;
        charts.adoption.update();

        charts.support.data.datasets[0].data = supportCounts;
        charts.support.update();

        charts.roi.data.datasets[0].data = roiCounts;
        charts.roi.update();

        charts.roiVsHappiness.data.datasets = scatterDatasets;
        charts.roiVsHappiness.update();



        // Create a copy for the trend chart so we don't mutate the main data (which is sorted descending)
        const trendData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
        const trendLabels = trendData.map(d => new Date(d.date).toLocaleDateString());
        const trendValues = trendData.map(d => d.happiness);
        charts.healthTrend.data.labels = trendLabels;
        charts.healthTrend.data.datasets[0].data = trendValues;
        charts.healthTrend.update();

        // Update ERP Chart - Split multi-ERP entries for analytics
        const erpStats = {};
        let multiErpCount = 0;

        // List of services to exclude from ERP analytics (not actual ERP/SIS/CRM systems)
        const excludedServices = ['EDI', 'API', 'Custom'];

        data.forEach(d => {
            // Split ERP field by comma to handle multi-ERP customers
            const erpList = d.erp.split(',').map(e => e.trim()).filter(e => e.length > 0);

            // Filter out non-ERP services
            const actualErps = erpList.filter(erp => !excludedServices.includes(erp));

            if (erpList.length > 1) {
                multiErpCount++;
                if (multiErpCount <= 3) {
                    console.log(`📊 [ERP Split] "${d.company}" uses multiple systems: ${erpList.join(', ')} → Counting: ${actualErps.join(', ')}`);
                }
            }

            // Add this customer's health score to each actual ERP/SIS/CRM they use
            actualErps.forEach(erp => {
                if (!erpStats[erp]) erpStats[erp] = { total: 0, count: 0 };
                erpStats[erp].total += d.happiness;
                erpStats[erp].count++;
            });
        });

        if (multiErpCount > 0) {
            console.log(`📊 [ERP Analytics] Found ${multiErpCount} customers using multiple ERP systems`);
        }

        const erpLabels = Object.keys(erpStats).sort();
        const erpValues = erpLabels.map(erp => (erpStats[erp].total / erpStats[erp].count).toFixed(1));

        // Color-code bars based on health score
        const erpColors = erpValues.map(score => {
            const numScore = parseFloat(score);
            if (numScore <= 2) return '#e53e3e';      // Red - Poor health
            if (numScore <= 3) return '#dd6b20';      // Orange - Below average
            if (numScore <= 4) return '#d69e2e';      // Yellow - Average
            if (numScore <= 4.5) return '#38a169';    // Light green - Good
            return '#2f855a';                          // Dark green - Excellent
        });

        console.log('🎨 [ERP Colors] Applying colors to chart:', erpColors);

        charts.erpHealth.data.labels = erpLabels;
        charts.erpHealth.data.datasets[0].data = erpValues;
        charts.erpHealth.data.datasets[0].backgroundColor = erpColors;
        charts.erpHealth.update();
    }

    // Simple sentiment analyzer
    function analyzeSentiment(text) {
        if (!text || text.trim().length === 0) return 'neutral';

        const text_lower = text.toLowerCase();

        // Positive indicators
        const positiveWords = ['great', 'excellent', 'good', 'happy', 'satisfied', 'love', 'perfect', 'amazing', 'wonderful', 'fantastic', 'impressed', 'helpful', 'smooth', 'easy', 'efficient', 'reliable', 'professional', 'effective', 'appreciate', 'thank', 'thrilled', 'delighted'];
        const negativeWords = ['bad', 'poor', 'hate', 'terrible', 'awful', 'horrible', 'disappointing', 'frustrated', 'issue', 'problem', 'broken', 'slow', 'difficult', 'confusing', 'unhappy', 'worse', 'complaint', 'concern', 'fail', 'error', 'bug'];

        let positiveScore = positiveWords.filter(word => text_lower.includes(word)).length;
        let negativeScore = negativeWords.filter(word => text_lower.includes(word)).length;

        if (positiveScore > negativeScore) return 'positive';
        if (negativeScore > positiveScore) return 'negative';
        return 'neutral';
    }

    function renderFeedbackList(data) {
        const listEl = document.getElementById('feedback-list');
        listEl.innerHTML = '';

        // Filter to only show responses with feedback
        const withFeedback = data.filter(item => item.feedback_Q3 && item.feedback_Q3.trim().length > 0);
        const recentFeedback = withFeedback.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

        if (recentFeedback.length === 0) {
            listEl.innerHTML = `<p class="text-gray-500 text-center">No feedback available for the selected filters.</p>`;
            return;
        }

        // Calculate sentiment breakdown
        const sentiments = withFeedback.map(item => analyzeSentiment(item.feedback_Q3));
        const positiveCount = sentiments.filter(s => s === 'positive').length;
        const negativeCount = sentiments.filter(s => s === 'negative').length;
        const neutralCount = sentiments.filter(s => s === 'neutral').length;
        const total = sentiments.length;

        const posPercent = Math.round((positiveCount / total) * 100);
        const negPercent = Math.round((negativeCount / total) * 100);
        const neuPercent = Math.round((neutralCount / total) * 100);

        // Add sentiment summary at top
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'mb-4 p-4 bg-white rounded-lg border border-gray-200 grid grid-cols-3 gap-4';
        summaryDiv.innerHTML = `
    <div class="text-center">
        <p class="text-xs text-gray-500 uppercase font-bold">Positive</p>
        <p class="text-2xl font-bold text-green-600">${posPercent}%</p>
        <p class="text-xs text-gray-500">(${positiveCount})</p>
    </div>
    <div class="text-center">
        <p class="text-xs text-gray-500 uppercase font-bold">Neutral</p>
        <p class="text-2xl font-bold text-gray-600">${neuPercent}%</p>
        <p class="text-xs text-gray-500">(${neutralCount})</p>
    </div>
    <div class="text-center">
        <p class="text-xs text-gray-500 uppercase font-bold">Negative</p>
        <p class="text-2xl font-bold text-red-600">${negPercent}%</p>
        <p class="text-xs text-gray-500">(${negativeCount})</p>
    </div>
`;
        listEl.appendChild(summaryDiv);

        recentFeedback.forEach(item => {
            const sentiment = analyzeSentiment(item.feedback_Q3);
            const sentimentColor = sentiment === 'positive' ? 'bg-green-100 text-green-800' : sentiment === 'negative' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800';
            const sentimentLabel = sentiment.charAt(0).toUpperCase() + sentiment.slice(1);

            const card = document.createElement('div');
            card.className = 'p-4 rounded-lg bg-gray-50 border border-gray-200/80';
            card.innerHTML = `
        <div class="flex items-start justify-between mb-2">
            <span class="text-xs font-bold px-2 py-1 rounded ${sentimentColor}">${sentimentLabel}</span>
            <span class="text-xs text-gray-400">${new Date(item.date).toLocaleDateString()}</span>
        </div>
        <p class="text-sm text-gray-800">"${item.feedback_Q3}"</p>
        <p class="text-xs text-gray-500 mt-2">- ${item.company}</p>
    `;
            listEl.appendChild(card);
        });
    }



    function renderTriageList() {
        const listEl = document.getElementById('triage-list');
        listEl.innerHTML = '';

        let triageItems = rawResponses.filter(d => d.happiness <= 3);

        if (triageState.status !== 'Archived') {
            triageItems = triageItems.filter(d => d.status !== 'Archived');
        }

        if (triageState.csm !== 'all') {
            triageItems = triageItems.filter(d => d.assignedCsm === triageState.csm);
        }
        if (triageState.status !== 'all') {
            triageItems = triageItems.filter(d => d.status === triageState.status);
        }

        triageItems.sort((a, b) => a.happiness - b.happiness);

        if (triageItems.length === 0) {
            const message = triageState.status === 'Archived'
                ? 'No archived customers found.'
                : 'No items require triage. Great job!';
            listEl.innerHTML = `<div class="text-center py-10"><p class="text-gray-600 font-medium">${message}</p></div>`;
            return;
        }

        const isEditingEnabled = isLoggedIn;

        triageItems.forEach(item => {
            const card = document.createElement('div');
            card.className = `triage-card score-${item.happiness} rounded-lg p-4 grid grid-cols-1 md:grid-cols-5 gap-4 items-center transition shadow-sm`;

            const csmOptions = CSMs.map(csm => `<option value="${csm}" ${item.assignedCsm === csm ? 'selected' : ''}>${csm}</option>`).join('');
            const allStatusOptionsWithArchive = ALL_STATUS_OPTIONS.map(s => `<option value="${s}" ${item.status === s ? 'selected' : ''}>${s}</option>`).join('');

            const lastUpdate = item.triageHistory && item.triageHistory.length > 0 ? item.triageHistory[item.triageHistory.length - 1] : null;
            const lastUpdateText = lastUpdate ? `Last update by ${lastUpdate.user} on ${new Date(lastUpdate.timestamp).toLocaleDateString()}` : `Survey taken on ${new Date(item.date).toLocaleDateString()}`;

            const feedbackPreview = (item.feedback_Q3 || 'No feedback provided').substring(0, 50);

            const disabledAttr = isEditingEnabled ? '' : 'disabled';
            const opacityClass = isEditingEnabled ? '' : 'opacity-60 cursor-not-allowed';

            card.innerHTML = `
        <div class="md:col-span-2">
            <p class="font-bold text-lg text-gray-800">${item.company}</p>
            <p class="text-sm text-gray-500">${item.email}</p>
            <p class="text-xs text-gray-500 mt-1">${lastUpdateText}</p>
            <p class="text-sm text-gray-600 mt-2 italic">"${feedbackPreview}..."</p>
        </div>
        <div class="flex items-center justify-start md:justify-center">
            <span class="text-3xl font-bold text-gray-700">${item.happiness}</span>
            <span class="text-yellow-400 ml-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            </span>
        </div>
        <div class="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label for="csm-${item.id}" class="text-xs font-medium text-gray-500">Assign CSM</label>
                <select ${disabledAttr} id="csm-${item.id}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-sm ${opacityClass}">
                    <option value="Unassigned">Unassigned</option>
                    ${csmOptions}
                </select>
            </div>
            <div>
                <label for="status-${item.id}" class="text-xs font-medium text-gray-500">Set Status</label>
                <select ${disabledAttr} id="status-${item.id}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-sm ${opacityClass}">
                    ${allStatusOptionsWithArchive}
                </select>
            </div>
        </div>
    `;
            listEl.appendChild(card);

            if (isEditingEnabled) {
                const csmSelect = document.getElementById(`csm-${item.id}`);
                const statusSelect = document.getElementById(`status-${item.id}`);

                if (csmSelect) {
                    csmSelect.addEventListener('change', function () {
                        handleTriageUpdate(item.id, 'csm', this.value);
                    });
                }

                if (statusSelect) {
                    statusSelect.addEventListener('change', function () {
                        handleTriageUpdate(item.id, 'status', this.value);
                    });
                }
            }
        });
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        const formatConfig = DATE_FORMATS[state.dateFormat] || DATE_FORMATS['us'];
        const options = { ...formatConfig.options }; // Copy options

        if (state.timezone && state.timezone !== 'local') {
            options.timeZone = state.timezone;
        }

        if (state.dateFormat === 'iso') {
            return date.toLocaleString('sv-SE', options);
        }

        return date.toLocaleString(formatConfig.locale, options);
    }

    function renderDataTable(data) {
        const tableBody = document.getElementById('data-table-body');
        const drilldownContainer = document.getElementById('drilldown-status-bar-container');

        if (drillDownState.active) {
            const keyLabel = drillDownState.key.replace(/./, c => c.toUpperCase());
            const displayValue = drillDownState.key === 'risk' ? drillDownState.value : `Score ${drillDownState.value}`;

            drilldownContainer.innerHTML = `
        <div id="drilldown-alert" class="bg-indigo-100 border-l-4 border-indigo-500 text-indigo-700 p-4 mb-4 rounded-r-lg flex justify-between items-center">
            <p class="font-medium">
                Drill-down active: <strong>${keyLabel}: ${displayValue}</strong>
            </p>
            <button onclick="clearDrillDown()" class="px-3 py-1 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 transition text-sm">Clear Filter</button>
        </div>
    `;
        } else {
            drilldownContainer.innerHTML = '';
        }

        tableBody.innerHTML = '';
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="12" class="text-center py-10 text-gray-500">No data available for the selected filters.</td></tr>`;
            return;
        }

        data.forEach(d => {
            const row = document.createElement('tr');
            const roiDisplay = d.roi === 5 ? 'Yes' : 'No';
            const roiColorClass = d.roi === 5 ? 'text-green-600' : 'text-red-600';

            row.innerHTML = `
        <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">${formatDate(d.date)}</td>
        <td class="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${d.company}</td>
        <td class="px-3 py-3 whitespace-nowrap text-sm font-semibold ${d.happiness <= 2 ? 'text-red-600' : d.happiness === 3 ? 'text-yellow-600' : 'text-green-600'}">${d.happiness}</td>
        <td class="px-3 py-3 whitespace-nowrap text-sm font-semibold text-gray-700">${d.adoption}</td>
        <td class="px-3 py-3 whitespace-nowrap text-sm font-semibold ${roiColorClass}">${roiDisplay}</td>
        <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">${d.support === 5 ? 'Yes' : 'No'}</td>
        <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">${d.batch_proc_Q14}</td>
        <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">${d.clean_file_Q12}</td>
        <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">${d.cloud_plan_Q16}</td>
        <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">${d.reference_Q30}</td>
        <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">${d.industry}</td>
        <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">${d.erp}</td>
        <td class="px-3 py-3 whitespace-nowrap text-sm">
            <button onclick="showDetailsModal(${d.id})" class="text-[#4A5C6A] hover:text-indigo-600 font-medium text-xs">View Details</button>
        </td>
    `;
            tableBody.appendChild(row);
        });
    }

    function updateDashboard() {
        if (rawResponses.length === 0) {
            return;
        }

        const data = getFilteredData();
        calculateKPIs(data);
        updateCharts(data);
        renderFeedbackList(data);
        renderDataTable(data);
    }



    function init() {
        console.log('Initializing Demo Dashboard...');
        if (typeof updateCsmDropdowns === 'function') {
            updateCsmDropdowns();
        }

        const triageCsmFilter = document.getElementById('triageCsmFilter');
        const triageStatusFilter = document.getElementById('triageStatusFilter');

        if (triageCsmFilter) {
            triageCsmFilter.addEventListener('change', function (e) {
                triageState.csm = e.target.value;
                renderTriageList();
            });
        }

        if (triageStatusFilter) {
            triageStatusFilter.addEventListener('change', function (e) {
                triageState.status = e.target.value;
                renderTriageList();
            });
        }

        fetchData();
        createCharts();
        updateUIForAuth();
        navigateTo('dashboard');

        // Attach event listeners to buttons
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', function () {
                console.log('Login button clicked. isLoggedIn:', isLoggedIn);
                if (!isLoggedIn) {
                    console.log('Calling promptLogin...');
                    window.promptLogin();
                }
            });
        }

        const manageCsmsBtn = document.getElementById('manage-csms-btn');
        if (manageCsmsBtn) {
            // Remove any existing listeners by cloning or just use addEventListener since we fixed openCsmManager
            manageCsmsBtn.addEventListener('click', window.openCsmManager);
        }

        const addCsmBtn = document.getElementById('add-csm-btn');
        if (addCsmBtn) {
            addCsmBtn.addEventListener('click', window.addNewCsm);
        }
    }

    // --- Global Helpers for HTML onclick attributes ---
    window.closeCsmModal = function () {
        const modal = document.getElementById('csm-modal');
        modal.classList.remove('visible', 'opacity-100');
        modal.classList.add('invisible', 'opacity-0');
    }

    // Explicitly expose logging/interaction for debugging
    window.triggerLogin = function () {
        if (!isLoggedIn) {
            window.promptLogin();
        }
    }

    // Add Enter key support for CSM Name input
    const newCsmInput = document.getElementById('new-csm-name');
    if (newCsmInput) {
        newCsmInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                console.log('Enter key pressed in CSM input');
                window.addNewCsm();
            }
        });
    }

    init();
});
