# Customer Health Dashboard — Complete Setup & User Guide

> **ELI5 Edition** — Written so anyone can understand it, from day one. No tech degree required.

---

## 📋 Table of Contents

1. [What Is This Dashboard?](#1-what-is-this-dashboard)
2. [Initial Setup — Running the Dashboard](#2-initial-setup--running-the-dashboard)
3. [Logging In & Your Role](#3-logging-in--your-role)
4. [The Header Bar — KPI Cards](#4-the-header-bar--kpi-cards)
5. [Tab 1: Dashboard — Charts & Trends](#5-tab-1-dashboard--charts--trends)
6. [Tab 2: Triage — Critical Health & Engagement Blackout](#6-tab-2-triage--critical-health--engagement-blackout)
7. [Tab 3: Data Table](#7-tab-3-data-table)
8. [Tab 4: Ticket Intelligence (AI)](#8-tab-4-ticket-intelligence-ai)
   - [Who Can Run Batch Jobs?](#who-can-run-batch-jobs-role-based-access)
   - [Dry-Run vs. Live Run](#dry-run-preview-mode-vs-live-run)
   - [Starting a Batch Job](#starting-a-batch-job)
   - [Watching Progress](#watching-progress--the-status-bar)
   - [Manual Single-Ticket Processing](#manual-single-ticket-processing)
   - [Force Re-process a Ticket](#force-re-process-a-ticket)
   - [Retry Failed Tickets](#retry-failed-tickets)
   - [Ticket Exclusions (What Gets Skipped)](#what-gets-automatically-skipped)
   - [Charts — Issue Types, ERP, Services](#the-three-charts)
   - [Processed Ticket Browser](#processed-ticket-browser)
   - [AI Processing Log](#ai-processing-log)
   - [Data Health: Unmatched Records](#data-health-unmatched-records)
   - [Data Health: AI Classification Review Queue](#data-health-ai-classification-review-queue)
   - [Automation — Daily Maintenance Trigger](#automation--daily-maintenance-trigger)
   - [Batch Completion Email](#batch-completion-email)
9. [Outreach Modal — Emailing & Calling Customers](#9-outreach-modal--emailing--calling-customers)
10. [Troubleshooting](#10-troubleshooting)
11. [Apps Script Setup (Admin Only)](#11-apps-script-setup-admin-only)

---

## 1. What Is This Dashboard?

Think of this dashboard as your **mission control center for customer health**. It pulls together:

- 📋 **Customer survey responses** — how happy are your customers?
- 🎫 **Support ticket history** — what problems are they having?
- 🤖 **AI-generated intelligence** — what patterns are emerging across all tickets?

All of this is displayed in one browser page so your team can quickly spot at-risk customers, track outreach, and understand what issues are trending.

---

## 2. Initial Setup — Running the Dashboard

### What You Need First
- Google Chrome (preferred browser)
- Python installed (comes with most Macs and modern PCs)
- The dashboard ZIP file from Google Drive

### Step-by-Step

**Step 1 — Get the Files**
1. Open the shared Google Drive folder: **Customer Success → Customer_Survey_Health_Dashboard**
2. Download `Survey_Dashboard_Package.zip`
3. Move the ZIP to your Desktop
4. Delete any old extracted dashboard folder first (to prevent file conflicts)
5. Right-click the ZIP → **Extract All** → **Extract**

**Step 2 — Start the Local Server**

> ⚠️ The dashboard won't work by just double-clicking the HTML file. It needs a tiny local server because it talks to Google securely in the background.

1. Click Start → type `cmd` → press Enter (opens the black Command Prompt box)
2. Type `cd ` (with a space after it), then drag & drop your extracted folder onto the Command Prompt window — it will paste the path automatically
3. Press Enter
4. Type exactly: `python -m http.server 8080` and press Enter
5. You should see: `Serving HTTP on :: port 8080` — **do not close this window!**

**Step 3 — Open in Chrome**
1. Open Chrome
2. In the address bar type: `localhost:8080/customer_health_dashboard.html`
3. Press Enter — the dashboard loads!

> 💡 When you're done for the day, close the Chrome tab and then close the black Command Prompt window.

---

## 3. Logging In & Your Role

### Why Login?
Without logging in, you are in **read-only / view mode**. You can see all charts and data but cannot change anything or run AI jobs.

### How to Log In
1. Click **"Login for Editing"** at the top right of the dashboard
2. Enter your full name and your `@runnertechnologies.com` email
3. Click **"Send Code"** — a 6-digit code is emailed to you instantly
4. Enter the code in the box and click **"Verify Code"**
5. You're in! ✅

> 🔐 Codes expire after 10 minutes. If yours expired, click "Go back" and request a new one.

### Your Role Explained

| Role | Can See Everything? | Can Edit / Assign? | Can Run AI Batch Jobs? |
|---|---|---|---|
| **Viewer** (not logged in) | ✅ Yes | ❌ No | ❌ No |
| **CSM** (logged in, e.g., Tonja) | ✅ Yes | ✅ Yes (own accounts) | ❌ No |
| **Admin** (logged in, e.g., Misty) | ✅ Yes | ✅ Yes (all accounts) | ✅ Yes |

> ℹ️ **Batch job access is intentionally restricted to admins only.** This prevents accidental large-scale AI runs that consume API credits. Only Misty Wilmore can trigger, stop, or retry batch jobs.

---

## 4. The Header Bar — KPI Cards

These five cards at the top give you an instant health snapshot of your entire customer base.

| Card | What It Means |
|---|---|
| **CLEAN_Address Score** | The average satisfaction score (1–5 scale) across all survey responses currently loaded |
| **Total Responses** | How many survey responses are in the system right now |
| **At-Risk Customers** | Customers who scored 1 or 2 (out of 5) on their most recent survey — needs attention! |
| **Silent Accounts** | Customers who have NOT sent a ticket or answered a survey in over 180 days — they are "ghosting" us |
| **New Responses (24h)** | Fresh survey submissions received in the last 24 hours |

> 💡 Hover over the **`?`** icon on any card to see exactly how that number is calculated.

---

## 5. Tab 1: Dashboard — Charts & Trends

This is the first thing you see when the page loads. It has six interactive charts.

### Chart 1: CLEAN_Address Score Trend (Line Chart)
- **What it shows:** How the average customer health score has changed over time
- **Why it matters:** If this line is dropping, customers are getting less happy over time — a red flag
- **How to use it:** Look for sudden dips that might match a product release or support issue

### Chart 2: CLEAN_Address Score Distribution (Pie/Donut Chart)
- **What it shows:** How many customers scored 1, 2, 3, 4, or 5 on the health question
- **Interactive:** Click any slice to filter the **Data Table tab** to show only customers in that score group

### Chart 3: ROI Score Distribution (Pie/Donut Chart)
- **What it shows:** Whether customers feel they're getting a good return on their investment (Q4 in the survey)
- **Interactive:** Click any slice to filter the Data Table

### Chart 4: CLEAN_Address Score vs. ROI Correlation (Scatter Plot)
- **What it shows:** A dot for each company — where they land based on their Health Score (Y axis) vs. ROI perception (X axis)
- **Why it matters:** Companies in the bottom-left corner (low health AND low ROI) are at the highest churn risk
- **Interactive:** Click any cluster of dots to filter the Data Table to those companies

### Chart 5: Product Adoption Score (Pie/Donut Chart)
- **What it shows:** A composite score based on three survey questions — ROI (Q4), Batch Processing (Q14), and CLEAN_File awareness (Q12)
- **Why it matters:** Low adoption = they're not using the full product, which leads to churn
- **Interactive:** Click any slice to filter the Data Table

### Chart 6: Support Satisfaction Score (Pie/Donut Chart)
- **What it shows:** How customers rated the Support Portal / Knowledge Base (Q10)
- **Why it matters:** Even unhappy customers can stay if support is excellent

### Chart 7: Health Score by ERP System (Bar Chart)
- **What it shows:** The average health score broken out by which ERP system the customer uses (Banner, Salesforce, PeopleSoft, etc.)
- **Why it matters:** If one ERP group consistently scores low, it points to an integration issue

### Chart 8: Time Since Last Touchpoint (Bar Chart)
- **What it shows:** Buckets of customers by how many days since they last contacted us (via ticket or survey)
- **Interactive:** Click any bar to jump to the **Engagement Blackout tab** filtered to that time range
- **Why it matters:** The further right the bar, the more "silent" that group is

### Recent Qualitative Feedback (Feed)
- **What it shows:** A live scrolling list of all the text/written feedback customers submitted in their surveys, automatically color-coded by sentiment (green = positive, red = negative)
- **How to use it:** Read through these to understand what customers are saying in their own words — this context is gold for outreach calls

---

## 6. Tab 2: Triage — Critical Health & Engagement Blackout

### Sub-Tab 1: Critical Health
Shows a list of every customer who scored poorly (1 or 2 out of 5) on their most recent survey. These accounts need active follow-up NOW.

**Filters available:**
- **Assigned CSM:** Filter to see only your accounts (or all accounts if admin)
- **Follow-up Status:** Filter by where the account is in the follow-up workflow

**What you can do per account:**
- **Assign yourself** as the CSM handling it
- **Update the status** (e.g., "New Response" → "Outreach Sent - Awaiting Reply")
- **Add follow-up notes** — a popup will ask you for notes any time you change the status
- **Open the Outreach modal** — walk through emailing or calling the customer contact

### Sub-Tab 2: Engagement Blackout
Shows customers who are completely silent — no survey, no support ticket, nothing.

**Risk levels:**
| Level | What It Means |
|---|---|
| 🔴 **365+ Days / Never (Critical)** | They've never engaged or haven't in over a year. High churn risk |
| 🟠 **180–365 Days (Risk)** | Over 6 months of silence |
| 🟡 **90–180 Days (Warning)** | Getting concerning |

**Filters available:**
- **Risk Level:** Focus on a specific silence range
- **Follow-up Only:** Show only accounts that need action (hides snoozed/complete)
- **Assigned CSM:** Filter to your own accounts

**Snooze a Customer:**
If a customer says "call me in 30 days," click the snooze button, pick the date, and write a note. They'll disappear from the list until that date, then come back automatically.

---

## 7. Tab 3: Data Table

This is the raw data view — every single survey response in a filterable table. Use the global filters at the top of the page (Industry, Date Range, etc.) to narrow down the results.

**Columns:**
- Date, Company, Health Score (Q2), Product Adoption (Avg), ROI (Q4), Support Satisfaction (Q10), Batch Usage (Q14), CLEAN_File Awareness (Q12), Cloud Plan (Q16), Reference willingness (Q30), Industry, ERP

**Click "View Details"** on any row to see the customer's full survey response in a popup.

---

## 8. Tab 4: Ticket Intelligence (AI)

> 🤖 This is the most powerful tab. The AI reads all your closed Freshdesk support tickets, figures out what the issue really was, gives it a better subject line, writes a summary, and tracks trends across all of them.

---

### Who Can Run Batch Jobs? (Role-Based Access)

**Only admins (currently: Misty Wilmore) can run AI batch jobs.** This is enforced at both the UI level (buttons are hidden for non-admins) and the server level (the backend will reject unauthorized requests even if someone tries to bypass the UI).

If you are logged in as a CSM (e.g., Tonja), you will see a notice: *"Batch jobs are restricted to system admins. Contact Misty Wilmore to request a run."* You can still view all the charts and logs.

---

### Dry-Run (Preview Mode) vs. Live Run

Before running the AI on real tickets, you have a safety switch:

| Mode | What Happens |
|---|---|
| ☑️ **Dry-Run checked** | AI reads tickets and generates summaries, but **nothing is saved to Freshdesk**. Results appear in the AI Processing Log table so you can review them first. |
| ☐ **Dry-Run unchecked** | AI reads tickets AND **permanently saves** the revised subject line and AI summary into each Freshdesk ticket's custom fields. Charts populate. |

> 💡 **Always start with a Dry-Run** on a small batch to make sure the AI output looks right before committing to Freshdesk.

---

### Starting a Batch Job

1. Make sure you are **logged in as an admin**
2. *(Optional)* Check **Dry-Run** if you want a preview
3. *(Optional)* Set **Max Tickets** to a small number (e.g., `5`) for a test run — leave blank to process all
4. Click **▶️ Start Batch Job**
5. The status bar appears — you can watch progress in real time

**What "Max Tickets" means:**
- Leave it blank = process every eligible ticket it can find (the big historical backlog run)
- Enter `20` = stop after 20 successfully processed tickets (skipped/noise/failed tickets do not count towards this limit; it will continue searching until it successfully processes 20 tickets or exhausts all records)

---

### Watching Progress — The Status Bar

While a batch job runs, a status bar appears showing:

- **Page:** Which "page" of Freshdesk tickets it's currently scanning (30 tickets per page)
- **Processed:** How many tickets have been successfully AI-processed this session
- **Failed:** How many tickets hit an error (API failure, validation issue, etc.)
- **Skipped:** How many tickets were intentionally bypassed (already done, spam, etc.)
- **Elapsed time:** How long the job has been running

> ℹ️ Google Apps Script has a 6-minute execution limit. If the job is large, it will automatically pause and resume from where it left off the next time it runs (or you can re-click Start).

---

### Manual Single-Ticket Processing

Sometimes you need to run just ONE specific ticket through the AI — maybe a rep just closed a ticket and you want to tag it immediately, or a ticket was missed during a batch run.

**How to use it:**
1. Find the ticket number in Freshdesk (it's the number in the URL, e.g., `#91003`)
2. In the **Manual Ticket Processing** panel, type the ticket number into the **Ticket ID** field
3. Click **▶ Process This Ticket**
4. A result message appears below the button (green = success, red = error with reason)

> 🔐 This panel is only visible and functional when logged in as an admin.

---

### Force Re-process a Ticket

Normally, the system skips any ticket that already has AI tags or a summary — to avoid wasting API credits re-doing work.

But sometimes the AI got it wrong the first time (wrong integration label, bad summary), and you want to re-run it.

**How to use it:**
1. Enter the ticket ID in the Manual Ticket Processing panel
2. **Check the "Force Re-process" checkbox**
3. Click **▶ Process This Ticket**

The system will re-run the AI on that ticket even if it was already processed, overwriting the previous output.

> ⚠️ Use this deliberately — it will overwrite the existing `cf_revised_subject_name` and `cf_ai_summary_notes` fields in Freshdesk.

---

### Retry Failed Tickets

If a batch job had errors (network blips, API rate limits, Freshdesk validation issues), those tickets show as `error` in the AI Processing Log. Rather than re-running the entire batch to catch them, you can surgically retry just the failures.

**How to use it:**
1. In the **Manual Ticket Processing** panel, click **⚠️ Retry Failed Tickets**
2. The system automatically reads all `error` rows from the AI Processing Log
3. It re-queues each unique failed ticket ID for reprocessing
4. A message tells you how many tickets were queued

> 💡 This is the fastest way to clean up after a failed batch. Only distinct ticket IDs are retried (so the same ticket won't be retried twice even if it failed multiple times in the log).

---

### What Gets Automatically Skipped?

The system intelligently skips tickets that shouldn't be AI-processed. These are counted in the **Skipped** counter but not treated as errors.

| Skip Reason | Why |
|---|---|
| Already processed | The ticket already has `cf_ai_summary_notes` or `ai:` tags. Use "Force Re-process" to override. |
| **Spam** type ticket | Noise — not useful for trend analysis |
| **Runner Internal** type ticket | Internal-only tickets that don't represent real customer issues |
| Out-of-Office / Auto-Reply | Subjects containing "out of office", "automatic reply", etc. |
| Open or Pending status | Only **Resolved** (status 4) and **Closed** (status 5) tickets are processed — active tickets haven't been assigned and triaged yet |

---

### The Three Charts

These charts are powered by the `Ticket_AI_Data` Google Sheet, which is populated as the AI processes tickets.

#### Chart 1: Issue Types by Category (Bar Chart)
- **What it shows:** A breakdown of what the AI categorized as the main topic of each ticket, grouped by the prefix of the Revised Subject (e.g., "Banner", "Authentication", "Data File")
- **Why it matters:** Instantly see which categories are generating the most support load

#### Chart 2: ERP / Integrations (Donut Chart)
- **What it shows:** Which ERP or integration system is mentioned most in tickets (Banner, PeopleSoft, Salesforce, etc.)
- **Note:** "General", "None", and internal tools (SFTP, FTP, Melissa) are intentionally excluded so this chart only shows real customer ERP connections
- **Why it matters:** Pinpoints which integration needs documentation, training, or a bug fix

#### Chart 3: Services / Products (Donut Chart)
- **What it shows:** Which Runner product area is mentioned most (CLEAN_Address, CLEAN_File, Data Enhancement, SurveyDIG, etc.)
- **Why it matters:** Shows which services are driving the most tickets — useful for product roadmap and training focus

---

### Processed Ticket Browser

A scrollable table showing every ticket the AI has processed (most recent first). Click any row to open that ticket in Freshdesk.

**Columns:**
- **Date:** When the ticket was originally created
- **Ticket #:** Freshdesk ticket ID (clickable link)
- **Revised Subject:** The AI-generated clean subject line (format: `Integration: Category Issue`)
- **ERP / Integration:** What system the AI identified as involved
- **Severity:** How serious the AI judged the issue (critical / high / medium / low)
- **Sentiment:** How the customer felt during the interaction (😊 positive, 😐 neutral, 😤 frustrated, 😌 frustrated-then-resolved)

---

### AI Processing Log

A detailed log of every ticket the AI has touched — including both successes and errors.

**Columns:**
- **Timestamp:** When this processing happened
- **Ticket #:** Freshdesk ticket ID (clickable)
- **Mode:** 📝 DRY RUN PREVIEW (nothing was saved) or ✅ COMMITTED (saved to Freshdesk)
- **Status:** `success` (green) or `error` (red)
- **Proposed Subject:** The AI's suggested subject line for that ticket
- **AI Summary:** A short preview of the AI's summary (hover for full text)

> 💡 **Error rows** are your "retry queue." If you see a lot of red rows, use the **Retry Failed Tickets** button to clean them up.

---

### Data Health: Unmatched Records

This section is separate from the AI. It shows survey respondents whose email domain or company name couldn't be automatically matched to your `customer_data.csv` master list.

**Why does this happen?**
- A customer submitted a survey with a personal email instead of their company email
- A company's name in the survey doesn't exactly match how it's spelled in your CSV

**What to do:**
- Review the list and add/correct the company entry in your CSV file
- Re-upload the CSV to Google Drive and refresh the dashboard

---

### Data Health: AI Classification Review Queue

This section flags tickets that the AI processed but whose output might need a human eye. It automatically surfaces:

| Flag | What It Means |
|---|---|
| **Unclassified** | `integration = "general"` — the AI couldn't determine which ERP/system was involved. These are candidates for manual review or a force re-process. |
| **Critical Severity** | The AI flagged this ticket as `severity = critical` — worth confirming the flag is accurate |
| **Resolution Pending** | The AI classified `resolution = pending` — the ticket may actually still need follow-up even though it's closed in Freshdesk |

You can click the ticket number in any row to jump directly to it in Freshdesk.

---

### Automation — Daily Maintenance Trigger

You don't have to manually run a batch job every day to keep data fresh. The system has an automatic daily trigger that runs at **1:00 AM** each night.

**What it does:**
- Scans all tickets updated in the **last 30 days**
- Processes any closed/resolved tickets that haven't been AI-tagged yet
- Skips everything already processed (no duplicate work)
- Sends a completion email when done (same format as a manual batch email)

**To set this up (one-time, admin only):**
1. Open the Google Apps Script editor for the dashboard
2. In the function dropdown at the top, select `setupDailyMaintenanceTrigger`
3. Click **Run**
4. Done — it will run every night automatically from that point on

---

### Batch Completion Email

When any batch job **fully completes** (not just paused mid-run for the time limit), you will automatically receive an email summarizing the results.

**Email subject format:**
- ✅ `Ticket AI Batch Complete — 47 processed, 0 failed` (all good)
- ⚠️ `Ticket AI Batch Complete — 39 processed, 8 failed` (some failures to retry)

**Email body includes:**
- Mode (Dry-Run or Live)
- Who triggered the job
- Start and finish times
- Breakdown: ✅ Processed / ❌ Failed / ⏭️ Skipped
- If there were failures: a note explaining they are in the Processing Log and can be retried via the dashboard

> 📬 Misty Wilmore always receives this email. If a different admin triggers the job, they receive it too.

---

## 9. Outreach Modal — Emailing & Calling Customers

When you click **"Start Outreach"** on any account in the Triage tabs, a full outreach workflow modal opens.

**What it does:**
1. Fetches the customer's contacts directly from Freshdesk
2. Presents each contact one by one with their name, title, and email
3. Gives you options:
   - **Email Composer:** Drafts a pre-filled email. You can edit it and either send via the backend (`Send Now`) or open your own email client (`Use My Email App`)
   - **Call Logger:** Log the outcome of a phone call (Connected, No Answer, Voicemail, etc.) with notes
   - **Event Logger:** Record any type of interaction (webinar, conference, referral, etc.)
4. If a contact doesn't respond, click **"This Contact Failed"** to move to the next contact in the list
5. If all contacts are exhausted, the account is automatically marked as **"Requires CS Review - DNC/Exhausted"**

**Send Test Email:**
Before sending to a customer, click **"Test (Send to Me)"** — the email goes to your own inbox so you can confirm it looks right.

---

## 10. Troubleshooting

### Dashboard won't load / looks broken
- Make sure your Command Prompt server is still running (Step 2)
- Check that no files in the folder have `(1)` or `(2)` appended to their name — if so, re-extract from the original ZIP

### "localhost refused to connect" error
Your local server stopped. Go back to Step 2 and run `python -m http.server 8080` again inside the folder.

### Everything is grey / can't click anything
Log in! Click **"Login for Editing"** → enter name + email → get the code from your email → enter it.

### Didn't receive the verification code
Check your Spam/Junk folder. If not there, click "Go back" and request a new code. Codes expire after 10 minutes.

### Batch job buttons are hidden
You are logged in as a CSM, not an admin. Only Misty Wilmore (admin) can run batch jobs. Contact Misty to request a batch run.

### Batch job failed partway through
Check the **AI Processing Log** for red `error` rows. Then click **⚠️ Retry Failed Tickets** — the system will re-process only the ones that failed without touching the ones that succeeded.

### Ticket processed with wrong data (wrong ERP, bad summary)
Enter the ticket number in the **Manual Ticket Processing** panel, check **Force Re-process**, and click **▶ Process This Ticket**. The AI will re-analyze it and overwrite the previous output.

### Emails from the Outreach modal aren't sending
The Apps Script needs to have email permissions authorized. See **Section 11** below.

---

## 11. Apps Script Setup (Admin Only)

This section is for Misty or whoever manages the backend Google Apps Script.

### Required Script Properties (set in Apps Script → Project Settings → Script Properties)

| Property Key | What It Is |
|---|---|
| `Freshdesk_Api_Key` | Your Freshdesk API key (from Freshdesk Admin → API Settings) |
| `Groq_Api_Key` | Your Groq API key from [console.groq.com](https://console.groq.com) |

### Setting Up API Keys
1. Open your Apps Script project at [script.google.com](https://script.google.com)
2. Click the **⚙️ Project Settings** gear icon on the left
3. Scroll down to **Script Properties**
4. Click **Add Script Property**
5. Enter the key name exactly as shown above and paste your API key as the value
6. Click **Save Script Properties**

### Authorizing Email Sending (One-Time)
1. In the Apps Script editor, paste this function temporarily at the bottom:
   ```javascript
   function authorizeEmail() {
     MailApp.sendEmail(Session.getActiveUser().getEmail(), 'Test', 'Test');
   }
   ```
2. Select `authorizeEmail` in the function dropdown and click **Run**
3. Follow the Google authorization popup (click "Advanced" → "Go to project (unsafe)" → "Allow")
4. Delete the temporary function once authorized

### Deploying After Code Changes
1. Click **Deploy → Manage Deployments**
2. Click the pencil ✏️ icon on your existing deployment
3. Change Version from "1" to **"New Version"**
4. Click **Deploy**
5. Copy the new Web App URL if it changed and update `SHEET_URL` in `customer_health_dashboard.js`

### Setting Up the Daily Maintenance Trigger
1. In the Apps Script editor, select `setupDailyMaintenanceTrigger` from the function dropdown
2. Click **Run**
3. The trigger is now set — it will scan for newly closed tickets every night at 1 AM automatically

### Adding a New Batch Admin
To allow another user to run batch jobs, open `Code.gs` and add their email to:
```javascript
var BATCH_ADMIN_EMAILS = [
  'misty.wilmore@runnertechnologies.com',
  'newadmin@runnertechnologies.com'  // add here
];
```
Then redeploy.

### Adding New Excluded Ticket Types
To prevent the AI from processing certain Freshdesk ticket types, open `Code.gs` and add to:
```javascript
var EXCLUDED_TICKET_TYPES = ['Spam', 'Runner Internal', 'YourNewType'];
```
Then redeploy.
