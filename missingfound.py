import mysql.connector

# Intended US top 100 tickers (just the ticker strings, matching previous list)
intended_tickers = [
    "AAPL","MSFT","AMZN","GOOGL","GOOG","META","NVDA","TSLA","BRK-B","JPM",
    "V","PG","JNJ","UNH","HD","MA","BAC","ABBV","PFE","XOM",
    "PEP","CVX","KO","MRK","AVGO","WMT","COST","DIS","MCD","TMO",
    "VZ","UNP","GS","ADBE","NFLX","INTC","ORCL","QCOM","CSCO","IBM",
    "SBUX","ABT","T","MS","RTX","MDLZ","AMGN","CMCSA","CVS","CAT",
    "GE","LOW","BA","SCHW","ELV","MO","C","SPGI","AXP","MDT",
    "HON","DE","DHR","LMT","CB","NKE","DUK","BLK","USB","AMT",
    "CL","PNC","SO","ISRG","TJX","ADP","MMM","BK","GILD","TGT",
    "FDX","REGN","EOG","GM","PLD","BDX","APD","FISV","MU","PAYX",
    "ALL","AIG","EA","KMB","AEP","MCO","CME"
]

# MySQL connection config
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'n3u3da!',
    'database': 'stock_history'
}

def identify_missing():
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()

    cursor.execute("SELECT ticker FROM stocks")
    existing_tickers = set(row[0] for row in cursor.fetchall())

    missing = [ticker for ticker in intended_tickers if ticker not in existing_tickers]

    if missing:
        print("Tickers missing from the database:")
        for m in missing:
            print(m)
    else:
        print("All tickers are present in the database!")

    cursor.close()
    conn.close()

if __name__ == '__main__':
    identify_missing()
