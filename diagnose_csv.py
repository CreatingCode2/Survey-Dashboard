import csv

print("🔍 Diagnosing customer_data.csv for parsing issues...\n")

# Read the CSV and check for issues
with open('customer_data.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)
    
    print(f"📋 Header columns ({len(header)}):")
    for i, col in enumerate(header):
        print(f"   {i}: {repr(col)}")
    
    print(f"\n📊 Checking data rows for anomalies...\n")
    
    issues_found = []
    row_num = 1
    
    for row in reader:
        row_num += 1
        
        # Check if row has correct number of columns
        if len(row) != len(header):
            issues_found.append({
                'row': row_num,
                'issue': f'Column count mismatch: expected {len(header)}, got {len(row)}',
                'data': row
            })
        
        # Check for quotes in ERP field (column 6)
        if len(row) >= 7:
            company = row[0]
            domain = row[1]
            erp = row[6]
            
            # Check for unclosed quotes or newlines
            if '"' in erp or '\n' in erp or '\r' in erp:
                issues_found.append({
                    'row': row_num,
                    'issue': f'ERP field contains quotes or newlines',
                    'company': company,
                    'domain': domain,
                    'erp': repr(erp)
                })
    
    if issues_found:
        print(f"❌ Found {len(issues_found)} issues:\n")
        for issue in issues_found:
            print(f"Row {issue['row']}:")
            if 'company' in issue:
                print(f"   Company: {issue['company']}")
                print(f"   Domain: {issue['domain']}")
                print(f"   ERP: {issue['erp']}")
            print(f"   Issue: {issue['issue']}")
            if 'data' in issue:
                print(f"   Data: {issue['data']}")
            print()
    else:
        print("✅ No obvious issues found!")

print("\n📈 Showing all ERP values:")
with open('customer_data.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    next(reader)  # Skip header
    
    erp_values = set()
    for row in reader:
        if len(row) >= 7:
            erp_values.add(row[6])
    
    for erp in sorted(erp_values):
        print(f"   - {repr(erp)}")
