#!/usr/bin/env python3
"""
Script to clean up customer_data.csv by removing extra trailing commas.
This will create a backup and then clean the file.
"""

import csv
import shutil
from datetime import datetime

# File paths
input_file = 'customer_data.csv'
backup_file = f'customer_data_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
output_file = 'customer_data_cleaned.csv'

print(f"Cleaning {input_file}...")
print(f"Creating backup: {backup_file}")

# Create backup
shutil.copy2(input_file, backup_file)

# Read and clean the CSV
with open(input_file, 'r', encoding='utf-8') as infile:
    lines = infile.readlines()

cleaned_lines = []
for i, line in enumerate(lines):
    # Remove trailing commas and whitespace
    cleaned = line.rstrip().rstrip(',')
    
    # Add back the newline
    cleaned_lines.append(cleaned + '\n')
    
    # Show what changed
    if line.rstrip() != cleaned:
        print(f"Line {i+1}: Removed {line.count(',') - cleaned.count(',')} trailing comma(s)")

# Write cleaned data
with open(output_file, 'w', encoding='utf-8', newline='') as outfile:
    outfile.writelines(cleaned_lines)

print(f"\nCleaned file saved to: {output_file}")
print(f"Backup saved to: {backup_file}")
print(f"\nTotal lines processed: {len(cleaned_lines)}")
print("\nTo use the cleaned file, run:")
print(f"  move {output_file} {input_file}")
