import mysql.connector

# Full US top 100 tickers with sector info (you can expand or adjust this list as needed)
us100_sectors = [
    {"ticker": "AAPL",  "sector": "Information Technology"},
    {"ticker": "MSFT",  "sector": "Information Technology"},
    {"ticker": "AMZN",  "sector": "Consumer Discretionary"},
    {"ticker": "GOOGL", "sector": "Communication Services"},
    {"ticker": "GOOG",  "sector": "Communication Services"},
    {"ticker": "META",  "sector": "Communication Services"},
    {"ticker": "NVDA",  "sector": "Information Technology"},
    {"ticker": "TSLA",  "sector": "Consumer Discretionary"},
    {"ticker": "BRK-B", "sector": "Financials"},
    {"ticker": "JPM",   "sector": "Financials"},
    {"ticker": "V",     "sector": "Information Technology"},
    {"ticker": "PG",    "sector": "Consumer Staples"},
    {"ticker": "JNJ",   "sector": "Health Care"},
    {"ticker": "UNH",   "sector": "Health Care"},
    {"ticker": "HD",    "sector": "Consumer Discretionary"},
    {"ticker": "MA",    "sector": "Information Technology"},
    {"ticker": "BAC",   "sector": "Financials"},
    {"ticker": "ABBV",  "sector": "Health Care"},
    {"ticker": "PFE",   "sector": "Health Care"},
    {"ticker": "XOM",   "sector": "Energy"},
    {"ticker": "PEP",   "sector": "Consumer Staples"},
    {"ticker": "CVX",   "sector": "Energy"},
    {"ticker": "KO",    "sector": "Consumer Staples"},
    {"ticker": "MRK",   "sector": "Health Care"},
    {"ticker": "AVGO",  "sector": "Information Technology"},
    {"ticker": "WMT",   "sector": "Consumer Staples"},
    {"ticker": "COST",  "sector": "Consumer Staples"},
    {"ticker": "DIS",   "sector": "Communication Services"},
    {"ticker": "MCD",   "sector": "Consumer Discretionary"},
    {"ticker": "TMO",   "sector": "Health Care"},
    {"ticker": "VZ",    "sector": "Communication Services"},
    {"ticker": "UNP",   "sector": "Industrials"},
    {"ticker": "GS",    "sector": "Financials"},
    {"ticker": "ADBE",  "sector": "Information Technology"},
    {"ticker": "NFLX",  "sector": "Communication Services"},
    {"ticker": "INTC",  "sector": "Information Technology"},
    {"ticker": "ORCL",  "sector": "Information Technology"},
    {"ticker": "QCOM",  "sector": "Information Technology"},
    {"ticker": "CSCO",  "sector": "Information Technology"},
    {"ticker": "IBM",   "sector": "Information Technology"},
    {"ticker": "SBUX",  "sector": "Consumer Discretionary"},
    {"ticker": "ABT",   "sector": "Health Care"},
    {"ticker": "T",     "sector": "Communication Services"},
    {"ticker": "MS",    "sector": "Financials"},
    {"ticker": "RTX",   "sector": "Industrials"},
    {"ticker": "MDLZ",  "sector": "Consumer Staples"},
    {"ticker": "AMGN",  "sector": "Health Care"},
    {"ticker": "CMCSA", "sector": "Communication Services"},
    {"ticker": "CVS",   "sector": "Health Care"},
    {"ticker": "CAT",   "sector": "Industrials"},
    {"ticker": "GE",    "sector": "Industrials"},
    {"ticker": "LOW",   "sector": "Consumer Discretionary"},
    {"ticker": "BA",    "sector": "Industrials"},
    {"ticker": "SCHW",  "sector": "Financials"},
    {"ticker": "ELV",   "sector": "Health Care"},
    {"ticker": "MO",    "sector": "Consumer Staples"},
    {"ticker": "C",     "sector": "Financials"},
    {"ticker": "SPGI",  "sector": "Financials"},
    {"ticker": "AXP",   "sector": "Financials"},
    {"ticker": "MDT",   "sector": "Health Care"},
    {"ticker": "HON",   "sector": "Industrials"},
    {"ticker": "DE",    "sector": "Industrials"},
    {"ticker": "DHR",   "sector": "Health Care"},
    {"ticker": "LMT",   "sector": "Industrials"},
    {"ticker": "CB",    "sector": "Financials"},
    {"ticker": "NKE",   "sector": "Consumer Discretionary"},
    {"ticker": "DUK",   "sector": "Utilities"},
    {"ticker": "BLK",   "sector": "Financials"},
    {"ticker": "USB",   "sector": "Financials"},
    {"ticker": "AMT",   "sector": "Real Estate"},
    {"ticker": "CL",    "sector": "Consumer Staples"},
    {"ticker": "PNC",   "sector": "Financials"},
    {"ticker": "SO",    "sector": "Utilities"},
    {"ticker": "ISRG",  "sector": "Health Care"},
    {"ticker": "TJX",   "sector": "Consumer Discretionary"},
    {"ticker": "ADP",   "sector": "Information Technology"},
    {"ticker": "MMM",   "sector": "Industrials"},
    {"ticker": "BK",    "sector": "Financials"},
    {"ticker": "GILD",  "sector": "Health Care"},
    {"ticker": "TGT",   "sector": "Consumer Discretionary"},
    {"ticker": "FDX",   "sector": "Industrials"},
    {"ticker": "REGN",  "sector": "Health Care"},
    {"ticker": "EOG",   "sector": "Energy"},
    {"ticker": "GM",    "sector": "Consumer Discretionary"},
    {"ticker": "PLD",   "sector": "Real Estate"},
    {"ticker": "BDX",   "sector": "Health Care"},
    {"ticker": "APD",   "sector": "Materials"},
    {"ticker": "FISV",  "sector": "Information Technology"},
    {"ticker": "MU",    "sector": "Information Technology"},
    {"ticker": "PAYX",  "sector": "Information Technology"},
    {"ticker": "ALL",   "sector": "Financials"},
    {"ticker": "AIG",   "sector": "Financials"},
    {"ticker": "EA",    "sector": "Information Technology"},
    {"ticker": "KMB",   "sector": "Consumer Staples"},
    {"ticker": "AEP",   "sector": "Utilities"},
    {"ticker": "MCO",   "sector": "Financials"},
    {"ticker": "CME",   "sector": "Financials"}
]

# MySQL connection details
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'n3u3da!',
    'database': 'stock_history'
}

def update_sectors():
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()

    for stock in us100_sectors:
        ticker = stock['ticker']
        sector = stock['sector']
        try:
            cursor.execute(
                "UPDATE stocks SET sector = %s WHERE ticker = %s",
                (sector, ticker)
            )
        except Exception as e:
            print(f"Failed to update sector for {ticker}: {e}")

    conn.commit()
    cursor.close()
    conn.close()
    print("Sectors updated for all stocks present in DB.")

if __name__ == '__main__':
    update_sectors()
