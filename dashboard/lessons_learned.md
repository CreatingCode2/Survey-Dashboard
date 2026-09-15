# Customer Health Dashboard — Lessons Learned

> **Purpose:** This document is reviewed at the start of every session to prevent repeating known mistakes.  
> **Source:** Distilled from 50+ git commits spanning 2025-12-02 to 2026-09-15.  
> **Owner:** Misty Wilmore / AI Agent  

---

## 🔴 CRITICAL LESSONS (Mistakes That Caused Production Failures)

### LL-001: Never Delete `MAX_EXECUTION_TIME_MS` — 138 Batch Failures
- **Date:** 2026-06-23
- **Commit:** `0c37e3d` (bad) / `44ef765` (fix)
- **What happened:** AI editor deleted `MAX_EXECUTION_TIME_MS` from `batchProcessTickets()` while adding auto-resume trigger logic. GAS hit the 6-minute hard kill repeatedly, causing 138 batch failures in production with no recovery.
- **Root cause:** AI replaced a block of code instead of surgically adding to it.
- **Rule created:** Rule 2 — Never touch batch logic without a `git diff` first. Grep for protected variables after every edit.
- **Repeat risk:** HIGH — any edit to `batchProcessTickets()` can accidentally delete this.

### LL-002: Batch Completion Email Never Sent — Two Separate Bugs
- **Date:** 2026-06-25
- **Commit:** `67701b1`
- **What happened:** Completion email never fired. Two bugs: (1) inner-loop `break` only exited the inner for-loop, not the outer while-loop; (2) the time-exit path never checked if `jobFullyComplete` was already true.
- **Root cause:** Nested loop control flow — `break` in a for-loop inside a while-loop only exits the for.
- **Lesson:** When the inner loop uses `break` to signal completion, the outer while must check `if (jobFullyComplete) break` immediately after.

### LL-003: Edit Button Broken Repeatedly (3+ Incidents)
- **Dates:** 2026-07-23, 2026-07-24, 2026-08-06
- **Commits:** `a6f6d80`, `4187e0d`, `74075be`, `b436ec2`
- **What happened:** The Edit button in the AI Classification Review Queue stopped working. It was fixed, re-broken, fixed, re-broken in consecutive sessions.
- **Root cause (first):** Modal was being shown/hidden with Tailwind CSS classes (`hidden`) instead of `style.display`. When the modal's inline style overrode the class, it remained invisible.
- **Root cause (second):** Special characters in ticket subjects or integrations (quotes, apostrophes, ampersands) broke the `onclick="openOverrideModal(this)"` attribute string when values were interpolated inside it.
- **Permanent fix:** Store all values in `data-*` attributes on the button (`data-ticket-id`, `data-subject`, `data-integration`, `data-product`). The `openOverrideModal(this)` function reads from `btn.dataset` — no string interpolation into onclick at all.
- **Cache issue:** After JS fix, browser had cached the old JS. Required bumping `?v=N` on the `<script>` tag.
- **Lesson:** **NEVER** use Tailwind `hidden` class to show/hide modals. Always use `style.display`. **NEVER** interpolate data into `onclick="..."` attribute strings — use `data-*` attrs instead.

---

## 🟠 RECURRING BUGS (Fixed Multiple Times)

### LL-004: Drill-Down / Chart Filter Showing Wrong Tickets (Ongoing)
- **Dates:** 2026-07-17, 2026-07-30
- **Commits:** `96dbee7`, `44cd5e8`, `996b116`
- **What happened:** Clicking a chart segment filtered the Ticket Browser, but showed only Banner tickets regardless of what was clicked. The filter comparison against `normaliseIntegration()` output was inconsistent — the ticket browser filter used raw values while the chart used normalised values.
- **Root cause:** The `aiTableFilter` object stores either a raw label or a normalised label inconsistently depending on which chart fired it. The `renderTicketBrowser` filter checks `normaliseIntegration()` at render time, so if the stored filter value doesn't match the output of `normaliseIntegration()`, it always defaults to the first match.
- **Lesson:** All chart click handlers and the ticket browser filter MUST use the same normalisation layer. The filter stored in `aiTableFilter.value` must always be the normalised key, not the raw AI output.

### LL-005: PeopleSoft & Campus Solutions Double-Categorised (Ongoing)
- **Dates:** 2026-07-23, 2026-08-04, 2026-08-06
- **Commits:** `a6f6d80`, `8c35ca6`
- **What happened:** AI was tagging tickets as both `PeopleSoft` and `PS Campus Solutions`. Both appeared as separate slices in the ERP chart. The sub-category level showed both `CS` and `Campus Solutions` for the same module.
- **Root cause:** `normaliseIntegration()` correctly maps `peoplesoft` → `PeopleSoft`, but `ps campus solutions` → `PS Campus Solutions` (separate top-level entry). The AI prompt used inconsistent casing/naming that sometimes produced `PeopleSoft - Campus Solutions` and sometimes `PS Campus Solutions` as a standalone value.
- **Lesson:** The `normaliseIntegration()` map must canonicalise ALL variants of Campus Solutions to `PeopleSoft` at the top level. Sub-module labels (CS, HCM, FIN) must use the standardised abbreviations, not the full names. The AI prompt must be explicit about using `PeopleSoft - CS`, `PeopleSoft - HCM`, `PeopleSoft - FIN`.

### LL-006: Data Health UI Freezing on Dismiss
- **Date:** 2026-07-21
- **Commit:** `1fc820c`
- **What happened:** Clicking Dismiss in the Data Health review queue caused the entire page to freeze/hang.
- **Root cause:** The dismiss action triggered a re-render of the review queue while a prior DOM manipulation was still in progress; no `return false` on the anchor tag caused full page reload.
- **Lesson:** All interactive table actions (Dismiss, Noise, Re-run) must be async-safe. Always return `false` from anchor `onclick` handlers. Never trigger a full re-render synchronously inside a table row click.

### LL-007: Batch Early Exit — All Tickets Appeared Already Processed
- **Date:** 2026-07-23
- **Commit:** `958a5d8`
- **What happened:** After the page-exhaustion safeguard was added (`outOfBoundsCount === tkts.length → stop`), a batch with Overwrite enabled was stopping on page 1 even though there were more tickets.
- **Root cause:** `outOfBoundsCount` included tickets that were skipped due to open/pending status AND date-window mismatches. If a full page was returned but all were open tickets (not resolved/closed), the safeguard incorrectly treated this as "all out of bounds" and stopped.
- **Lesson:** `outOfBoundsCount` must ONLY increment for date-window violations, NOT for status skips. Status skips are valid reasons to continue paginating.

### LL-008: AI Tags Stacking / Duplicate Tags on Freshdesk Tickets
- **Dates:** 2026-08-04
- **Commits:** `00ca81e`, `5c34685`
- **What happened:** Each re-process of a ticket appended new `ai:` tags instead of replacing the old ones. Tags also exceeded Freshdesk's 32-character limit and caused API validation errors.
- **Root cause:** The `updateFreshdeskTicketTags` function appended to existing tags without first stripping old `ai:` prefixed tags. Freshdesk has a hard 32-char limit per tag that was not enforced before writing.
- **Lesson:** Always strip existing `ai:` tags before adding new ones. Truncate all tags to 32 chars before writing. The `removeFreshdeskAiTags()` helper exists — call it first.

### LL-009: Batch "No More Tickets" on Second Run After Overwrite
- **Date:** 2026-08-14
- **What happened:** First batch of 150 ran fine. Second batch with Overwrite ON reported "no more tickets" immediately after a few processed.
- **Lesson (pending verification):** The page-exhaustion safeguard must ONLY count tickets that are genuinely outside the date window. Tickets that are "already processed" but within the date window should NOT count toward `outOfBoundsCount` when overwrite is enabled.

### LL-019: Intermittent 404 on Google Apps Script Web App (Multiple Account CORS Bug)
- **Dates:** 2026-08-24, 2026-09-15
- **Commits:** `c6d775a`, `70373cd`, `831eb6c`
- **What happened:** The dashboard intermittently threw "404 File not found" or "cannot connect to server" errors, preventing users from logging in or fetching data. A previous fix added `credentials: 'omit'` globally to `window.fetch`, but it was later reverted and replaced with `apiFetch` which initially missed the `credentials: 'omit'` property.
- **Root cause:** When a browser is logged into multiple Google accounts, the initial `302 Redirect` to `script.googleusercontent.com` sends mixed or incorrect cookies, causing Google's servers to reject the request and return a 404.
- **Permanent fix:** The `apiFetch` wrapper (and any `fetch` to Apps Script) MUST include `credentials: 'omit'`. This forces an anonymous request, bypassing the multi-account cookie confusion (since the web app is deployed as Access: Anyone).
- **Lesson:** **NEVER** use a default `fetch()` to call a Google Apps Script Web App without explicitly adding `credentials: 'omit'`.

---

## 🟡 ARCHITECTURAL DECISIONS & LESSONS

### LL-010: Apps Script Deployment — Never Overwrite Same Version Number
- **Source:** Rule 7, SETUP_INSTRUCTIONS.md Section 11
- **Lesson:** Always deploy as a **New Version**. Overwriting the same version in GAS does not update the live web app URL deployment. Users continue hitting the old code until a new version is published.

### LL-011: Re-Authorization Is Rare, Not Routine
- **Date:** 2026-06-25
- **Commits:** `322171c`, `f1e181b`
- **Lesson:** OAuth tokens persist for weeks-to-months. Re-auth is only needed when you see `You do not have permission to call ScriptApp`. When that happens, run `cleanupBatchTriggers()` in the Apps Script editor (it calls ScriptApp directly, triggering the consent flow). Do NOT redeploy just to re-auth.

### LL-012: File Split Revert — Deployment Constraints Dictate Architecture
- **Date:** 2026-06-26
- **Commit:** `82c52b4`
- **Lesson:** Code was refactored into separate `.gs` files (Config.gs, Batch.gs, etc.), then reverted to a single `Code.gs`. GAS supports multiple files in the editor, but the manual copy-paste deployment workflow this project uses requires all backend code in one file. Do not split unless the deployment workflow changes.

### LL-013: Browser Cache Invalidation After JS Changes
- **Commits:** `3c8aa93`, `b436ec2`
- **Lesson:** After any change to `customer_health_dashboard.js`, the `<script>` tag in `customer_health_dashboard.html` must have its `?v=N` query string incremented (e.g., `?v=7` → `?v=8`). Without this, browsers serve the old cached JS file and the fix doesn't appear.

### LL-014: Tailwind CDN vs. Style.display — Modal Visibility
- **Commits:** `4187e0d`
- **Lesson:** This project loads Tailwind from CDN. The `hidden` utility class adds `display: none !important`. If a modal also has `style="display: flex"` set programmatically, the Tailwind class wins and the modal stays invisible. **Always use `style.display = 'flex'/'none'` to control modal visibility, never Tailwind utility classes.**

### LL-015: writeTicketAiData Must Upsert, Not Append
- **Date:** 2026-07-24
- **Commit:** `85abf7b`
- **Lesson:** When a ticket is re-processed, `writeTicketAiData` must find the existing row by `ticket_id` and update it in place. If it always appends, stale duplicate rows accumulate in `Ticket_AI_Data`, corrupting chart counts (the same ticket appears twice with different data).

### LL-016: Noise Exclusions Must Be Maintained Actively
- **Multiple commits:** `f8bcd8e`, `5fe32df`, `3c8aa93`, `74075be`
- **Lesson:** Certain emails (astro@forwardfuture.ai, surveyresearch@ellucian.com), ticket IDs (90426, 90658, 91404, 90639, 91175, 88131, 90847), and subject patterns (FedEx reply, out-of-office) have been hardcoded as noise exclusions over time. Whenever a new spam ticket pattern is found, add it to `HARDCODED_IGNORED_TICKETS` in `Code.gs` AND to the noise email list. Keep this list documented.

### LL-017: Person Manager Must Always Normalise to Banner or Colleague
- **Commits:** `566afdb`, `8c35ca6`
- **Lesson:** Freshdesk tickets sometimes come in as `integration: "Person Manager"`. This is not a standalone ERP — it is Banner's HR module. The `normaliseIntegration()` function must map `person manager` → `Banner` (or `Colleague - SaaS` if Colleague is mentioned). This normalisation was added but broken during subsequent edits.

### LL-018: AI Hallucination Post-Processing Is Required
- **Dates:** 2026-06-25
- **Commits:** `1b9c3e6`, `ce6f056`
- **Lesson:** The Groq/Gemini AI sometimes hallucinates product/integration values not in the approved whitelist (e.g., "Text Connector", "Guild Core Engine"). A post-processing validation layer must scrub any `integration` or `product_area` value not in the approved lists. The whitelist is in `Code.gs` around `processTicket()`.

---

## 🟢 WINS — What Works Well

### LW-001: Nightly Batch Automation Is Running Reliably
- The `setupDailyMaintenanceTrigger` (runs at 1 AM) has been processing tickets overnight without intervention. Don't touch this function.

### LW-002: Upsert Fix Resolved Duplicate Data in Charts
- `writeTicketAiData` now correctly updates existing rows rather than appending, preventing duplicate chart counts.

### LW-003: Staleness Watchdog Prevents Stuck Batches
- The 10-minute heartbeat watchdog in `getBatchAiStatus()` auto-corrects stuck `AI_Batch_Running=true` states. This is working correctly.

### LW-004: Page-Exhaustion Safeguard Prevents Infinite Pagination
- When all tickets on a Freshdesk page are outside the date window, the batch now correctly terminates rather than looping forever.

### LW-005: Live Ticket Counter in Ticket Browser
- The browser now shows "Showing X filtered / Y total" when a chart filter is active — confirming the filter is working.

---

## 📋 Hardcoded Noise Exclusions Reference

### Ignored Ticket IDs (HARDCODED_IGNORED_TICKETS in Code.gs)
`90426, 90658, 91404, 90639, 91175, 88131, 90847`

### Noise Email Senders
- `astro@forwardfuture.ai`
- `surveyresearch@ellucian.com`

### Noise Subject Patterns (isNoiseSubject in Code.gs)
- Out of office, automatic reply, FedEx shipment notifications

---

*This document should be updated after every session where a new lesson is learned.*
