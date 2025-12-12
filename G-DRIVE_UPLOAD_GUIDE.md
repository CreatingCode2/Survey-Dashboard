# Google Drive Upload Guide for Customer Success Dashboard

## Recommended Approach: Upload Folder Directly ✅

**Why this is better:**
- ✅ No file corruption during compression/extraction
- ✅ Easier to update individual files later
- ✅ Team members can view files directly in Google Drive
- ✅ Simpler for non-technical users
- ✅ Google Drive handles the download packaging automatically

---

## Step-by-Step: Upload to Google Drive

### 1. Prepare the Folder
You'll upload these essential files from your `Survey Dashboard` folder:
- `customer_health_dashboard.html`
- `customer_health_dashboard.js`
- `customer_health_dashboard.css`
- `customer_data.csv`
- `SETUP_INSTRUCTIONS.md` (newly created)

**Files to EXCLUDE** (not needed by CS team):
- `.git` folder (version control)
- `.gitignore`
- Python scripts (`*.py` files)
- Backup CSV files

### ⚠️ CRITICAL: Check File Names Before Uploading
**Do not upload files with `[1]` or `(1)` in their names.**
- ❌ Bad: `customer_health_dashboard[1].js`
- ✅ Good: `customer_health_dashboard.js`

If you upload a file with `[1]`, **it will be broken for everyone** who downloads it. Rename them on your computer *first* to remove the numbers, then upload.

### 2. Upload to Google Drive

**Option A: Upload Selected Files** (Recommended)
1. Go to your Customer Success G-Drive folder
2. Create a new folder called "Customer Health Dashboard"
3. Drag and drop the 5 essential files listed above into that folder
4. Right-click the folder → Share → Add your CS team members

**Option B: Upload Entire Folder** (Simpler but includes extra files)
1. Go to your Customer Success G-Drive folder
2. Click "New" → "Folder upload"
3. Select the entire `Survey Dashboard` folder
4. Wait for upload to complete
5. Right-click the folder → Share → Add your CS team members

### 3. Share with Team

1. Right-click the "Customer Health Dashboard" folder
2. Click "Share"
3. Add team member email addresses
4. Set permission to "Viewer" (they can download but not edit)
5. Click "Send"

### 4. Notify Your Team

Send them this message:

---

**Email Template:**

> **Subject:** Customer Health Dashboard - Now Available on G-Drive
>
> Hi Team,
>
> I've shared the Customer Health Dashboard with you on Google Drive. Here's how to access it:
>
> **Location:** [Customer Success G-Drive] → Customer Health Dashboard
>
> **To Use:**
> 1. Open the shared folder in Google Drive
> 2. Click the ⋮ (three dots) at the top → Download
> 3. Extract the downloaded ZIP file to your computer
> 4. Open `customer_health_dashboard.html` in your browser
> 5. See `SETUP_INSTRUCTIONS.md` for detailed help
>
> **What it does:**
> - Shows real-time customer health survey data
> - Interactive charts and filtering
> - Triage view for at-risk customers
> - Pulls live data from our Google Sheet
>
> Let me know if you have any questions!

---

## What Happens When They Download

When your team member clicks "Download" on the G-Drive folder:
1. Google Drive automatically creates a ZIP file
2. They download the ZIP to their computer
3. They extract it (right-click → Extract All on Windows)
4. They open `customer_health_dashboard.html`
5. Dashboard loads and fetches live data from Google Sheets

## Updating the Dashboard Later

If you need to update files:
1. Go to the G-Drive folder
2. Upload the updated file (it will replace the old version)
3. Team members download again to get the latest version

**Tip:** Add a version number or date to the folder name (e.g., "Customer Health Dashboard - Dec 2025") so team members know when it was last updated.

---

## Quick Checklist

- [ ] Create "Customer Health Dashboard" folder in CS G-Drive
- [ ] Upload the 5 essential files
- [ ] Share folder with CS team members
- [ ] Send notification email with instructions
- [ ] Verify a team member can successfully download and open it

---

**Need Help?** Contact Misty Wilmore or refer to `SETUP_INSTRUCTIONS.md`
