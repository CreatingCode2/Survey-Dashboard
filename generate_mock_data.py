"""
Mock Data Generator for Customer Health Dashboard

Generates realistic fake survey responses and customer master data
for demo purposes without exposing real customer information.

Usage:
    python generate_mock_data.py [--responses N] [--months M]
    
    --responses N : Number of mock survey responses to generate (default: 75)
    --months M    : Number of months to spread data over (default: 12)
"""

import csv
import random
import argparse
from datetime import datetime, timedelta
from faker import Faker

# Initialize Faker
fake = Faker()

# Configuration
INDUSTRIES = ['Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Technology', 'Education']
ERP_SYSTEMS = ['SAP', 'Oracle', 'Microsoft Dynamics', 'NetSuite', 'Workday', 'Infor', 'Epicor', 'JD Edwards', 'PeopleSoft', 'Unknown']

# Survey response options
HEALTH_RESPONSES = ['Very Satisfied', 'Satisfied', 'Ok', 'Dissatisfied', 'Very Dissatisfied']
YES_NO_RESPONSES = ['Yes', 'No']
FREQUENCY_RESPONSES = ['Monthly', 'Bi-Monthly', 'Quarterly', 'Semi-Annually', 'Other']

# Weighted distributions for more realistic data
HEALTH_WEIGHTS = [0.35, 0.40, 0.15, 0.07, 0.03]  # Mostly positive
ROI_WEIGHTS = [0.75, 0.25]  # 75% say yes to ROI
ADOPTION_WEIGHTS = [0.60, 0.40]  # 60% using advanced features


def generate_company_name():
    """Generate a realistic but fake company name"""
    prefixes = ['Global', 'National', 'United', 'Premier', 'Advanced', 'Innovative', 'Strategic', 'Dynamic']
    middles = ['Tech', 'Solutions', 'Systems', 'Services', 'Industries', 'Enterprises', 'Group', 'Corporation']
    suffixes = ['Inc.', 'LLC', 'Corp.', 'Ltd.', 'Co.']
    
    # Mix of different naming patterns
    patterns = [
        lambda: f"{random.choice(prefixes)} {random.choice(middles)} {random.choice(suffixes)}",
        lambda: f"{fake.last_name()} {random.choice(middles)}",
        lambda: f"{fake.city()} {random.choice(middles)}",
        lambda: f"{random.choice(prefixes)} {fake.last_name()} {random.choice(suffixes)}"
    ]
    
    return random.choice(patterns)()


def generate_domain(company_name):
    """Generate a realistic domain from company name"""
    # Clean company name for domain
    clean_name = company_name.lower()
    clean_name = clean_name.replace(' ', '').replace('.', '').replace(',', '')
    clean_name = ''.join(c for c in clean_name if c.isalnum())
    
    # Truncate if too long
    if len(clean_name) > 15:
        clean_name = clean_name[:15]
    
    tlds = ['.com', '.net', '.org', '.io']
    return clean_name + random.choice(tlds)


def generate_timestamp(start_date, end_date):
    """Generate random timestamp between start and end dates"""
    time_between = end_date - start_date
    days_between = time_between.days
    random_days = random.randrange(days_between)
    random_seconds = random.randrange(24 * 60 * 60)
    
    return start_date + timedelta(days=random_days, seconds=random_seconds)


def generate_feedback(sentiment='neutral'):
    """Generate realistic feedback text"""
    positive_feedback = [
        "The product has been working great for our needs.",
        "Very satisfied with the results and support.",
        "Easy to use and integrates well with our systems.",
        "Has significantly improved our data quality.",
        "The team finds it very helpful for daily operations.",
        "Excellent tool, would recommend to others.",
    ]
    
    neutral_feedback = [
        "It's working fine for our basic needs.",
        "No major issues, does what we need it to do.",
        "Meets our requirements adequately.",
        "Standard functionality, no complaints.",
        "",  # Some people don't leave feedback
    ]
    
    negative_feedback = [
        "We've had some challenges with integration.",
        "Would like to see more features added.",
        "The learning curve was steeper than expected.",
        "Had some initial setup issues but they were resolved.",
        "Could use better documentation in some areas.",
    ]
    
    if sentiment == 'positive':
        return random.choice(positive_feedback)
    elif sentiment == 'negative':
        return random.choice(negative_feedback)
    else:
        return random.choice(neutral_feedback)


def generate_customer_master_data(num_companies):
    """Generate mock customer master data CSV"""
    companies = []
    
    for i in range(num_companies):
        company_name = generate_company_name()
        domain = generate_domain(company_name)
        industry = random.choice(INDUSTRIES)
        erp = random.choice(ERP_SYSTEMS)
        
        companies.append({
            'Company': company_name,
            'Domain': domain,
            'Address': fake.street_address(),
            'City': fake.city(),
            'State': fake.state_abbr(),
            'Industry': industry,
            'ERP': erp
        })
    
    # Write to CSV
    with open('mock_customer_data.csv', 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['Company', 'Domain', 'Address', 'City', 'State', 'Industry', 'ERP']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(companies)
    
    print(f"✅ Generated mock_customer_data.csv with {num_companies} companies")
    return companies


def generate_survey_responses(num_responses, companies, months=12):
    """Generate mock survey responses"""
    responses = []
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=months * 30)
    
    for i in range(num_responses):
        # Pick a random company
        company = random.choice(companies)
        
        # Generate respondent info
        respondent_name = fake.name()
        email = f"{respondent_name.lower().replace(' ', '.')}@{company['Domain']}"
        
        # Generate timestamp
        timestamp = generate_timestamp(start_date, end_date)
        
        # Generate health score (weighted towards positive)
        health = random.choices(HEALTH_RESPONSES, weights=HEALTH_WEIGHTS)[0]
        sentiment = 'positive' if health in ['Very Satisfied', 'Satisfied'] else 'negative' if health in ['Dissatisfied', 'Very Dissatisfied'] else 'neutral'
        
        # Generate ROI response
        roi = random.choices(YES_NO_RESPONSES, weights=ROI_WEIGHTS)[0]
        
        # Generate adoption metrics
        clean_file_aware = random.choices(YES_NO_RESPONSES, weights=ADOPTION_WEIGHTS)[0]
        batch_processing = random.choices(YES_NO_RESPONSES, weights=ADOPTION_WEIGHTS)[0]
        support_portal = random.choices(YES_NO_RESPONSES, weights=ADOPTION_WEIGHTS)[0]
        
        # Generate other responses
        update_frequency = random.choice(FREQUENCY_RESPONSES)
        cloud_plan = random.choices(YES_NO_RESPONSES, weights=[0.3, 0.7])[0]  # 30% planning cloud
        upgrade_5x = random.choices(YES_NO_RESPONSES, weights=[0.6, 0.4])[0]  # 60% upgraded
        reference = random.choices(YES_NO_RESPONSES, weights=[0.5, 0.5])[0]
        salesforce = random.choices(YES_NO_RESPONSES, weights=[0.3, 0.7])[0]
        ms_dynamics = random.choices(YES_NO_RESPONSES, weights=[0.2, 0.8])[0]
        
        # Build response row
        response = {
            'Timestamp': timestamp.strftime('%m/%d/%Y %H:%M:%S'),
            'Email Address': email,
            'What is the name of your organization and the name of the person completing this survey?': f"{company['Company']} - {respondent_name}",
            'How has CLEAN_Address been working for your organization?': health,
            'Explain or provide additional feedback below': generate_feedback(sentiment),
            'Do you feel you are getting a return on your investment?': roi,
            'Explain or provide additional feedback below_2': generate_feedback(sentiment) if random.random() > 0.7 else '',
            'Can you confirm who should receive renewal quotes/invoices for your organization? Please add their name(s) and email address below.': f"{fake.name()}, {fake.email()}",
            'Can you confirm the Bill To and Ship To addresses? Please add the address below.': company['Address'],
            'Who are the end user(s) or functional user(s) at your organization? If your organization has multiple users please list the top 5. Please add their name(s) and email address(es). Note: The end user or functional user would be the person responsible for entering data into your system.': f"{fake.name()}, {fake.email()}",
            'How often do you download and update the new data files?': update_frequency,
            'Do you or your end user(s) use the Support Portal or the Knowledge Base (My Runner EDQ)?': support_portal,
            'Explain or provide additional feedback below_3': generate_feedback('neutral') if random.random() > 0.8 else '',
            'Are you aware of the file processing application included with your CLEAN_Address subscription called CLEAN_File? Note: This utility allows you to process a flat file before loading data into your system(s).': clean_file_aware,
            'Explain or provide additional feedback below_4': '',
            'Are you using Batch Processing included with your subscription to keep your database up to date?': batch_processing,
            'Explain or provide additional feedback below_5': '',
            'Do you have any plans for migration to the cloud?': cloud_plan,
            'Have you upgraded to CLEAN_Address version 5x?': upgrade_5x,
            'Explain or provide additional feedback below_6': '',
            'Are there any suggestions to improve our processes and help with customer success (e.g. Would you like us to provide more product knowledge or training on our products and/or services?) If yes, please provide details in the "Comment" box.': generate_feedback('neutral') if random.random() > 0.6 else '',
            'Explain or provide additional feedback below_7': '',
            'Are there other data "types" or "sets" you are interested in acquiring or appending to your existing records? If yes, please add the details in the "Comment" box. (Examples of data "types" or "sets" are cell phone, email, household income, gender, occupation, etc.)': '',
            'Explain or provide additional feedback below_8': '',
            'Would Demographic Data associated with address records be beneficial for your organization?(Examples of Demographic Data would be Political Party, Date of Birth, Date of Death, Occupation, Homeowner or Renter, Income)': random.choice(YES_NO_RESPONSES),
            'Explain or provide additional feedback below_9': '',
            'Are there any other systems (e.g. PeopleSoft, Banner, Advance, EBS, JD Edwards, or CRM Recruit) in your organization that could use address validation? Are there any other Departments in your organization (e.g. A/P/A/R, Payroll, Alumni, or HR) that could use CLEAN_Address? If so, please list them in the "Comment" box.': '',
            'Explain or provide additional feedback below_10': '',
            'Do you use Salesforce?': salesforce,
            'Explain or provide additional feedback below_11': '',
            'Do you use Microsoft Dynamics?': ms_dynamics,
            'Explain or provide additional feedback below_12': '',
            'Are you willing to be a reference for RunnerEDQ and CLEAN_Address?': reference,
            'Explain or provide additional feedback below_13': '',
            'Can you refer any other organization you feel would benefit from our products and services? If yes, please list the organization(s) in the "Comment" box?': '',
            'Explain or provide additional feedback below_14': '',
            'Are there any other details that you would like to provide?': generate_feedback('neutral') if random.random() > 0.7 else ''
        }
        
        responses.append(response)
    
    # Sort by timestamp
    responses.sort(key=lambda x: datetime.strptime(x['Timestamp'], '%m/%d/%Y %H:%M:%S'))
    
    # Write to CSV
    with open('mock_survey_data.csv', 'w', newline='', encoding='utf-8') as f:
        fieldnames = list(responses[0].keys())
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(responses)
    
    print(f"✅ Generated mock_survey_data.csv with {num_responses} responses")
    print(f"   Date range: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
    
    # Print statistics
    health_counts = {}
    for r in responses:
        h = r['How has CLEAN_Address been working for your organization?']
        health_counts[h] = health_counts.get(h, 0) + 1
    
    print(f"\n📊 Health Score Distribution:")
    for health, count in sorted(health_counts.items(), key=lambda x: HEALTH_RESPONSES.index(x[0])):
        pct = (count / num_responses) * 100
        print(f"   {health}: {count} ({pct:.1f}%)")


def main():
    parser = argparse.ArgumentParser(description='Generate mock data for Customer Health Dashboard')
    parser.add_argument('--responses', type=int, default=75, help='Number of survey responses to generate (default: 75)')
    parser.add_argument('--months', type=int, default=12, help='Number of months to spread data over (default: 12)')
    
    args = parser.parse_args()
    
    print("🚀 Generating Mock Data for Customer Health Dashboard\n")
    print(f"Configuration:")
    print(f"  - Survey responses: {args.responses}")
    print(f"  - Time period: {args.months} months")
    print(f"  - Companies: {args.responses // 2} (approximately 2 responses per company)\n")
    
    # Generate customer master data (roughly half the number of responses)
    num_companies = max(args.responses // 2, 20)
    companies = generate_customer_master_data(num_companies)
    
    # Generate survey responses
    generate_survey_responses(args.responses, companies, args.months)
    
    print("\n✅ Mock data generation complete!")
    print("\nGenerated files:")
    print("  - mock_customer_data.csv")
    print("  - mock_survey_data.csv")
    print("\nNext steps:")
    print("  1. Review the generated data")
    print("  2. Use these files with the demo dashboard")
    print("  3. Regenerate anytime with: python generate_mock_data.py")


if __name__ == '__main__':
    main()
