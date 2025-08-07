import mysql.connector
import random
from datetime import datetime, timedelta

# Configuration - adjust as necessary
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'n3u3da!',
    'database': 'stock_history'
}

# Define latest date in your price data (fixed to match your DB)
LATEST_DATE_STR = '2017-11-10'
LATEST_DATE = datetime.strptime(LATEST_DATE_STR, '%Y-%m-%d')
START_DATE = LATEST_DATE - timedelta(days=365 * 10)  # 10 years before

NOTES_SAMPLE = [
    'Initial buy', 'Additional buy', 'Partial sell', 'Profit booking',
    'Portfolio rebalancing', 'Bought on dip', 'Added shares', 'Sold for profit'
]

def random_date(start, end):
    delta = end - start
    return start + timedelta(days=random.randint(0, delta.days))

def fetch_stock_tickers(min_count=20):
    """Fetch at least min_count tickers from stocks table"""
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()
    cursor.execute(f"SELECT ticker FROM stocks LIMIT {min_count * 2}")  # get more if some skipped
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    tickers = [row[0] for row in rows]
    if len(tickers) < min_count:
        raise ValueError(f"Not enough stocks found in DB (found only {len(tickers)})")
    return tickers[:min_count]

def generate_transactions(tickers, total_transactions=100):
    """Generate buy/sell transaction sequence for given tickers"""
    transactions = []
    # Track buys per ticker to limit sell shares (avoid net negative)
    ticker_buys = {ticker: 0 for ticker in tickers}

    for _ in range(total_transactions):
        ticker = random.choice(tickers)

        # Decide action - bias to BUY (~70%), SELL (~30%)
        action = 'BUY' if random.random() < 0.7 else 'SELL'

        # Shares range: 1 to 30 shares approx
        shares = round(random.uniform(1, 30), 3)

        # If SELL, check buys to avoid negative holdings
        if action == 'SELL':
            if ticker_buys[ticker] < 1:
                # No shares to sell, force BUY
                action = 'BUY'
            else:
                shares = min(shares, ticker_buys[ticker])  # can't sell more than bought

        # Price between $20 and $300 - realistic range
        price = round(random.uniform(20, 300), 2)

        tx_date = random_date(START_DATE, LATEST_DATE).date()

        note = random.choice(NOTES_SAMPLE)

        if action == 'BUY':
            ticker_buys[ticker] += shares
        else:
            ticker_buys[ticker] -= shares

        # SELL shares recorded as negative in db
        signed_shares = shares if action == 'BUY' else -shares

        transactions.append((ticker, signed_shares, price, action, tx_date, note))
    return transactions

def insert_transactions(transactions):
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()

    # Insert all transactions
    for txn in transactions:
        cursor.execute(
            "INSERT INTO portfolio_transactions (ticker, shares, price, action, tx_date, notes)" \
            " VALUES (%s, %s, %s, %s, %s, %s)",
            txn
        )
    conn.commit()
    cursor.close()
    conn.close()

def main():
    print("Fetching tickers from database...")
    tickers = fetch_stock_tickers(min_count=20)
    print(f"Selected {len(tickers)} tickers.")

    print(f"Generating approximately 100 transactions across selected stocks...")
    txns = generate_transactions(tickers, total_transactions=100)
    print(f"Generated {len(txns)} transactions.")

    print("Inserting transactions into database...")
    insert_transactions(txns)
    print("Transactions inserted successfully!")

if __name__ == "__main__":
    main()
