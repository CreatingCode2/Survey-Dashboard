# Customer Health Dashboard

A real-time dashboard for visualizing and managing customer health check survey responses. This dashboard integrates with Google Sheets to display survey data, customer master information, and provides tools for customer success management.

## Features

### 📊 Dashboard View
- **KPI Cards**: Display key metrics including average CLEAN_Address score, total responses, at-risk customers, and new responses in the last 24 hours
- **Interactive Charts**:
  - CLEAN_Address Score Trend (line chart)
  - Score Distribution (doughnut charts for Health, ROI, Adoption, Support)
  - Health vs ROI Correlation (scatter plot)
  - Health Score by ERP System (bar chart)
- **Sentiment Analysis**: Automatic analysis of customer feedback with positive/negative/neutral classification
- **Recent Feedback**: Display of latest customer comments with sentiment indicators

### 🚨 Triage View
- Filter at-risk customers (health score ≤ 3)
- Assign CSMs to customer accounts
- Track follow-up status (New Response, Followed Up - Low/High Risk, Archived)
- View customer history and status changes
- Login system for editing capabilities

### 📋 Data Table View
- Comprehensive table of all survey responses
- Filterable by industry and date range
- Drill-down capability from charts
- Detailed view modal for complete survey responses (all 34 questions)
- Display of Industry and ERP information from customer master data

### 🎯 Additional Features
- **CSM Management**: Add/remove Customer Success Managers
- **Industry Filtering**: Filter data by Finance, Healthcare, Retail, Manufacturing, Technology, Education
- **Date Range Filtering**: View data from last 7/30/60/90/180/365 days or custom range
- **Responsive Design**: Works on desktop and mobile devices

## Project Structure

```
Survey Dashboard/
├── customer_health_dashboard.html    # Main HTML file
├── customer_health_dashboard.css     # Custom styles
├── customer_health_dashboard.js      # Application logic
├── customer_data.csv                 # Customer master data (Industry, ERP)
├── .gitignore                        # Git ignore file
└── README.md                         # This file
```

## Setup Instructions

### Prerequisites
- Modern web browser (Chrome, Firefox, Edge, Safari)
- Google Apps Script web app URL configured for survey data
- Local web server (for loading customer_data.csv)

### Quick Start

1. **Clone or download this repository**
   ```bash
   git clone <repository-url>
   cd "Survey Dashboard"
   ```

2. **Configure Google Apps Script URL**
   - Open `customer_health_dashboard.js`
   - Update the `SHEET_URL` constant (line 4) with your Google Apps Script web app URL

3. **Serve the files locally** (required for customer_data.csv to load)
   
   **Option 1: Using Python**
   ```bash
   # Python 3
   python -m http.server 8000
   ```
   
   **Option 2: Using VS Code Live Server**
   - Install the "Live Server" extension
   - Right-click on `customer_health_dashboard.html`
   - Select "Open with Live Server"
   
   **Option 3: Using Node.js**
   ```bash
   npx http-server -p 8000
   ```

4. **Open in browser**
   - Navigate to `http://localhost:8000/customer_health_dashboard.html`

### Customer Master Data

The `customer_data.csv` file should contain customer master information in the following format:

```csv
Company,Industry,ERP
Acme Corporation,Manufacturing,SAP
TechStart Inc,Technology,Microsoft Dynamics
HealthPlus,Healthcare,Oracle
```

**Note**: Company names in the CSV should match the company names from survey responses for proper data joining.

## Google Apps Script Setup

Your Google Apps Script should:
1. Read data from your Google Sheet containing survey responses
2. Return data as CSV format
3. Be deployed as a web app with "Anyone" access

Example Apps Script code structure:
```javascript
function doGet() {
  var sheet = SpreadsheetApp.openById('YOUR_SHEET_ID').getSheetByName('Sheet1');
  var data = sheet.getDataRange().getValues();
  
  // Convert to CSV
  var csv = data.map(row => row.join(',')).join('\n');
  
  return ContentService.createTextOutput(csv)
    .setMimeType(ContentService.MimeType.TEXT);
}
```

## Survey Questions Mapping

The dashboard expects the following columns from the Google Sheet:

| Column Header | Internal Field | Description |
|--------------|----------------|-------------|
| Timestamp | date | Survey submission date/time |
| Email Address | email | Respondent email |
| Q1: Organization/Person | org_user_name_Q1 | Company and contact name |
| Q2: How has CLEAN_Address been working? | health_raw_Q2 | Health score (1-5) |
| Q4: Return on investment? | roi_raw_Q4 | ROI score (Yes/No) |
| Q10: Support Portal usage? | support_portal_Q10 | Support usage (Yes/No) |
| Q12: CLEAN_File awareness? | clean_file_Q12 | Product awareness |
| Q14: Batch Processing usage? | batch_proc_Q14 | Feature adoption |
| Q16: Cloud migration plans? | cloud_plan_Q16 | Future plans |
| Q30: Willing to be a reference? | reference_Q30 | Reference willingness |

See `customer_health_dashboard.js` lines 28-76 for complete column mapping.

## Calculated Metrics

- **Health Score**: Mapped from Q2 responses (1-5 scale)
- **ROI Score**: Mapped from Q4 responses (Yes=5, No=1)
- **Support Score**: Mapped from Q10 responses (Yes=5, No=1)
- **Adoption Score**: Average of ROI (Q4), Batch Processing (Q14), and CLEAN_File Awareness (Q12)

## User Guide

### Navigating the Dashboard

1. **Dashboard Tab**: View overall metrics and trends
2. **Triage View Tab**: Manage at-risk customers (shows count badge)
3. **Data Table Tab**: Browse all responses in detail

### Filtering Data

- **Industry Filter**: Select specific industries or view all
- **Date Range Filter**: Choose predefined ranges or set custom dates
- **Chart Drill-down**: Click on chart segments to filter the data table

### Managing Triage Items

1. Click "Login for Editing" button
2. Enter your name
3. In Triage View:
   - Assign CSMs from the dropdown
   - Update follow-up status
   - Changes are tracked with user and timestamp

### Managing CSMs

1. Click "Manage CSMs" button
2. Add new CSMs or remove existing ones
3. CSMs will appear in triage assignment dropdowns

## Troubleshooting

### Dashboard shows "Failed to load data"
- Check that the Google Apps Script URL is correct
- Verify the Apps Script is deployed and accessible
- Check browser console for specific error messages

### Customer master data not loading (Industry/ERP show "Unknown")
- Ensure you're serving files from a local web server (not opening as `file:///`)
- Verify `customer_data.csv` exists in the same directory
- Check that company names match between CSV and survey data

### Charts not displaying
- Ensure Chart.js is loading (check browser console)
- Verify data is being fetched successfully
- Check that survey data contains valid numeric scores

### Styling looks broken
- Ensure Tailwind CSS CDN is loading
- Check browser console for CSS loading errors
- Clear browser cache and reload

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Edge 90+
- ✅ Safari 14+

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **CSS Framework**: Tailwind CSS (CDN)
- **Charts**: Chart.js
- **Fonts**: Google Fonts (Inter)
- **Data Source**: Google Apps Script / Google Sheets

## Known Limitations

- Customer master data (`customer_data.csv`) requires a local web server to load due to browser security restrictions on `file:///` URLs
- Triage status and CSM assignments are stored in browser memory only (not persisted to backend)
- Tailwind CDN shows a production warning in console (acceptable for internal tools)

## Future Enhancements

- [ ] Backend database for persistent triage data
- [ ] Email notifications for new at-risk customers
- [ ] Export functionality for reports
- [ ] Advanced filtering and search capabilities
- [ ] User authentication and role-based access
- [ ] Integration with CRM systems

## Support

For issues or questions, please contact:
- Misty Wilmore: misty.wilmore@runnertechnologies.com
- Tonja Jones: tonja.jones@runnertechnologies.com

## License

Internal use only - Runner Technologies

---

**Last Updated**: December 2025
