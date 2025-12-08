# Mock Data Generation Guide

## Overview
This guide explains how to generate realistic mock data for the Customer Health Dashboard demo version.

## Prerequisites

- Python 3.x installed
- `faker` library (will be installed automatically if missing)

## Quick Start

### Generate Mock Data

Run the mock data generator script:

```bash
python generate_mock_data.py
```

This will create:
- `mock_survey_data.csv` - 75 fake survey responses
- `mock_customer_data.csv` - Customer master data with fake companies

### Custom Generation

You can customize the number of responses and time period:

```bash
# Generate 100 responses over 12 months
python generate_mock_data.py --responses 100 --months 12

# Generate 50 responses over 6 months
python generate_mock_data.py --responses 50 --months 6
```

## What Gets Generated

### Mock Survey Data (`mock_survey_data.csv`)

**Realistic Patterns:**
- **75 survey responses** (default) from fake companies
- **Year-long timestamps** (12 months) for trend visualization
- **Weighted distributions**:
  - 75% positive health scores (Very Satisfied/Satisfied)
  - 75% report positive ROI
  - 60% using advanced features
  - 10% at-risk customers (for triage demonstration)

**Fake Data Includes:**
- Generic company names (e.g., "Global Tech Solutions Inc.", "Premier Systems Corp.")
- Realistic email addresses matching company domains
- Varied responses across all 34 survey questions
- Realistic feedback text
- Mix of industries and ERP systems

### Mock Customer Data (`mock_customer_data.csv`)

**Contains:**
- Fake company names
- Generated email domains
- Fake addresses (city, state)
- Industry assignments (Finance, Healthcare, Retail, etc.)
- ERP system assignments (SAP, Oracle, Microsoft Dynamics, etc.)

**Approximately 40 companies** (half the number of responses, simulating multiple responses per company)

## Data Characteristics

### Realistic Distributions

The generator creates data that looks like real customer survey results:

| Metric | Distribution |
|--------|--------------|
| Very Satisfied | 35% |
| Satisfied | 40% |
| Ok | 15% |
| Dissatisfied | 7% |
| Very Dissatisfied | 3% |

**ROI Responses:**
- Yes: 75%
- No: 25%

**Feature Adoption:**
- Using advanced features: 60%
- Not using: 40%

### Timeline

Responses are spread evenly across the specified time period (default: 12 months) to create realistic trend charts.

## Regenerating Data

You can regenerate mock data anytime:

```bash
python generate_mock_data.py
```

**Note:** This will overwrite existing `mock_survey_data.csv` and `mock_customer_data.csv` files.

## Using Mock Data

### With Demo Dashboard

The demo dashboard (`customer_health_dashboard_demo.html`) automatically loads from these mock CSV files:
1. Open `customer_health_dashboard_demo.html` in a browser
2. Dashboard loads `mock_survey_data.csv` and `mock_customer_data.csv`
3. All features work identically to the production dashboard

### Verifying Mock Data

After generation, you can:
1. Open the CSV files in Excel or a text editor
2. Verify company names are generic (no real customers)
3. Check that timestamps span the expected period
4. Review the health score distribution in the console output

## Customization

### Modifying the Generator

Edit `generate_mock_data.py` to customize:

**Company Name Patterns:**
```python
# Line ~35
prefixes = ['Global', 'National', 'United', ...]
middles = ['Tech', 'Solutions', 'Systems', ...]
```

**Industries:**
```python
# Line ~19
INDUSTRIES = ['Finance', 'Healthcare', 'Retail', ...]
```

**ERP Systems:**
```python
# Line ~20
ERP_SYSTEMS = ['SAP', 'Oracle', 'Microsoft Dynamics', ...]
```

**Score Distributions:**
```python
# Line ~27-29
HEALTH_WEIGHTS = [0.35, 0.40, 0.15, 0.07, 0.03]  # Adjust percentages
ROI_WEIGHTS = [0.75, 0.25]  # 75% yes, 25% no
```

## Troubleshooting

### `faker` Module Not Found

If you see an error about `faker` not being installed:

```bash
pip install faker
```

### No Data Generated

Check that:
- Python 3.x is installed: `python --version`
- Script has write permissions in the directory
- No other process has the CSV files open

### Data Looks Unrealistic

Adjust the weights in `generate_mock_data.py`:
- Increase `HEALTH_WEIGHTS` for dissatisfied responses to create more at-risk customers
- Adjust `ROI_WEIGHTS` to change ROI perception
- Modify feedback templates in the `generate_feedback()` function

## Best Practices

1. **Regenerate periodically** - Keep demo data fresh with recent timestamps
2. **Verify before sharing** - Always check that no real customer data leaked into mock files
3. **Document changes** - If you customize the generator, document what you changed
4. **Version control** - Commit the generator script, but consider gitignoring the generated CSV files

## Next Steps

After generating mock data:
1. Open `customer_health_dashboard_demo.html` to test
2. Verify all charts and features work
3. Package demo files for sharing (see `DEMO_SHARING_GUIDE.md`)

---

**Questions?** Contact the development team or refer to `DASHBOARD_REUSABILITY_GUIDE.md` for more information.
