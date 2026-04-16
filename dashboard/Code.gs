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
              var td = new Date(t.created_at).getTime();
              if (!tByUser[t.requester_id] || td > tByUser[t.requester_id]) tByUser[t.requester_id] = td;
            }
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
    // ACTION: sendoutreach
    // ----------------------------------------------------------------
    if (action === 'sendoutreach') {
      var targetEmail = postData.email;
      var targetName = postData.name || '';
      var ccEmails = postData.cc || '';
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
