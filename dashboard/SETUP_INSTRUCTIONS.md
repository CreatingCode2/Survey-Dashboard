# Customer Health Dashboard - ELI5 Setup Instructions

Welcome! This dashboard has been recently updated with new features (like Email Notifications, Follow-Up Notes, interactive charts, and secure email-verified login). 

Because of these powerful new features, the dashboard **must be run using a tiny local server on your computer** (you can no longer just double-click the HTML file). 

Don't worry! This is very easy. Just follow these steps exactly as written.

---

## Step 1: Get the Newest Files

**WARNINGS BEFORE DOWNLOADING:** 
* **Clear Old Files:** Before clicking any links, please open your computer's "Downloads" folder and **delete any old copies** of the dashboard you might have.
* **Avoid Duplicates:** If Windows automatically renames your new download to `Survey_Dashboard_Package (1).zip` because of duplicate files, it could break the code! The file must be named exactly `Survey_Dashboard_Package.zip`.

1. Open the Google Drive folder that was shared with you in your web browser, OR navigate in G-Drive to: **Customer Success** -> **Customer_Survey_Health_Dashboard**. *(If you don't have access to the folder or the file inside it, click the "Request Access" option).*
2. Find the file named exactly `Survey_Dashboard_Package.zip` and double-click it (or right-click and press "Download") to download it to your computer.
3. Open your computer's **"Downloads" folder** (usually found by clicking the yellow folder icon at the bottom of your screen) to find the ZIP file you just downloaded.
4. Click and hold the `Survey_Dashboard_Package.zip` file, and **drag it onto your Desktop wallpaper** to move it. (We want to move it out of the Downloads folder so it is easy to work with).
5. If you already have an older extracted folder on your Desktop from a previous version, **delete it completely** first so the old and new files do not mix!
6. **Right-click** the new ZIP file now on your Desktop and select **"Extract All..."**.
7. A box will pop up. Click the **"Extract"** button. 
8. You should now have a normal, fresh folder on your Desktop containing all the new files!

---

## Step 2: Start the Local Server (The "black hacker screen")

Because we securely talk to Google Sheets and send emails in the background, we need to run a tiny server on your computer to host the files. 

1. Click on your Windows Start Menu (the Windows icon in the corner of your screen).
2. Type the letters `cmd` and press **Enter**. A black box named "Command Prompt" will pop up.
3. In that black box, type the letters `cd` followed by a single space. Do NOT press Enter yet!
   *(Example: `cd `)*
4. Now, double-click your new, unzipped dashboard folder on your Desktop to open it. Look at the very top of that folder window where the "address bar" is. Click anywhere in the blank white space of the address bar. The folder's path will turn blue (it will look something like `C:\Users\Tonja\Desktop\Survey_Dashboard_Package`). 
5. **Right-click** the blue highlighted text and select **"Copy"**.
6. Go back to your black Command Prompt box, **Right-click** inside the box, and it will automatically **Paste** that path text!
   *(Example result: `cd C:\Users\Tonja\Desktop\Survey_Dashboard_Package`)*
7. Press **Enter**. (The black box should now show that you successfully jumped inside that folder).
8. Finally, type exactly this and press **Enter**:
   ```
   python -m http.server 8080
   ```
9. The black box will say something like `Serving HTTP on :: port 8080`. **Do not close this black box!** This box is your local server. If you close it, the dashboard will crash! Just minimize the box for now.

---

## Step 3: Open the Dashboard in Chrome

1. Open a brand new tab in Google Chrome.
2. In the URL address bar at the very top (where you usually type www.google.com), type exactly this:
   ```
   localhost:8080/customer_health_dashboard.html
   ```
3. Press **Enter**.
4. The dashboard will load instantly!

*Note: Whenever you are finished working for the day, you can close the Chrome tab and click the X to easily close the black Command Prompt server box.*

---

## 🌟 ELI5 Quick Features Guide

If you are new to the dashboard, here is a fast breakdown of what everything does:

- **KPI Cards (The big numbers up top)**: These give you a quick summary of the total responses, the average health score, and how many customers are "Silent" (meaning they haven't sent a support ticket or answered a survey in a very long time). You can hover over the `?` icons to see exactly what they mean!
- **Interactive Charts**: The bar and pie charts are fully clickable! If you click the red "90-180 Days" bar, the website will jump straight down to the *Engagement Blackout* tab and show you ONLY the customers in that timeframe.
- **Critical Health Tab**: A list of customers who specifically scored poorly on their latest surveys.
- **Engagement Blackout Tab**: A list of customers who are "ghosting" us (no surveys, no tickets). 
- **Secure Login & PIN Verification**: Click "Login for Editing" and enter your name and Runner Technologies email. A **6-digit verification code** will be emailed to you instantly. Enter that code to confirm who you are and unlock your editing permissions. Codes expire after 10 minutes for security.
- **Assigning CSMs & Notes**: After logging in, assign yourself to risky customers. When you change their status, a box will ask you for "Follow-Up Notes" so you can log what you talked about!
- **Emails**: Assigning yourself to a customer automatically fires off a notification email to your inbox!

---

## Troubleshooting Guide

**The page loads but looks completely broken or is blank!**
This almost always happens because your computer downloaded a duplicate file into the same folder and automatically renamed it to something like `customer_health_dashboard (1).js`. The website is strictly looking for exactly `.js`, not `(1).js`, so the program safely crashes.
*To fix this:* Go back into your folder and look at the filenames. Ensure NONE of them have a `(1)` or `(2)` at the end of their name. If they do, rename them to remove the numbers, or simply delete the whole folder and extract the ZIP again into a totally empty location.

**The black screen says "localhost refused to connect"**
This means your black Command Prompt box is closed or stopped. Go back to Step 2 and run the `python -m http.server 8080` command inside the folder again!

**Everything is still greyed out / I can't click things**
Click the **"Login for Editing"** button at the top right. Enter your full name and your `@runnertechnologies.com` email address, then click **"Send Code"**. Check your email for a 6-digit code, type it in, and click **"Verify Code"**. Your editing controls will unlock immediately.

**I didn't receive the verification code email!**
Check your Spam or Junk folder — sometimes automated emails land there. If it's not there, click **"Go back"** in the login box and click **"Send Code"** again. Codes expire after 10 minutes, so you may need to request a fresh one.

**Emails aren't sending when I assign someone!**
If you are using Misty's code, it points to her Google Apps Script, so it will email from her backend just fine! If you built your *own* copy of the Google Apps script for your own database, you must authorize it:
1. Open your Google Apps Script editor.
2. At the very bottom of your script file, add this code:
   `function authorizeEmail() { MailApp.sendEmail(Session.getActiveUser().getEmail(), "Test", "Test"); }`
3. At the top of the editor, click the dropdown menu, select `authorizeEmail`, and click **Run**.
4. A white Google popup will appear saying "Authorization Required". Click "Review Permissions", select your Google account, click "Advanced" at the bottom, and click "Go to project (unsafe)". Click **Allow**. 
5. Deploy a New Version of your script and replace the URL in your `customer_health_dashboard.js` file!

