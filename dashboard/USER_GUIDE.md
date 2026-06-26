# Customer Health Dashboard - User Guide

Welcome to the Customer Health Dashboard! This guide is designed to help new Customer Success Managers (CSMs) and team members navigate, manage, and understand the interface and its features. 

---

## 1. Overview & Navigation
The Customer Health Dashboard is an interactive tool that consolidates customer survey feedback, support ticket history, and general engagement metrics into one readable view. It allows you to quickly identify "at-risk" customers and manage outreach workflows.

### Navigating the Interface
*   **Top KPI Bar:** Displays high-level summaries of the entire customer base.
*   **Visual Charts:** Interactive graphs that break down engagement timelines and health scores.
*   **Customer Lists (Tabs):** Detailed, filterable tables containing customer data, broken out by status (e.g., Critical Health, Engagement Blackout).

---

## 2. Secure Login & Authentication
To make any changes to customer statuses or assign yourself to an account, you must log in. This prevents accidental changes and ensures data security.

1.  Click the **"Login for Editing"** button at the top right of the dashboard.
2.  Enter your full name and your official `@runnertechnologies.com` email address.
3.  Click **"Send Code"**.
4.  Check your email inbox for a 6-digit verification PIN.
5.  Enter the PIN into the dashboard and click **"Verify Code"**.
6.  *Note:* Your editing controls will unlock immediately. PIN codes expire after 10 minutes, so if you wait too long, simply request a new one.

---

## 3. Understanding KPIs and Metrics
At the very top of the dashboard, you will see large KPI (Key Performance Indicator) cards. These give you an instant snapshot of team performance:
*   **Total Responses:** The overall volume of customer surveys collected and processed.
*   **Average Health Score:** A rolled-up metric of average customer satisfaction/health based on recent survey data.
*   **Silent Customers:** The number of accounts that have not submitted a support ticket or answered a survey in a critically long time.
*   *Tip:* You can hover over the **`?`** icons next to each KPI for specific calculation details.

---

## 4. Interactive Charts & Filtering
The charts on the dashboard aren't just for show—they are powerful filtering tools!
*   **Bar and Pie Charts:** These are fully clickable. For example, if you click the red "90-180 Days" bar in an engagement chart, the dashboard will automatically scroll down to the *Engagement Blackout* tab and filter the table to show *only* the customers in that timeframe.

---

## 5. Working with Customer Tabs
The bottom section of the dashboard splits customers into distinct tabs based on priority.

### Critical Health Tab
This tab displays a list of customers who specifically scored poorly on their latest health checks or surveys. These accounts require immediate triage and follow-up.

### Engagement Blackout Tab
This tab lists customers who are "ghosting" us. These are accounts with no recent surveys and no support tickets. They require structured outreach (e.g., the 4-day/10-day outreach workflow) to re-engage them or eventually decommission them.

---

## 6. Managing Customers (Assigning & Notes)
Once you are logged in, you can manage accounts directly from the Customer Tabs.

*   **Assigning a CSM:** Click the assignment dropdown next to a customer to assign yourself as the CSM handling the account.
*   **Automated Emails:** Assigning yourself to a customer will automatically send a notification email to your inbox to remind you of the task.
*   **Updating Status & Adding Notes:** When you update a customer's status (e.g., changing from "Requires CS Review" to "Outreach 1 Completed"), a modal will pop up asking for "Follow-Up Notes". Use this to log your actions, insights from calls, or any relevant details. These notes are saved for future reference.

---

## 7. User Management & Permissions (Admins Only)
Admins have access to a **"Manage Users"** button in the dashboard navigation.
*   **Adding Users:** You can grant access to new users by entering their Name, Email, and selecting a Role (Viewer, CSM, or Admin).
*   **Tab Access:** You can granularly control whether a user can see the Data Table or Ticket Intelligence tabs using the checkboxes. 
*   **CSM Dropdowns:** Anyone assigned the **CSM** role will automatically appear in the dropdowns for triage assignments across the dashboard.

---

## 8. Ticket Intelligence Tab (AI Processing)
The Ticket Intelligence tab provides an AI-driven analysis of all support tickets.
*   **AI Ticket Health Data:** Shows a complete list of processed tickets, including an AI-generated summary, sentiment analysis (Positive, Neutral, Negative), and an organically generated Issue Type.
*   **AI Controls (Admins Only):** Admins can view the AI Processing Log, manually process individual tickets, or trigger bulk AI processing.
*   **Manual Overrides:** If the AI categorizes a ticket incorrectly, you can click the **Edit** button on any ticket to manually correct its Subject, Integration, or Product Area.
*   **Dismiss vs. Noise:** Click **Dismiss** to accept a ticket's analysis and remove it from your queue (it stays in the metrics). Click **Noise** if the ticket was spam or irrelevant to completely exclude it from charts.

---

## 9. Basic Troubleshooting
*   **Everything is greyed out:** You need to log in! See Section 2.
*   **Did not receive the verification code:** Check your Spam/Junk folder. If it's not there, click "Go back" on the login screen and request a fresh code.
*   **Features are broken/Server error:** Ensure your local dashboard server (the black Command Prompt window) is still running in the background as per the Setup Instructions.

*For installation or server-related technical issues, please refer to the `SETUP_INSTRUCTIONS.md` guide.*
