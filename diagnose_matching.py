#!/usr/bin/env python3
"""
Diagnostic script to show why company names aren't matching.
This will help identify the mismatch between survey data and customer_data.csv
"""

# Simulate what the JavaScript is doing

# Sample company names from survey (with potential typos/variations)
survey_companies = [
    "Oklahoma City University",
    "Oklahoma City Univeristy",  # Typo
    "Abraham Baldwin Agricultural College",
    "ACGI Software - Alice Smith",  # Has contact name
    "Des Moines Area Community College (DMACC) Ilene Hays",  # Has extra text
]

# Sample company names from customer_data.csv (column 0, lowercase)
csv_companies = [
    "oklahoma city university",
    "abraham baldwin agricultural college",
    "acgi software",
    "des moines area community college",
]

print("=" * 70)
print("COMPANY NAME MATCHING DIAGNOSTIC")
print("=" * 70)
print()

print("Survey Company Names (as entered by users):")
print("-" * 70)
for company in survey_companies:
    print(f"  • {company}")
print()

print("CSV Company Names (from customer_data.csv, column 0, lowercased):")
print("-" * 70)
for company in csv_companies:
    print(f"  • {company}")
print()

print("MATCHING RESULTS:")
print("=" * 70)
for survey_name in survey_companies:
    survey_lower = survey_name.lower()
    
    # Try exact match (what JavaScript currently does)
    if survey_lower in csv_companies:
        print(f"✓ MATCH: '{survey_name}'")
        print(f"  → Found in CSV as: '{survey_lower}'")
    else:
        print(f"✗ NO MATCH: '{survey_name}'")
        print(f"  → Looking for: '{survey_lower}'")
        print(f"  → Result: Industry='Unknown', ERP='Unknown'")
        
        # Show closest match
        for csv_name in csv_companies:
            if csv_name in survey_lower or survey_lower.startswith(csv_name[:10]):
                print(f"  → Possible match: '{csv_name}' (but not exact)")
    print()

print("=" * 70)
print("SOLUTION: Use email domain matching instead of company names")
print("=" * 70)
print()
print("Example:")
print("  Survey: 'Oklahoma City Univeristy' (typo)")
print("  Email: 'user@okcu.edu'")
print("  Domain: 'okcu.edu'")
print("  CSV Lookup: Find row where URL column = 'okcu.edu'")
print("  Result: Use correct company name 'Oklahoma City University'")
print("          from CSV, plus Industry and ERP")
