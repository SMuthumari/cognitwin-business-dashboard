# CogniTwin Dataset

This folder contains sample business datasets for the CogniTwin dashboard.

## Files

### `business_data.csv`
Standard healthy business dataset with 12 months of data across 5 products. Shows stable growth, positive cash flow, and healthy inventory levels. Use this to see the dashboard, forecasting, and business twin features working normally.

### `business_data_risk_scenario.csv`
Dataset with a deteriorating business scenario. The last 6 months show declining sales, rising expenses, shrinking inventory, and negative cash flow. Use this to see the risk analysis, alerts, and AI recommendations features in action.

## CSV Format

| Column | Description |
|--------|-------------|
| Date | Date of the record (YYYY-MM-DD) |
| Product | Product name |
| Sales | Units sold |
| Revenue | Total revenue (currency) |
| Expenses | Total expenses (currency) |
| Inventory | Units in inventory |
| Demand | Units demanded |
| Production | Units produced |
| CashFlow | Net cash flow (Revenue - Expenses) |

## Usage

1. Open the CogniTwin dashboard
2. Navigate to **Data Upload** in the sidebar
3. Click the upload area and select a CSV file from this folder
4. The dashboard will update with the new data
