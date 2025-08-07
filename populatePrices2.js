const yahooFinance = require('yahoo-finance2').default;
const mysql = require('mysql2/promise');

async function populatePriceHistory() {
  // Update MySQL connection details as per your setup
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',     // replace with your username
    password: 'n3u3da!', // replace with your password
    database: 'portfolio_management',
  });

  try {
    // Get all stocks (id and ticker)
    const [stocks] = await connection.execute('SELECT stock_id, ticker FROM stocks');
    if (stocks.length === 0) {
      console.log('No stocks found in the stocks table. Please add stocks first.');
      return;
    }

    // Define date range: 1 year from today
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 1);

    // Loop over each stock
    for (const stock of stocks) {
      const { stock_id, ticker } = stock;
      console.log(`Fetching historical data for ${ticker}...`);

      try {
        const historical = await yahooFinance.historical(ticker, {
          period1: startDate.toISOString().split('T')[0], // e.g., '2024-08-01'
          period2: endDate.toISOString().split('T')[0],   // e.g., '2025-08-01'
          interval: '1d',
        });

        if (!historical || historical.length === 0) {
          console.log(`No historical data found for ${ticker}, skipping.`);
          continue;
        }

        // Insert each daily bar into price_history
        for (const bar of historical) {
          await connection.execute(
            `INSERT INTO price_history (stock_id, date, open, close, high, low, volume)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE open=VALUES(open), close=VALUES(close), high=VALUES(high), low=VALUES(low), volume=VALUES(volume)`,
            [stock_id, bar.date, bar.open, bar.close, bar.high, bar.low, bar.volume]
          );
        }

        console.log(`Inserted/updated ${historical.length} records for ${ticker}.`);

      } catch (err) {
        console.error(`Failed fetching data for ${ticker}:`, err.message);
      }
    }

  } catch (error) {
    console.error('Database query error:', error.message);
  } finally {
    await connection.end();
    console.log('All done fetching and inserting price data!');
  }
}

populatePriceHistory().catch(console.error);
