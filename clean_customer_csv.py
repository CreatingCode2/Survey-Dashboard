import csv

print("🧹 Cleaning customer_data.csv...")

# Read the CSV
with open('customer_data.csv', 'r', encoding='utf-8', newline='') as f:
    reader = csv.reader(f)
    rows = list(reader)

print(f"📊 Found {len(rows)} rows (including header)")

# Clean each row
cleaned_rows = []
issues_found = 0

for i, row in enumerate(rows):
    cleaned_row = []
    for j, cell in enumerate(row):
        # Remove leading/trailing commas and whitespace
        cleaned_cell = cell.strip().strip(',').strip()
        
        # Track if we made changes
        if cleaned_cell != cell and cell.strip() != '':
            issues_found += 1
            if issues_found <= 5:  # Show first 5 examples
                print(f"   Row {i+1}, Col {j+1}: '{cell}' → '{cleaned_cell}'")
        
        cleaned_row.append(cleaned_cell)
    
    cleaned_rows.append(cleaned_row)

print(f"\n✅ Found and cleaned {issues_found} cells with extra commas/whitespace")

# Write back to CSV
with open('customer_data.csv', 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerows(cleaned_rows)

print("💾 Saved cleaned CSV to customer_data.csv")
print("\n🔄 Refresh your dashboard to see the changes!")
