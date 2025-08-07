const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'n3u3da!',
  database: 'stock_history'
};

async function getConnection() {
  return mysql.createConnection(dbConfig);
}

async function getLatestPriceDate() {
  const conn = await getConnection();
  const [rows] = await conn.execute('SELECT MAX(date) AS latest_date FROM price_history');
  await conn.end();
  if (rows.length && rows[0].latest_date) return rows[0].latest_date;
  return null;
}

// Portfolio Value History
app.get('/api/portfolio/history', async (req, res) => {
  const { range = 'year' } = req.query;
  let days = 365;
  if (range === 'day') days = 1;
  else if (range === 'week') days = 7;
  else if (range === 'month') days = 30;

  try {
    const latestDate = await getLatestPriceDate();
    if (!latestDate) return res.status(500).json({ error: 'No price data available' });
    const conn = await getConnection();

    const sql = `
      WITH dates AS (
        SELECT DISTINCT date FROM price_history
        WHERE date <= ? AND date >= DATE_SUB(?, INTERVAL ${days} DAY)
      ),
      stock_dates AS (
        SELECT s.ticker, d.date
        FROM stocks s CROSS JOIN dates d
      ),
      shares_cumulative AS (
        SELECT
          sd.ticker,
          sd.date,
          COALESCE(
            SUM(pt.shares) OVER (PARTITION BY pt.ticker ORDER BY pt.tx_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW),
            0
          ) AS cum_shares
        FROM stock_dates sd
        LEFT JOIN portfolio_transactions pt
          ON pt.ticker = sd.ticker AND pt.tx_date <= sd.date
      ),
      stock_ids AS (
        SELECT ticker, stock_id FROM stocks
      ),
      prices AS (
        SELECT stock_id, date, close
        FROM price_history
        WHERE date <= ? AND date >= DATE_SUB(?, INTERVAL ${days} DAY)
      )
      SELECT
        sc.date,
        SUM(sc.cum_shares * p.close) AS portfolio_value
      FROM shares_cumulative sc
      JOIN stock_ids si ON si.ticker = sc.ticker
      JOIN prices p ON p.stock_id = si.stock_id AND p.date = sc.date
      GROUP BY sc.date
      ORDER BY sc.date ASC;
    `;

    const [rows] = await conn.execute(sql, [latestDate, latestDate, latestDate, latestDate]);
    await conn.end();

    res.json({
      dates: rows.map(r => (typeof r.date === 'string' ? r.date : r.date.toISOString().slice(0, 10))),
      values: rows.map(r => Number(r.portfolio_value) || 0)
    });
  } catch (err) {
    console.error('Error in /api/portfolio/history:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Current Portfolio Holdings
app.get('/api/portfolio', async (req, res) => {
  try {
    const conn = await getConnection();

    const sql = `
      SELECT
        t.ticker,
        s.company_name,
        s.sector,
        CAST(SUM(t.shares) AS DECIMAL(18, 3)) AS shares,
        COALESCE(
          ROUND(
            SUM(CASE WHEN t.shares > 0 THEN t.shares * t.price ELSE 0 END)
            / NULLIF(SUM(CASE WHEN t.shares > 0 THEN t.shares ELSE 0 END), 0)
          , 2), 0) AS avg_price
      FROM portfolio_transactions t
      JOIN stocks s ON s.ticker = t.ticker
      GROUP BY t.ticker
      HAVING shares != 0
      ORDER BY s.company_name;
    `;

    const [rows] = await conn.execute(sql);
    await conn.end();

    res.json(rows);
  } catch (err) {
    console.error('Error in /api/portfolio:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// All Tickers
app.get('/api/tickers', async (req, res) => {
  try {
    const conn = await getConnection();
    const [rows] = await conn.execute('SELECT ticker, company_name FROM stocks ORDER BY ticker');
    await conn.end();
    res.json(rows);
  } catch (err) {
    console.error('Error in /api/tickers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sector Allocation
app.get('/api/sector-allocation', async (req, res) => {
  try {
    const latestDate = await getLatestPriceDate();
    if (!latestDate) return res.status(500).json({ error: "Price data not available" });
    const conn = await getConnection();
    const sql = `
      SELECT s.sector, SUM(ph.close * p.shares) AS sector_value
      FROM portfolio_transactions p
      JOIN stocks s ON s.ticker = p.ticker
      JOIN price_history ph ON ph.stock_id = s.stock_id
      WHERE ph.date = ?
      GROUP BY s.sector
      ORDER BY sector_value DESC
    `;
    const [rows] = await conn.execute(sql, [latestDate]);
    await conn.end();
    res.json(rows);
  } catch (err) {
    console.error('Error in /api/sector-allocation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stocks by Sector
app.get('/api/sector-stocks/:sector', async (req, res) => {
  const { sector } = req.params;
  try {
    const conn = await getConnection();
    const sql = `
      SELECT s.ticker, s.company_name, SUM(p.shares) AS shares
      FROM portfolio_transactions p
      JOIN stocks s ON s.ticker = p.ticker
      WHERE s.sector = ?
      GROUP BY s.ticker, s.company_name
      HAVING shares > 0
      ORDER BY shares DESC
    `;
    const [rows] = await conn.execute(sql, [sector]);
    await conn.end();
    res.json(rows);
  } catch (err) {
    console.error('Error in /api/sector-stocks:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Latest Price
app.get('/api/latest-price/:ticker', async (req, res) => {
  const { ticker } = req.params;
  try {
    const conn = await getConnection();
    const [stockRows] = await conn.execute(
      "SELECT stock_id FROM stocks WHERE ticker = ? LIMIT 1", [ticker]
    );
    if (stockRows.length === 0) {
      await conn.end();
      return res.status(404).json({ error: "Ticker not found" });
    }
    const stock_id = stockRows[0].stock_id;

    const [priceRows] = await conn.execute(
      `SELECT close FROM price_history WHERE stock_id = ? ORDER BY date DESC LIMIT 1`, [stock_id]
    );
    await conn.end();

    if (priceRows.length === 0) {
      return res.status(404).json({ error: "No price data found" });
    }
    res.json({ close: priceRows[0].close });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// Watchlist APIs (GET, POST, DELETE, Search)
app.get('/api/watchlist', async (req, res) => {
  try {
    const conn = await getConnection();

    const [watchlistRows] = await conn.execute('SELECT ticker FROM watchlist');
    if (watchlistRows.length === 0) {
      await conn.end();
      return res.json([]);
    }
    const tickers = watchlistRows.map(r => r.ticker);
    const placeholders = tickers.map(() => '?').join(',');
    const [stockRows] = await conn.execute(
      `SELECT ticker, stock_id FROM stocks WHERE ticker IN (${placeholders})`,
      tickers
    );
    if (stockRows.length === 0) {
      await conn.end();
      return res.json([]);
    }

    const latestDate = await getLatestPriceDate();
    if (!latestDate) {
      await conn.end();
      return res.json([]);
    }

    const weekAgo = new Date(new Date(latestDate).getTime() - 7 * 24 * 3600000);
    const monthAgo = new Date(new Date(latestDate).getTime() - 30 * 24 * 3600000);
    const formatDate = (d) => d.toISOString().slice(0, 10);

    const pricesFetchPromises = stockRows.map(async ({ ticker, stock_id }) => {
      const [prices] = await conn.query(
        `SELECT date, close FROM price_history WHERE stock_id = ? AND date <= ? ORDER BY date DESC LIMIT 1`,
        [stock_id, latestDate]
      );
      const latestPrice = prices.length ? prices[0].close : null;

      const [weekPrices] = await conn.query(
        `SELECT date, close FROM price_history WHERE stock_id = ? AND date <= ? ORDER BY date DESC LIMIT 1`,
        [stock_id, formatDate(weekAgo)]
      );
      const weekPrice = weekPrices.length ? weekPrices[0].close : null;

      const [monthPrices] = await conn.query(
        `SELECT date, close FROM price_history WHERE stock_id = ? AND date <= ? ORDER BY date DESC LIMIT 1`,
        [stock_id, formatDate(monthAgo)]
      );
      const monthPrice = monthPrices.length ? monthPrices[0].close : null;

      const calcChange = (start, end) => (start && end) ? ((end - start) / start) * 100 : null;

      return {
        ticker,
        latestPrice,
        weekPrice,
        monthPrice,
        weekChangePercent: calcChange(weekPrice, latestPrice),
        monthChangePercent: calcChange(monthPrice, latestPrice)
      };
    });

    const results = await Promise.all(pricesFetchPromises);
    await conn.end();

    res.json(results);
  } catch (err) {
    console.error('Error in /api/watchlist:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/watchlist', async (req, res) => {
  const { ticker } = req.body;
  if (!ticker) return res.status(400).json({ error: 'ticker is required' });

  try {
    const conn = await getConnection();

    const [stockCheck] = await conn.execute('SELECT ticker FROM stocks WHERE ticker = ? LIMIT 1', [ticker]);
    if (stockCheck.length === 0) {
      await conn.end();
      return res.status(400).json({ error: 'Ticker not found' });
    }

    try {
      await conn.execute('INSERT INTO watchlist (ticker) VALUES (?)', [ticker]);
    } catch (e) {
      // ignore duplicate
    }

    await conn.end();
    res.json({ success: true, ticker });
  } catch (err) {
    console.error('Error in POST /api/watchlist:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/watchlist/:ticker', async (req, res) => {
  const ticker = req.params.ticker;
  try {
    const conn = await getConnection();
    await conn.execute('DELETE FROM watchlist WHERE ticker = ?', [ticker]);
    await conn.end();
    res.json({ success: true, ticker });
  } catch (err) {
    console.error('Error in DELETE /api/watchlist:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/tickers/search', async (req, res) => {
  try {
    const search = req.query.q || '';
    const conn = await getConnection();
    const [rows] = await conn.execute(
      `SELECT ticker, company_name FROM stocks
       WHERE ticker LIKE ? OR company_name LIKE ?
       ORDER BY ticker LIMIT 20`,
      [`%${search}%`, `%${search}%`]
    );
    await conn.end();
    res.json(rows);
  } catch (err) {
    console.error('Error in /api/tickers/search:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Portfolio Buy
app.post('/api/portfolio/buy', async (req, res) => {
  const { ticker, shares, price } = req.body;
  if (!ticker || !shares || shares <= 0) return res.status(400).json({ error: 'Invalid ticker or number of shares' });

  try {
    const conn = await getConnection();

    const [stockRows] = await conn.execute(
      'SELECT stock_id FROM stocks WHERE ticker = ? LIMIT 1',
      [ticker]
    );
    if (stockRows.length === 0) {
      await conn.end();
      return res.status(400).json({ error: 'Ticker not found' });
    }
    const stock_id = stockRows[0].stock_id;

    let sharePrice = price;
    if (!sharePrice) {
      const [priceRows] = await conn.execute(
        'SELECT close FROM price_history WHERE stock_id = ? ORDER BY date DESC LIMIT 1',
        [stock_id]
      );
      if (priceRows.length === 0) {
        await conn.end();
        return res.status(400).json({ error: 'Price data not found for ticker' });
      }
      sharePrice = priceRows[0].close;
    }

    await conn.execute(
      'INSERT INTO portfolio_transactions (ticker, shares, price, tx_date) VALUES (?, ?, ?, NOW())',
      [ticker, shares, sharePrice]
    );
    await conn.end();

    res.json({ success: true, ticker, shares, price: sharePrice });
  } catch (err) {
    console.error('Error in /api/portfolio/buy:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Portfolio Sell
app.post('/api/portfolio/sell', async (req, res) => {
  const { ticker, shares, price } = req.body;
  if (!ticker || !shares || shares <= 0) return res.status(400).json({ error: 'Invalid ticker or number of shares' });

  try {
    const conn = await getConnection();

    const [holdings] = await conn.execute(
      'SELECT CAST(SUM(shares) AS DECIMAL(18, 3)) AS total_shares FROM portfolio_transactions WHERE ticker = ?',
      [ticker]
    );

    const totalShares = holdings[0].total_shares || 0;
    if (shares > totalShares) {
      await conn.end();
      return res.status(400).json({ error: `You only have ${totalShares} shares to sell` });
    }

    const [stockRows] = await conn.execute(
      'SELECT stock_id FROM stocks WHERE ticker = ? LIMIT 1',
      [ticker]
    );
    if (stockRows.length === 0) {
      await conn.end();
      return res.status(400).json({ error: 'Ticker not found' });
    }
    const stock_id = stockRows[0].stock_id;

    let sharePrice = price;
    if (!sharePrice) {
      const [priceRows] = await conn.execute(
        'SELECT close FROM price_history WHERE stock_id = ? ORDER BY date DESC LIMIT 1',
        [stock_id]
      );
      if (priceRows.length === 0) {
        await conn.end();
        return res.status(400).json({ error: 'Price data not found for ticker' });
      }
      sharePrice = priceRows[0].close;
    }

    await conn.execute(
      'INSERT INTO portfolio_transactions (ticker, shares, price, tx_date) VALUES (?, ?, ?, NOW())',
      [ticker, -shares, sharePrice]
    );
    await conn.end();

    res.json({ success: true, ticker, shares, price: sharePrice });
  } catch (err) {
    console.error('Error in /api/portfolio/sell:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Major Stocks News Proxy (Finnhub.io key required)
const FINNHUB_API_KEY = 'd2a2991r01qvhsfvp2h0d2a2991r01qvhsfvp2hg';

app.get('/api/major-news', async (req, res) => {
  try {
    // Accept ticker query param, default to 'AAPL'
    const symbol = req.query.ticker || 'AAPL';

    // Calculate date range: past 7 days
    const today = new Date();
    const toDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - 7);
    const fromDate = pastDate.toISOString().split('T')[0];

    // Fetch from Finnhub API
    const response = await axios.get(`https://finnhub.io/api/v1/company-news`, {
      params: {
        symbol,
        from: fromDate,
        to: toDate,
        token: FINNHUB_API_KEY
      }
    });

    // Optionally, filter or map to reduce fields before sending to frontend
    const newsItems = Array.isArray(response.data) ? response.data.map(item => ({
      datetime: item.datetime,
      headline: item.headline,
      source: item.source,
      url: item.url,
      summary: item.summary
    })) : [];

    res.json(newsItems);

  } catch (error) {
    console.error('Error fetching news:', error && error.response ? error.response.data : error.message || error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});


// Transactions with pagination - corrected by embedding limit & offset in SQL string directly
app.get('/api/transactions', async (req, res) => {
  try {
    const conn = await getConnection();

    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100;

    const offset = (page - 1) * limit;

    const [countRows] = await conn.execute(`SELECT COUNT(*) AS totalCount FROM portfolio_transactions`);
    const totalCount = countRows[0].totalCount;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    const sql = `
      SELECT id, ticker, shares, price, action, tx_date
      FROM portfolio_transactions
      ORDER BY tx_date DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [rows] = await conn.execute(sql);
    await conn.end();

    res.json({
      transactions: rows,
      page,
      totalPages,
      totalCount
    });
  } catch (err) {
    console.error('Error in /api/transactions:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/invested', async (req, res) => {
  const ticker = req.query.ticker;
  if (!ticker) return res.status(400).json({ error: 'Ticker is required' });

  try {
    const conn = await getConnection();
    const [rows] = await conn.execute(
      `SELECT SUM(shares * price) AS invested
       FROM portfolio_transactions
       WHERE ticker = ? AND shares > 0`, // Only buys
      [ticker]
    );
    await conn.end();
    const invested = rows[0].invested || 0;
    res.json({ invested });
  } catch (err) {
    console.error('Error in /api/invested:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Returns total invested amount (sum of buys: shares*price) from portfolio_transactions
app.get('/api/portfolio/total-invested', async (req, res) => {
  try {
    const conn = await getConnection();
    const [rows] = await conn.execute(`
      SELECT IFNULL(SUM(shares * price), 0) AS totalInvested
      FROM portfolio_transactions
      WHERE shares > 0
    `);
    await conn.end();
    res.json({ totalInvested: Number(rows[0].totalInvested) });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Add this route near your other page-serving routes
app.get('/transactions', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'transactions.html'));
});

// Serve frontend pages
app.get('/watchlist', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'watchlist.html'));
});

app.get('/portfolio/manage', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'portfolio_manage.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
