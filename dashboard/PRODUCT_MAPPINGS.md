# Product, Service, and Integration Mappings

This document serves as a reference guide for all Runner Technologies products, ERP integrations, Data Enhancement Services (DES), and Freshdesk ticket fields. It is intended to be used as a source of truth for the Customer Health Dashboard's Ticket Intelligence categorizations and noise filtering.

## 1. ERPs & Integrations
Our software integrates directly into the following ERP and database systems. Tickets for these can range from scheduling, installation, and configuration issues for batch or real-time processing.

- **Advance**
- **Banner**
  - Implementations: Admin, Self Service
- **Colleague**
  - Implementations: Self Service
- **JD Edwards**
  - Modules/Formats: EDI
- **Oracle Database**
- **Oracle E-Business Suite (Oracle EBS)**
  - Modules/Formats: EDI
- **PeopleSoft (Enterprise)**
  - Modules: Campus Solutions (CS), Finance (FIN), Human Capital Management (HCM)
  - Interfaces: Classic, Fluid
  - Implementations: Admin, Self Service

## 2. Core Products & Utilities
These are standalone utilities, tools, and portals offered:
- **CLEAN_Address**: The core engine.
- **CLEAN_Address Build**: Tickets relative to the build process.
- **CLEAN_Cloud**: Cloud-based address cleansing (very few customers).
- **CLEAN_Data Portal**: Online portal.
- **CLEAN_Entry**: Desktop version of the software.
- **CLEAN_File**: Utility tool to batch cleanse addresses via a flat file.
- **CLEAN_Update**: Utility tool for downloading data file updates (monthly/bi-monthly) and updating customer databases.
- **SurveyDIG**: Survey integration product.
- **Documentation**: Help docs and user guides.

## 3. Data Enhancement Services (DES)
Customers upload files to our SFTP server, which are then sent to our partner (Melissa Data) for processing. Melissa Data sends notifications upon completion, which trigger pending tickets.

*Note: Automated Melissa notifications stating a file has been processed are noise and should be excluded from ticket trends.*

**DES Sub-Services:**
- CCOA
- Deceased Append
- Demographic Data
- Email Append
- GeoCoding
- geoBasic
- GeoPoints
- Global Address Verification (International address verification)
- MCOA
- NCOA
- PCOA
- Phone Append
- RBDI

## 4. Freshdesk Ticket Groups / Categories
The Freshdesk "Group" or "Solution" fields are assigned to represent the specific product or service the ticket is referring to.

- Account Management (updating contacts, billing details, etc.)
- CLEAN_Address Build
- CLEAN_Address
- CLEAN_Address for Advance
- CLEAN_Address for Banner
- CLEAN_Address for Colleague
- CLEAN_Address for JD Edwards
- CLEAN_Address for Oracle E-Business Suite
- CLEAN_Address for Peoplesoft Enterprise
- CLEAN_Address for PS Campus Solutions
- CLEAN_Cloud
- CLEAN_Data Portal
- CLEAN_Entry
- CLEAN_File
- CLEAN_Update
- Client Onboarding
- Data Enhancement Services
- Data Enhancement Services - NCOA *(no longer used)*
- Development
- Documentation
- SurveyDig

## 5. Noise & Exclusions (Do Not Process)
The following automated tickets and notifications are considered noise. They do not represent actual customer issues or trends and must be strictly excluded from the AI Ticket Intelligence processing:

- **Melissa Data Notifications**: "File ready for processing", "File uploaded successfully", NCOA/Email Append completion notices.
- **Zoom**: Zoom meeting notifications.
- **Uptime Robot**: Monitor up/down alerts.
- **Oracle Security Notifications**: e.g., "Critical Patch Update".
- **Tempo**: Time-tracking notifications.
- **Basecamp**: Project management notifications.
