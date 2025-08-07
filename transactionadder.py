import pandas as pd
import mysql.connector

datafile = 'portfolio_transactions.csv'

conn = mysql.connector.connect(
    host='localhost',
    user='root',
    password='n3u3da!',
    database='stock_history'
)
cursor = conn.cursor()

df = pd.read_csv(datafile)
for _, row in df.iterrows():
    cursor.execute(
        "INSERT INTO portfolio_transactions (ticker, shares, price, action, tx_date, notes) VALUES (%s, %s, %s, %s, %s, %s)",
        (row['ticker'], row['shares'], row['price'], row['action'], row['tx_date'], row['notes'])
    )
conn.commit()
cursor.close()
conn.close()
print('Imported portfolio transactions.')
