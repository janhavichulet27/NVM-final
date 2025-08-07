const mysql = require('mysql2/promise');

const failedStocks = [
  "BHARTIARTL.NS",
  "ETERNAL.NS",
  "WAAREE.NS",
  "VISHAL.NS",
  "MOTILALOFS.NS",
  "DIGGIMULT.NS",
  "DIVYASHAKT.NS",
  "ELEGANTFLO.NS",
  "FIRSTCUSTO.NS",
  "GALLOPS.NS",
  "GETD.NS",
  "GKBOPHTL.NS",
  "HEROMOTOCO.NS",
  "HINDUNILVR.NS",
  "INTEGRATEDC.NS",
  "JAYBHARAT.NS",
  "JUMBOLC.NS",
  "LINDEINDIA.NS",
  "LINKPHARMA.NS",
  "MACCHARLS.NS",
  "MAXGROW.NS",
  "MUKATPIPES.NS",
  "NEILINDIA.NS",
  "NGEL.NS",
  "OBJECTONE.NS",
  "OMNIAXS.NS",
  "PHOTOQUIP.NS",
  "POPULARFND.NS",
  "POWERINDIA.NS",
  "PURPLEENT.NS",
  "SAYAJIHOTEL.NS",
  "SCAGROTECH.NS",
  "SCHAEFFLER.NS",
  "SHIVAMCHEM.NS",
  "SRILAKSAR.NS",
  "SUBAMPAP.NS",
  "SURYOFOOD.NS",
  "WEEKSENT.NS",
  "WPIL.NS"
];

async function deleteFailedStocksAndRelatedHistory() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root', // change to your username
    password: 'n3u3da!', // change to your password
    database: 'portfolio_management'
  });

  try {
    // Step 1: Get stock_ids for tickers to delete
    const placeholders = failedStocks.map(() => '?').join(',');
    const [stocksToDelete] = await connection.execute(
      `SELECT stock_id FROM stocks WHERE ticker IN (${placeholders})`,
      failedStocks
    );

    if (stocksToDelete.length === 0) {
      console.log('No stocks found to delete.');
      return;
    }

    const stockIds = stocksToDelete.map(r => r.stock_id);

    // Step 2: Delete price_history rows referencing these stocks
    const stockIdPlaceholders = stockIds.map(() => '?').join(',');
    const [delPriceHist] = await connection.execute(
      `DELETE FROM price_history WHERE stock_id IN (${stockIdPlaceholders})`,
      stockIds
    );
    console.log(`Deleted ${delPriceHist.affectedRows} rows from price_history.`);

    // Step 3: Now delete the stocks
    const [delStocks] = await connection.execute(
      `DELETE FROM stocks WHERE stock_id IN (${stockIdPlaceholders})`,
      stockIds
    );
    console.log(`Deleted ${delStocks.affectedRows} rows from stocks.`);

  } catch (err) {
    console.error('Error deleting failed stocks and related data:', err);
  } finally {
    await connection.end();
  }
}

deleteFailedStocksAndRelatedHistory().catch(console.error);