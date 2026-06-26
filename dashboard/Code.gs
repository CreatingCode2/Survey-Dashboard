// ==========================================================================
// FILE: Config.gs
// ==========================================================================

var BATCH_ADMIN_EMAILS = [
  'misty.wilmore@runnertechnologies.com'
];

function isBatchAdmin(email) {
  if (!email) return false;
  var emailLower = email.toLowerCase().trim();
  if (BATCH_ADMIN_EMAILS.indexOf(emailLower) !== -1) return true;
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('User_Permissions');
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var rowEmail = String(data[i][1]).toLowerCase().trim();
        var rowRole = String(data[i][2]).toLowerCase().trim();
        if (rowEmail === emailLower && rowRole === 'admin') {
          return true;
        }
      }
    }
  } catch (e) {
    Logger.log("Error checking batch admin in sheet: " + e);
  }
  return false;
}

function getUserPermissions(email) {
  var defaultPerms = { name: 'Unknown', email: email, role: 'viewer', canAccessData: false, canAccessIntel: false };
  if (!email) return defaultPerms;
  
  var emailLower = email.toLowerCase().trim();
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('User_Permissions');
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var rowEmail = String(data[i][1]).toLowerCase().trim();
        if (rowEmail === emailLower) {
          var role = String(data[i][2]).toLowerCase().trim();
          var canAccessData = String(data[i][3]).toLowerCase() === 'true';
          var canAccessIntel = String(data[i][4]).toLowerCase() === 'true';
          
          if (role === 'admin') {
            canAccessData = true;
            canAccessIntel = true;
          }
          
          return {
            name: String(data[i][0]).trim(),
            email: emailLower,
            role: role,
            canAccessData: canAccessData,
            canAccessIntel: canAccessIntel
          };
        }
      }
    }
  } catch (e) {
    Logger.log("Error fetching user permissions: " + e);
  }
  
  // Fallback for hardcoded admin
  if (BATCH_ADMIN_EMAILS.indexOf(emailLower) !== -1) {
    defaultPerms.role = 'admin';
    defaultPerms.canAccessData = true;
    defaultPerms.canAccessIntel = true;
  }
  
  return defaultPerms;
}

// ── Ticket types that should never be AI-processed (noise) ────
var EXCLUDED_TICKET_TYPES = ['Spam', 'Runner Internal'];

var HARDCODED_IGNORED_TICKETS = [90745, 90746, 90757, 90760, 90761, 90847];

var NOISE_SUBJECT_PHRASES = [
  'out of office',
  'automatic reply',
  'auto-reply',
  'vacation',
  'autoreply',
  'oracle: security notification',
  'uptime robot',
  'zoom',
  'tempo',
  'basecamp',
  'rejected posting to infdba',
  'runner edq: holiday reminder',
  'your service request has been received and will be assigned',
  'confluence',
  'recall:',
  'passcode',
  'new voicemail',
  'unused transaction pool expires',
  'melissa product news',
  'melissa data subscription update',
  'file is complete and updated',
  'completed file posted on ftp',
  'transactions low'
];

function isNoiseSubject(subject) {
  if (!subject) return false;
  var s = subject.toLowerCase();
  for (var i = 0; i < NOISE_SUBJECT_PHRASES.length; i++) {
    if (s.indexOf(NOISE_SUBJECT_PHRASES[i]) !== -1) return true;
  }
  if (s.indexOf('runner edq') !== -1 && s.indexOf('celebration') !== -1) return true;
  return false;
}


// ==========================================================================
// FILE: SheetsService.gs
// ==========================================================================


function writeTicketAiData(ticket, aiResult) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Ticket_AI_Data');
  if (!sheet) {
    sheet = ss.insertSheet('Ticket_AI_Data');
    sheet.appendRow([
      'ticket_id', 'company_id', 'created_at', 'processed_at', 'subject_original', 
      'proposed_subject', 'summary', 'issue_type', 'integration', 'product_area', 
      'platform', 'severity', 'resolution', 'sentiment', 'status', 'tags'
    ]);
  }
  
  sheet.appendRow([
    ticket.id,
    ticket.company_id || '',
    ticket.created_at,
    new Date().toISOString(),
    ticket.subject,
    aiResult.proposed_subject,
    aiResult.summary,
    aiResult.issue_type,
    aiResult.integration,
    aiResult.product_area,
    aiResult.platform,
    aiResult.severity,
    aiResult.resolution,
    aiResult.sentiment,
    ticket.status,
    aiResult.tags_to_add.join(', ')
  ]);
}

function logAiProcessing(ticketId, status, actionOrError, dryRun, aiResult) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('AI_Processing_Log');
  if (!sheet) {
    sheet = ss.insertSheet('AI_Processing_Log');
    // 8-column header: includes proposed_subject + summary for dry-run audit preview
    sheet.appendRow(['timestamp', 'ticket_id', 'action', 'status', 'error_message', 'dry_run', 'proposed_subject', 'summary']);
  }

  var props = PropertiesService.getScriptProperties();
  var triggeredBy = props.getProperty('AI_Batch_TriggeredBy') || 'Unknown';

  var proposedSubject = '';
  var summary = '';
  if (status === 'success' && aiResult) {
    proposedSubject = aiResult.proposed_subject || '';
    // Truncate summary to 500 chars to avoid giant cells
    summary = (aiResult.summary || '').substring(0, 500);
  }

  var actionStr;
  if (status === 'success') actionStr = actionOrError;
  else if (status === 'skipped') actionStr = 'skipped';
  else actionStr = 'processing_failed';

  sheet.appendRow([
    new Date().toISOString(),
    ticketId,
    actionStr + ' [by: ' + triggeredBy + ']',
    status,
    (status === 'error' || status === 'skipped') ? actionOrError : '',
    dryRun ? 'TRUE' : 'FALSE',
    proposedSubject,
    summary
  ]);
}

// ============================================================================
// DIAGNOSTIC & TEST HELPERS
// ============================================================================

/**
 * STEP 1 — Run this FIRST.
 * Dumps every custom field name and current value from a real ticket.
 * This confirms the exact API field names (cf_revised_subject_name, etc.)
 * before we attempt any writes.
 *
 * HOW TO USE:
 *   1. Open Google Apps Script
 *   2. Select "inspectTicketFields" from the function dropdown
 *   3. Click Run
 *   4. Open "Execution Log" and look for the custom_fields section
 */

function updateTicketAiDataRow(ticketId, updates) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Ticket_AI_Data');
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(ticketId)) {
      if (updates.proposed_subject !== undefined) sheet.getRange(i + 1, 6).setValue(updates.proposed_subject);
      if (updates.integration !== undefined) sheet.getRange(i + 1, 9).setValue(updates.integration);
      if (updates.product_area !== undefined) sheet.getRange(i + 1, 10).setValue(updates.product_area);
      break;
    }
  }
}

function deleteTicketAiDataRow(ticketId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Ticket_AI_Data');
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  // Bottom up to not shift indices
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]).trim() === String(ticketId)) {
      sheet.deleteRow(i + 1);
    }
  }
}

function addTagToTicketAiDataRow(ticketId, tag) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Ticket_AI_Data');
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(ticketId)) {
      var existingTags = String(data[i][15] || ''); // index 15 is tags column
      if (existingTags.indexOf(tag) === -1) {
        var newTags = existingTags ? existingTags + ', ' + tag : tag;
        sheet.getRange(i + 1, 16).setValue(newTags); // column 16 is index 15
      }
      break;
    }
  }
}


// ==========================================================================
// FILE: FreshdeskService.gs
// ==========================================================================



function syncFreshdesk() {
  var apiKey = PropertiesService.getScriptProperties().getProperty('Freshdesk_Api_Key');
  if (!apiKey) {
    Logger.log('Error: Freshdesk_Api_Key not found in Script Properties.');
    return;
  }

  var domain = 'runnertech.freshdesk.com';
  var authHeader = 'Basic ' + Utilities.base64Encode(apiKey + ':X');
  var options = {
    'method': 'get',
    'headers': {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    'muteHttpExceptions': true
  };

  var companies = {};
  var page = 1;
  while (true) {
    var companyUrl = 'https://' + domain + '/api/v2/companies?per_page=100&page=' + page;
    var response = UrlFetchApp.fetch(companyUrl, options);
    if (response.getResponseCode() !== 200) {
      Logger.log("Failed to fetch companies: " + response.getContentText());
      break;
    }
    var data = JSON.parse(response.getContentText());
    if (data.length === 0) break;

    for (var i = 0; i < data.length; i++) {
      companies[data[i].id] = data[i].name;
    }
    page++;
    if (page > 50) break;
  }

  var lastTicketDates = {};
  var date = new Date();
  date.setDate(date.getDate() - 365);
  var updatedSince = date.toISOString().split('.')[0] + 'Z';

  page = 1;
  while (true) {
    var ticketUrl = 'https://' + domain + '/api/v2/tickets?updated_since=' + updatedSince + '&per_page=100&page=' + page;
    var response = UrlFetchApp.fetch(ticketUrl, options);
    if (response.getResponseCode() !== 200) {
      Logger.log("Failed to fetch tickets: " + response.getContentText());
      break;
    }
    var tickets = JSON.parse(response.getContentText());
    if (tickets.length === 0) break;

    for (var i = 0; i < tickets.length; i++) {
      var t = tickets[i];
      if (t.company_id) {
        // Filter out OOO and Auto-Replies
        var subject = t.subject ? t.subject.toLowerCase() : '';
        var tags = t.tags ? t.tags.map(function(tag) { return tag.toLowerCase(); }) : [];
        var isAutoReply = false;
        
        if (subject.indexOf('out of office') !== -1 || subject.indexOf('automatic reply') !== -1 || subject.indexOf('auto-reply') !== -1 || subject.indexOf('vacation') !== -1 || subject.indexOf('autoreply') !== -1) {
          isAutoReply = true;
        }
        if (tags.indexOf('out of office') !== -1 || tags.indexOf('auto-reply') !== -1 || tags.indexOf('ooo') !== -1 || tags.indexOf('vacation') !== -1) {
          isAutoReply = true;
        }

        if (!isAutoReply) {
          var ticketDate = new Date(t.created_at);
          if (!lastTicketDates[t.company_id] || ticketDate > lastTicketDates[t.company_id]) {
            lastTicketDates[t.company_id] = ticketDate;
          }
        }
      }
    }
    page++;
    if (page > 50) break;
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Freshdesk_Data');
  if (!sheet) {
    Logger.log('Error: Freshdesk_Data tab not found.');
    return;
  }

  sheet.clear();
  var output = [['Company', 'Last_Ticket_Date', 'Company_ID']];

  for (var companyId in companies) {
    var companyName = companies[companyId];
    var lastDate = lastTicketDates[companyId] ? lastTicketDates[companyId] : '';
    output.push([companyName, lastDate, companyId]);
  }

  sheet.getRange(1, 1, output.length, 2).setValues(output);
  Logger.log('Successfully synced Freshdesk data! Total companies processed: ' + (output.length - 1));
}

function autoFlagExhaustedAccounts() {
  var apiKey = PropertiesService.getScriptProperties().getProperty('Freshdesk_Api_Key');
  if (!apiKey) {
    Logger.log('Error: Freshdesk_Api_Key not found.');
    return;
  }
  var authHeader = 'Basic ' + Utilities.base64Encode(apiKey + ':X');
  var fdOpts = { 'headers': { 'Authorization': authHeader }, 'muteHttpExceptions': true };
  var domain = 'runnertech.freshdesk.com';

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var fdSheet = ss.getSheetByName('Freshdesk_Data');
  var triageSheet = ss.getSheetByName('Triage_Data');
  
  if (!fdSheet || !triageSheet) return;

  var fdData = fdSheet.getDataRange().getValues();
  var triageData = triageSheet.getDataRange().getValues();
  
  // 1. Find all "active" companies in the Triage Data (get their latest status)
  var triageStatus = {};
  for (var i = 1; i < triageData.length; i++) {
    if (triageData[i][2] === 'status') {
      triageStatus[triageData[i][1]] = triageData[i][3]; 
    }
  }

  // 2. Iterate companies in Freshdesk Data
  for (var f = 1; f < fdData.length; f++) {
    var companyName = fdData[f][0];
    var companyId = fdData[f][2];
    if (!companyId) continue;
    
    var currentStatus = triageStatus[companyName];
    // Skip if already flagged or canceled
    if (currentStatus === 'Requires CS Review - DNC/Exhausted' || currentStatus === 'Inactive - Canceled' || currentStatus === 'Archived') {
       continue;
    }

    // Check contacts
    var validCount = 0;
    var cRes = UrlFetchApp.fetch('https://' + domain + '/api/v2/contacts?company_id=' + companyId + '&per_page=100', fdOpts);
    if (cRes.getResponseCode() === 200) {
      var cts = JSON.parse(cRes.getContentText());
      for (var j = 0; j < cts.length; j++) {
        var c = cts[j];
        var cn = (c.name || '').toLowerCase();
        if (cn.indexOf('- do not contact') !== -1 || cn.indexOf('- retired') !== -1 || cn.indexOf(' retired') !== -1) continue;
        if (!c.email) continue;
        validCount++;
      }
    }

    // If zero valid contacts flag it
    if (validCount === 0) {
      var uniqueId = Utilities.getUuid();
      var timestamp = new Date().toISOString();
      triageSheet.appendRow([uniqueId, companyName, 'status', 'Requires CS Review - DNC/Exhausted', timestamp, 'System', 'system@runnertechnologies.com', 'System: Account flagged because all Freshdesk contacts are marked DNC/Retired or missing.']);
      Logger.log("Flagged " + companyName + " as Exhausted.");
      
      // Email alert corresponding to exhaustion
      var csmSearch = 'Unassigned';
      for (var r = triageData.length - 1; r >= 1; r--) {
        if (triageData[r][1] === companyName && triageData[r][2] === 'csm') {
          csmSearch = triageData[r][3];
          break;
        }
      }
      if (csmSearch !== 'Unassigned') {
        var emailExhaust = "";
        if (csmSearch === "Misty Wilmore") emailExhaust = "misty.wilmore@runnertechnologies.com";
        else if (csmSearch === "Tonja Jones") emailExhaust = "tonja.jones@runnertechnologies.com";
        
        if (emailExhaust !== "") {
          var subjectExhaust = "Outreach Alert: " + companyName + " Contacts Exhausted";
          var bodyExhaust = "Hello " + csmSearch + ",\n\n" +
                     "All known contacts for " + companyName + " have either failed the cadence or are marked Do Not Contact/Retired.\n\n" +
                     "Please perform manual research to find a new contact. Once you find one, open the dashboard's Engagement Blackout View and click [+ Add Researched Contact] to seamlessly inject them into the cadence.\n\n" +
                     "Best,\nCustomer Health Automation";
          try {
            GmailApp.sendEmail(emailExhaust, subjectExhaust, bodyExhaust, {
              from: "customersuccess@runnertechnologies.com"
            });
          } catch(e) {
            MailApp.sendEmail(emailExhaust, subjectExhaust, bodyExhaust);
          }
        }
      }
    }
  }
}

// ── UI Queue Helper Functions ─────────────────────────────────────────────
function updateFreshdeskTicketFields(ticketId, customFields) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('Freshdesk_Api_Key');
  var domain = 'runnertech.freshdesk.com';
  var authHeader = 'Basic ' + Utilities.base64Encode(apiKey + ':X');
  
  var payload = { custom_fields: customFields };
  var updateUrl = 'https://' + domain + '/api/v2/tickets/' + ticketId;
  var updateOptions = {
    'method': 'put',
    'headers': { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };
  
  var updateRes = UrlFetchApp.fetch(updateUrl, updateOptions);
  if (updateRes.getResponseCode() === 200) return { status: 'success' };
  return { status: 'error', message: updateRes.getContentText() };
}

function updateFreshdeskTicketTags(ticketId, tagsToAdd) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('Freshdesk_Api_Key');
  var domain = 'runnertech.freshdesk.com';
  var authHeader = 'Basic ' + Utilities.base64Encode(apiKey + ':X');
  var fdOpts = { headers: { Authorization: authHeader }, muteHttpExceptions: true };
  
  // Get current tags
  var res = UrlFetchApp.fetch('https://' + domain + '/api/v2/tickets/' + ticketId, fdOpts);
  if (res.getResponseCode() !== 200) return { status: 'error' };
  var ticket = JSON.parse(res.getContentText());
  var tags = ticket.tags || [];
  
  tagsToAdd.forEach(function(t) {
    if (tags.indexOf(t) === -1) tags.push(t);
  });
  
  var updateUrl = 'https://' + domain + '/api/v2/tickets/' + ticketId;
  var updateOptions = {
    'method': 'put',
    'headers': { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    'payload': JSON.stringify({ tags: tags }),
    'muteHttpExceptions': true
  };
  var updateRes = UrlFetchApp.fetch(updateUrl, updateOptions);
  if (updateRes.getResponseCode() === 200) return { status: 'success' };
  return { status: 'error', message: updateRes.getContentText() };
}

function removeFreshdeskAiTags(ticketId) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('Freshdesk_Api_Key');
  var domain = 'runnertech.freshdesk.com';
  var authHeader = 'Basic ' + Utilities.base64Encode(apiKey + ':X');
  var fdOpts = { headers: { Authorization: authHeader }, muteHttpExceptions: true };
  
  var res = UrlFetchApp.fetch('https://' + domain + '/api/v2/tickets/' + ticketId, fdOpts);
  if (res.getResponseCode() !== 200) return;
  var ticket = JSON.parse(res.getContentText());
  var tags = ticket.tags || [];
  var newTags = [];
  for (var i = 0; i < tags.length; i++) {
    if (tags[i].indexOf('ai:') !== 0) newTags.push(tags[i]);
  }
  
  var updateUrl = 'https://' + domain + '/api/v2/tickets/' + ticketId;
  var updateOptions = {
    'method': 'put',
    'headers': { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    'payload': JSON.stringify({ tags: newTags }),
    'muteHttpExceptions': true
  };
  UrlFetchApp.fetch(updateUrl, updateOptions);
}


// ==========================================================================
// FILE: AiService.gs
// ==========================================================================


// ============================================================================
// TICKET INTELLIGENCE & AI AUTOMATION
// ============================================================================

function callGemini(prompt) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('Gemini_Api_Key');
  if (!apiKey) throw new Error('Gemini_Api_Key not found in Script Properties.');

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + apiKey;
  var payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json"
    }
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var maxRetries = 5;
  for (var attempt = 1; attempt <= maxRetries; attempt++) {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    var text = response.getContentText();

    if (code === 200) {
      var data = JSON.parse(text);
      if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
        return JSON.parse(data.candidates[0].content.parts[0].text);
      } else {
        throw new Error('Unexpected Gemini response structure: ' + text);
      }
    } else if ((code === 429 || code === 503) && attempt < maxRetries) {
      // Read the exact retryDelay from the API response, with a safe fallback.
      var retryDelaySec = 65; // safe default: just over 1 minute
      try {
        var errBody = JSON.parse(text);
        var details = (errBody.error && errBody.error.details) ? errBody.error.details : [];
        for (var d = 0; d < details.length; d++) {
          if (details[d]['@type'] === 'type.googleapis.com/google.rpc.RetryInfo' && details[d].retryDelay) {
            // retryDelay is a string like "49s" or "49.342352113s"
            retryDelaySec = Math.ceil(parseFloat(details[d].retryDelay)) + 5;
            break;
          }
        }
      } catch (parseErr) { /* use default */ }

      Logger.log('Gemini ' + code + ' hit. Sleeping ' + retryDelaySec + 's before retry ' + (attempt + 1) + '/' + maxRetries);
      Utilities.sleep(retryDelaySec * 1000);
    } else {
      throw new Error('Gemini API Error: ' + text);
    }
  }
}

function callGroq(prompt) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('Groq_Api_Key');
  if (!apiKey) throw new Error('Groq_Api_Key not found in Script Properties.');

  var url = 'https://api.groq.com/openai/v1/chat/completions';
  var payload = {
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.2,
    response_format: { type: "json_object" }
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + apiKey
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var maxRetries = 5;
  for (var attempt = 1; attempt <= maxRetries; attempt++) {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    var text = response.getContentText();

    if (code === 200) {
      var data = JSON.parse(text);
      if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
        return JSON.parse(data.choices[0].message.content);
      } else {
        throw new Error('Unexpected Groq response structure: ' + text);
      }
    } else if ((code === 429 || code === 503) && attempt < maxRetries) {
      var retryDelaySec = 15; // default wait
      try {
        var errBody = JSON.parse(text);
        var errMsg = errBody.error ? errBody.error.message : '';
        var match = errMsg.match(/try again in ([\d\.]+)s/i);
        if (match) {
          retryDelaySec = Math.ceil(parseFloat(match[1])) + 2;
        }
      } catch (parseErr) { /* use default */ }

      Logger.log('Groq ' + code + ' hit. Sleeping ' + retryDelaySec + 's before retry ' + (attempt + 1) + '/' + maxRetries);
      Utilities.sleep(retryDelaySec * 1000);
    } else {
      throw new Error('Groq API Error: ' + text);
    }
  }
}

function processSingleTicketManual(ticketId) {
  return processTicket(ticketId, false);
}

function processTicket(ticketId, dryRun) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('Freshdesk_Api_Key');
  if (!apiKey) throw new Error('Freshdesk_Api_Key not found.');
  
  var domain = 'runnertech.freshdesk.com';
  var authHeader = 'Basic ' + Utilities.base64Encode(apiKey + ':X');
  var fdOpts = { 'headers': { 'Authorization': authHeader }, 'muteHttpExceptions': true };
  
  // 1. Fetch Ticket Details
  var ticketUrl = 'https://' + domain + '/api/v2/tickets/' + ticketId + '?include=requester';
  var ticketRes = UrlFetchApp.fetch(ticketUrl, fdOpts);
  if (ticketRes.getResponseCode() !== 200) throw new Error('Failed to fetch ticket: ' + ticketRes.getContentText());
  var ticket = JSON.parse(ticketRes.getContentText());

  // SAFETY BACKSTOP: Never process open tickets, regardless of how this function was called.
  // Status 4 = Resolved, Status 5 = Closed. Anything else is open/pending and must be skipped.
  var ticketStatusInner = ticket.status;
  if (ticketStatusInner !== 4 && ticketStatusInner !== 5) {
    var openMsg = 'Ticket #' + ticketId + ' is not Resolved or Closed (status ' + ticketStatusInner + '). Skipping.';
    Logger.log(openMsg);
    logAiProcessing(ticketId, 'skipped', openMsg, dryRun, null);
    return { status: 'skipped', message: openMsg };
  }
  
  // 2. Fetch Conversations
  var convUrl = 'https://' + domain + '/api/v2/tickets/' + ticketId + '/conversations';
  var convRes = UrlFetchApp.fetch(convUrl, fdOpts);
  if (convRes.getResponseCode() !== 200) throw new Error('Failed to fetch conversations.');
  var conversations = JSON.parse(convRes.getContentText());
  
  // Extract Agent Fields
  var customFields = ticket.custom_fields || {};
  var agentProduct = customFields.solutions || 'Unknown';
  var agentPlatform = customFields.cf_platform || 'Unknown';
  var agentIntegration = customFields.cf_erp_integration || customFields.cf_integration || customFields.erp_integration || customFields.integration || 'Unknown';
  if (['ncoa', 'ftp', 'sftp', 'melissa', 'none', 'n/a'].indexOf(agentIntegration.toLowerCase()) !== -1) {
      agentIntegration = 'None';
  }
  
  // Combine all text for prompt
  var thread = "Ticket Fields (Assigned by Agent):\n";
  thread += "- Product Area/Solution: " + agentProduct + "\n";
  thread += "- ERP Integration: " + agentIntegration + "\n";
  thread += "- Platform/OS: " + agentPlatform + "\n\n";
  thread += "Subject: " + ticket.subject + "\n\n";
  thread += "Initial Description:\n" + (ticket.description_text || ticket.description) + "\n\n";
  
  for (var i = 0; i < conversations.length; i++) {
    var c = conversations[i];
    var type = c.incoming ? "Customer Reply" : (c.private ? "Internal Note" : "Agent Reply");
    thread += "--- " + type + " (" + c.created_at + ") ---\n";
    thread += (c.body_text || c.body) + "\n\n";
  }
  
  // Noise Filter Check
  var subjLower = (ticket.subject || '').toLowerCase();
  var rawDesc = (ticket.description_text || ticket.description || '').toLowerCase();
  var descLower = rawDesc.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ');
  var threadLower = (thread || '').toLowerCase().replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ');
  var isNoiseTicket = false;
  
  // 1. Basic auto-replies, monitoring tools, internal notices, and system noise
  if (subjLower.indexOf('out of office') !== -1 ||
      subjLower.indexOf('automatic reply') !== -1 ||
      subjLower.indexOf('auto-reply') !== -1 ||
      subjLower.indexOf('autoreply') !== -1 ||
      subjLower.indexOf('vacation reply') !== -1 ||
      subjLower.indexOf('oracle: security notification') !== -1 ||
      subjLower.indexOf('uptimerobot') !== -1 ||
      subjLower.indexOf('uptime robot') !== -1 ||
      subjLower.indexOf('monitor is down') !== -1 ||
      subjLower.indexOf('monitor is up') !== -1 ||
      subjLower.indexOf('zoom') !== -1 ||
      subjLower.indexOf('tempo') !== -1 ||
      subjLower.indexOf('basecamp') !== -1 ||
      subjLower.indexOf('recall:') !== -1 ||
      subjLower.indexOf('rejected posting to infdba') !== -1 ||
      subjLower.indexOf('runner edq: holiday reminder') !== -1 ||
      (subjLower.indexOf('runner edq') !== -1 && subjLower.indexOf('celebration') !== -1) ||
      subjLower.indexOf('confluence') !== -1) {
    isNoiseTicket = true;
  }
  
  // 2. Deep monitoring/noise indicators (UptimeRobot, Zoom from desc, closed/merged from thread)
  if (!isNoiseTicket) {
    if (descLower.indexOf('uptimerobot') !== -1 || 
        descLower.indexOf('zoom.us') !== -1 || 
        threadLower.indexOf('closed and merged into ticket') !== -1) {
      isNoiseTicket = true;
    }
  }

  // 3. Sales / Marketing / Outbound notifications
  if (!isNoiseTicket && (subjLower.indexOf('cloud mastery bootcamp') !== -1 || 
                         subjLower.indexOf('got hired') !== -1 ||
                         subjLower.indexOf('welcome on-boarding package') !== -1 || 
                         subjLower.indexOf('onboarding package') !== -1)) {
    isNoiseTicket = true;
  }

  // 4. Melissa Data File Notifications (Skip pure "ready to be processed" notices)
  if (!isNoiseTicket && (subjLower.indexOf('file is ready to be processed') !== -1 ||
                         subjLower.indexOf('file ready for processing') !== -1 ||
                         subjLower.indexOf('file uploaded successfully') !== -1 ||
                         subjLower.indexOf('has been completed') !== -1 ||
                         subjLower.indexOf('file is ready') !== -1 ||
                         subjLower.indexOf('uploaded to their ftp') !== -1 ||
                         descLower.indexOf('file uploaded successfully') !== -1 ||
                         descLower.indexOf('uploaded to their ftp') !== -1 ||
                         descLower.indexOf('file is ready to be processed') !== -1)) {
    isNoiseTicket = true;
  }
  
  // 4b. Block tickets from known noise sender emails/domains
  var EXCLUDED_SENDER_EMAILS = [
    'giselle.mazurat@runnertechnologies.com',  // Internal Runner — not customer tickets
    'lourdes.delfin@runchero.com',             // Known noise sender
    'listserv@list.unm.edu',                   // Specific listserv address — not a customer
    'samratkapoor620@gmail.com',               // Spam/unsolicited
    'no-reply@mermaid.ai',                     // Automated tool notification
    'daas_alerts@informatica.com'              // Informatica automated alerts
  ];
  var EXCLUDED_SENDER_DOMAINS = [
    'melissa.com', 'melissadata.com',          // Melissa file notifications
    'mermaid.ai',                              // Mermaid automated emails
    'email.openai.com',                        // OpenAI automated emails
    'oracle-mail.com',                         // Oracle automated emails
    'replies.app.basecamp.com'                 // Basecamp automated emails
  ];
  if (!isNoiseTicket && ticket.requester_id) {
    try {
      // Use requester data already included in the ticket fetch (no extra API call needed)
      var requesterEmail = '';
      if (ticket.requester && ticket.requester.email) {
        requesterEmail = ticket.requester.email.toLowerCase();
      } else {
        // Fallback: fetch contact separately if requester not embedded
        var contactRes = UrlFetchApp.fetch('https://runnertech.freshdesk.com/api/v2/contacts/' + ticket.requester_id, fdOpts);
        if (contactRes.getResponseCode() === 200) {
          requesterEmail = (JSON.parse(contactRes.getContentText()).email || '').toLowerCase();
        }
      }
      // Check exact email match
      if (EXCLUDED_SENDER_EMAILS.indexOf(requesterEmail) !== -1) {
        isNoiseTicket = true;
      }
      // Check domain match
      if (!isNoiseTicket) {
        var senderDomain = requesterEmail.split('@')[1] || '';
        for (var sd = 0; sd < EXCLUDED_SENDER_DOMAINS.length; sd++) {
          if (senderDomain === EXCLUDED_SENDER_DOMAINS[sd] || senderDomain.indexOf(EXCLUDED_SENDER_DOMAINS[sd]) !== -1) {
            isNoiseTicket = true;
            break;
          }
        }
      }
      // Confluence: check if sender domain or subject contains 'confluence' or 'atlassian'
      if (!isNoiseTicket && (requesterEmail.indexOf('atlassian') !== -1 || requesterEmail.indexOf('confluence') !== -1)) {
        isNoiseTicket = true;
      }
    } catch (e) {
      Logger.log('Failed to check sender email for ticket ' + ticketId + ': ' + e.message);
    }
  }
  
  // 5. GeoPoints automated data-update notices — skip ONLY if it's a pure notification
  // (no indication of a customer-reported problem in subject or first description)
  if (!isNoiseTicket && subjLower.indexOf('[external] geopoints data update') !== -1) {
    var hasProblemIndicator = descLower.indexOf('error') !== -1 ||
        descLower.indexOf('issue') !== -1 ||
        descLower.indexOf('problem') !== -1 ||
        descLower.indexOf('fail') !== -1 ||
        descLower.indexOf('not working') !== -1 ||
        descLower.indexOf('can\'t') !== -1 ||
        descLower.indexOf('cannot') !== -1 ||
        descLower.indexOf('help') !== -1;
    if (!hasProblemIndicator) {
      isNoiseTicket = true;
    }
  }
  
  // 6. Hardcoded Tickets to Ignore and specific subject phrases
  var HARDCODED_IGNORED_TICKETS = [90745, 90746, 90757, 90760, 90761];
  if (HARDCODED_IGNORED_TICKETS.indexOf(Number(ticketId)) !== -1) {
    isNoiseTicket = true;
  }
  if (subjLower.indexOf('your service request has been received and will be assigned') !== -1) {
    isNoiseTicket = true;
  }
  
  if (isNoiseTicket) {
    var skipMsg = "Ticket skipped due to noise filtering (Auto-reply/Admin alert).";
    logAiProcessing(ticketId, "skipped", skipMsg, dryRun, null);
    
    // Write a tag back to Freshdesk so we never evaluate this noise ticket again!
    if (!dryRun) {
      try {
        var existingTags = ticket.tags || [];
        if (existingTags.indexOf('ai:skipped-noise') === -1) {
          existingTags.push('ai:skipped-noise');
          UrlFetchApp.fetch(ticketUrl, {
            'method': 'put',
            'headers': { 'Authorization': fdOpts.headers.Authorization, 'Content-Type': 'application/json' },
            'payload': JSON.stringify({ tags: existingTags }),
            'muteHttpExceptions': true
          });
        }
      } catch (e) {
        Logger.log("Failed to tag noise ticket " + ticketId + ": " + e.message);
      }
    }
    
    return { status: "skipped", message: skipMsg };
  }
  
  // 3. Build Prompt
  var prompt = "You are a customer support intelligence agent. Analyze the following support ticket thread.\n\n" +
    "Ticket Thread:\n" + thread + "\n\n" +
    "Please provide a JSON response with the following keys:\n" +
    "- summary: A detailed summary of the problem, steps taken, and resolution. Paragraph format. Use the Agent Fields provided to contextualize your summary.\n" +
    "- proposed_subject: A revised subject line. You MUST include the brackets. If integration is 'None' or 'Unknown', format strictly as '[{Product Area}]: {Issue Type} - {Short Description}'. Otherwise, format strictly as '[{Product Area} - {Integration}]: {Issue Type} - {Short Description}'. (Max 80 chars)\n" +
    "- issue_type: A short, specific 2-4 word phrase describing the exact type of issue (e.g., NCOA File Upload, Database Migration, Login Failure, SFTP Access). Be descriptive and specific so we can accurately analyze issue trends later. Do not restrict yourself to a predefined list.\n" +
    "- product_area: MUST be the exact Agent-Assigned Product Area/Solution if provided. Otherwise classify using ONLY these exact values: CLEAN_Address, CLEAN_Cloud, CLEAN_Data Portal, CLEAN_Entry, CLEAN_File, CLEAN_Update, Data Enhancement Services, Documentation, SurveyDIG, On boarding, Other. IMPORTANT: FTP file delivery tickets, SFTP access tickets, NCOA processing tickets, and Data Enhancement batch jobs are product_area = 'Data Enhancement Services'.\n" +
    "- integration: If the ticket is for a Data Enhancement Service, format as 'DES - [Service]'. If it involves an ERP or Integration, you MUST aggressively scan the conversation for specific modules or interfaces. Explicitly look for 'HCM', 'FIN', 'Finance', 'cs', 'Campus Solutions' (map to PeopleSoft - CS), 'Admin', 'ss', 'ssb', 'ss 9.x', 'self service' (map to Banner - Self Service), 'Classic', 'Fluid', 'EDI'. Format exactly as '[Base ERP] - [Module]'. If SurveyDIG is mentioned, output 'SurveyDIG'. DO NOT output 'Text Connector' or 'Guild Core Engine'. Valid Base ERPs: Advance, Banner, PeopleSoft, Colleague, JD Edwards, Oracle EBS, Oracle Database, SurveyDIG, None. CRITICAL: FTP, SFTP, and file processing are NOT integrations - use 'None' for those.\n" +
    "- platform: MUST be the exact Agent-Assigned Platform if provided. Otherwise: Cloud, Windows, Linux, or Other.\n" +
    "- severity: critical, high, medium, or low.\n" +
    "- resolution: solution-provided, fixed-bug, user-error, workaround-provided, escalated, or pending.\n" +
    "- sentiment: positive, neutral, frustrated, or frustrated-then-resolved.\n" +
    "- tags_to_add: An array of 3-5 tags prefixed with 'ai:'. For example: ['ai:integration-failure', 'ai:banner', 'ai:sev-high'].";
    
  // 4. Call AI (Dynamic fallback)
  var aiResult;
  var isUsingGroq = false;
  try {
    var groqApiKey = PropertiesService.getScriptProperties().getProperty('Groq_Api_Key');
    if (groqApiKey) {
      isUsingGroq = true;
      aiResult = callGroq(prompt);
    } else {
      aiResult = callGemini(prompt);
    }
  } catch (e) {
    var apiName = isUsingGroq ? "Groq" : "Gemini";
    logAiProcessing(ticketId, "error", apiName + " API failed: " + e.message, dryRun);
    return { status: "error", message: e.message };
  }
  
  // --- AGGRESSIVE POST-PROCESSING SANITIZATION & WHITELISTS ---
  if (aiResult) {
    // 1. Strict Validation for Products (Must be exact match, else 'Other')
    var VALID_PRODUCTS = [
      'CLEAN_Address', 'CLEAN_Cloud', 'CLEAN_Data Portal', 'CLEAN_Entry', 
      'CLEAN_File', 'CLEAN_Update', 'Data Enhancement Services', 
      'Documentation', 'SurveyDIG', 'On boarding', 'Other'
    ];
    if (aiResult.product_area && VALID_PRODUCTS.indexOf(aiResult.product_area) === -1) {
      aiResult.product_area = 'Other';
    }

    // 2. Intelligent Validation for ERPs (Must START with an approved Base ERP)
    var VALID_BASE_ERPS = [
      'Advance', 'Banner', 'Colleague', 'JD Edwards', 'Oracle EBS', 
      'Oracle Database', 'PeopleSoft', 'SurveyDIG', 'DES', 'None'
    ];
    
    if (aiResult.integration) {
      // First strip out known stubborn hallucinations
      if (aiResult.integration.indexOf('Guild Core Engine') !== -1) {
        aiResult.integration = 'None';
      }
      
      // Then validate it starts with an approved Base ERP
      var startsWithValidErp = false;
      for (var k = 0; k < VALID_BASE_ERPS.length; k++) {
        if (aiResult.integration.indexOf(VALID_BASE_ERPS[k]) === 0) {
          startsWithValidErp = true;
          break;
        }
      }
      if (!startsWithValidErp) {
        aiResult.integration = 'None';
      }
    }

    // 3. Scrub Subject Line
    if (aiResult.proposed_subject) {
      aiResult.proposed_subject = aiResult.proposed_subject.replace(/ - Guild Core Engine/ig, '');
      aiResult.proposed_subject = aiResult.proposed_subject.replace(/Guild Core Engine/ig, 'None');
    }
  }
  // -------------------------------------------------------------
  
  // 5. Apply Updates to Freshdesk (if not dry run)
  if (!dryRun) {
    var updatePayload = {
      custom_fields: {
        cf_revised_subject_name: aiResult.proposed_subject,
        cf_ai_summary_notes: aiResult.summary
      },
      tags: ticket.tags.concat(aiResult.tags_to_add)
    };
    
    var updateOptions = {
      method: 'put',
      contentType: 'application/json',
      headers: { 'Authorization': authHeader },
      payload: JSON.stringify(updatePayload),
      muteHttpExceptions: true
    };
    
    var updateRes = UrlFetchApp.fetch(ticketUrl, updateOptions);
    
    // Auto-fix Freshdesk mandatory field validation errors on legacy/broken tickets
    if (updateRes.getResponseCode() === 400 && updateRes.getContentText().indexOf('Validation failed') !== -1) {
      var errData = JSON.parse(updateRes.getContentText());
      var needsRetry = false;
      var errs = errData.errors || [];
      
      for (var e = 0; e < errs.length; e++) {
        if (errs[e].field === 'custom_fields.solutions') {
          updatePayload.custom_fields.solutions = 'Other';
          needsRetry = true;
        } else if (errs[e].field === 'custom_fields.close_root_cause') {
          updatePayload.custom_fields.close_root_cause = 'Not a ticket (Info or cc)';
          needsRetry = true;
        } else if (errs[e].field === 'custom_fields.erp_integration') {
          updatePayload.custom_fields.erp_integration = 'Other';
          needsRetry = true;
        } else if (errs[e].field === 'type') {
          updatePayload.type = 'Incident';
          needsRetry = true;
        } else if (errs[e].field === 'custom_fields.cf_platform') {
          updatePayload.custom_fields.cf_platform = 'Other';
          needsRetry = true;
        }
      }
      
      if (needsRetry) {
        updateOptions.payload = JSON.stringify(updatePayload);
        updateRes = UrlFetchApp.fetch(ticketUrl, updateOptions);
      }
    }

    if (updateRes.getResponseCode() !== 200) {
      logAiProcessing(ticketId, "error", "FD Update failed: " + updateRes.getContentText(), dryRun);
      return { status: "error", message: "Failed to update FD: " + updateRes.getContentText() };
    }
  }
  
  // 6. Write to Google Sheets Database ONLY if live run (keeps charts clean)
  if (!dryRun) {
    writeTicketAiData(ticket, aiResult);
  }
  
  // Pass aiResult to log so dry-run audit shows exactly what WOULD be written to Freshdesk
  logAiProcessing(ticketId, 'success', 'Summarized & Tagged', dryRun, aiResult);

  return { status: 'success', ai_result: aiResult };
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

function batchProcessTicketsTrigger() {
  var props = PropertiesService.getScriptProperties();
  var isRunning = props.getProperty('AI_Batch_Running');
  if (isRunning !== 'true') return;

  // CRITICAL: Prevent two trigger invocations from running simultaneously.
  // If a previous trigger is still executing, this one exits immediately.
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(1000); // wait up to 1 second; if still locked, bail out
  } catch (e) {
    Logger.log('Another batch run is already in progress. Skipping this trigger invocation.');
    return;
  }

  try {
    var dryRun = props.getProperty('AI_Batch_DryRun') === 'true';
    batchProcessTickets(dryRun);
  } finally {
    lock.releaseLock();
  }
}

function batchProcessTicketsTrigger() {
  var props = PropertiesService.getScriptProperties();
  var isRunning = props.getProperty('AI_Batch_Running');
  if (isRunning !== 'true') return;

  // CRITICAL: Prevent two trigger invocations from running simultaneously.
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(1000); // wait up to 1 second; if still locked, bail out
  } catch (e) {
    Logger.log('Another batch run is already in progress. Skipping this trigger invocation.');
    return;
  }

  try {
    var dryRun = props.getProperty('AI_Batch_DryRun') === 'true';
    batchProcessTickets(dryRun);
  } finally {
    lock.releaseLock();
  }
}

function startBatchAiJob(dryRun, overwrite, triggeredBy, triggeredByEmail, limit, daysBack, startDate, endDate) {
  // CRITICAL: Clean up any old execution triggers from previous failed jobs before starting!
  cleanupBatchTriggers();

  var props = PropertiesService.getScriptProperties();
  props.setProperty('AI_Batch_Running', 'true');
  props.setProperty('AI_Batch_DryRun', dryRun ? 'true' : 'false');
  props.setProperty('AI_Batch_Overwrite', overwrite ? 'true' : 'false');
  props.setProperty('AI_Batch_Page', '1');
  props.setProperty('AI_Batch_Count', '0');
  props.setProperty('AI_Batch_FailCount', '0');    // NEW: track failures
  props.setProperty('AI_Batch_SkipCount', '0');    // NEW: track skips
  props.setProperty('AI_Batch_Limit', (limit || 0).toString());
  props.setProperty('AI_Batch_DaysBack', (daysBack || 365).toString());
  props.setProperty('AI_Batch_StartDate', startDate || '');
  props.setProperty('AI_Batch_EndDate', endDate || '');
  props.setProperty('AI_Batch_TriggeredBy', triggeredBy || 'Unknown');
  props.setProperty('AI_Batch_TriggeredByEmail', triggeredByEmail || '');
  props.setProperty('AI_Batch_StartTime', new Date().toISOString()); // NEW
  props.setProperty('AI_Batch_LastRunEnd', '');    // Clear previous end time

  // Try processing immediately
  batchProcessTickets(dryRun);
}

function setupDailyMaintenanceTrigger() {
  // Delete existing triggers for this function to avoid duplicates
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'runDailyMaintenanceBatch') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Set trigger to run daily at 1 AM
  ScriptApp.newTrigger('runDailyMaintenanceBatch')
           .timeBased()
           .everyDays(1)
           .atHour(1)
           .create();
}

function runDailyMaintenanceBatch() {
  // Scan the last 30 days for newly closed/resolved tickets
  startBatchAiJob(false, 'Daily Maintenance Trigger', 'system@runnertechnologies.com', 0, 30);
}

function stopBatchAiJob() {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('AI_Batch_Running', 'false');
}

function getBatchAiStatus() {
  var props = PropertiesService.getScriptProperties();
  return {
    running:          props.getProperty('AI_Batch_Running') === 'true',
    page:             parseInt(props.getProperty('AI_Batch_Page') || '1', 10),
    ticketsProcessed: parseInt(props.getProperty('AI_Batch_Count') || '0', 10),
    failedCount:      parseInt(props.getProperty('AI_Batch_FailCount') || '0', 10),
    skippedCount:     parseInt(props.getProperty('AI_Batch_SkipCount') || '0', 10),
    startTime:        props.getProperty('AI_Batch_StartTime') || '',
    lastRunEnd:       props.getProperty('AI_Batch_LastRunEnd') || '',
    triggeredBy:      props.getProperty('AI_Batch_TriggeredBy') || '',
    dryRun:           props.getProperty('AI_Batch_DryRun') === 'true'
  };
}

function batchProcessTickets(dryRun) {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('AI_Batch_Running') !== 'true') return;

  var apiKey = props.getProperty('Freshdesk_Api_Key');
  var domain = 'runnertech.freshdesk.com';
  var authHeader = 'Basic ' + Utilities.base64Encode(apiKey + ':X');
  
  var page             = parseInt(props.getProperty('AI_Batch_Page')      || '1',   10);
  var processedCount   = parseInt(props.getProperty('AI_Batch_Count')     || '0',   10);
  var failedCount      = parseInt(props.getProperty('AI_Batch_FailCount') || '0',   10);
  var skippedCount     = parseInt(props.getProperty('AI_Batch_SkipCount') || '0',   10);
  var limit            = parseInt(props.getProperty('AI_Batch_Limit')     || '0',   10);
  var daysBack         = parseInt(props.getProperty('AI_Batch_DaysBack')  || '365', 10);
  var jobFullyComplete = false; // true only when we exhaust all pages or hit limit cleanly
  
  var startTime = new Date().getTime();
  // GAS execution limit is 6 min. Stop after 4.5 min to safely save state.
  var MAX_EXECUTION_TIME_MS = 4.5 * 60 * 1000;
  
  var d = new Date();
  d.setDate(d.getDate() - daysBack);
  var updatedSince = d.toISOString();
  
  while (true) {
    if (new Date().getTime() - startTime > MAX_EXECUTION_TIME_MS) {
      // If an inner-loop check already marked the job complete (e.g. daysBack hit
      // right as the timer was about to fire), honour that and send the email.
      if (props.getProperty('AI_Batch_Running') !== 'true') {
        jobFullyComplete = true;
        Logger.log('Time limit reached but job was already marked complete — sending email.');
      } else {
        Logger.log('Execution limit approaching, pausing batch. State saved - background trigger will resume.');
        // Chain the background trigger to resume exactly where we left off
        try {
          ScriptApp.newTrigger('batchProcessTicketsTrigger').timeBased().after(60 * 1000).create();
        } catch (e) {
          Logger.log('Failed to create continuation trigger: ' + e.message);
        }
      }
      break;
    }
    
    if (limit > 0 && processedCount >= limit) {
      props.setProperty('AI_Batch_Running', 'false');
      jobFullyComplete = true;
      Logger.log('Batch complete! Reached user-specified limit of ' + limit + ' tickets.');
      break;
    }
    
    // Fetch newest tickets first using created_at desc.
    var url = 'https://' + domain + '/api/v2/tickets?updated_since=' + updatedSince + '&order_by=created_at&order_type=desc&per_page=30&page=' + page;
    var res = UrlFetchApp.fetch(url, { headers: { Authorization: authHeader }, muteHttpExceptions: true });
    
    if (res.getResponseCode() !== 200) {
      Logger.log('Failed to fetch tickets for batch: ' + res.getContentText());
      // CRITICAL FIX: If we fail to fetch a page (e.g. Rate Limit 429), we MUST tell the UI to stop.
      props.setProperty('AI_Batch_Running', 'false');
      jobFullyComplete = true; // Clean up and send the email with whatever progress we made
      break;
    }
    
    var tkts = JSON.parse(res.getContentText());
    if (tkts.length === 0) {
      props.setProperty('AI_Batch_Running', 'false');
      jobFullyComplete = true;
      Logger.log('Batch fully complete - no more tickets found.');
      break;
    }
    
    for (var i = 0; i < tkts.length; i++) {
      if (new Date().getTime() - startTime > MAX_EXECUTION_TIME_MS) break;
      
      var ticketId     = tkts[i].id;
      var ticketStatus = tkts[i].status;
      var ticketType   = tkts[i].type || '';
      var ticketDate   = new Date(tkts[i].created_at);
      
      // Stop the batch if we've reached tickets older than our daysBack limit
      if (daysBack > 0 && (new Date().getTime() - ticketDate.getTime()) / (1000 * 3600 * 24) > daysBack) {
        props.setProperty('AI_Batch_Running', 'false');
        jobFullyComplete = true;
        Logger.log('Batch complete! Reached the ' + daysBack + ' day history limit.');
        break;
      }
      
      // 0. Only process Resolved (4) or Closed (5) tickets
      if (ticketStatus !== 4 && ticketStatus !== 5) {
        skippedCount++;
        continue;
      }
      
      var subject      = tkts[i].subject ? tkts[i].subject.toLowerCase() : '';
      var tags         = tkts[i].tags || [];
      var customFields = tkts[i].custom_fields || {};
      
      // 1. Skip Already Processed Tickets (saves API credits)
      var alreadyProcessed = false;
      var isManuallySkipped = false;
      if (customFields.cf_ai_summary_notes) alreadyProcessed = true;
      for (var t = 0; t < tags.length; t++) {
        if (tags[t].toLowerCase().indexOf('ai:') === 0) alreadyProcessed = true;
        if (tags[t].toLowerCase() === 'ai:skipped' || tags[t].toLowerCase() === 'ai:skipped-noise') isManuallySkipped = true;
      }
      
      if (isManuallySkipped) {
        skippedCount++;
        continue;
      }
      
      // 2. Skip excluded ticket types (Spam, Runner Internal - they are noise)
      if (EXCLUDED_TICKET_TYPES.indexOf(ticketType) !== -1) {
        skippedCount++;
        if (!alreadyProcessed) logAiProcessing(ticketId, 'skipped', 'Skipped: Excluded Ticket Type', dryRun, null);
        continue;
      }
      
      // 3. Skip Auto-Replies, internal notifications, and known noise
      if (isNoiseSubject(subject)) {
        skippedCount++;
        if (!alreadyProcessed) logAiProcessing(ticketId, 'skipped', 'Skipped: Noise Subject Filter', dryRun, null);
        continue;
      }
      
      // 4. Skip Hardcoded ignores
      if (HARDCODED_IGNORED_TICKETS.indexOf(Number(ticketId)) !== -1) {
        skippedCount++;
        if (!alreadyProcessed) logAiProcessing(ticketId, 'skipped', 'Skipped: Hardcoded Ignore List', dryRun, null);
        continue;
      }

      if (alreadyProcessed) {
        // We log alreadyProcessed tickets ONLY if overwrite is not requested (but wait, overwrite isn't implemented here yet!)
        var overwrite = props.getProperty('AI_Batch_Overwrite') === 'true';
        if (!overwrite) {
          skippedCount++;
          continue;
        }
      }
      
      // 4. Process the ticket
      try {
        var result = processTicket(ticketId, dryRun);
        if (result && result.status === 'success') {
          processedCount++;
          props.setProperty('AI_Batch_Count', processedCount.toString());
        } else if (result && result.status === 'skipped') {
          skippedCount++;
          props.setProperty('AI_Batch_SkipCount', skippedCount.toString());
        } else if (result && result.status === 'error') {
          failedCount++;
          props.setProperty('AI_Batch_FailCount', failedCount.toString());
        }
        
        props.setProperty('AI_Batch_SkipCount', skippedCount.toString());
        props.setProperty('AI_Batch_FailCount', failedCount.toString());
        
        if (limit > 0 && processedCount >= limit) {
          props.setProperty('AI_Batch_Running', 'false');
          jobFullyComplete = true;
          Logger.log('Batch complete! Reached limit of ' + limit + ' successfully processed tickets.');
          break;
        }
      } catch (e) {
        failedCount++;
        props.setProperty('AI_Batch_FailCount', failedCount.toString());
        Logger.log('Error processing ticket ' + ticketId + ': ' + e.message);
      }
      
      // ~2s gap between tickets to stay within rate limits (reduced from 4s)
      Utilities.sleep(2000);
    }
    
    // If jobFullyComplete was set inside the inner loop (daysBack hit, limit hit),
    // break out of the outer while immediately — do NOT advance to the next page.
    if (jobFullyComplete) break;
    
    page++;
    props.setProperty('AI_Batch_Page',      page.toString());
    props.setProperty('AI_Batch_SkipCount', skippedCount.toString());
    props.setProperty('AI_Batch_FailCount', failedCount.toString());
  }

  // Record end time regardless of how we exited
  props.setProperty('AI_Batch_LastRunEnd', new Date().toISOString());

  // Send completion email and clean up triggers only when the job truly finishes
  if (jobFullyComplete) {
    cleanupBatchTriggers();
    sendBatchCompletionEmail(processedCount, failedCount, skippedCount, dryRun);
  }
}

function cleanupBatchTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'batchProcessTicketsTrigger' && 
        triggers[i].getEventType() === ScriptApp.EventType.CLOCK) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Manual single-ticket processor (used by process_single_ticket
// POST action). Supports forceReprocess to bypass the skip check.
// ─────────────────────────────────────────────────────────────
function processTicketById(ticketId, dryRun, forceReprocess) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('Freshdesk_Api_Key');
  if (!apiKey) return { status: 'error', message: 'Freshdesk_Api_Key not configured.' };

  var domain     = 'runnertech.freshdesk.com';
  var authHeader = 'Basic ' + Utilities.base64Encode(apiKey + ':X');
  var fdOpts     = { headers: { Authorization: authHeader }, muteHttpExceptions: true };

  // Fetch the ticket first so we can check if already processed
  var ticketRes = UrlFetchApp.fetch('https://' + domain + '/api/v2/tickets/' + ticketId, fdOpts);
  if (ticketRes.getResponseCode() !== 200) {
    return { status: 'error', message: 'Ticket ' + ticketId + ' not found in Freshdesk. Check the ID.' };
  }
  var ticket = JSON.parse(ticketRes.getContentText());

  // Skip check (unless forceReprocess is true)
  if (!forceReprocess) {
    var customFields = ticket.custom_fields || {};
    var tags = ticket.tags || [];
    if (customFields.cf_ai_summary_notes) {
      return { status: 'error', message: 'Ticket #' + ticketId + ' was already processed. Use "Force Re-process" to override.' };
    }
    for (var t = 0; t < tags.length; t++) {
      if (tags[t].toLowerCase().indexOf('ai:') === 0) {
        return { status: 'error', message: 'Ticket #' + ticketId + ' already has AI tags. Use "Force Re-process" to override.' };
      }
    }
  }

  // Status check: only closed/resolved for non-forced runs
  var ticketStatus = ticket.status;
  if (!forceReprocess && ticketStatus !== 4 && ticketStatus !== 5) {
    return { status: 'error', message: 'Ticket #' + ticketId + ' is not Resolved or Closed (status ' + ticketStatus + '). Only closed tickets are processed.' };
  }

  try {
    var result = processTicket(ticketId, dryRun);
    return result;
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

// ─────────────────────────────────────────────────────────────
// Retry all tickets that have status=error in AI_Processing_Log.
// Returns the count of tickets that were re-queued.
// ─────────────────────────────────────────────────────────────
function retryFailedTicketsJob(triggeredBy, triggeredByEmail) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('AI_Processing_Log');
  if (!sheet) return 0;

  var data = sheet.getDataRange().getValues();
  // Header: timestamp(0), ticket_id(1), action(2), status(3), error_message(4), dry_run(5), ...
  var failedTicketIds = [];
  var seen = {};
  for (var r = 1; r < data.length; r++) {
    var rowStatus   = String(data[r][3]).toLowerCase();
    var rowTicketId = String(data[r][1]).trim();
    if (rowStatus === 'error' && rowTicketId && !seen[rowTicketId]) {
      seen[rowTicketId] = true;
      failedTicketIds.push(rowTicketId);
    }
  }

  if (failedTicketIds.length === 0) return 0;

  // Set audit props so logAiProcessing captures the right user
  var props = PropertiesService.getScriptProperties();
  props.setProperty('AI_Batch_TriggeredBy',      triggeredBy    || 'Retry Job');
  props.setProperty('AI_Batch_TriggeredByEmail', triggeredByEmail || '');

  var successCount = 0;
  for (var i = 0; i < failedTicketIds.length; i++) {
    try {
      var result = processTicketById(failedTicketIds[i], false, true);
      if (result && result.status === 'success') successCount++;
    } catch (e) {
      Logger.log('Retry failed for ticket ' + failedTicketIds[i] + ': ' + e.message);
    }
    Utilities.sleep(4000);
  }

  Logger.log('Retry job complete: ' + successCount + '/' + failedTicketIds.length + ' succeeded.');
  return failedTicketIds.length;
}

// ─────────────────────────────────────────────────────────────────────────
// RUN BATCH AUDIT: Scans tickets in the given timeframe without processing
// them. Creates/replaces an "Audit_Report" tab with full results.
// ─────────────────────────────────────────────────────────────────────────
function runBatchAudit(daysBack, startDateStr, endDateStr) {
  var props      = PropertiesService.getScriptProperties();
  var apiKey     = props.getProperty('Freshdesk_Api_Key');
  var domain     = 'runnertech.freshdesk.com';
  var authHeader = 'Basic ' + Utilities.base64Encode(apiKey + ':X');
  
  var updatedSince;
  if (daysBack === 0 && startDateStr) {
    var d = new Date(startDateStr);
    updatedSince = d.toISOString();
  } else {
    var d = new Date();
    d.setDate(d.getDate() - (daysBack || 365));
    updatedSince = d.toISOString();
  }

  // Build set of ticket IDs already in the Ticket_AI_Data sheet
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aiSheet = ss.getSheetByName('Ticket_AI_Data');
  var processedIds = {};
  if (aiSheet) {
    var data = aiSheet.getDataRange().getValues();
    for (var r = 1; r < data.length; r++) {
      processedIds[String(data[r][0]).trim()] = true;
    }
  }

  var auditSheet = ss.getSheetByName('Audit_Report');
  if (!auditSheet) {
    auditSheet = ss.insertSheet('Audit_Report');
  } else {
    auditSheet.clear();
  }
  
  auditSheet.appendRow(['Ticket #', 'Subject', 'Status', 'Type', 'Created', 'Category', 'Notes']);
  auditSheet.getRange('A1:G1').setFontWeight('bold');

  var page = 1;
  var totalChecked = 0;
  
  // Categorization counts
  var stats = {
    eligible: 0,
    alreadyProcessed: 0,
    openPending: 0,
    excludedType: 0,
    noise: 0
  };

  while (true) {
    var url = 'https://' + domain + '/api/v2/tickets?updated_since=' + updatedSince + '&order_by=created_at&order_type=desc&per_page=100&page=' + page;
    var res = UrlFetchApp.fetch(url, { headers: { Authorization: authHeader }, muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) break;
    var tkts = JSON.parse(res.getContentText());
    if (tkts.length === 0) break;
    
    var rows = [];
    tkts.forEach(function(t) {
      var cat = 'ELIGIBLE';
      var notes = '';
      
      if (t.status !== 4 && t.status !== 5) { cat = 'OPEN/PENDING'; stats.openPending++; }
      else if (EXCLUDED_TICKET_TYPES.indexOf(t.type || '') !== -1) { cat = 'EXCLUDED TYPE'; stats.excludedType++; }
      else if (isNoiseSubject(t.subject)) { cat = 'NOISE FILTER'; stats.noise++; }
      else if (HARDCODED_IGNORED_TICKETS.indexOf(Number(t.id)) !== -1) { cat = 'HARDCODED IGNORE'; stats.noise++; }
      else if (processedIds[String(t.id)]) { cat = 'ALREADY PROCESSED'; stats.alreadyProcessed++; }
      else { stats.eligible++; }
      
      rows.push([t.id, t.subject, t.status, t.type, t.created_at, cat, notes]);
    });
    
    if (rows.length > 0) auditSheet.getRange(auditSheet.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
    page++;
    Utilities.sleep(500);
  }
}


// Shows processed / failed / skipped breakdown + partial-success
// note if failures occurred.
// ─────────────────────────────────────────────────────────────
function sendBatchCompletionEmail(processedCount, failedCount, skippedCount, dryRun) {
  try {
    var props         = PropertiesService.getScriptProperties();
    var triggeredBy   = props.getProperty('AI_Batch_TriggeredBy')      || 'System';
    var toEmail       = props.getProperty('AI_Batch_TriggeredByEmail') || '';
    var startTime     = props.getProperty('AI_Batch_StartTime')         || '';
    var endTime       = new Date().toISOString();

    // Always notify Misty; also notify the triggering user if different
    var recipients = ['misty.wilmore@runnertechnologies.com'];
    if (toEmail && toEmail !== 'misty.wilmore@runnertechnologies.com' &&
        toEmail !== 'system@runnertechnologies.com') {
      recipients.push(toEmail);
    }

    var modeLabel   = dryRun ? '📝 DRY RUN (Preview Only — nothing written to Freshdesk)'
                             : '⚡ LIVE RUN (Written to Freshdesk)';
    var statusEmoji = failedCount > 0 ? '⚠️' : '✅';
    var subject     = statusEmoji + ' Ticket AI Batch Complete — '
                    + processedCount + ' processed, ' + failedCount + ' failed';

    var startLabel = startTime ? new Date(startTime).toLocaleString() : 'N/A';
    var endLabel   = new Date(endTime).toLocaleString();

    var partialNote = '';
    if (failedCount > 0) {
      partialNote = '\n⚠️  PARTIAL SUCCESS: ' + failedCount + ' ticket(s) failed during this run.\n'
                 + '   These tickets are recorded in the AI Processing Log.\n'
                 + '   Use the "Retry Failed Tickets" button in the dashboard to re-process them.\n';
    }

    var body = 'Ticket Intelligence Batch Job Summary\n'
             + '=====================================\n'
             + 'Mode:       ' + modeLabel + '\n'
             + 'Triggered By: ' + triggeredBy + '\n'
             + 'Started:    ' + startLabel + '\n'
             + 'Finished:   ' + endLabel + '\n'
             + '\nResults\n-------\n'
             + '✅ Successfully Processed: ' + processedCount + ' ticket(s)\n'
             + '❌ Failed:                 ' + failedCount    + ' ticket(s)\n'
             + '⏭️  Skipped:                ' + skippedCount   + ' ticket(s)\n'
             + '   (Skipped = open/pending tickets, already AI-processed, excluded types\n'
             + '    (Spam/Runner Internal), noise filters (Basecamp, Confluence, OOO, etc.),\n'
             + '    or hardcoded excluded ticket numbers)\n'
             + partialNote
             + '\n---\nView the full log in the Ticket Intelligence tab of the Customer Health Dashboard.\n'
             + 'https://support.runnertech.com';

    for (var r = 0; r < recipients.length; r++) {
      MailApp.sendEmail({
        to:      recipients[r],
        subject: subject,
        body:    body
      });
    }
    Logger.log('Batch completion email sent to: ' + recipients.join(', '));
  } catch (emailErr) {
    Logger.log('Could not send batch completion email: ' + emailErr.message);
  }
}

/**
 * Utility to mass-remove AI modifications from specific noise tickets.
 * Reverts the subject, removes ai: tags, and deletes AI Summary notes.
 */


// ==========================================================================
// FILE: Router.gs
// ==========================================================================


function doGet(e) {
  var sheetName = 'Form Responses 1';

  if (e && e.parameter) {

    // ----------------------------------------------------------------
    // TYPE: contacts — GET proxy for Outreach modal (bypasses POST redirect issue)
    // ----------------------------------------------------------------
    if (e.parameter.type === 'contacts') {
      var companyName = e.parameter.companyName || '';
      if (!companyName) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'companyName required', gs_version: '1.3' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var apiKey = PropertiesService.getScriptProperties().getProperty('Freshdesk_Api_Key');
      var domain = 'runnertech.freshdesk.com';
      var authHeader = 'Basic ' + Utilities.base64Encode(apiKey + ':X');
      var fdOpts = { 'headers': { 'Authorization': authHeader }, 'muteHttpExceptions': true };

      // Find company
      var companyId = null;
      var sRes = UrlFetchApp.fetch('https://' + domain + '/api/v2/companies/autocomplete?name=' + encodeURIComponent(companyName), fdOpts);
      if (sRes.getResponseCode() === 200) {
        var sRaw = JSON.parse(sRes.getContentText());
        var cos = Array.isArray(sRaw) ? sRaw : (sRaw.companies || []);
        if (cos.length > 0) companyId = cos[0].id;
      }
      if (!companyId) {
        var listRes = UrlFetchApp.fetch('https://' + domain + '/api/v2/companies?per_page=100', fdOpts);
        if (listRes.getResponseCode() === 200) {
          var allCos = JSON.parse(listRes.getContentText());
          var needle = companyName.toLowerCase().substring(0, 12);
          for (var ci = 0; ci < allCos.length; ci++) {
            if (allCos[ci].name && allCos[ci].name.toLowerCase().indexOf(needle) !== -1) { companyId = allCos[ci].id; break; }
          }
        }
      }
      if (!companyId) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Company not found: ' + companyName, gs_version: '1.3' }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // Get ticket dates by contact
      var tByUser = {};
      var tRes = UrlFetchApp.fetch('https://' + domain + '/api/v2/tickets?company_id=' + companyId + '&per_page=100', fdOpts);
      if (tRes.getResponseCode() === 200) {
        var tkts = JSON.parse(tRes.getContentText());
        for (var ti = 0; ti < tkts.length; ti++) {
          var t = tkts[ti];
          if (t.requester_id) {
            var td = new Date(t.created_at).getTime();
            if (!tByUser[t.requester_id] || td > tByUser[t.requester_id]) tByUser[t.requester_id] = td;
          }
        }
      }

      // Get and filter contacts
      var validContacts = [];
      var cRes = UrlFetchApp.fetch('https://' + domain + '/api/v2/contacts?company_id=' + companyId + '&per_page=100', fdOpts);
      if (cRes.getResponseCode() === 200) {
        var cts = JSON.parse(cRes.getContentText());
        for (var i = 0; i < cts.length; i++) {
          var c = cts[i];
          var cn = (c.name || '').toLowerCase();
          if (cn.indexOf('- do not contact') !== -1 || cn.indexOf('- retired') !== -1 || cn.indexOf(' retired') !== -1) continue;
          if (!c.email) continue;
          validContacts.push({ id: c.id, name: c.name, email: c.email, job_title: c.job_title || '', lastTicketTime: tByUser[c.id] || 0 });
        }
      }
      validContacts.sort(function(a, b) {
        if (a.lastTicketTime > 0 && b.lastTicketTime > 0) return b.lastTicketTime - a.lastTicketTime;
        if (a.lastTicketTime > 0) return -1;
        if (b.lastTicketTime > 0) return 1;
        return a.name.localeCompare(b.name);
      });

      return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: { companyId: companyId, contacts: validContacts }, gs_version: '1.3' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (e.parameter.type === 'freshdesk') {
      sheetName = 'Freshdesk_Data';
    } else if (e.parameter.type === 'triage') {
      sheetName = 'Triage_Data';
    } else if (e.parameter.type === 'ticket_trends') {
      sheetName = 'Ticket_AI_Data';
    } else if (e.parameter.type === 'ai_log') {
      sheetName = 'AI_Processing_Log';
    } else if (e.parameter.type === 'ai_status') {
      // ----------------------------------------------------------------
      // TYPE: ai_status — Returns the current state of the batch processor
      // ----------------------------------------------------------------
      var status = getBatchAiStatus();
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: status }))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (e.parameter.type === 'permissions') {
      // ----------------------------------------------------------------
      // TYPE: permissions - Returns user permissions and (if admin) all users
      // ----------------------------------------------------------------
      var email = e.parameter.email || '';
      var perms = getUserPermissions(email);
      
      var response = { status: 'success', permissions: perms };
      
      // If admin, fetch all users from User_Permissions sheet
      if (perms.role === 'admin') {
        var allUsers = [];
        try {
          var ss = SpreadsheetApp.getActiveSpreadsheet();
          var sheet = ss.getSheetByName('User_Permissions');
          if (sheet) {
            var data = sheet.getDataRange().getValues();
            for (var i = 1; i < data.length; i++) {
              allUsers.push({
                name: String(data[i][0]).trim(),
                email: String(data[i][1]).toLowerCase().trim(),
                role: String(data[i][2]).toLowerCase().trim(),
                canAccessData: String(data[i][3]).toLowerCase() === 'true',
                canAccessIntel: String(data[i][4]).toLowerCase() === 'true'
              });
            }
          }
        } catch (err) {
          Logger.log("Error fetching all users: " + err);
        }
        response.allUsers = allUsers;
      }
      
      return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  if (!sheet) {
    return ContentService.createTextOutput('Error: Sheet "' + sheetName + '" not found')
      .setMimeType(ContentService.MimeType.TEXT);
  }

  var data = sheet.getDataRange().getValues();
  var csvLines = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var csvRow = [];

    for (var j = 0; j < row.length; j++) {
      var cell = row[j];
      var cellValue = '';

      if (cell instanceof Date) {
        cellValue = cell.toISOString();
      } else if (cell === null || cell === undefined) {
        cellValue = '';
      } else {
        cellValue = String(cell);
      }

      cellValue = cellValue.replace(/[\r\n]+/g, ' ');
      cellValue = cellValue.replace(/"/g, '""');

      if (cellValue.indexOf(',') !== -1 || cellValue.indexOf('"') !== -1 || cellValue.indexOf(' ') !== -1) {
        cellValue = '"' + cellValue + '"';
      }

      csvRow.push(cellValue);
    }

    csvLines.push(csvRow.join(','));
  }

  return ContentService.createTextOutput(csvLines.join('\n'))
    .setMimeType(ContentService.MimeType.CSV);
}


function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action || 'triage';

    // ----------------------------------------------------------------
    // ACTION: sendpin  — generate & email a 6-digit login PIN
    // ----------------------------------------------------------------
    if (action === 'sendpin') {
      var email = (postData.email || '').toLowerCase().trim();
      var name  = postData.name || 'there';

      if (!email) {
        return jsonResponse('error', 'Email is required.');
      }

      var pin = Math.floor(100000 + Math.random() * 900000).toString();
      var expires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min expiry

      // Store the PIN in a Login_Pins sheet (create if needed)
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var pinSheet = ss.getSheetByName('Login_Pins');
      if (!pinSheet) {
        pinSheet = ss.insertSheet('Login_Pins');
        pinSheet.appendRow(['Email', 'Pin', 'Expires', 'Used']);
      }

      // Remove any old entries for this email
      var lastRow = pinSheet.getLastRow();
      if (lastRow > 1) {
        var emailCol = pinSheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var i = emailCol.length - 1; i >= 0; i--) {
          if (emailCol[i][0].toString().toLowerCase() === email) {
            pinSheet.deleteRow(i + 2);
          }
        }
      }

      // Append new PIN row
      pinSheet.appendRow([email, pin, expires, 'false']);

      // Send the PIN by email
      var subject = 'Your Customer Health Dashboard Login Code';
      var body = 'Hello ' + name + ',\n\n' +
                 'Your verification code is:\n\n' +
                 '    ' + pin + '\n\n' +
                 'This code will expire in 10 minutes.\n\n' +
                 'If you did not request this code, please ignore this email.\n\n' +
                 'Best,\nRunner Technologies Customer Success';

      MailApp.sendEmail(email, subject, body);

      return jsonResponse('success', 'PIN sent.');
    }

    // ----------------------------------------------------------------
    // ACTION: verifypin — check the PIN and mark it used
    // ----------------------------------------------------------------
    if (action === 'verifypin') {
      var email = (postData.email || '').toLowerCase().trim();
      var pin   = (postData.pin   || '').trim();

      if (!email || !pin) {
        return jsonResponse('error', 'Email and PIN are required.');
      }

      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var pinSheet = ss.getSheetByName('Login_Pins');
      if (!pinSheet) {
        return jsonResponse('error', 'No PINs have been generated yet.');
      }

      var lastRow = pinSheet.getLastRow();
      if (lastRow < 2) {
        return jsonResponse('error', 'No PINs have been generated yet.');
      }

      var rows = pinSheet.getRange(2, 1, lastRow - 1, 4).getValues();
      var now  = new Date();

      for (var i = 0; i < rows.length; i++) {
        var rowEmail   = rows[i][0].toString().toLowerCase().trim();
        var rowPin     = rows[i][1].toString().trim();
        var rowExpires = new Date(rows[i][2]);
        var rowUsed    = rows[i][3].toString();

        if (rowEmail === email && rowPin === pin) {
          if (rowUsed === 'true') {
            return jsonResponse('error', 'This code has already been used.');
          }
          if (now > rowExpires) {
            return jsonResponse('error', 'This code has expired. Please request a new one.');
          }
          // Mark as used
          pinSheet.getRange(i + 2, 4).setValue('true');
          return jsonResponse('success', 'PIN verified.');
        }
      }

      return jsonResponse('error', 'Incorrect code. Please try again.');
    }

    // ----------------------------------------------------------------
    // ACTION: AI Batch Job Controls
    // ----------------------------------------------------------------
    if (action === 'start_batch_ai') {
      var triggeredByEmail = postData.triggeredByEmail || '';
      if (!isBatchAdmin(triggeredByEmail)) {
        return jsonResponse('error', 'Access denied. Only authorized admins can run batch jobs. Contact Misty Wilmore.');
      }
      var dryRun = postData.dryRun === true;
      var overwrite = postData.overwrite === true;
      var limit = postData.limit || 0;
      var daysBack = postData.daysBack || 365;
      var startDate = postData.startDate || '';
      var endDate = postData.endDate || '';
      var triggeredBy = postData.triggeredBy || 'Unknown';
      startBatchAiJob(dryRun, overwrite, triggeredBy, triggeredByEmail, limit, daysBack, startDate, endDate);
      return jsonResponse('success', 'Batch job started (dryRun: ' + dryRun + ', overwrite: ' + overwrite + ', by: ' + triggeredBy + ', limit: ' + limit + ').');
    }
    
    if (action === 'run_batch_audit') {
      var auditCallerEmail = postData.triggeredByEmail || '';
      if (!isBatchAdmin(auditCallerEmail)) {
        return jsonResponse('error', 'Access denied.');
      }
      var daysBack = postData.daysBack || 365;
      var startDate = postData.startDate || '';
      var endDate = postData.endDate || '';
      runBatchAudit(daysBack, startDate, endDate);
      return jsonResponse('success', 'Audit complete. Check the Audit_Report tab.');
    }
    
    if (action === 'stop_batch_ai') {
      var stopCallerEmail = postData.triggeredByEmail || '';
      if (!isBatchAdmin(stopCallerEmail)) {
        return jsonResponse('error', 'Access denied.');
      }
      stopBatchAiJob();
      return jsonResponse('success', 'Batch job stopped.');
    }

    // ── Manual single-ticket processing ──────────────────────
    if (action === 'process_single_ticket') {
      var callerEmail = postData.triggeredByEmail || '';
      if (!isBatchAdmin(callerEmail)) {
        return jsonResponse('error', 'Access denied. Only authorized admins can process tickets manually.');
      }
      var ticketId = postData.ticketId ? String(postData.ticketId).trim() : '';
      if (!ticketId || isNaN(Number(ticketId))) {
        return jsonResponse('error', 'Invalid ticketId. Please provide a numeric Freshdesk ticket ID.');
      }
      var forceReprocess = postData.forceReprocess === true;
      var callerName = postData.triggeredBy || 'Unknown';
      // Temporarily set audit props so logAiProcessing captures the right user
      var props = PropertiesService.getScriptProperties();
      props.setProperty('AI_Batch_TriggeredBy', callerName);
      props.setProperty('AI_Batch_TriggeredByEmail', callerEmail);
      var result = processTicketById(ticketId, false, forceReprocess);
      return jsonResponse(result.status, result.message || result.status, result.ai_result);
    }

    // ── Retry all failed tickets from AI_Processing_Log ──────
    if (action === 'retry_failed_tickets') {
      var retryCallerEmail = postData.triggeredByEmail || '';
      if (!isBatchAdmin(retryCallerEmail)) {
        return jsonResponse('error', 'Access denied.');
      }
      var retryCallerName = postData.triggeredBy || 'Unknown';
      var retryCount = retryFailedTicketsJob(retryCallerName, retryCallerEmail);
      return jsonResponse('success', 'Queued ' + retryCount + ' failed ticket(s) for reprocessing.');
    }

    // ── AI Queue Action Handlers ─────────────────────────────
    if (action === 'override_ai_classification') {
      var overrideCallerEmail = postData.triggeredByEmail || '';
      if (!isBatchAdmin(overrideCallerEmail)) return jsonResponse('error', 'Access denied.');
      
      var ticketId = postData.ticketId;
      var newSubject = postData.newSubject;
      var newIntegration = postData.newIntegration;
      var newProduct = postData.newProduct;
      
      var customFields = {
        cf_ai_proposed_subject: newSubject,
        cf_ai_integration: newIntegration,
        cf_ai_product_area: newProduct
      };
      
      var res = updateFreshdeskTicketFields(ticketId, customFields);
      if (res && res.status === 'success') {
        updateTicketAiDataRow(ticketId, {
          proposed_subject: newSubject,
          integration: newIntegration,
          product_area: newProduct
        });
        return jsonResponse('success', 'Override saved.');
      }
      return jsonResponse('error', 'Failed to update Freshdesk: ' + (res ? res.message : 'Unknown error'));
    }

    if (action === 'skip_ai_ticket') {
      var skipCallerEmail = postData.triggeredByEmail || '';
      if (!isBatchAdmin(skipCallerEmail)) return jsonResponse('error', 'Access denied.');
      
      var ticketId = postData.ticketId;
      var res = updateFreshdeskTicketTags(ticketId, ['ai:skipped']);
      if (res && res.status === 'success') {
        deleteTicketAiDataRow(ticketId);
        logAiProcessing(ticketId, 'skipped', 'Skipped via UI review', false, null);
        return jsonResponse('success', 'Ticket skipped.');
      }
      return jsonResponse('error', 'Failed to add tag to Freshdesk.');
    }

    if (action === 'dismiss_ai_ticket') {
      var dismissCallerEmail = postData.triggeredByEmail || '';
      if (!isBatchAdmin(dismissCallerEmail)) return jsonResponse('error', 'Access denied.');
      
      var ticketId = postData.ticketId;
      var res = updateFreshdeskTicketTags(ticketId, ['ai:reviewed']);
      if (res && res.status === 'success') {
        addTagToTicketAiDataRow(ticketId, 'ai:reviewed');
        return jsonResponse('success', 'Ticket dismissed from queue.');
      }
      return jsonResponse('error', 'Failed to add tag to Freshdesk.');
    }

    if (action === 'reprocess_ai_ticket') {
      var reprocessCallerEmail = postData.triggeredByEmail || '';
      if (!isBatchAdmin(reprocessCallerEmail)) return jsonResponse('error', 'Access denied.');
      
      var ticketId = postData.ticketId;
      
      var customFields = { cf_ai_proposed_subject: null, cf_ai_summary_notes: null, cf_ai_product_area: null, cf_ai_integration: null, cf_ai_severity: null };
      updateFreshdeskTicketFields(ticketId, customFields);
      removeFreshdeskAiTags(ticketId);
      deleteTicketAiDataRow(ticketId);
      
      var props = PropertiesService.getScriptProperties();
      props.setProperty('AI_Batch_TriggeredBy', postData.triggeredBy || 'Unknown');
      props.setProperty('AI_Batch_TriggeredByEmail', reprocessCallerEmail);
      var result = processTicketById(ticketId, false, true);
      
      return jsonResponse(result.status, 'Reprocessed ticket.');
    }

    // ----------------------------------------------------------------
    // ACTION: get_outreach_contacts
    // ----------------------------------------------------------------
    if (action === 'get_outreach_contacts') {
      var companyName = postData.companyName;
      if (!companyName) return jsonResponse('error', 'Company Name missing.');

      var apiKey = PropertiesService.getScriptProperties().getProperty('Freshdesk_Api_Key');
      var domain = 'runnertech.freshdesk.com';
      var authHeader = 'Basic ' + Utilities.base64Encode(apiKey + ':X');
      var options = { 'headers': { 'Authorization': authHeader, 'Content-Type': 'application/json' }, 'muteHttpExceptions': true };
      
      // 0. Resolve the Company Name into a Freshdesk Company ID
      // The autocomplete endpoint returns a flat array of company objects
      var companySearchUrl = 'https://' + domain + '/api/v2/companies/autocomplete?name=' + encodeURIComponent(companyName);
      var searchRes = UrlFetchApp.fetch(companySearchUrl, options);
      var companyId = null;
      
      if (searchRes.getResponseCode() === 200) {
        var searchRaw = JSON.parse(searchRes.getContentText());
        // Handle both flat array and {companies:[]} response formats
        var companies = Array.isArray(searchRaw) ? searchRaw : (searchRaw.companies || []);
        if (companies.length > 0) {
          companyId = companies[0].id;
        }
      }
      
      // Fallback: search via the companies list API if autocomplete failed
      if (!companyId) {
        var listUrl = 'https://' + domain + '/api/v2/companies?page=1&per_page=100';
        var listRes = UrlFetchApp.fetch(listUrl, options);
        if (listRes.getResponseCode() === 200) {
          var allCompanies = JSON.parse(listRes.getContentText());
          var nameLower = companyName.toLowerCase();
          for (var ci = 0; ci < allCompanies.length; ci++) {
            if (allCompanies[ci].name && allCompanies[ci].name.toLowerCase().indexOf(nameLower.substring(0, 10)) !== -1) {
              companyId = allCompanies[ci].id;
              break;
            }
          }
        }
      }
      
      if (!companyId) return jsonResponse('error', 'Company not found in Freshdesk: ' + companyName);

      // 1. Fetch recent tickets to determine active submitters
      var ticketDatesByUser = {};
      var ticketUrl = 'https://' + domain + '/api/v2/tickets?company_id=' + companyId + '&per_page=100';
      var ticketRes = UrlFetchApp.fetch(ticketUrl, options);
      if (ticketRes.getResponseCode() === 200) {
        var tickets = JSON.parse(ticketRes.getContentText());
        for (var i = 0; i < tickets.length; i++) {
           var t = tickets[i];
           if (t.requester_id) {
             var tDate = new Date(t.created_at).getTime();
             if (!ticketDatesByUser[t.requester_id] || tDate > ticketDatesByUser[t.requester_id]) {
                ticketDatesByUser[t.requester_id] = tDate;
             }
           }
        }
      }

      // 2. Fetch contacts for this company
      var contactsUrl = 'https://' + domain + '/api/v2/contacts?company_id=' + companyId + '&per_page=100';
      var contactsRes = UrlFetchApp.fetch(contactsUrl, options);
      var validContacts = [];
      if (contactsRes.getResponseCode() === 200) {
         var contacts = JSON.parse(contactsRes.getContentText());
         for (var i = 0; i < contacts.length; i++) {
           var c = contacts[i];
           var cname = c.name ? c.name.toLowerCase() : '';
           var cemail = c.email ? c.email : '';
           
           if (cname.indexOf('- do not contact') !== -1 || cname.indexOf('- retired') !== -1 || cname.indexOf(' retired') !== -1) continue;
           if (!cemail) continue;

           validContacts.push({
             id: c.id,
             name: c.name,
             email: c.email,
             job_title: c.job_title || '',
             lastTicketTime: ticketDatesByUser[c.id] || 0
           });
         }
      }

      // 3. Sort: Has tickets first (newest to oldest), then no tickets
      validContacts.sort(function(a, b) {
         if (a.lastTicketTime > 0 && b.lastTicketTime > 0) return b.lastTicketTime - a.lastTicketTime;
         if (a.lastTicketTime > 0) return -1;
         if (b.lastTicketTime > 0) return 1;
         return a.name.localeCompare(b.name);
      });

      return jsonResponse('success', { contacts: validContacts });
    }

    // ----------------------------------------------------------------
    // ACTION: save_permissions
    // ----------------------------------------------------------------
    if (action === 'save_permissions') {
      var callerEmail = postData.triggeredByEmail || '';
      var perms = getUserPermissions(callerEmail);
      if (perms.role !== 'admin') {
        return jsonResponse('error', 'Access denied. Only Admins can save permissions.');
      }
      
      var users = postData.users || [];
      try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var sheet = ss.getSheetByName('User_Permissions');
        if (!sheet) {
          return jsonResponse('error', 'User_Permissions sheet not found.');
        }
        
        // Clear all rows except header
        var lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
        }
        
        // Write new users
        if (users.length > 0) {
          var newRows = [];
          for (var i = 0; i < users.length; i++) {
            var u = users[i];
            // Format: Name, Email, Role, Can_Access_Data_Table, Can_Access_Ticket_Intel
            newRows.push([
              u.name,
              u.email,
              u.role,
              u.canAccessData ? 'TRUE' : 'FALSE',
              u.canAccessIntel ? 'TRUE' : 'FALSE'
            ]);
          }
          sheet.getRange(2, 1, newRows.length, 5).setValues(newRows);
        }
        return jsonResponse('success', 'Permissions saved successfully.');
      } catch (err) {
        return jsonResponse('error', 'Error saving permissions: ' + err.message);
      }
    }

    // ----------------------------------------------------------------
    // ACTION: sendoutreach
    // ----------------------------------------------------------------
    if (action === 'sendoutreach') {
      var targetEmail = postData.email;
      var targetName = postData.name || '';
      var ccEmails = postData.cc || '';
      var bccEmails = postData.bcc || '';
      var subject = postData.subject || 'Checking in';
      var body = postData.body || 'Hi,\nJust checking in.\n\nThanks';

      if (!targetEmail) return jsonResponse('error', 'Missing target email.');

      // Dynamic Distribution List Greeting Check
      var eMatch = targetEmail.toLowerCase();
      if (eMatch.indexOf('admin@') === 0 || eMatch.indexOf('info@') === 0 || eMatch.indexOf('it@') === 0 || eMatch.indexOf('support@') === 0 || eMatch.indexOf('team@') === 0 || targetName.trim() === '') {
         body = body.replace(/Hi .*?,|Hi,/, 'Hi ' + (postData.company || 'Team') + ' Team,');
      } else {
         var firstName = targetName.split(' ')[0];
         body = body.replace(/Hi .*?,|Hi,/, 'Hi ' + firstName + ',');
      }

      var mailOptions = {
         replyTo: 'support@runnertechnologies.com'
      };
      if (ccEmails) mailOptions.cc = ccEmails;
      if (bccEmails) mailOptions.bcc = bccEmails;

      try {
        GmailApp.sendEmail(targetEmail, subject, body, mailOptions);
        return jsonResponse('success', 'Outreach sent successfully.');
      } catch (err) {
        return jsonResponse('error', 'Failed to dispatch email: ' + err.toString());
      }
    }

    // ----------------------------------------------------------------
    // ACTION: addcontact
    // ----------------------------------------------------------------
    if (action === 'addcontact') {
      var companyId = postData.companyId;
      var addname = postData.name;
      var addemail = postData.email;
      var addtitle = postData.title || '';

      if (!companyId || !addname || !addemail) return jsonResponse('error', 'Missing required fields.');

      var apiKey = PropertiesService.getScriptProperties().getProperty('Freshdesk_Api_Key');
      var authHeader = 'Basic ' + Utilities.base64Encode(apiKey + ':X');
      
      var payload = {
         name: addname,
         email: addemail,
         company_id: parseInt(companyId, 10)
      };
      if (addtitle) payload.job_title = addtitle;

      var options = {
        'method': 'post',
        'headers': { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        'payload': JSON.stringify(payload),
        'muteHttpExceptions': true
      };

      var res = UrlFetchApp.fetch('https://runnertech.freshdesk.com/api/v2/contacts', options);
      var respCode = res.getResponseCode();
      var respText = res.getContentText();

      if (respCode === 201 || respCode === 200) {
         return jsonResponse('success', 'Contact added to Freshdesk.');
      } else if (respCode === 400 && (respText.indexOf('duplicate_value') !== -1 || respText.indexOf('already exists') !== -1)) {
         // Fallback: Link existing contact to this company
         var searchUrl = 'https://runnertech.freshdesk.com/api/v2/contacts?email=' + encodeURIComponent(addemail);
         var sRes = UrlFetchApp.fetch(searchUrl, { 'headers': { 'Authorization': authHeader }, 'muteHttpExceptions': true });
         if (sRes.getResponseCode() === 200) {
            var existingList = JSON.parse(sRes.getContentText());
            if (existingList && existingList.length > 0) {
               var contactId = existingList[0].id;
               var updateUrl = 'https://runnertech.freshdesk.com/api/v2/contacts/' + contactId;
               var updatePayload = { company_id: parseInt(companyId, 10) };
               if (addtitle) updatePayload.job_title = addtitle;
               
               UrlFetchApp.fetch(updateUrl, {
                 'method': 'put',
                 'headers': { 'Authorization': authHeader, 'Content-Type': 'application/json' },
                 'payload': JSON.stringify(updatePayload),
                 'muteHttpExceptions': true
               });
               return jsonResponse('success', 'Existing contact linked to this company.');
            }
         }
      }
      return jsonResponse('error', 'Failed to add contact to Freshdesk. ' + respText);
    }

    // ----------------------------------------------------------------
    // ACTION: markContactInvalid
    // ----------------------------------------------------------------
    if (action === 'markContactInvalid') {
      var emailToMark = postData.email;
      if (!emailToMark) return jsonResponse('error', 'Missing email.');

      var apiKey = PropertiesService.getScriptProperties().getProperty('Freshdesk_Api_Key');
      var authHeader = 'Basic ' + Utilities.base64Encode(apiKey + ':X');

      var searchUrl = 'https://runnertech.freshdesk.com/api/v2/contacts?email=' + encodeURIComponent(emailToMark);
      var sRes = UrlFetchApp.fetch(searchUrl, { 'headers': { 'Authorization': authHeader }, 'muteHttpExceptions': true });

      if (sRes.getResponseCode() === 200) {
         var existingList = JSON.parse(sRes.getContentText());
         if (existingList && existingList.length > 0) {
            var contactId = existingList[0].id;
            var updateUrl = 'https://runnertech.freshdesk.com/api/v2/contacts/' + contactId;
            var updatePayload = { 
                custom_fields: { do_not_contact_: true } 
            };
            
            var updateRes = UrlFetchApp.fetch(updateUrl, {
              'method': 'put',
              'headers': { 'Authorization': authHeader, 'Content-Type': 'application/json' },
              'payload': JSON.stringify(updatePayload),
              'muteHttpExceptions': true
            });
            if (updateRes.getResponseCode() === 200) {
                return jsonResponse('success', 'Contact marked as Do Not Contact in Freshdesk.');
            } else {
                return jsonResponse('error', 'Failed to update contact: ' + updateRes.getContentText());
            }
         } else {
             return jsonResponse('error', 'Contact not found.');
         }
      } else {
          return jsonResponse('error', 'Failed to search Freshdesk.');
      }
    }

    // ----------------------------------------------------------------
    // DEFAULT ACTION: triage update (existing logic)
    // ----------------------------------------------------------------
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Triage_Data");
    if (!sheet) {
      return jsonResponse('error', 'Triage_Data sheet not found.');
    }

    var uniqueId  = postData.uniqueId;
    var company   = postData.company;
    var field     = postData.field;
    var value     = postData.value;
    var user      = postData.user;
    var email     = postData.email || "";
    var note      = postData.note  || "";
    var timestamp = new Date().toISOString();

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["UniqueId", "Company", "Field", "Value", "Timestamp", "User", "Email", "Note"]);
    }

    sheet.appendRow([uniqueId, company, field, value, timestamp, user, email, note]);

    // Email notification on CSM assignment
    if (field === 'csm' && value !== 'Unassigned') {
      var emailAddress = "";
      if (value === "Misty Wilmore") {
        emailAddress = "misty.wilmore@runnertechnologies.com";
      } else if (value === "Tonja Jones") {
        emailAddress = "tonja.jones@runnertechnologies.com";
      }

      if (emailAddress !== "") {
        var subject = "New Customer Assignment: " + company;
        var body = "Hello " + value + ",\n\n" +
                   "You have been assigned as the CSM for " + company + " by " + user + " (" + email + ").\n\n" +
                   "Please check the Customer Health Dashboard for more details.\n\n" +
                   "Best,\nCustomer Success Team";
        try {
          GmailApp.sendEmail(emailAddress, subject, body, {
            from: "customersuccess@runnertechnologies.com"
          });
        } catch(aliasError) {
          MailApp.sendEmail(emailAddress, subject, body);
        }
      }
    }

    // Email notification for Exhausted Contacts
    if (field === 'status' && value === 'Requires CS Review - DNC/Exhausted') {
       var csmSearch = 'Unassigned';
       var rData = sheet.getDataRange().getValues();
       for (var r = rData.length - 1; r >= 1; r--) {
         if (rData[r][0] == uniqueId && rData[r][2] == 'csm') {
             csmSearch = rData[r][3];
             break;
         }
       }
       if (csmSearch !== 'Unassigned') {
         var emailExhaust = "";
         if (csmSearch === "Misty Wilmore") emailExhaust = "misty.wilmore@runnertechnologies.com";
         else if (csmSearch === "Tonja Jones") emailExhaust = "tonja.jones@runnertechnologies.com";
         
         if (emailExhaust !== "") {
            var subjectExhaust = "Outreach Alert: " + company + " Contacts Exhausted";
            var bodyExhaust = "Hello " + csmSearch + ",\n\n" +
                       "All known contacts for " + company + " have either failed the cadence or are marked Do Not Contact/Retired.\n\n" +
                       "Please perform manual research to find a new contact. Once you find one, open the dashboard's Engagement Blackout View and click [+ Add Researched Contact] to seamlessly inject them into the cadence.\n\n" +
                       "Best,\nCustomer Health Automation";
            try {
              GmailApp.sendEmail(emailExhaust, subjectExhaust, bodyExhaust, {
                from: "customersuccess@runnertechnologies.com"
              });
            } catch(aliasError) {
              MailApp.sendEmail(emailExhaust, subjectExhaust, bodyExhaust);
            }
         }
       }
    }

    return jsonResponse('success', 'Triage saved.');

  } catch (error) {
    return jsonResponse('error', error.toString());
  }
}


// Helper: return a standard JSON response
function jsonResponse(status, message) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: status, message: message, gs_version: '1.3' }))
    .setMimeType(ContentService.MimeType.JSON);
}


// ==========================================================================
// FILE: Diagnostic.gs
// ==========================================================================

function inspectTicketFields() {
  var apiKey = PropertiesService.getScriptProperties().getProperty('Freshdesk_Api_Key');
  var domain = 'runnertech.freshdesk.com';
  var authHeader = 'Basic ' + Utilities.base64Encode(apiKey + ':X');
  var fdOpts = { headers: { Authorization: authHeader }, muteHttpExceptions: true };

  // Fetch the 5 most recent tickets to find one that's not an OOO
  var url = 'https://' + domain + '/api/v2/tickets?per_page=5&order_by=created_at&order_type=desc';
  var res = UrlFetchApp.fetch(url, fdOpts);
  var tkts = JSON.parse(res.getContentText());

  var target = null;
  for (var i = 0; i < tkts.length; i++) {
    var subj = (tkts[i].subject || '').toLowerCase();
    if (subj.indexOf('out of office') === -1 && subj.indexOf('auto') === -1) {
      target = tkts[i];
      break;
    }
  }

  if (!target) {
    Logger.log('❌ No suitable test ticket found in the last 5 tickets.');
    return;
  }

  Logger.log('=== TICKET FIELD INSPECTION ===');
  Logger.log('Ticket ID   : ' + target.id);
  Logger.log('Subject     : ' + target.subject);
  Logger.log('Status      : ' + target.status);
  Logger.log('Tags        : ' + JSON.stringify(target.tags));
  Logger.log('');
  Logger.log('--- ALL CUSTOM FIELDS ---');

  var cf = target.custom_fields || {};
  var keys = Object.keys(cf);
  if (keys.length === 0) {
    Logger.log('(no custom fields found on this ticket)');
  } else {
    keys.forEach(function(k) {
      Logger.log('  ' + k + ' = ' + JSON.stringify(cf[k]));
    });
  }

  Logger.log('');
  Logger.log('=== EXPECTED WRITE TARGETS ===');
  Logger.log('  cf_revised_subject_name : ' + (cf.hasOwnProperty('cf_revised_subject_name') ? '✅ EXISTS (current: ' + cf['cf_revised_subject_name'] + ')' : '❌ NOT FOUND — check field name in FD Admin'));
  Logger.log('  cf_ai_summary_notes     : ' + (cf.hasOwnProperty('cf_ai_summary_notes')     ? '✅ EXISTS (current: ' + cf['cf_ai_summary_notes']     + ')' : '❌ NOT FOUND — check field name in FD Admin'));
  Logger.log('');
  Logger.log('→ Use ticket ID ' + target.id + ' in testSingleTicketLive() below');
}


/**
 * STEP 2 — Run this after inspectTicketFields confirms field names are correct.
 * Processes ONE ticket end-to-end:
 *   - Calls Gemini AI to analyze the ticket thread
 *   - Writes cf_revised_subject_name + cf_ai_summary_notes to Freshdesk (LIVE)
 *   - Logs exactly what was sent and what Freshdesk replied
 *
 * HOW TO USE:
 *   1. Replace TICKET_ID_HERE with the ID from inspectTicketFields output
 *   2. Select "testSingleTicketLive" from the dropdown and click Run
 *   3. Check the Execution Log AND open that ticket in Freshdesk to confirm
 */
function testSingleTicketLive() {
  var TICKET_ID = 90958; // ← REPLACE with a real ticket ID from inspectTicketFields

  Logger.log('🚀 Starting live test on ticket #' + TICKET_ID);
  Logger.log('   (dryRun = FALSE — this WILL write to Freshdesk)');
  Logger.log('');

  var apiKey = PropertiesService.getScriptProperties().getProperty('Freshdesk_Api_Key');
  var domain = 'runnertech.freshdesk.com';
  var authHeader = 'Basic ' + Utilities.base64Encode(apiKey + ':X');
  var fdOpts = { headers: { Authorization: authHeader }, muteHttpExceptions: true };
  var res = UrlFetchApp.fetch('https://' + domain + '/api/v2/tickets/' + TICKET_ID, fdOpts);
  if (res.getResponseCode() === 200) {
    var t = JSON.parse(res.getContentText());
    Logger.log('=== TARGET TICKET CUSTOM FIELDS ===');
    var cf = t.custom_fields || {};
    Object.keys(cf).forEach(function(k) {
      Logger.log('  ' + k + ' = ' + JSON.stringify(cf[k]));
    });
    Logger.log('===================================');
  }

  try {
    var result = processTicket(TICKET_ID, false); // dryRun = false → writes for real
    Logger.log('=== RESULT ===');
    Logger.log(JSON.stringify(result, null, 2));

    if (result.status === 'success') {
      Logger.log('');
      Logger.log('✅ SUCCESS! Now open this ticket in Freshdesk to verify:');
      Logger.log('   https://runnertech.freshdesk.com/a/tickets/' + TICKET_ID);
      Logger.log('');
      Logger.log('In the properties panel on the right, you should see:');
      Logger.log('  Revised Subject Name : ' + (result.ai_result ? result.ai_result.proposed_subject : '(check log)'));
      Logger.log('  AI Summary Notes     : (first 100 chars) ' + (result.ai_result && result.ai_result.summary ? result.ai_result.summary.substring(0, 100) + '...' : '(check log)'));
    } else {
      Logger.log('');
      Logger.log('❌ FAILED. Error message: ' + result.message);
      Logger.log('Common causes:');
      Logger.log('  - Custom field name mismatch (run inspectTicketFields first)');
      Logger.log('  - Ticket was already processed (has ai: tags or cf_ai_summary_notes)');
      Logger.log('  - Gemini API key missing or rate limited');
    }
  } catch(e) {
    Logger.log('❌ Exception: ' + e.message);
    Logger.log(e.stack);
  }
}


/**
 * UTILITY — Finds a recent ticket suitable for testing (no OOO, no ai: tags, no prior AI processing).
 * Run this if you are unsure which ticket to use for testSingleTicketLive.
 */
function findTestableTicket() {
  var apiKey = PropertiesService.getScriptProperties().getProperty('Freshdesk_Api_Key');
  var domain = 'runnertech.freshdesk.com';
  var authHeader = 'Basic ' + Utilities.base64Encode(apiKey + ':X');
  var fdOpts = { headers: { Authorization: authHeader }, muteHttpExceptions: true };

  var url = 'https://' + domain + '/api/v2/tickets?per_page=20&order_by=created_at&order_type=desc';
  var res = UrlFetchApp.fetch(url, fdOpts);
  var tkts = JSON.parse(res.getContentText());

  Logger.log('=== TESTABLE TICKETS (not OOO, not already AI-processed) ===');
  var found = 0;
  tkts.forEach(function(t) {
    var subj = (t.subject || '').toLowerCase();
    if (subj.indexOf('out of office') !== -1 || subj.indexOf('automatic reply') !== -1 || subj.indexOf('auto-reply') !== -1) return;

    var tags = t.tags || [];
    var alreadyDone = tags.some(function(tag) { return tag.toLowerCase().indexOf('ai:') === 0; });
    var cf = t.custom_fields || {};
    if (alreadyDone || cf['cf_ai_summary_notes']) return;

    Logger.log('  ID: ' + t.id + ' | Subject: ' + t.subject);
    found++;
  });

  if (found === 0) Logger.log('  (All recent 20 tickets are either OOO or already processed)');
  Logger.log('');
  Logger.log('→ Copy any ID above into testSingleTicketLive()');
}

// ─────────────────────────────────────────────────────────────────────────
// ONE-TIME CLEANUP: Removes incorrectly processed noise tickets
// from both Ticket_AI_Data and AI_Processing_Log sheets.
// Run once from Apps Script editor after redeployment.
// ─────────────────────────────────────────────────────────────────────────
function removeNoiseTicketsFromSheet() {
  var TICKETS_TO_REMOVE = ['90819', '90789', '90790', '90800', '90802', '90844', '90859', '90861', '91057', '90791', '90855', '90847', '90735', '90738', '90739', '90745', '90746', '90757', '90760', '90761', '90763', '90768', '90972'];

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var removedAiData = 0;
  var removedLog    = 0;

  // ── Clean Ticket_AI_Data ─────────────────────────────────────
  var aiSheet = ss.getSheetByName('Ticket_AI_Data');
  if (aiSheet) {
    var aiData = aiSheet.getDataRange().getValues();
    // Iterate from bottom up so row deletions don't shift indices
    for (var i = aiData.length - 1; i >= 1; i--) {
      var tid = String(aiData[i][0]).trim();
      if (TICKETS_TO_REMOVE.indexOf(tid) !== -1) {
        aiSheet.deleteRow(i + 1); // sheet rows are 1-indexed
        removedAiData++;
      }
    }
  }

  // ── Clean AI_Processing_Log ──────────────────────────────────
  var logSheet = ss.getSheetByName('AI_Processing_Log');
  if (logSheet) {
    var logData = logSheet.getDataRange().getValues();
    for (var j = logData.length - 1; j >= 1; j--) {
      var ltid = String(logData[j][1]).trim(); // column B = ticket_id
      if (TICKETS_TO_REMOVE.indexOf(ltid) !== -1) {
        logSheet.deleteRow(j + 1);
        removedLog++;
      }
    }
  }

  var msg = 'Cleanup complete. Removed ' + removedAiData + ' rows from Ticket_AI_Data and ' + removedLog + ' rows from AI_Processing_Log.';
  Logger.log(msg);
}
function revertNoiseTickets() {
  var ticketsToRevert = [90819, 90789, 90790, 90800, 90802, 90844, 90859, 90861, 91057, 90791, 90855, 90847, 90735, 90738, 90739, 90745, 90746, 90757, 90760, 90761, 90763, 90768, 90972];
  var domain = 'runnertech.freshdesk.com';
  var apiKey = PropertiesService.getScriptProperties().getProperty('Freshdesk_Api_Key');
  
  if (!apiKey) {
    console.error("No API key found.");
    return;
  }
  
  var authHeader = 'Basic ' + Utilities.base64Encode(apiKey + ':X');
  var fdOpts = {
    headers: { 'Authorization': authHeader },
    muteHttpExceptions: true
  };
  
  var logMessages = [];
  
  for (var i = 0; i < ticketsToRevert.length; i++) {
    var ticketId = ticketsToRevert[i];
    
    // 1. Fetch ticket
    var ticketRes = UrlFetchApp.fetch('https://' + domain + '/api/v2/tickets/' + ticketId, fdOpts);
    if (ticketRes.getResponseCode() !== 200) {
      logMessages.push('Ticket ' + ticketId + ': Not found or error fetching.');
      continue;
    }
    var ticket = JSON.parse(ticketRes.getContentText());
    
    // 2. Clean subject (remove AI bracket prefixes like [Critical]: or [Other]:)
    var cleanSubject = ticket.subject.replace(/^\[.*?\]:\s*/i, '');
    
    // 3. Clean tags (remove anything starting with 'ai:')
    var currentTags = ticket.tags || [];
    var newTags = [];
    for (var t = 0; t < currentTags.length; t++) {
      if (currentTags[t].indexOf('ai:') !== 0) {
        newTags.push(currentTags[t]);
      }
    }
    
    // 4. Update ticket (subject and tags)
    var updatePayload = {
      subject: cleanSubject,
      tags: newTags
    };
    var updateOptions = {
      method: 'put',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
      payload: JSON.stringify(updatePayload),
      muteHttpExceptions: true
    };
    var updateRes = UrlFetchApp.fetch('https://' + domain + '/api/v2/tickets/' + ticketId, updateOptions);
    var updateSuccess = updateRes.getResponseCode() === 200;
    
    // 5. Delete AI conversations (Notes)
    var convUrl = 'https://' + domain + '/api/v2/tickets/' + ticketId + '/conversations';
    var convRes = UrlFetchApp.fetch(convUrl, fdOpts);
    var notesDeleted = 0;
    if (convRes.getResponseCode() === 200) {
      var conversations = JSON.parse(convRes.getContentText());
      for (var j = 0; j < conversations.length; j++) {
        var conv = conversations[j];
        if (conv.private && conv.body_text && conv.body_text.indexOf('AI Classification Summary') !== -1) {
          // Delete this conversation
          var delOpts = {
            method: 'delete',
            headers: { 'Authorization': authHeader },
            muteHttpExceptions: true
          };
          UrlFetchApp.fetch('https://' + domain + '/api/v2/conversations/' + conv.id, delOpts);
          notesDeleted++;
        }
      }
    }
    
    logMessages.push('Ticket ' + ticketId + ': Subject reverted (' + updateSuccess + '), ' + (currentTags.length - newTags.length) + ' tags removed, ' + notesDeleted + ' notes deleted.');
  }
  
  console.log("Cleanup Results:\n" + logMessages.join('\n'));
}

// ─────────────────────────────────────────────────────────────────────────
// FACTORY RESET: Clears all AI data sheets and removes AI tags/custom fields
// from all tickets in Freshdesk (except ai:skipped).
// ─────────────────────────────────────────────────────────────────────────
function factoryResetAiData() {
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty('Freshdesk_Api_Key');
  var domain = 'runnertech.freshdesk.com';
  var authHeader = 'Basic ' + Utilities.base64Encode(apiKey + ':X');
  
  // 1. Clear Google Sheets Data
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aiSheet = ss.getSheetByName('Ticket_AI_Data');
  if (aiSheet && aiSheet.getLastRow() > 1) {
    aiSheet.getRange(2, 1, aiSheet.getLastRow() - 1, aiSheet.getLastColumn()).clearContent();
  }
  
  var logSheet = ss.getSheetByName('AI_Processing_Log');
  if (logSheet && logSheet.getLastRow() > 1) {
    logSheet.getRange(2, 1, logSheet.getLastRow() - 1, logSheet.getLastColumn()).clearContent();
  }
  
  var auditSheet = ss.getSheetByName('Audit_Report');
  if (auditSheet && auditSheet.getLastRow() > 1) {
    auditSheet.getRange(2, 1, auditSheet.getLastRow() - 1, auditSheet.getLastColumn()).clearContent();
  }
  
  Logger.log("Sheets cleared.");

  // 2. Clear Freshdesk Tickets
  var page = 1;
  var ticketsReset = 0;
  
  while (true) {
    var url = 'https://' + domain + '/api/v2/search/tickets?query="tag:\'ai:reviewed\' OR tag:\'ai:processed\'"&page=' + page;
    var res = UrlFetchApp.fetch(url, { headers: { Authorization: authHeader }, muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) break;
    
    var tktsRes = JSON.parse(res.getContentText());
    var tkts = tktsRes.results || [];
    if (tkts.length === 0) break;
    
    for (var i = 0; i < tkts.length; i++) {
      var t = tkts[i];
      var tags = t.tags || [];
      var newTags = [];
      
      for (var j = 0; j < tags.length; j++) {
        if (tags[j].indexOf('ai:') !== 0) {
          newTags.push(tags[j]);
        }
      }
      
      var updatePayload = {
        tags: newTags,
        custom_fields: {
          cf_ai_proposed_subject: null,
          cf_ai_summary_notes: null,
          cf_ai_product_area: null,
          cf_ai_integration: null,
          cf_ai_severity: null
        }
      };
      
      var updateUrl = 'https://' + domain + '/api/v2/tickets/' + t.id;
      UrlFetchApp.fetch(updateUrl, {
        'method': 'put',
        'headers': { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        'payload': JSON.stringify(updatePayload),
        'muteHttpExceptions': true
      });
      ticketsReset++;
    }
    page++;
    Utilities.sleep(1500); // Respect API rate limits
  }
  
  Logger.log("Reset " + ticketsReset + " tickets in Freshdesk.");
}



