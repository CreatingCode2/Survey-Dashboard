# Customer Health Dashboard - Setup Instructions

## For Customer Success Team Members

### Quick Start Guide

1. **Download the Files from Google Drive**
   - Open the shared "Customer Health Dashboard" folder in Google Drive
   - Click the **⋮** (three dots) menu at the top right
   - Select **"Download"**
   - Google Drive will automatically create a ZIP file and download it
   - The file will be named something like `Customer Health Dashboard.zip`

2. **Extract the Files**
   - Locate the downloaded ZIP file (usually in your Downloads folder)
   - Right-click the ZIP file → **"Extract All..."** (Windows) or double-click (Mac)
   - Choose a location to extract (e.g., Desktop or Documents)
   - Click "Extract"

3. **Open the Dashboard**
   - Navigate to the extracted folder
   - Double-click **`customer_health_dashboard.html`**
   - The dashboard will open in your default web browser

4. **First Time Setup**
   - The dashboard will automatically load live data from the Google Sheet
   - You may see a loading spinner for a few seconds while data loads
   - Once loaded, you can use all the interactive features

### 📖 Recommended: Read the README

**Before diving in, we highly recommend reading `README.md`** for a comprehensive understanding of:
- How each chart works and what metrics
 it displays
- The Triage workflow and CSM assignment process
- Data filtering and drill-down capabilities
- How the dashboard connects to Google Sheets
- Detailed explanations of all features and functionality

This will help you get the most value from the dashboard!

### What You'll See

- **Dashboard View**: Charts and KPIs showing customer health metrics
- **Triage View**: List of at-risk customers requiring follow-up
- **Data Table**: Detailed view of all survey responses

### Features Available

✅ **Filter by Industry**: Use the dropdown to filter by customer industry  
✅ **Filter by Date Range**: View responses from specific time periods  
✅ **Interactive Charts**: Click on chart segments to drill down into specific data  
✅ **CSM Management**: Assign customers to Customer Success Managers  
✅ **Export Capability**: View and analyze detailed customer responses  

### Important Notes

- **Internet Required**: The dashboard needs internet access to fetch live data from Google Sheets
- **Browser Compatibility**: Works best in Chrome, Edge, Firefox, or Safari (latest versions)
- **Data Updates**: Refresh the page (F5) to load the latest survey responses
- **Login Feature**: Click "Login for Editing" to enable CSM assignment and triage updates

### Troubleshooting

**Dashboard shows "Loading..." forever**
- Check your internet connection
- Try refreshing the page (F5)
- Clear browser cache and reload

**Charts not displaying**
- Ensure JavaScript is enabled in your browser
- Try a different browser (Chrome recommended)

**Data looks incorrect**
    - Refresh the page to load latest data
    - Contact Misty Wilmore if issues persist
    
    **"Syntax Error" or "Windows Script Host" popup**
    - 🛑 **STOP:** You tried to run the `.js` file directly. 
    - **FIX:** Close that error. Double-click the orange/blue `customer_health_dashboard.html` icon instead. The JS file runs *automatically* inside the HTML.
    
    **"Failed to load resource: net::ERR_FILE_NOT_FOUND"**
    - **CAUSE:** Your computer renamed the file because you downloaded it twice (e.g., `customer_health_dashboard[1].js`).
    - **FIX:** Rename the file back to `customer_health_dashboard.js` (remove the `[1]`). Ensure all files are in the *same* folder.

**Need to run a local server?**
    - **NOTE:** The dashboard works by double-clicking the HTML file - no server required!
    - **However**, if you need to run a local Python server for testing:
    
    **Starting the server:**
    - Open Command Prompt or Terminal
    - Navigate to the dashboard folder: `cd "path\to\Survey Dashboard"`
    - Run one of these commands (you can choose any port number):
      - **Python 3**: `python -m http.server [PORT]`
      - **Python 2**: `python -m SimpleHTTPServer [PORT]`
    - **Common port numbers:** 8000, 8080, 8083, 3000, 5000
      - Example: `python -m http.server 8080`
      - Example: `python -m http.server 8083`
    - You'll see output like: `Serving HTTP on 0.0.0.0 port 8080 (http://0.0.0.0:8080/) ...`
      - The **port number** is always shown in this message
    - Open your browser and **type the URL** using your chosen port:
      - For port 8080: `http://localhost:8080/customer_health_dashboard.html`
      - For port 8083: `http://localhost:8083/customer_health_dashboard.html`
    
    **Restarting the server:**
    - Press `Ctrl+C` in the Command Prompt window to stop the server
    - Run the same command again to restart (e.g., `python -m http.server 8080`)
    - The terminal will again show: `Serving HTTP on 0.0.0.0 port 8080...`
    - **Refresh your browser** (F5) or **type the URL again** with the correct port
    
    **Stopping the server:**
    - Press `Ctrl+C` in the Command Prompt window
    
    **💡 TIP:** Keep the Command Prompt window open while using the dashboard. If you close it, the server stops!

### 🔄 THE "NUCLEAR" FIX (Solves All Name/Error Issues)
**Attempt this if you cannot rename the files or keep getting errors.**
If Windows says "File in Use" or won't let you rename, it's because the file is open or stuck.

1.  Go to your **Desktop**.
2.  Right-click -> New -> Folder. Name it **"Dashboard_Clean"**.
3.  Go to your downloads and open the ZIP file you just downloaded.
4.  **Drag and Drop** the files from the ZIP directly into your new **"Dashboard_Clean"** folder.
    *   *Do not* just click "Extract". Use the drag-and-drop method.
5.  Open the "Dashboard_Clean" folder and double-click the HTML file.

This bypasses all "file already exists" or "renaming" errors because the folder is perfectly empty.

### Files Included

- `customer_health_dashboard.html` - Main dashboard file (open this)
- `customer_health_dashboard.js` - Dashboard logic and functionality
- `customer_health_dashboard.css` - Visual styling
- `customer_data.csv` - Customer master data (industry/ERP information)
- `README.md` - Detailed technical documentation (recommended reading)
- `SETUP_INSTRUCTIONS.md` - This file (quick start guide)

### Support

For questions or issues, contact:
- **Misty Wilmore**: misty.wilmore@runnertechnologies.com
- **Tonja Jones**: tonja.jones@runnertechnologies.com

---

**Last Updated**: December 2025
