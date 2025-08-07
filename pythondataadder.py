import os
import pandas as pd
import mysql.connector

# === CONFIGURATION ===

# MySQL connection configuration
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'n3u3da!',
    'database': 'stock_history'
}

# Folder containing the historical price files
data_dir = r"C:\Users\Administrator\Desktop\data\Stocks"  # adjust path as necessary

# Top 100 US Stocks (ticker uppercase, with name)
us_top100 = [
    {"ticker": "AAPL",  "company_name": "Apple Inc."},
    {"ticker": "MSFT",  "company_name": "Microsoft Corporation"},
    {"ticker": "AMZN",  "company_name": "Amazon.com, Inc."},
    {"ticker": "GOOGL", "company_name": "Alphabet Inc. (Class A)"},
    {"ticker": "GOOG",  "company_name": "Alphabet Inc. (Class C)"},
    {"ticker": "META",  "company_name": "Meta Platforms, Inc."},
    {"ticker": "NVDA",  "company_name": "NVIDIA Corporation"},
    {"ticker": "TSLA",  "company_name": "Tesla, Inc."},
    {"ticker": "BRK-B", "company_name": "Berkshire Hathaway Inc. (B)"},
    {"ticker": "JPM",   "company_name": "JPMorgan Chase & Co."},
    {"ticker": "V",     "company_name": "Visa Inc."},
    {"ticker": "PG",    "company_name": "Procter & Gamble Company"},
    {"ticker": "JNJ",   "company_name": "Johnson & Johnson"},
    {"ticker": "UNH",   "company_name": "UnitedHealth Group Incorporated"},
    {"ticker": "HD",    "company_name": "Home Depot, Inc."},
    {"ticker": "MA",    "company_name": "Mastercard Incorporated"},
    {"ticker": "BAC",   "company_name": "Bank of America Corporation"},
    {"ticker": "ABBV",  "company_name": "AbbVie Inc."},
    {"ticker": "PFE",   "company_name": "Pfizer Inc."},
    {"ticker": "XOM",   "company_name": "Exxon Mobil Corporation"},
    {"ticker": "PEP",   "company_name": "PepsiCo, Inc."},
    {"ticker": "CVX",   "company_name": "Chevron Corporation"},
    {"ticker": "KO",    "company_name": "Coca-Cola Company"},
    {"ticker": "MRK",   "company_name": "Merck & Co., Inc."},
    {"ticker": "AVGO",  "company_name": "Broadcom Inc."},
    {"ticker": "WMT",   "company_name": "Walmart Inc."},
    {"ticker": "COST",  "company_name": "Costco Wholesale Corporation"},
    {"ticker": "DIS",   "company_name": "Walt Disney Company"},
    {"ticker": "MCD",   "company_name": "McDonald's Corporation"},
    {"ticker": "TMO",   "company_name": "Thermo Fisher Scientific Inc."},
    {"ticker": "VZ",    "company_name": "Verizon Communications Inc."},
    {"ticker": "UNP",   "company_name": "Union Pacific Corporation"},
    {"ticker": "GS",    "company_name": "Goldman Sachs Group, Inc."},
    {"ticker": "ADBE",  "company_name": "Adobe Inc."},
    {"ticker": "NFLX",  "company_name": "Netflix, Inc."},
    {"ticker": "INTC",  "company_name": "Intel Corporation"},
    {"ticker": "ORCL",  "company_name": "Oracle Corporation"},
    {"ticker": "QCOM",  "company_name": "QUALCOMM Incorporated"},
    {"ticker": "CSCO",  "company_name": "Cisco Systems, Inc."},
    {"ticker": "IBM",   "company_name": "International Business Machines Corporation"},
    {"ticker": "SBUX",  "company_name": "Starbucks Corporation"},
    {"ticker": "ABT",   "company_name": "Abbott Laboratories"},
    {"ticker": "T",     "company_name": "AT&T Inc."},
    {"ticker": "MS",    "company_name": "Morgan Stanley"},
    {"ticker": "RTX",   "company_name": "RTX Corporation"},
    {"ticker": "MDLZ",  "company_name": "Mondelez International, Inc."},
    {"ticker": "AMGN",  "company_name": "Amgen Inc."},
    {"ticker": "CMCSA", "company_name": "Comcast Corporation"},
    {"ticker": "CVS",   "company_name": "CVS Health Corporation"},
    {"ticker": "CAT",   "company_name": "Caterpillar Inc."},
    {"ticker": "GE",    "company_name": "General Electric Company"},
    {"ticker": "LOW",   "company_name": "Lowe's Companies, Inc."},
    {"ticker": "BA",    "company_name": "Boeing Company"},
    {"ticker": "SCHW",  "company_name": "Charles Schwab Corporation"},
    {"ticker": "ELV",   "company_name": "Elevance Health, Inc."},
    {"ticker": "MO",    "company_name": "Altria Group, Inc."},
    {"ticker": "C",     "company_name": "Citigroup Inc."},
    {"ticker": "SPGI",  "company_name": "S&P Global Inc."},
    {"ticker": "AXP",   "company_name": "American Express Company"},
    {"ticker": "MDT",   "company_name": "Medtronic plc"},
    {"ticker": "HON",   "company_name": "Honeywell International Inc."},
    {"ticker": "DE",    "company_name": "Deere & Company"},
    {"ticker": "DHR",   "company_name": "Danaher Corporation"},
    {"ticker": "LMT",   "company_name": "Lockheed Martin Corporation"},
    {"ticker": "CB",    "company_name": "Chubb Limited"},
    {"ticker": "NKE",   "company_name": "NIKE, Inc."},
    {"ticker": "DUK",   "company_name": "Duke Energy Corporation"},
    {"ticker": "BLK",   "company_name": "BlackRock, Inc."},
    {"ticker": "USB",   "company_name": "U.S. Bancorp"},
    {"ticker": "AMT",   "company_name": "American Tower Corporation"},
    {"ticker": "CL",    "company_name": "Colgate-Palmolive Company"},
    {"ticker": "PNC",   "company_name": "PNC Financial Services Group, Inc."},
    {"ticker": "SO",    "company_name": "Southern Company"},
    {"ticker": "ISRG",  "company_name": "Intuitive Surgical, Inc."},
    {"ticker": "TJX",   "company_name": "TJX Companies, Inc."},
    {"ticker": "ADP",   "company_name": "Automatic Data Processing, Inc."},
    {"ticker": "MMM",   "company_name": "3M Company"},
    {"ticker": "BK",    "company_name": "Bank of New York Mellon Corporation"},
    {"ticker": "GILD",  "company_name": "Gilead Sciences, Inc."},
    {"ticker": "TGT",   "company_name": "Target Corporation"},
    {"ticker": "FDX",   "company_name": "FedEx Corporation"},
    {"ticker": "REGN",  "company_name": "Regeneron Pharmaceuticals, Inc."},
    {"ticker": "EOG",   "company_name": "EOG Resources, Inc."},
    {"ticker": "GM",    "company_name": "General Motors Company"},
    {"ticker": "PLD",   "company_name": "Prologis, Inc."},
    {"ticker": "BDX",   "company_name": "Becton, Dickinson and Company"},
    {"ticker": "APD",   "company_name": "Air Products and Chemicals, Inc."},
    {"ticker": "FISV",  "company_name": "Fiserv, Inc."},
    {"ticker": "MU",    "company_name": "Micron Technology, Inc."},
    {"ticker": "PAYX",  "company_name": "Paychex, Inc."},
    {"ticker": "ALL",   "company_name": "Allstate Corporation"},
    {"ticker": "AIG",   "company_name": "American International Group, Inc."},
    {"ticker": "EA",    "company_name": "Electronic Arts Inc."},
    {"ticker": "KMB",   "company_name": "Kimberly-Clark Corporation"},
    {"ticker": "AEP",   "company_name": "American Electric Power Company, Inc."},
    {"ticker": "MCO",   "company_name": "Moody's Corporation"},
    {"ticker": "CME",   "company_name": "CME Group Inc."}
]

def main():
    print(f"Connecting to database `{db_config['database']}`...")
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()

    # Insert stocks data
    print(f"Inserting {len(us_top100)} stocks...")
    for stock in us_top100:
        cursor.execute(
            "INSERT IGNORE INTO stocks (ticker, company_name) VALUES (%s, %s)",
            (stock['ticker'], stock['company_name'])
        )
    conn.commit()

    # Get mapping: ticker -> stock_id
    cursor.execute("SELECT stock_id, ticker FROM stocks")
    stock_id_map = {ticker: stock_id for stock_id, ticker in cursor.fetchall()}

    # List all files in data directory
    files = os.listdir(data_dir)
    files_lower = [f.lower() for f in files]
    print(f"Found {len(files)} files in data directory.")

    for stock in us_top100:
        ticker = stock['ticker'].upper()
        # Find matching file with either .us or .us.txt extension (case-insensitive)
        possible_filenames = [f"{ticker.lower()}.us", f"{ticker.lower()}.us.txt"]
        matching_file = None
        for pf in possible_filenames:
            if pf in files_lower:
                idx = files_lower.index(pf)
                matching_file = os.path.join(data_dir, files[idx])
                break

        if not matching_file:
            print(f"Data file for ticker '{ticker}' not found, skipping.")
            continue

        stock_id = stock_id_map.get(ticker)
        if not stock_id:
            print(f"Stock ID not found in DB for '{ticker}', skipping.")
            continue

        print(f"Importing price data for '{ticker}' from file '{matching_file}'...")
        df = pd.read_csv(matching_file)

        for _, row in df.iterrows():
            try:
                open_ = float(row['Open']) if row['Open'] != '' else None
                high = float(row['High']) if row['High'] != '' else None
                low = float(row['Low']) if row['Low'] != '' else None
                close = float(row['Close']) if row['Close'] != '' else None
                volume = int(float(row['Volume'])) if row['Volume'] != '' else 0
            except Exception as e:
                print(f"Skipping bad row in {ticker} data: {e}")
                continue

            cursor.execute("""
                INSERT INTO price_history (stock_id, date, open, high, low, close, volume)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE open=VALUES(open), high=VALUES(high), low=VALUES(low), close=VALUES(close), volume=VALUES(volume)
            """, (stock_id, row['Date'], open_, high, low, close, volume))

        conn.commit()

    print("Data import completed!")
    cursor.close()
    conn.close()


if __name__ == '__main__':
    main()
