import mysql.connector
import random
from datetime import datetime, timedelta

db_config = {
    'host':'localhost',
    'user':'root',
    'password':'n3u3da!',
    'database':'stock_history'
}

# Use your latest price date for alignment
latest_date_str = '2017-11-10'
latest_date = datetime.strptime(latest_date_str, '%Y-%m-%d')
start_date = latest_date - timedelta(days=365*10)

# The tickers to add clean buy transactions for
tickers = ['DIS', 'JPM', 'MSFT', 'GOOGL', 'AAPL', 'SPGI']

notes_samples = ['Initial buy', 'Added shares', 'Incremental buy', 'Long term hold', 'Purchase']

def random_date(start, end):
    delta = end - start
    random_days = random.randint(0, delta.days)
    return start + timedelta(days=random_days)

def generate_buy_transactions(n=50):
    transactions = []
    for _ in range(n):
        ticker = random.choice(tickers)
        shares = round(random.uniform(5, 20), 3)  # always positive shares
        price = round(random.uniform(20, 300), 2)  # mock price, adjust as needed
        tx_date = random_date(start_date, latest_date).date()
        note = random.choice(notes_samples)

        transactions.append((ticker, shares, price, 'BUY', tx_date, note))
    return transactions

def insert_buy_transactions():
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()

    # Insert generated buy transactions
    buys = generate_buy_transactions(50)
    for txn in buys:
        cursor.execute(
            "INSERT INTO portfolio_transactions (ticker, shares, price, action, tx_date, notes) VALUES (%s, %s, %s, %s, %s, %s)",
            txn
        )
    conn.commit()
    print(f"Inserted {len(buys)} buy transactions for tickers: {', '.join(tickers)}")

    cursor.close()
    conn.close()

if __name__ == '__main__':
    insert_buy_transactions()
