# Dashboard Reusability Guide

## Overview
This guide helps you assess whether this Customer Health Dashboard can be adapted for other industries or clients, and what customization is required.

---

## Current Dashboard Dependencies

### Critical Dependencies
1. **Domain Mapping** - Email domains must match customer master data for company identification
2. **Survey Structure** - 34 specific questions about CLEAN_Address product
3. **Scoring Logic** - Health scores based on specific answer patterns (Very Satisfied = 5, etc.)
4. **Industry Categories** - Hardcoded: Finance, Healthcare, Retail, Manufacturing, Technology, Education
5. **ERP Systems** - Expects specific ERP values in customer master data
6. **Google Sheets Integration** - Fetches data from specific Google Apps Script endpoint

### Product-Specific Elements
- Chart labels reference "CLEAN_Address" product
- Questions about CLEAN_File, Batch Processing, version 5x upgrade
- ROI and adoption metrics tied to specific product features
- Support portal references (My Runner EDQ)

---

## Scoping Questions for New Clients

### 1. Data Collection Questions

**Survey Structure:**
- [ ] How many survey questions do you have? (Current: 34)
- [ ] What types of questions? (Multiple choice, yes/no, free text, ratings)
- [ ] Do you use a rating scale? If so, what scale? (Current: Very Satisfied to Very Dissatisfied)
- [ ] How often do you send surveys? (Affects date filtering needs)

**Customer Data:**
- [ ] Do you have a customer master data source? (CSV, database, CRM)
- [ ] What customer attributes do you track? (Industry, size, tier, region, product line)
- [ ] Can you map survey respondents to customers via email domain?
- [ ] Do respondents use company email addresses or personal emails?

**Data Source:**
- [ ] Where is survey data stored? (Google Sheets, Excel, database, survey platform API)
- [ ] How is data accessed? (API, export, direct database connection)
- [ ] How frequently does data update? (Real-time, daily, weekly)

### 2. Metric & KPI Questions

**Health Scoring:**
- [ ] How do you define "customer health"? (Satisfaction, NPS, usage, engagement)
- [ ] What metrics indicate an "at-risk" customer?
- [ ] What score ranges are considered healthy vs. at-risk?
- [ ] Are there multiple health dimensions to track?

**Key Metrics:**
- [ ] What are your top 3-5 KPIs to display?
- [ ] Do you track adoption/usage metrics?
- [ ] Do you measure ROI or value realization?
- [ ] Are there product-specific metrics to track?

**Segmentation:**
- [ ] How do you segment customers? (Industry, size, region, product, tier)
- [ ] What filters are most important for your team?
- [ ] Do you need to filter by customer success manager or account owner?

### 3. Workflow Questions

**Triage Process:**
- [ ] Do you have a triage or follow-up workflow for at-risk customers?
- [ ] Who manages customer follow-ups? (CSMs, account managers, support)
- [ ] What statuses do you track? (Current: New Response, Followed Up, Archived)
- [ ] Do you need assignment/routing capabilities?

**Team Structure:**
- [ ] How many team members will use the dashboard?
- [ ] Do different roles need different views or permissions?
- [ ] Do you need audit trails or change history?

### 4. Technical Questions

**Integration:**
- [ ] What systems need to integrate? (CRM, support platform, data warehouse)
- [ ] Do you need real-time data or is batch/periodic sync acceptable?
- [ ] Are there authentication/security requirements?
- [ ] Do you need to export data from the dashboard?

**Deployment:**
- [ ] Where will the dashboard be hosted? (Local files, web server, cloud platform)
- [ ] Who needs access? (Internal team only, or external stakeholders)
- [ ] Are there compliance requirements? (GDPR, HIPAA, SOC2)

---

## Customization Requirements

### Low Effort (1-2 hours)

**Text & Labels:**
- Update product name throughout (CLEAN_Address → Your Product)
- Modify chart titles and descriptions
- Update KPI labels
- Change company/contact email addresses

**Visual Styling:**
- Update color scheme to match brand
- Change logo/header
- Modify fonts

**Simple Configuration:**
- Update industry list
- Modify date range filter options
- Change CSM names

### Medium Effort (1-2 days)

**Survey Question Mapping:**
- Map new survey questions to dashboard fields
- Update question labels in detail modal
- Modify which questions appear in data table
- Adjust feedback field mappings

**Scoring Logic:**
- Redefine health score calculation
- Update at-risk thresholds
- Modify adoption score formula
- Change ROI scoring logic

**Customer Data Integration:**
- Adapt customer master data CSV structure
- Update domain matching logic
- Add new customer attributes (region, tier, etc.)
- Modify industry/category mappings

**Filtering & Segmentation:**
- Add new filter dimensions
- Update filter dropdowns
- Modify segmentation logic

### High Effort (1-2 weeks)

**Data Source Migration:**
- Replace Google Sheets with new data source (API, database)
- Implement authentication for data access
- Add data transformation/ETL logic
- Handle different data formats

**New Metrics & Charts:**
- Add new KPI calculations
- Create new chart types
- Implement custom visualizations
- Add drill-down capabilities for new dimensions

**Advanced Features:**
- Multi-user authentication and permissions
- Data export functionality
- Integration with external systems (CRM, ticketing)
- Real-time data updates
- Advanced analytics (trends, predictions, cohort analysis)

**Workflow Customization:**
- Custom triage workflows
- Automated routing/assignment rules
- Email notifications
- Task management integration

---

## Who This Dashboard Works Best For

### ✅ Ideal Fit

**Characteristics:**
- B2B SaaS or software companies
- Conduct regular customer health surveys (quarterly, semi-annual)
- Have 50-500 customers
- Track customer satisfaction and product adoption
- Use email surveys with company email addresses
- Have customer master data in CSV or simple database
- Small to medium CS team (2-10 people)
- Need quick insights without complex BI tools

**Use Cases:**
- Customer health monitoring
- Identifying at-risk customers
- Tracking product adoption trends
- CSM workload management
- Executive reporting on customer satisfaction

### ⚠️ Requires Significant Customization

**Characteristics:**
- B2C companies (personal emails, no domain mapping)
- Very large customer base (1000+ customers)
- Complex survey structures (100+ questions, branching logic)
- Need real-time data integration
- Multiple products or business units
- Advanced analytics requirements (ML, predictive models)
- Strict compliance/security requirements
- Need mobile app or advanced responsive design

### ❌ Not a Good Fit

**Characteristics:**
- No structured survey process
- Customers don't use company email addresses
- Need transactional data analysis (usage logs, events)
- Require advanced BI features (pivot tables, custom reports)
- Need multi-tenant architecture
- Require enterprise-grade security (SSO, RBAC, audit logs)
- Very complex data sources requiring heavy ETL
- Need native mobile apps

**Better Alternatives:**
- **Gainsight, ChurnZero, Totango** - Enterprise CS platforms
- **Tableau, Power BI, Looker** - Advanced BI tools
- **Qualtrics, SurveyMonkey** - Survey platforms with built-in analytics
- **Custom development** - For highly specialized requirements

---

## Adaptation Checklist

When adapting this dashboard for a new client, use this checklist:

### Discovery Phase
- [ ] Complete all scoping questions above
- [ ] Review sample survey data
- [ ] Understand customer master data structure
- [ ] Identify key metrics and KPIs
- [ ] Map current workflow to dashboard features
- [ ] Assess technical requirements

### Planning Phase
- [ ] Document required customizations (low/medium/high effort)
- [ ] Identify data source integration approach
- [ ] Design new scoring/metric calculations
- [ ] Plan filter and segmentation dimensions
- [ ] Create mockups for new charts or features
- [ ] Estimate effort and timeline

### Implementation Phase
- [ ] Update configuration (labels, colors, branding)
- [ ] Modify survey question mappings
- [ ] Implement new scoring logic
- [ ] Adapt customer data integration
- [ ] Add/modify charts and visualizations
- [ ] Update filters and segmentation
- [ ] Integrate new data source
- [ ] Test with sample data

### Validation Phase
- [ ] Generate mock data for testing
- [ ] Verify all calculations are correct
- [ ] Test all interactive features
- [ ] Validate data accuracy with client
- [ ] User acceptance testing
- [ ] Create documentation for client

### Deployment Phase
- [ ] Package dashboard files
- [ ] Set up data source connection
- [ ] Deploy to client environment
- [ ] Train client team
- [ ] Provide documentation
- [ ] Set up support/maintenance plan

---

## Key Customization Files

When adapting the dashboard, these are the primary files to modify:

| File | What to Customize |
|------|-------------------|
| `customer_health_dashboard.js` | Survey question mapping, scoring logic, data source URL, calculations |
| `customer_health_dashboard.html` | Labels, chart titles, KPI names, filter options |
| `customer_health_dashboard.css` | Colors, fonts, branding |
| `customer_data.csv` | Customer master data structure and content |
| Google Apps Script | Data source integration (if using Google Sheets) |

---

## Example Adaptation Scenarios

### Scenario 1: Different Industry (Healthcare → Education)

**Changes Needed:**
- Update industry filter options (K-12, Higher Ed, Corporate Training)
- Modify customer attributes (enrollment size, institution type)
- Adjust terminology (customers → institutions, users → students/faculty)
- **Effort:** Low-Medium (4-8 hours)

### Scenario 2: Different Product (Software → Services)

**Changes Needed:**
- Redefine health metrics (satisfaction, service quality, responsiveness)
- Update survey questions and mappings
- Modify adoption metrics (engagement, utilization)
- Change product-specific references
- **Effort:** Medium (1-2 days)

### Scenario 3: Different Data Source (Google Sheets → Salesforce)

**Changes Needed:**
- Implement Salesforce API integration
- Add authentication logic
- Transform Salesforce data format
- Handle real-time updates
- **Effort:** High (1-2 weeks)

---

## Support & Maintenance Considerations

**For Clients:**
- Who will maintain the dashboard code?
- Who updates customer master data?
- How often does survey structure change?
- What happens when new questions are added?
- Who provides technical support?

**Ongoing Costs:**
- Data source hosting (Google Sheets, database)
- Dashboard hosting (if web-hosted)
- Maintenance and updates
- Training new team members
- Feature enhancements

---

## Conclusion

This dashboard is highly adaptable for B2B companies with structured survey processes and customer master data. The key to successful adaptation is:

1. **Thorough discovery** - Understand the client's data, metrics, and workflow
2. **Realistic scoping** - Assess customization effort accurately
3. **Incremental approach** - Start with core features, add complexity gradually
4. **Good documentation** - Ensure client can maintain and understand the dashboard

For questions or assistance with adaptation, contact the development team.
