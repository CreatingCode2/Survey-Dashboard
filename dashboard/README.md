# Customer Health Dashboard

A real-time dashboard for visualizing and managing customer health check survey responses, combined with Freshdesk integration for detecting silent accounts. This dashboard integrates directly with Google Sheets for real-time reads and writes, providing powerful tools for customer success management.

## Features

### 📊 Dashboard View
- **KPI Cards**: Key metrics (CLEAN_Address score, Responses, At-Risk Customers, Silent Accounts) with hover tooltips for detailed definitions.
- **Interactive Charts**:
  - CLEAN_Address Score Trend
  - Score Distribution (Health, ROI, Adoption, Support)
  - Time Since Last Touchpoint (identifying Silent Accounts)
  - Health vs ROI Correlation & ERP mapping
- **Deep Drill-downs**: Clicking any data point in the charts instantly filters the Triage or Data blocks below logically.

### 🚨 Triage View
- **Critical Health Tab**: Automatically flags at-risk customers (health score ≤ 3).
- **Engagement Blackout Tab**: Cross-references Freshdesk ticket activity to flag customers who haven't opened a support ticket or taken a survey in 90+ days. Filterable by Risk Level.
- **Secure Login & PIN Verification**: A 2-step login flow — users enter their Runner Technologies email and receive a 6-digit verification code. Codes expire after 10 minutes. Unrecognized emails receive view-only access.
- **Role-Based Access Control**: Three permission tiers — Admin (Misty: full access, assign any customer), CSM (Tonja: self-assign unassigned customers, update own rows only), Viewer (all others: read-only).
- **CSM Assignment & Statuses**: Assign CSMs, track statuses, and archive accounts. All changes are stamped with the user's name, email, and timestamp in the `Triage_Data` sheet.
- **Follow-up Notes**: Add rich text notes to log CSM outreach efforts securely into the database history.
- **Email Automations**: Assigning a CSM automatically triggers an email notification to that team member.

### 📋 Data Table View
- Comprehensive table of all survey responses.
- Detailed modal for examining full 34-question survey responses per customer.

## Architecture & Setup

### Requirements
- **Local Web Server**: The dashboard must run on a local HTTP server (e.g., `python -m http.server 8080`) to bypass strict browser CORS requirements when talking to Google.
- **Google Apps Script Backend**: The app relies on a deployed Google Apps Script web app to act as the backend API database.
- **Google Sheets**: Acts as the database, containing four distinct sheets: `Form Responses 1`, `Freshdesk_Data`, `Triage_Data`, and `Login_Pins` (auto-created on first login).

### Quick Start
Please refer to **`SETUP_INSTRUCTIONS.md`** for an ELI5 step-by-step guide on how to launch the local server and start the dashboard.

## Google Apps Script Setup
Your Google Apps Script handles three primary operations:
1. `doGet()`: Fetches data from the Survey Sheet, Freshdesk sheet, or Triage history sheet.
2. `doPost()`: Handles four actions:
   - **`sendpin`**: Generates a 6-digit PIN, stores it with a 10-minute expiry in `Login_Pins`, and emails it to the user.
   - **`verifypin`**: Validates the submitted PIN against the stored value; marks it used on success.
   - **Triage update** (default): Persists CSM assignments, status changes, and notes to `Triage_Data`, stamping the user's name, email, and timestamp. Also triggers CSM assignment email notifications.
3. `syncFreshdesk()`: A time-driven trigger that calls the Freshdesk API daily to identify the last ticket date for each active company.

## Known Limitations
- Freshdesk ticket tracking requires exact company name matching between the Survey form, the Customer Master Data CSV, and Freshdesk records.
- Tailwind CDN shows a developer warning in the browser console (acceptable for lightweight internal tools).

## Support
For issues or questions, please contact:
- Misty Wilmore
- Tonja Jones

---
**Last Updated**: April 2026
