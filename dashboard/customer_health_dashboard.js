// --- CONFIGURATION: GOOGLE APPS SCRIPT WEB APP URL (global so all functions can access it) ---
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbyq_MQYSZduVAftUiE9EQ1y8hdlqfU4FCGquP0--BmDzHemCOHnN4w2qEUZtmdyXwxz/exec';
// -------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {

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
    let freshdeskData = [];
    let engagementBlackoutCustomers = [];

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
            // sv-SE is a good proxy for ISO-like YYYY-MM-DD HH:MM
            return date.toLocaleString('sv-SE', options);
        }

        return date.toLocaleString(formatConfig.locale, options);
    }

    const views = {
        dashboard: document.getElementById('view-dashboard'),
        triage: document.getElementById('view-triage'),
        data: document.getElementById('view-data'),
    };

    const INDUSTRIES = ['Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Technology', 'Education'];
    let CSMs = ['Misty Wilmore', 'Tonja Jones']; // Now mutable so we can add/remove
    // AUTHORIZED USERS: only these emails are allowed to edit. Role: 'admin' or 'csm'
    const AUTHORIZED_USERS = [
        { name: 'Misty Wilmore', email: 'misty.wilmore@runnertechnologies.com', role: 'admin' },
        { name: 'Tonja Jones',   email: 'tonja.jones@runnertechnologies.com',   role: 'csm'   }
    ];
    const ALL_STATUS_OPTIONS = ['New Response', 'Followed Up - Low Risk', 'Followed Up - High Risk', 'Archived', 'Inactive - Canceled'];

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
        'Are there any other details that you would like to provide?': 'other_details_Q34'
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

                if (header === 'Explain or provide additional feedback below') {
                    feedbackCounter++;
                    if (FEEDBACK_POSITIONS[feedbackCounter]) {
                        row[FEEDBACK_POSITIONS[feedbackCounter]] = value;
                    }
                } else if (COLUMN_MAP[header]) {
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
            const timestamp = new Date().getTime();
            const fetchUrl = `customer_data.csv?t=${timestamp}`;
            console.log(`🔍 [DEBUG] Attempting fetch: ${window.location.origin}/${fetchUrl}`);
            
            const response = await fetch(fetchUrl);
            if (!response.ok) {
                console.warn(`⚠️ [DEBUG] Could not load customer_data.csv (Status: ${response.status}), using defaults`);
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
                if (parts.length >= 5) {
                    const companyOriginal = parts[0].trim();
                    const urlOriginal = parts[1].trim();
                    const industry = parts[3].trim();
                    const erp = parts[4].trim();

                    // Helper to clean domain (remove http://, www., and paths)
                    const cleanDomain = (url) => {
                        if (!url) return '';
                        let domain = url.toLowerCase();
                        domain = domain.replace(/^https?:\/\//, ''); // Remove protocol
                        domain = domain.replace(/^www\./, '');       // Remove www.
                        domain = domain.split('/')[0];               // Remove path
                        return domain;
                    };

                    const domain = cleanDomain(urlOriginal);

                    // Log first few entries for verification
                    if (i <= 3) {
                        console.log(`📊 [DEBUG] Row ${i}: Company="${companyOriginal}", URL="${urlOriginal}" -> Domain="${domain}", Industry="${industry}", ERP="${erp}"`);
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

            console.log('\n📊 [DEBUG] Step 3: Fetching Freshdesk data...');
            try {
                const fdResponse = await fetch(SHEET_URL + '?type=freshdesk');
                if (fdResponse.ok) {
                    const fdCsv = await fdResponse.text();
                    const fdLines = fdCsv.trim().split('\n');
                    for (let i = 1; i < fdLines.length; i++) {
                        const parts = parseCSVLine(fdLines[i]);
                        if (parts.length >= 2) {
                            freshdeskData.push({ company: parts[0], lastTicketDate: parts[1], companyId: parts[2] || '' });
                        }
                    }
                    console.log(`✅ [DEBUG] Loaded ${freshdeskData.length} Freshdesk ticket records.`);
                }
            } catch(e) { console.warn("⚠️ Freshdesk fetch failed", e); }
            
            console.log('\n📊 [DEBUG] Step 4: Fetching Triage Data...');
            try {
                const trResponse = await fetch(SHEET_URL + '?type=triage');
                if (trResponse.ok) {
                    const trCsv = await trResponse.text();
                    const trLines = trCsv.trim().split('\n');
                    for (let i = 1; i < trLines.length; i++) {
                        const parts = parseCSVLine(trLines[i]);
                        if (parts.length >= 6) {
                            const uId = parts[0];
                            const comp = parts[1];
                            const field = parts[2];
                            const val = parts[3];
                            const ts = parts[4];
                            const u = parts[5];
                            const noteStr = parts[6] || "";
                            
                            if (!triageDetails[uId]) {
                                triageDetails[uId] = { assignedCsm: 'Unassigned', status: 'New Response', history: [] };
                            }
                            if (field === 'csm') triageDetails[uId].assignedCsm = val;
                            if (field === 'status') triageDetails[uId].status = val;
                            
                            // Track if CSM was explicitly set (even to Unassigned) to differentiate from default Unassigned
                            if (field === 'csm') triageDetails[uId].csmExplicitlySet = true;
                            
                            triageDetails[uId].history.push({
                                status: triageDetails[uId].status,
                                csm: triageDetails[uId].assignedCsm,
                                timestamp: ts,
                                user: u,
                                change: noteStr ? `${field} updated to ${val}\nNote: ${noteStr}` : `${field} updated to ${val}`
                            });
                        }
                    }
                    console.log(`✅ [DEBUG] Loaded Triage Database history.`);
                }
            } catch(e) { console.warn("⚠️ Triage fetch failed", e); }

            // Apply persistent triage history to raw responses
            rawResponses = rawResponses.map(r => {
                const uId = r.uniqueId;
                if (triageDetails[uId]) {
                    return { ...r, ...triageDetails[uId] };
                }
                return r;
            });

            calculateEngagementBlackout();

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

    function calculateEngagementBlackout() {
        engagementBlackoutCustomers = [];
        
        const surveyedCompanyNames = new Set(rawResponses.map(r => r.company.toLowerCase()));
        
        const uniqueMasterCompanies = {};
        for (const key in customerMasterData) {
            const master = customerMasterData[key];
            if (!uniqueMasterCompanies[master.name]) {
                uniqueMasterCompanies[master.name] = master;
            }
        }
        
        const now = new Date();
        
        // Seed the Round-Robin tracker before the loop
        let currentRoundRobinCsm = 'Tonja Jones';
        const currentAssignedGlobal = Object.values(triageDetails).map(t => t.assignedCsm).filter(c => c && c !== 'Unassigned');
        if (currentAssignedGlobal.length > 0) {
            currentRoundRobinCsm = currentAssignedGlobal[currentAssignedGlobal.length - 1]; // seed with history
        }
        
        for (const companyName in uniqueMasterCompanies) {
            const master = uniqueMasterCompanies[companyName];
            
            if (surveyedCompanyNames.has(master.name.toLowerCase())) {
                continue;
            }
            
            const fdEntry = freshdeskData.find(f => f.company.toLowerCase() === master.name.toLowerCase());
            let daysSinceLastTicket = Infinity;
            let lastTicketFormatted = 'Never';
            
            if (fdEntry && fdEntry.lastTicketDate) {
                const ticketDate = new Date(fdEntry.lastTicketDate);
                if (!isNaN(ticketDate.getTime())) {
                    daysSinceLastTicket = (now - ticketDate) / (24 * 60 * 60 * 1000);
                    lastTicketFormatted = ticketDate.toLocaleDateString();
                }
            }
            
            if (daysSinceLastTicket > 90) {
                let group = '';
                if (daysSinceLastTicket === Infinity || daysSinceLastTicket > 365) group = '365+ Days / Never (Critical)';
                else if (daysSinceLastTicket > 180) group = '180-365 Days (Risk)';
                else group = '90-180 Days (Warning)';
                
                let uniqueId = master.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
                
                let assignedCsm = 'Unassigned';
                let status = 'New Response';
                
                // If we have some triage history, but CSM is still the default 'Unassigned' and was never explicitly assigned
                const needsRoundRobin = !triageDetails[uniqueId] || (triageDetails[uniqueId].assignedCsm === 'Unassigned' && !triageDetails[uniqueId].csmExplicitlySet);

                if (!needsRoundRobin) {
                    assignedCsm = triageDetails[uniqueId].assignedCsm;
                    status = triageDetails[uniqueId].status;
                    
                    if (status === 'Inactive - Canceled') continue;
                    
                    // Snooze logic
                    if (triageDetails[uniqueId].snoozeUntil) {
                        const snoozeDate = new Date(triageDetails[uniqueId].snoozeUntil);
                        if (now < snoozeDate) {
                             continue; // Skip this company, it's currently snoozed
                        }
                    }
                } else {
                    // Round Robin Assignment using state tracker
                    let nextCsm = 'Misty Wilmore';
                    if (CSMs && CSMs.length > 0) {
                        const lastIndex = CSMs.indexOf(currentRoundRobinCsm);
                        if (lastIndex !== -1 && lastIndex + 1 < CSMs.length) {
                             nextCsm = CSMs[lastIndex + 1];
                        } else {
                             nextCsm = CSMs[0];
                        }
                    } else if (currentRoundRobinCsm === 'Misty Wilmore') {
                        nextCsm = 'Tonja Jones';
                    }
                    currentRoundRobinCsm = nextCsm; // Update loop tracker
                    
                    if (!triageDetails[uniqueId]) triageDetails[uniqueId] = { assignedCsm: nextCsm, status: 'New Response', history: [] };
                    else triageDetails[uniqueId].assignedCsm = nextCsm;
                    
                    assignedCsm = nextCsm;
                    triageDetails[uniqueId].csmExplicitlySet = true;
                    
                    if (isLoggedIn) {
                        setTimeout(() => handleTriageUpdate(uniqueId, 'csm', nextCsm, true), Math.random() * 2000 + 1000);
                    }
                }

                engagementBlackoutCustomers.push({
                    id: 'bo_' + Math.random().toString(36).substr(2, 9),
                    uniqueId: uniqueId,
                    company: master.name,
                    industry: master.industry,
                    erp: master.erp,
                    daysSinceLastTicket: daysSinceLastTicket === Infinity ? Infinity : Math.round(daysSinceLastTicket),
                    lastTicketFormatted: lastTicketFormatted,
                    group: group,
                    assignedCsm: assignedCsm,
                    status: status
                });
            }
        }
        
        engagementBlackoutCustomers.sort((a, b) => {
            if (a.daysSinceLastTicket === Infinity && b.daysSinceLastTicket === Infinity) return 0;
            if (a.daysSinceLastTicket === Infinity) return -1;
            if (b.daysSinceLastTicket === Infinity) return 1;
            return b.daysSinceLastTicket - a.daysSinceLastTicket;
        });
        
        const severeItems = engagementBlackoutCustomers.filter(c => c.daysSinceLastTicket === Infinity || c.daysSinceLastTicket > 180);
        document.getElementById('kpi-blackout').textContent = severeItems.length;
        document.getElementById('blackout-count-badge').textContent = severeItems.length;
        
        renderBlackoutList();
        updateCsmDropdowns();
    }

// Old getFollowUpStatus has been removed.

    function renderBlackoutList() {
        const listEl = document.getElementById('blackout-list');
        if (!listEl) return;
        listEl.innerHTML = '';
        
        let severeItems = engagementBlackoutCustomers;
        
        if (triageState.blackoutRisk && triageState.blackoutRisk !== 'all') {
            severeItems = severeItems.filter(c => c.group === triageState.blackoutRisk);
        }

        // CSM scoping for Blackout tab
        if (triageState.blackoutCsm && triageState.blackoutCsm !== 'all') {
            severeItems = severeItems.filter(c => c.assignedCsm === triageState.blackoutCsm);
        }
        
        const isEditingEnabled = isLoggedIn;

        let filteredItems = severeItems;
        if (triageState.blackoutFollowUpOnly) {
            filteredItems = filteredItems.filter(item => {
                const status = getFollowUpStatus(item);
                return status && (status.level === 'warning' || status.level === 'critical');
            });
        }
        
        if (filteredItems.length === 0) {
            listEl.innerHTML = '<div class="text-center py-10"><p class="text-gray-600 font-medium">No accounts match your follow-up filters.</p></div>';
            return;
        }

        filteredItems.forEach(item => {
            const followUp = getFollowUpStatus(item);
            let badgeHtml = '';
            if (followUp) {
                if (followUp.label === 'NEW') {
                    const bgClass = followUp.level === 'critical' ? 'bg-red-600 animate-pulse' : 'bg-orange-500';
                    const icon = followUp.level === 'critical' ? '🔴' : '🟠';
                    badgeHtml = `<span class="ml-2 px-2 py-0.5 ${bgClass} text-white text-[10px] font-bold rounded">${icon} INITIAL TOUCH DUE</span>`;
                } else {
                    if (followUp.level === 'critical') badgeHtml = `<span class="ml-2 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded animate-pulse">🔴 10 Day Due: Final Email (${followUp.days}d)</span>`;
                    else if (followUp.level === 'warning') badgeHtml = `<span class="ml-2 px-2 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded">🟠 4 Day Due: Call (${followUp.days}d)</span>`;
                }
            }

            const card = document.createElement('div');
            card.className = 'bg-white rounded-lg p-4 grid grid-cols-1 md:grid-cols-5 gap-4 items-center transition shadow-sm border border-gray-200';
            
            const displayDays = item.daysSinceLastTicket === Infinity ? 'Never' : item.daysSinceLastTicket + ' days ago';
            
            const emailSubject = encodeURIComponent("Checking in on your experience with CLEAN_Address");
            const emailBody = encodeURIComponent("Hi there,\n\nWe noticed it's been a while since we last connected. We wanted to see how everything is going with CLEAN_Address and if you need any assistance from our team.\n\nBest,\nYour Customer Success Team");
            const mailto = "mailto:?cc=misty.wilmore@runnertechnologies.com,tonja.jones@runnertechnologies.com&subject=" + emailSubject + "&body=" + emailBody;
            
            const csmOptions = CSMs.map(csm => `<option value="${csm}" ${item.assignedCsm === csm ? 'selected' : ''}>${csm}</option>`).join('');
            const allStatusOptionsWithArchive = ALL_STATUS_OPTIONS.map(s => `<option value="${s}" ${item.status === s ? 'selected' : ''}>${s}</option>`).join('');
            const isAdmin = isLoggedIn && currentUser.role === 'admin';
            const alreadyAssigned = item.assignedCsm && item.assignedCsm !== 'Unassigned';
            const assignedToMe = isLoggedIn && alreadyAssigned && item.assignedCsm.toLowerCase() === currentUser.name.toLowerCase();
            // Admin: can do anything. CSM: can edit only own rows or self-assign unassigned. Viewer: nothing.
            const canEdit = isLoggedIn && (isAdmin || assignedToMe || (!alreadyAssigned && currentUser.role === 'csm'));
            const canAssign = isLoggedIn && (isAdmin || (!alreadyAssigned && currentUser.role === 'csm'));
            const disabledEdit = canEdit ? '' : 'disabled';
            const opacityEdit = canEdit ? '' : 'opacity-60 cursor-not-allowed';
            const disabledAssign = canAssign ? '' : 'disabled';
            const opacityAssign = canAssign ? '' : 'opacity-60 cursor-not-allowed';
            
            card.innerHTML = `
                <div class="md:col-span-2">
                    <p class="font-bold text-lg text-gray-800 flex items-center">${item.company}${badgeHtml}</p>
                    <p class="text-sm text-gray-500">Industry: ${item.industry} | <span class="uppercase">ERP</span>: ${item.erp}</p>
                </div>
                <div class="flex items-center md:justify-center md:col-span-2">
                    <span class="text-sm font-semibold px-3 py-1 bg-gray-100 text-gray-600 rounded-full">Last Ticket: ${displayDays}</span>
                </div>
                <div class="flex justify-start md:justify-end gap-2">
                    <button class="outreach-btn inline-flex items-center px-3 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition text-sm shadow-sm cursor-pointer whitespace-nowrap"
                        data-uid="${item.uniqueId}" data-company="${item.company.replace(/"/g, '&quot;')}">
                        <svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Outreach
                    </button>
                    <button onclick="openSnoozeModal('${item.uniqueId}')" class="px-3 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition text-sm shadow-sm">
                        Snooze
                    </button>
                </div>
                <div class="col-span-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-t pt-4 mt-2 border-gray-100">
                    <div class="sm:col-span-1 lg:col-span-2 px-2">
                        <label for="bo-csm-${item.uniqueId}" class="text-xs font-medium text-gray-500">Assign CSM</label>
                        <select ${disabledAssign} id="bo-csm-${item.uniqueId}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-sm ${opacityAssign}">
                            <option value="Unassigned">Unassigned</option>
                            ${csmOptions}
                        </select>
                    </div>
                    <div class="sm:col-span-1 lg:col-span-2 px-2">
                        <label for="bo-status-${item.uniqueId}" class="text-xs font-medium text-gray-500">Set Status</label>
                        <select ${disabledEdit} id="bo-status-${item.uniqueId}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-sm ${opacityEdit}">
                            ${allStatusOptionsWithArchive}
                        </select>
                    </div>
                </div>
            `;
            listEl.appendChild(card);
            
            if (canAssign) {
                const csmSelect = document.getElementById(`bo-csm-${item.uniqueId}`);
                if (csmSelect) csmSelect.addEventListener('change', function () {
                    // CSM role: only allow selecting themselves
                    if (!isAdmin && this.value !== 'Unassigned' && this.value.toLowerCase() !== currentUser.name.toLowerCase()) {
                        alert('You can only assign customers to yourself.');
                        this.value = item.assignedCsm || 'Unassigned';
                        return;
                    }
                    handleTriageUpdate(item.uniqueId, 'csm', this.value, true);
                });
            }
            if (canEdit) {
                const statusSelect = document.getElementById(`bo-status-${item.uniqueId}`);
                if (statusSelect) statusSelect.addEventListener('change', function () { handleTriageUpdate(item.uniqueId, 'status', this.value, true); });
            }
        });

        // Delegated listener for Outreach buttons (data-attribute approach avoids escaping issues)
        listEl.querySelectorAll('.outreach-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const uid = this.getAttribute('data-uid');
                const company = this.getAttribute('data-company');
                openOutreachModal(uid, company);
            });
        });
    }

    let isLoggedIn = false;
    let currentUser = { id: 'guest', name: 'Guest User', email: '', role: 'viewer' };

    window.promptLogin = function () {
        const modal = document.getElementById('login-modal');
        document.getElementById('login-name-input').value = '';
        document.getElementById('login-email-input').value = '';
        document.getElementById('login-error').classList.add('hidden');
        document.getElementById('login-success').classList.add('hidden');
        document.getElementById('login-step-1').classList.remove('hidden');
        document.getElementById('login-step-2').classList.add('hidden');
        document.getElementById('login-primary-btn').textContent = 'Send Code';
        document.getElementById('login-primary-btn').onclick = sendLoginPin;
        modal.classList.remove('invisible', 'opacity-0');
        modal.classList.add('visible', 'opacity-100');
    };

    window.closeLoginModal = function () {
        const modal = document.getElementById('login-modal');
        modal.classList.remove('visible', 'opacity-100');
        modal.classList.add('invisible', 'opacity-0');
    };

    window.goBackToStep1 = function () {
        document.getElementById('login-step-1').classList.remove('hidden');
        document.getElementById('login-step-2').classList.add('hidden');
        document.getElementById('login-error').classList.add('hidden');
        document.getElementById('login-success').classList.add('hidden');
        document.getElementById('login-primary-btn').textContent = 'Send Code';
        document.getElementById('login-primary-btn').onclick = sendLoginPin;
    };

    window.sendLoginPin = async function () {
        const nameInput = document.getElementById('login-name-input').value.trim();
        const emailInput = document.getElementById('login-email-input').value.trim().toLowerCase();
        const errorEl = document.getElementById('login-error');
        const successEl = document.getElementById('login-success');
        const btn = document.getElementById('login-primary-btn');

        errorEl.classList.add('hidden');
        successEl.classList.add('hidden');

        if (!nameInput || !emailInput) {
            errorEl.textContent = 'Please enter both your name and email address.';
            errorEl.classList.remove('hidden');
            return;
        }

        // Only send to authorized emails — no point sending a code to strangers
        const match = AUTHORIZED_USERS.find(u => u.email.toLowerCase() === emailInput);
        if (!match) {
            errorEl.textContent = 'That email is not in the authorized list. You will have view-only access.';
            errorEl.classList.remove('hidden');
            // After 2 seconds, grant view-only silently
            setTimeout(() => {
                currentUser = { id: emailInput, name: nameInput, email: emailInput, role: 'viewer' };
                isLoggedIn = false;
                closeLoginModal();
                updateUIForAuth();
            }, 2000);
            return;
        }

        btn.textContent = 'Sending...';
        btn.disabled = true;

        try {
            const response = await fetch(SHEET_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'sendpin', email: emailInput, name: nameInput })
            });
            const result = await response.json();

            if (result.status === 'success') {
                document.getElementById('login-step-1').classList.add('hidden');
                document.getElementById('login-step-2').classList.remove('hidden');
                document.getElementById('login-pin-input').value = '';
                successEl.textContent = 'Code sent! Check your inbox (and spam folder just in case).';
                successEl.classList.remove('hidden');
                btn.textContent = 'Verify Code';
                btn.disabled = false;
                btn.onclick = verifyLoginPin;
                setTimeout(() => document.getElementById('login-pin-input').focus(), 100);
            } else {
                errorEl.textContent = result.message || 'Failed to send code. Please try again.';
                errorEl.classList.remove('hidden');
                btn.textContent = 'Send Code';
                btn.disabled = false;
            }
        } catch (err) {
            errorEl.textContent = 'Could not reach the server. Make sure your local server is running.';
            errorEl.classList.remove('hidden');
            btn.textContent = 'Send Code';
            btn.disabled = false;
        }
    };

    window.verifyLoginPin = async function () {
        const emailInput = document.getElementById('login-email-input').value.trim().toLowerCase();
        const nameInput  = document.getElementById('login-name-input').value.trim();
        const pinInput   = document.getElementById('login-pin-input').value.trim();
        const errorEl    = document.getElementById('login-error');
        const btn        = document.getElementById('login-primary-btn');

        errorEl.classList.add('hidden');

        if (!pinInput || pinInput.length !== 6) {
            errorEl.textContent = 'Please enter the full 6-digit code.';
            errorEl.classList.remove('hidden');
            return;
        }

        btn.textContent = 'Verifying...';
        btn.disabled = true;

        try {
            const response = await fetch(SHEET_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'verifypin', email: emailInput, pin: pinInput })
            });
            const result = await response.json();

            if (result.status === 'success') {
                const match = AUTHORIZED_USERS.find(u => u.email.toLowerCase() === emailInput);
                currentUser = { id: emailInput, name: match ? match.name : nameInput, email: emailInput, role: match ? match.role : 'viewer' };
                isLoggedIn = !!match;
                closeLoginModal();
                updateUIForAuth();
            } else {
                errorEl.textContent = result.message || 'Incorrect or expired code. Please try again.';
                errorEl.classList.remove('hidden');
                btn.textContent = 'Verify Code';
                btn.disabled = false;
            }
        } catch (err) {
            errorEl.textContent = 'Could not reach the server. Please try again.';
            errorEl.classList.remove('hidden');
            btn.textContent = 'Verify Code';
            btn.disabled = false;
        }
    };

    function updateUIForAuth() {
        const loginBtn = document.getElementById('login-btn');
        const manageCsmBtn = document.getElementById('manage-csm-btn');

        if (isLoggedIn) {
            const roleBadge = currentUser.role === 'admin' ? ' 🛡️' : '';
            loginBtn.textContent = `Logged in: ${currentUser.name}${roleBadge}`;
            loginBtn.onclick = null;
            loginBtn.classList.remove('bg-indigo-600');
            loginBtn.classList.add('bg-gray-400');
            loginBtn.disabled = true;
        } else if (currentUser.role === 'viewer' && currentUser.email) {
            loginBtn.textContent = `👁️ Viewing as: ${currentUser.name}`;
            loginBtn.onclick = null;
            loginBtn.classList.remove('bg-indigo-600');
            loginBtn.classList.add('bg-gray-300');
            loginBtn.disabled = true;
        }

        // Only show Manage CSMs to admins
        if (manageCsmBtn) {
            manageCsmBtn.style.display = (isLoggedIn && currentUser.role === 'admin') ? '' : 'none';
        }

        // --- CSM SCOPING: auto-filter both tabs to the logged-in CSM's accounts ---
        const isAdmin = isLoggedIn && currentUser.role === 'admin';
        const scopedCsm = (isLoggedIn && !isAdmin) ? currentUser.name : 'all';

        // Critical tab filter
        const critAllOpt = document.getElementById('triageCsmAllOption');
        const critFilter = document.getElementById('triageCsmFilter');
        if (critAllOpt) critAllOpt.style.display = isAdmin ? '' : 'none';
        if (critFilter) {
            critFilter.value = scopedCsm;
            triageState.csm = scopedCsm;
        }

        // Blackout tab filter
        const boAllOpt = document.getElementById('blackoutCsmAllOption');
        const boFilter = document.getElementById('blackoutCsmFilter');
        if (boAllOpt) boAllOpt.style.display = isAdmin ? '' : 'none';
        if (boFilter) {
            boFilter.value = scopedCsm;
            triageState.blackoutCsm = scopedCsm;
        }

        renderTriageList();
        renderBlackoutList();
    }

    const triageState = {
        csm: 'all',
        status: 'all',
        blackoutRisk: 'all',
        blackoutFollowUpOnly: false,
        blackoutCsm: 'all'
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
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q2: How has CLEAN_Address been working for your organization?</p><p class="text-sm text-gray-700 p-2">${data.health_raw_Q2 || 'N/A'}</p></div>
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
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q17: Have you upgraded to CLEAN_Address version 5x?</p><p class="text-sm text-gray-700 p-2">${data.upgrade_5x_Q17 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q17 Feedback: Explain or provide additional feedback below</p><p class="text-sm text-gray-700 p-2">${data.feedback_Q17 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q18: Are there any suggestions to improve our processes and help with customer success?</p><p class="text-sm text-gray-700 p-2">${data.suggestions_Q18 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q19: Explain or provide additional feedback below</p><p class="text-sm text-gray-700 p-2">${data.feedback_Q19 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q20: Are there other data types or sets you are interested in acquiring?</p><p class="text-sm text-gray-700 p-2">${data.data_types_Q20 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q21: Explain or provide additional feedback below</p><p class="text-sm text-gray-700 p-2">${data.feedback_Q21 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q22: Would Demographic Data associated with address records be beneficial?</p><p class="text-sm text-gray-700 p-2">${data.demographic_Q22 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q23: Explain or provide additional feedback below</p><p class="text-sm text-gray-700 p-2">${data.feedback_Q23 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q24: Are there any other systems or departments that could use CLEAN_Address?</p><p class="text-sm text-gray-700 p-2">${data.other_systems_Q24 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q25: Explain or provide additional feedback below</p><p class="text-sm text-gray-700 p-2">${data.feedback_Q25 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q26: Do you use Salesforce?</p><p class="text-sm text-gray-700 p-2">${data.salesforce_Q26 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q27: Explain or provide additional feedback below</p><p class="text-sm text-gray-700 p-2">${data.feedback_Q27 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q28: Do you use Microsoft Dynamics?</p><p class="text-sm text-gray-700 p-2">${data.ms_dynamics_Q28 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q29: Explain or provide additional feedback below</p><p class="text-sm text-gray-700 p-2">${data.feedback_Q29 || 'N/A'}</p></div>
        <div><p class="text-xs font-bold text-gray-600 bg-blue-50 p-2 rounded">Q30: Are you willing to be a reference for RunnerEDQ and CLEAN_Address?</p><p class="text-sm text-gray-700 p-2">${data.reference_Q30 || 'N/A'}</p></div>
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
            openModal(record);
        }
    };

    window.openCsmManager = function () {
        const modal = document.getElementById('csm-modal');
        renderCsmList();
        modal.classList.remove('invisible', 'opacity-0');
        modal.classList.add('visible', 'opacity-100');
    }

    window.closeCsmModal = function () {
        const modal = document.getElementById('csm-modal');
        modal.classList.remove('visible', 'opacity-100');
        modal.classList.add('invisible', 'opacity-0');
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
        <button onclick="removeCsm(${index})" class="px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded hover:bg-red-600 transition">
            Remove
        </button>
    `;
            listEl.appendChild(item);
        });
    }

    window.addNewCsm = function () {
        const input = document.getElementById('new-csm-name');
        const name = input.value.trim();

        if (name === '') {
            alert('Please enter a CSM name');
            return;
        }

        if (CSMs.includes(name)) {
            alert('This CSM already exists');
            return;
        }

        CSMs.push(name);
        input.value = '';
        renderCsmList();
        updateCsmDropdowns();
        alert(`CSM "${name}" added successfully!`);
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
        const blackoutCsmFilter = document.getElementById('blackoutCsmFilter');
        
        const triageCounts = {};
        const blackoutCounts = {};
        CSMs.forEach(csm => {
             triageCounts[csm] = rawResponses.filter(d => d.happiness <= 3 && d.status !== 'Archived' && d.assignedCsm === csm).length;
             blackoutCounts[csm] = (typeof engagementBlackoutCustomers !== 'undefined' && engagementBlackoutCustomers) ? engagementBlackoutCustomers.filter(c => c.assignedCsm === csm).length : 0;
        });

        if (triageCsmFilter) {
            const currentTValue = triageCsmFilter.value;
            triageCsmFilter.innerHTML = '<option id="triageCsmAllOption" value="all">All CSMs</option>';
            CSMs.forEach(csm => {
                const opt = document.createElement('option');
                opt.value = csm;
                opt.textContent = `${csm} (${triageCounts[csm] || 0})`;
                triageCsmFilter.appendChild(opt);
            });
            triageCsmFilter.value = currentTValue || 'all';
        }

        if (blackoutCsmFilter) {
            const currentBValue = blackoutCsmFilter.value;
            blackoutCsmFilter.innerHTML = '<option id="blackoutCsmAllOption" value="all">All CSMs</option>';
            CSMs.forEach(csm => {
                const opt = document.createElement('option');
                opt.value = csm;
                opt.textContent = `${csm} (${blackoutCounts[csm] || 0})`;
                blackoutCsmFilter.appendChild(opt);
            });
            blackoutCsmFilter.value = currentBValue || 'all';
        }
    }

    window.handleTriageUpdate = async (uniqueId, field, value, isBlackout = false, silent = false) => {
        if (!isLoggedIn) {
            return; // silently skip if not logged in during auto-updates
        }

        if (!triageDetails[uniqueId]) {
            triageDetails[uniqueId] = { assignedCsm: 'Unassigned', status: 'New Response', history: [] };
        }

        let companyName = "Unknown";
        
        if (isBlackout) {
            const idx = engagementBlackoutCustomers.findIndex(d => d.uniqueId === uniqueId);
            if (idx !== -1) {
                companyName = engagementBlackoutCustomers[idx].company;
                // Pre-emptively update engagementBlackoutCustomers array so it's fresh when re-rendered
                engagementBlackoutCustomers[idx].assignedCsm = field === 'csm' ? value : triageDetails[uniqueId].assignedCsm;
                engagementBlackoutCustomers[idx].status = field === 'status' ? value : triageDetails[uniqueId].status;
            }
        } else {
            const record = rawResponses.find(d => d.uniqueId === uniqueId);
            if (record) companyName = record.company;
        }

        let note = "";
        if (field === 'status' && !silent) {
            note = prompt(`Please enter a note explaining this status update for ${companyName} (Optional):`);
            if (note === null) return; // cancel update
        }

        if (field === 'csm') triageDetails[uniqueId].assignedCsm = value;
        if (field === 'status') triageDetails[uniqueId].status = value;

        triageDetails[uniqueId].history.push({
            status: triageDetails[uniqueId].status,
            csm: triageDetails[uniqueId].assignedCsm,
            timestamp: new Date().toISOString(),
            user: currentUser.name,
            change: note ? `${field} updated to ${value}\nNote: ${note}` : `${field} updated to ${value}`
        });

        if (!isBlackout) {
            rawResponses = rawResponses.map(r => r.uniqueId === uniqueId ? { ...r, ...triageDetails[uniqueId] } : r);
        }

        try {
            await fetch(SHEET_URL, {
                method: 'POST',
                body: JSON.stringify({
                    uniqueId: uniqueId,
                    company: companyName,
                    field: field,
                    value: value,
                    user: currentUser.name,
                    email: currentUser.email,
                    note: note
                })
            });
            console.log("✅ Triage saved to DB");
        } catch (e) {
            console.error("Failed to POST triage update", e);
        }
    }

    // --- FOLLOW-UP REMINDER LOGIC ---

    function getFollowUpStatus(item) {
        // Any status that is not Archived or Canceled should be eligible for badges if touches occurred
        const isFollowUpStatus = item.status !== 'Archived' && item.status !== 'Inactive - Canceled';
        const isNewResponse = item.status === 'New Response';
        const isSilentAccount = typeof item.daysSinceLastTicket !== 'undefined';

        // Silent accounts (EB Tab) should show "NEW" follow-up alerts if they are high risk 
        // and haven't had an outreach attempt yet.
        if (isNewResponse && isSilentAccount) {
            const daysLastTicket = item.daysSinceLastTicket;
            if (daysLastTicket === -1 || daysLastTicket > 365) {
                return { level: 'critical', days: 0, label: 'NEW' };
            } else if (daysLastTicket >= 180) {
                return { level: 'warning', days: 0, label: 'NEW' };
            }
        }

        if (!isFollowUpStatus) return null;

        const history = item.history || [];
        const snoozeExpiry = item.snoozeUntil ? new Date(item.snoozeUntil) : null;
        const now = new Date();

        // 1. Find the initial and latest outreach in history
        let initialTouchpointTs = 0;
        let latestTouchpointTs = 0;
        let touchCount = 0;
        const TOUCH_KEYWORDS = ['emailed', 'phone attempt', 'cadence', 'outreach sent', 'call logged', 'event logged', 'manually drafted email'];

        history.forEach(h => {
            const hTs = new Date(h.timestamp).getTime();
            const change = h.change ? h.change.toLowerCase() : '';
            
            const hasTouchKeyword = TOUCH_KEYWORDS.some(kw => change.includes(kw));
            
            if (hasTouchKeyword) {
                if (initialTouchpointTs === 0 || hTs < initialTouchpointTs) {
                    initialTouchpointTs = hTs;
                }
                if (hTs > latestTouchpointTs) {
                    latestTouchpointTs = hTs;
                }
                touchCount++;
            }
        });

        if (initialTouchpointTs === 0) return null;

        // If currently snoozed, hide entirely
        if (snoozeExpiry && snoozeExpiry > now) {
            return null;
        }

        // Calculate days relative to the FIRST touch point mapping to the business workflow (Day 0, Day 4, Day 10)
        let daysElapsed = (now - initialTouchpointTs) / (24 * 60 * 60 * 1000);
        let daysSinceLatestTouch = (now - latestTouchpointTs) / (24 * 60 * 60 * 1000);

        if (daysElapsed >= 10) {
            // Require 3 touches by day 10. If they have done it very recently, suppress.
            if (touchCount < 3 || daysSinceLatestTouch > 4) {
                 return { level: 'critical', days: Math.floor(daysElapsed) };
            }
        } else if (daysElapsed >= 4) {
            // Require 2 touches by day 4.
            if (touchCount < 2 || daysSinceLatestTouch > 4) {
                 return { level: 'warning', days: Math.floor(daysElapsed) };
            }
        }
        
        return null;
    }
    window.getFollowUpStatus = getFollowUpStatus;

    window.handleDrillDownClick = function (event, elements, chart) {
        if (!elements || elements.length === 0 || !chart) return;

        const chartId = chart.canvas.id;
        const clickedElement = elements[0];
        let index = clickedElement.index;

        if (chartId === 'engagementChart') {
            const label = chart.data.labels[index];
            const riskFilterEl = document.getElementById('blackoutRiskFilter');
            if (riskFilterEl) riskFilterEl.value = label;
            triageState.blackoutRisk = label;
            renderBlackoutList();

            navigateTo('triage');
            setTimeout(() => {
                const blackoutTab = document.getElementById('triage-tab-blackout');
                if (blackoutTab) blackoutTab.click();
            }, 50);
            return;
        }

        let filterKey = null;
        let filterValue = null;

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



    document.getElementById('blackoutFollowUpOnly').addEventListener('change', (e) => {
        triageState.blackoutFollowUpOnly = e.target.checked;
        renderBlackoutList();
    });

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
            const initialCount = filtered.length;
            if (drillDownState.key === 'erp') {
                console.log(`🔍 [FILTER DEBUG] Filtering by ERP: "${drillDownState.value}"`);
                // Handle multi-value ERP fields (e.g., "SAP, Oracle")
                filtered = filtered.filter(d => {
                    if (!d.erp) return false;
                    const erps = d.erp.split(',').map(e => e.trim());
                    const match = erps.includes(drillDownState.value);
                    if (match && d.erp.includes(',')) console.log(`   ✅ Matched multi-value ERP: "${d.company}" [${d.erp}]`);
                    return match;
                });
            } else {
                filtered = filtered.filter(d => d[drillDownState.key] === drillDownState.value);
            }
            console.log(`🔍 [FILTER DEBUG] Result: ${filtered.length} / ${initialCount} rows`);
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
                title: { display: true, text: 'CLEAN_Address Score' },
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
            data: { labels: [], datasets: [{ label: 'Avg CLEAN_Address Score', data: [], borderColor: '#4A5C6A', backgroundColor: '#4A5C6A20', fill: true, tension: 0.3 }] },
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

        charts.engagement = new Chart(document.getElementById('engagementChart'), {
            type: 'bar',
            data: { labels: ['90-180 Days (Warning)', '180-365 Days (Risk)', '365+ Days / Never (Critical)'], datasets: [{ label: 'Silent Accounts', data: [0, 0, 0], backgroundColor: ['#d69e2e', '#dd6b20', '#e53e3e'], borderRadius: 4 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } },
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

        if (engagementBlackoutCustomers && engagementBlackoutCustomers.length > 0 && charts.engagement) {
            const counts = [0, 0, 0];
            engagementBlackoutCustomers.forEach(c => {
                if (c.group === '90-180 Days (Warning)') counts[0]++;
                else if (c.group === '180-365 Days (Risk)') counts[1]++;
                else counts[2]++;
            });
            charts.engagement.data.datasets[0].data = counts;
            charts.engagement.update();
        }
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
        triageItems = triageItems.filter(d => d.status !== 'Inactive - Canceled');

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

            const followUp = getFollowUpStatus(item);
            let badgeHtml = '';
            if (followUp) {
                if (followUp.label === 'NEW') {
                    const bgClass = followUp.level === 'critical' ? 'bg-red-600 animate-pulse' : 'bg-orange-500';
                    const icon = followUp.level === 'critical' ? '🔴' : '🟠';
                    badgeHtml = `<span class="ml-2 px-2 py-0.5 ${bgClass} text-white text-[10px] font-bold rounded">${icon} INITIAL TOUCH DUE</span>`;
                } else {
                    if (followUp.level === 'critical') badgeHtml = `<span class="ml-2 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded animate-pulse">🔴 10 Day Due: Final Email (${followUp.days}d)</span>`;
                    else if (followUp.level === 'warning') badgeHtml = `<span class="ml-2 px-2 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded">🟠 4 Day Due: Call (${followUp.days}d)</span>`;
                }
            }

            const csmOptions = CSMs.map(csm => `<option value="${csm}" ${item.assignedCsm === csm ? 'selected' : ''}>${csm}</option>`).join('');
            const allStatusOptionsWithArchive = ALL_STATUS_OPTIONS.map(s => `<option value="${s}" ${item.status === s ? 'selected' : ''}>${s}</option>`).join('');

            const lastUpdate = item.triageHistory && item.triageHistory.length > 0 ? item.triageHistory[item.triageHistory.length - 1] : null;
            const lastUpdateText = lastUpdate ? `Last update by ${lastUpdate.user} on ${new Date(lastUpdate.timestamp).toLocaleDateString()}` : `Survey taken on ${new Date(item.date).toLocaleDateString()}`;

            const feedbackPreview = (item.feedback_Q3 || 'No feedback provided').substring(0, 50);

            const isAdmin = isLoggedIn && currentUser.role === 'admin';
            const alreadyAssigned = item.assignedCsm && item.assignedCsm !== 'Unassigned';
            const assignedToMe = isLoggedIn && alreadyAssigned && item.assignedCsm.toLowerCase() === currentUser.name.toLowerCase();
            // Admin: full access. CSM: can edit own or self-assign unassigned. Viewer: nothing.
            const canEdit = isLoggedIn && (isAdmin || assignedToMe || (!alreadyAssigned && currentUser.role === 'csm'));
            const canAssign = isLoggedIn && (isAdmin || (!alreadyAssigned && currentUser.role === 'csm'));
            const disabledEdit = canEdit ? '' : 'disabled';
            const opacityEdit = canEdit ? '' : 'opacity-60 cursor-not-allowed';
            const disabledAssign = canAssign ? '' : 'disabled';
            const opacityAssign = canAssign ? '' : 'opacity-60 cursor-not-allowed';

            card.innerHTML = `
        <div class="md:col-span-2">
            <p class="font-bold text-lg text-gray-800 flex items-center">${item.company}${badgeHtml}</p>
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
                <label for="csm-${item.uniqueId}" class="text-xs font-medium text-gray-500">Assign CSM</label>
                <select ${disabledAssign} id="csm-${item.uniqueId}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-sm ${opacityAssign}">
                    <option value="Unassigned">Unassigned</option>
                    ${csmOptions}
                </select>
            </div>
            <div>
                <label for="status-${item.uniqueId}" class="text-xs font-medium text-gray-500">Set Status</label>
                <select ${disabledEdit} id="status-${item.uniqueId}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-sm ${opacityEdit}">
                    ${allStatusOptionsWithArchive}
                </select>
            </div>
        </div>
    `;
            listEl.appendChild(card);

            if (canAssign) {
                const csmSelect = document.getElementById(`csm-${item.uniqueId}`);
                if (csmSelect) {
                    csmSelect.addEventListener('change', function () {
                        // CSM role: only allow selecting themselves
                        if (!isAdmin && this.value !== 'Unassigned' && this.value.toLowerCase() !== currentUser.name.toLowerCase()) {
                            alert('You can only assign customers to yourself.');
                            this.value = item.assignedCsm || 'Unassigned';
                            return;
                        }
                        handleTriageUpdate(item.uniqueId, 'csm', this.value, false);
                    });
                }
            }

            if (canEdit) {
                const statusSelect = document.getElementById(`status-${item.uniqueId}`);
                if (statusSelect) {
                    statusSelect.addEventListener('change', function () {
                        handleTriageUpdate(item.uniqueId, 'status', this.value, false);
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

    updateCsmDropdowns();

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

    const blackoutRiskFilter = document.getElementById('blackoutRiskFilter');
    if (blackoutRiskFilter) {
        blackoutRiskFilter.addEventListener('change', function(e) {
            triageState.blackoutRisk = e.target.value;
            renderBlackoutList();
        });
    }

    if (blackoutCsmFilter) {
        blackoutCsmFilter.addEventListener('change', function(e) {
            triageState.blackoutCsm = e.target.value;
            renderBlackoutList();
        });
    }

    const triageTabCritical = document.getElementById('triage-tab-critical');
    const triageTabBlackout = document.getElementById('triage-tab-blackout');
    
    if (triageTabCritical && triageTabBlackout) {
        triageTabCritical.addEventListener('click', () => {
            document.getElementById('triage-critical-section').classList.remove('hidden');
            document.getElementById('triage-blackout-section').classList.add('hidden');
            triageTabCritical.className = "py-2 px-4 border-b-2 border-indigo-600 font-semibold text-indigo-600";
            triageTabBlackout.className = "py-2 px-4 border-b-2 border-transparent font-medium text-gray-500 hover:text-gray-700 flex items-center";
        });
    
        triageTabBlackout.addEventListener('click', () => {
            document.getElementById('triage-critical-section').classList.add('hidden');
            document.getElementById('triage-blackout-section').classList.remove('hidden');
            triageTabCritical.className = "py-2 px-4 border-b-2 border-transparent font-medium text-gray-500 hover:text-gray-700";
            triageTabBlackout.className = "py-2 px-4 border-b-2 border-indigo-600 font-semibold text-indigo-600 flex items-center";
        });
    }

    function init() {
        fetchData();
        createCharts();
        updateUIForAuth();
        navigateTo('dashboard');
    }

    init();

    // --- OUTREACH PIPELINE STATE & HELPERS (Moved inside DOMContentLoaded for scope) ---
    let currentOutreachContacts = [];
    let currentOutreachIndex = 0;
    let currentOutreachUniqueId = '';
    let currentOutreachCompany = '';

    window.openSnoozeModal = function(uniqueId) {
        if (typeof isLoggedIn !== 'undefined' && !isLoggedIn) {
            alert("You must be logged in to manage snoozes.");
            return;
        }
        document.getElementById('snooze-unique-id').value = uniqueId;
        document.getElementById('snooze-date').value = '';
        document.getElementById('snooze-note').value = '';
        const modal = document.getElementById('snooze-modal');
        modal.classList.remove('invisible', 'opacity-0');
    }

    window.closeSnoozeModal = function() {
        const modal = document.getElementById('snooze-modal');
        modal.classList.add('invisible', 'opacity-0');
    }

    window.saveSnooze = function() {
        const uniqueId = document.getElementById('snooze-unique-id').value;
        const date = document.getElementById('snooze-date').value;
        const note = document.getElementById('snooze-note').value;
        if (!date || !note.trim()) {
            alert("Please provide both a date and a reason for snoozing.");
            return;
        }
        const historyText = `Snoozed until ${date}: ${note.trim()}`;
        handleTriageUpdate(uniqueId, 'history', historyText, true);
        closeSnoozeModal();
        alert("Account snoozed successfully! It will disappear on the next refresh.");
        setTimeout(() => location.reload(), 1500);
    }

    window.openOutreachModal = function(uniqueId, companyName) {
        if (typeof isLoggedIn !== 'undefined' && !isLoggedIn) {
            alert("You must be logged in to perform Outreach.");
            return;
        }
        currentOutreachUniqueId = uniqueId;
        currentOutreachCompany = companyName;
        document.getElementById('outreach-unique-id').value = uniqueId;
        document.getElementById('outreach-real-company-name').value = companyName;
        document.getElementById('outreach-company-name').textContent = `Outreach: ${companyName}`;
        document.getElementById('outreach-cadence-status').textContent = 'Fetching Contacts from Freshdesk...';
        document.getElementById('outreach-cadence-status').className = 'text-sm font-semibold text-indigo-600 mt-1';
        
        // Add Last Outreach Context
        const status = getFollowUpStatus(triageDetails[uniqueId] || {status: 'New Response', history: []});
        const lastOutreachSection = document.getElementById('outreach-cadence-status');
        if (status && status.days !== Infinity) {
            lastOutreachSection.innerHTML += ` <span class="text-xs text-gray-400 font-normal">| Last interaction: ${status.days}d ago</span>`;
        }
        
        document.getElementById('outreach-contact-card').classList.add('hidden');
        document.getElementById('outreach-actions').classList.add('hidden');
        document.getElementById('outreach-no-contacts').classList.add('hidden');
        document.getElementById('fail-contact-section').classList.add('hidden');
        document.getElementById('email-composer').classList.add('hidden');
        document.getElementById('call-logger').classList.add('hidden');

        const modal = document.getElementById('outreach-modal');
        modal.classList.remove('invisible', 'opacity-0');

        fetch(`${SHEET_URL}?type=contacts&companyName=${encodeURIComponent(companyName)}`)
        .then(res => res.text())
        .then(rawText => {
            let data;
            try { data = JSON.parse(rawText); } catch(e) {
                console.error('❌ Not valid JSON. Raw:', rawText.substring(0, 300));
                window.renderNoContacts();
                return;
            }
            if (data.status === 'success' && data.data && data.data.contacts) {
                 currentOutreachContacts = data.data.contacts;
                 currentOutreachIndex = 0;
                 document.getElementById('outreach-company-id').value = data.data.companyId || '';
                 window.renderCurrentContact();
            } else {
                 window.renderNoContacts();
            }
        })
        .catch(err => {
             console.error(err);
             window.renderNoContacts();
        });
    }

    window.closeOutreachModal = function() {
        const modal = document.getElementById('outreach-modal');
        modal.classList.add('invisible', 'opacity-0');
    }

    window.renderCurrentContact = function() {
        if (currentOutreachContacts.length === 0 || currentOutreachIndex >= currentOutreachContacts.length) {
            window.renderNoContacts();
            return;
        }
        
        const c = currentOutreachContacts[currentOutreachIndex];
        document.getElementById('outreach-cadence-status').textContent = `Attempt ${currentOutreachIndex + 1} of ${currentOutreachContacts.length}: Freshdesk Contact Loaded.`;
        document.getElementById('outreach-cadence-status').className = 'text-sm font-semibold text-green-600 mt-1';
        
        document.getElementById('outreach-target-name').value = c.name;
        document.getElementById('outreach-target-email').value = c.email;
        
        document.getElementById('outreach-c-name').textContent = c.name;
        document.getElementById('outreach-c-title').textContent = c.job_title || 'No Title Listed';
        document.getElementById('outreach-c-email').textContent = c.email;
        
        let greeting = "Hi,";
        const eMatch = c.email.toLowerCase();
        const isDistribution = (eMatch.indexOf('admin@') === 0 || eMatch.indexOf('info@') === 0 || eMatch.indexOf('it@') === 0 || eMatch.indexOf('support@') === 0 || eMatch.indexOf('team@') === 0 || !c.name || c.name.trim() === "");
        
        if (isDistribution) {
            const realCoName = document.getElementById('outreach-real-company-name').value || "Team";
            greeting = `Hi ${realCoName} Team,`;
        } else {
            const firstName = c.name.split(' ')[0];
            greeting = `Hi ${firstName},`;
        }
        
        const bodyText = `${greeting}\n\nI noticed we haven't touched base in a while. Since we've seen some shifting workflows recently, I wanted to reach out to ensure everything is running smoothly with CLEAN_Address.\n\nLet me know if you need anything!\n\nBest,`;
        document.getElementById('email-body').value = bodyText;

        document.getElementById('outreach-contact-card').classList.remove('hidden');
        document.getElementById('outreach-actions').classList.remove('hidden');
        document.getElementById('fail-contact-section').classList.remove('hidden');
        document.getElementById('outreach-no-contacts').classList.add('hidden');
        document.getElementById('email-composer').classList.add('hidden');
        document.getElementById('call-logger').classList.add('hidden');
    }

    window.renderNoContacts = function() {
        document.getElementById('outreach-cadence-status').textContent = 'All Valid Contacts Exhausted.';
        document.getElementById('outreach-cadence-status').className = 'text-sm font-semibold text-red-600 mt-1';
        document.getElementById('outreach-contact-card').classList.add('hidden');
        document.getElementById('outreach-actions').classList.add('hidden');
        document.getElementById('fail-contact-section').classList.add('hidden');
        document.getElementById('outreach-no-contacts').classList.remove('hidden');
        handleTriageUpdate(currentOutreachUniqueId, 'status', 'Requires CS Review - DNC/Exhausted', true, true);
    }

    window.failCurrentContact = function() {
        const c = currentOutreachContacts[currentOutreachIndex];
        handleTriageUpdate(currentOutreachUniqueId, 'history', `Cadence Failed for ${c.name} (${c.email}). Moving to next contact.`, true);
        currentOutreachIndex++;
        window.renderCurrentContact();
    }

    window.sendTestEmail = function() {
        const email = currentUser.email;
        if (!email) {
            alert('Cannot determine your email. Only logged in users can send test emails.');
            return;
        }
        const name = document.getElementById('outreach-target-name').value;
        const subject = "[TEST] " + document.getElementById('email-subject').value;
        const body = document.getElementById('email-body').value;
        const company = document.getElementById('outreach-real-company-name').value;
        
        const btn = document.getElementById('test-email-btn');
        btn.disabled = true;
        btn.textContent = 'Sending Test...';
        
        fetch(SHEET_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'sendoutreach', email, name, subject, body, company })
        })
        .then(res => res.json())
        .then(data => {
            btn.disabled = false;
            btn.textContent = 'Test (Send to Me)';
            if (data.status === 'success') {
                 document.getElementById('email-status-msg').textContent = 'Test email sent successfully to your inbox!';
                 document.getElementById('email-status-msg').className = 'text-xs font-medium mt-2 text-green-600';
            } else {
                 document.getElementById('email-status-msg').textContent = 'Error sending test email: ' + (data.message || 'Unknown error');
                 document.getElementById('email-status-msg').className = 'text-xs font-medium mt-2 text-red-600';
            }
        })
        .catch(err => {
             btn.disabled = false;
             btn.textContent = 'Test (Send to Me)';
             document.getElementById('email-status-msg').textContent = String(err);
             document.getElementById('email-status-msg').className = 'text-xs font-medium mt-2 text-red-600';
        });
    }

    window.executeEmailSend = function() {
        const email = document.getElementById('outreach-target-email').value;
        const name = document.getElementById('outreach-target-name').value;
        const subject = document.getElementById('email-subject').value;
        const body = document.getElementById('email-body').value;
        const company = document.getElementById('outreach-real-company-name').value;
        const bccMe = document.getElementById('bcc-me') ? document.getElementById('bcc-me').checked : false;
        
        const btn = document.getElementById('send-outreach-btn');
        btn.disabled = true;
        btn.textContent = 'Sending...';
        
        fetch(SHEET_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'sendoutreach', email, name, subject, body, company, bcc: bccMe ? currentUser.email : '' })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                 document.getElementById('email-status-msg').textContent = 'Email sent successfully via Code.gs!';
                 document.getElementById('email-status-msg').className = 'text-xs font-medium mt-2 text-green-600';
                 handleTriageUpdate(currentOutreachUniqueId, 'history', `Emailed ${name} at ${email}. Wait 3-4 days before calling.`, true, true);
                 handleTriageUpdate(currentOutreachUniqueId, 'status', 'Outreach Sent - Awaiting Reply', true, true);
                 setTimeout(() => window.closeOutreachModal(), 2000);
            } else {
                 document.getElementById('email-status-msg').textContent = 'Error: ' + data.message;
                 document.getElementById('email-status-msg').className = 'text-xs font-medium mt-2 text-red-600';
            }
        })
        .finally(() => {
            btn.disabled = false;
            btn.textContent = 'Send Now (via Backend)';
        });
    }

    window.generateMailto = function() {
        const email = document.getElementById('outreach-target-email').value;
        const name = document.getElementById('outreach-target-name').value;
        const subject = encodeURIComponent(document.getElementById('email-subject').value);
        const body = encodeURIComponent(document.getElementById('email-body').value);
        
        handleTriageUpdate(currentOutreachUniqueId, 'history', `Manually drafted email for ${name} at ${email}. Wait 3-4 days before calling.`, true, true);
        handleTriageUpdate(currentOutreachUniqueId, 'status', 'Outreach Sent - Awaiting Reply', true, true);
        window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
    }

    window.executeCallLog = function() {
        const name = document.getElementById('outreach-target-name').value;
        const outcome = document.getElementById('call-outcome').value;
        const notes = document.getElementById('call-notes').value;
        
        handleTriageUpdate(currentOutreachUniqueId, 'history', `Phone Attempt (${outcome}) for ${name}. Notes: ${notes}`, true, true);
        alert('Call attempt logged successfully to Triage History!');
        window.closeOutreachModal();
    }

    window.executeEventLog = async function() {
        const name = document.getElementById('outreach-target-name').value;
        const type = document.getElementById('event-type').value;
        const notes = document.getElementById('event-notes').value;
        
        await handleTriageUpdate(currentOutreachUniqueId, 'history', `[EVENT LOGGED] ${type} interaction with ${name}. Notes: ${notes}`, true, true);
        
        alert('Manual event logged successfully and outreach clock reset!');
        window.closeOutreachModal();
    }

    window.openAddContactModal = function() {
        window.closeOutreachModal();
        document.getElementById('add-c-companyId').value = document.getElementById('outreach-company-id').value;
        document.getElementById('add-c-uniqueId').value = document.getElementById('outreach-unique-id').value;
        document.getElementById('add-c-name').value = '';
        document.getElementById('add-c-email').value = '';
        document.getElementById('add-c-title').value = '';
        document.getElementById('add-c-status').textContent = '';
        
        const modal = document.getElementById('add-contact-modal');
        modal.classList.remove('invisible', 'opacity-0');
    }

    window.closeAddContactModal = function() {
        const modal = document.getElementById('add-contact-modal');
        modal.classList.add('invisible', 'opacity-0');
    }

    window.saveNewContact = function() {
        const name = document.getElementById('add-c-name').value;
        const email = document.getElementById('add-c-email').value;
        const title = document.getElementById('add-c-title').value;
        const companyId = document.getElementById('add-c-companyId').value;
        const uniqueId = document.getElementById('add-c-uniqueId').value;
        
        if (!name || !email) {
            document.getElementById('add-c-status').textContent = 'Name and Email are required.';
            return;
        }
        
        const btn = document.getElementById('save-new-contact-btn');
        btn.disabled = true;
        btn.textContent = 'Saving...';
        
        fetch(SHEET_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'addcontact', name, email, title, companyId })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                 handleTriageUpdate(uniqueId, 'history', `Harvested new Contact from Auto-Reply: ${name} (${email}).`, true);
                 setTimeout(() => {
                     window.closeAddContactModal();
                     window.openOutreachModal(uniqueId, currentOutreachCompany);
                 }, 1500);
            }
        })
        .finally(() => {
            btn.disabled = false;
            btn.textContent = 'Save to Freshdesk';
        });
    }
});
