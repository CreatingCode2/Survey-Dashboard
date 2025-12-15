#!/usr/bin/env python3
"""
Demo script showing how domain-based company matching will work.
This demonstrates the logic that will be implemented in JavaScript.
"""

# Simulated customer_data.csv (columns: Customer, URL, ..., Industry, ERP)
customer_data = [
    ["Abraham Baldwin Agricultural College", "abac.edu", "GA", "", "", "Higher Education", "Banner"],
    ["ACGI Software", "acgisoftware.com", "MD", "", "", "Software", ""],
    ["Oklahoma City University", "okcu.edu", "OK", "", "", "Higher Education", "Banner"],
    ["AFBS", "afbs.ca", "ON", "Canada", "", "Finance", "SAP"],
]

# Build lookup dictionary indexed by domain
domain_lookup = {}
for row in customer_data:
    company_name = row[0]
    domain = row[1].lower()
    industry = row[5]
    erp = row[6]
    
    if domain:
        domain_lookup[f"domain:{domain}"] = {
            "name": company_name,
            "industry": industry,
            "erp": erp
        }
    
    # Also index by company name (lowercase) as fallback
    domain_lookup[company_name.lower()] = {
        "name": company_name,
        "industry": industry,
        "erp": erp
    }

print("Domain Lookup Table:")
print("-" * 60)
for key, value in sorted(domain_lookup.items()):
    print(f"{key:50} -> {value['name']}")
print()

# Simulated survey responses with potential typos
survey_responses = [
    {"email": "john@abac.edu", "company_from_survey": "Abraham Baldwin Agricultural College"},
    {"email": "jane@okcu.edu", "company_from_survey": "Oklahoma City Univeristy"},  # Typo!
    {"email": "bob@afbs.ca", "company_from_survey": "AFBS"},
    {"email": "alice@acgisoftware.com", "company_from_survey": "ACGI Software - Alice Smith"},  # Extra text!
]

print("Survey Response Matching:")
print("-" * 60)
for response in survey_responses:
    email = response["email"]
    survey_company = response["company_from_survey"]
    
    # Extract domain from email
    email_domain = email.split('@')[1].lower() if '@' in email else None
    
    # Try domain lookup first
    master_data = None
    corrected_company = survey_company
    
    if email_domain:
        master_data = domain_lookup.get(f"domain:{email_domain}")
        if master_data:
            corrected_company = master_data["name"]
            print(f"✓ Email: {email}")
            print(f"  Survey said: '{survey_company}'")
            print(f"  Corrected to: '{corrected_company}' (via domain: {email_domain})")
            print(f"  Industry: {master_data['industry']}, ERP: {master_data['erp']}")
            print()
            continue
    
    # Fallback to company name lookup
    master_data = domain_lookup.get(survey_company.lower())
    if master_data:
        corrected_company = master_data["name"]
        print(f"○ Email: {email}")
        print(f"  Survey said: '{survey_company}'")
        print(f"  Matched by name: '{corrected_company}'")
        print(f"  Industry: {master_data['industry']}, ERP: {master_data['erp']}")
        print()
    else:
        print(f"✗ Email: {email}")
        print(f"  Survey said: '{survey_company}'")
        print(f"  NO MATCH FOUND - will show as 'Unknown'")
        print()

print("\nKey Benefits:")
print("- Typos in company names are automatically corrected via email domain")
print("- Extra text (like contact names) doesn't matter - domain matching works")
print("- Domains like afbs.ca work automatically - no special rules needed")
print("- The correct company name from CSV is used in the dashboard")
