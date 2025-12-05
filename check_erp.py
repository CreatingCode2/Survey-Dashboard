import csv

print("Checking customer_data.csv ERP column...\n")

with open('customer_data.csv', 'r', encoding='utf-8', newline='') as f:
    reader = csv.reader(f)
    header = next(reader)
    
    print(f"Column 6 (ERP) header: {repr(header[6])}\n")
    print("All ERP values found:\n")
    
    row_num = 1
    for row in reader:
        row_num += 1
        if len(row) >= 7:
            company = row[0]
            erp = row[6]
            print(f"Row {row_num}: Company={company[:30]:30s} | ERP={repr(erp)}")
