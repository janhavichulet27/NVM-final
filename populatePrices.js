const mysql = require('mysql2/promise');
const largeCapTickers = [
    "RELIANCE.NS",
    "HDFCBANK.NS",
    "BHARTIARTL.NS",
    "TCS.NS",
    "ICICIBANK.NS",
    "SBIN.NS",
    "INFY.NS",
    "HINDUNILVR.NS",
    "LICI.NS",
    "BAJFINANCE.NS",
    "ITC.NS",
    "LT.NS",
    "KOTAKBANK.NS",
    "HCLTECH.NS",
    "SUNPHARMA.NS",
    "MARUTI.NS",
    "M&M.NS",
    "ULTRACEMCO.NS",
    "AXISBANK.BO",    // BSE ticker
    "NTPC.NS",
    "BAJAJFINSV.NS",
    "ONGC.NS",
    "HAL.NS",
    "TITAN.NS",
    "ADANIPORTS.NS",
    "ETERNAL.NS",     // Zomato (if this is correct, else use ZOMATO.NS as on Yahoo)
    "BEL.NS",
    "DMART.NS",
    "ADANIENT.NS",
    "POWERGRID.NS",
    "WIPRO.NS",       // Use WIPRO.NS (WIT is for NYSE ADR)
    "JSWSTEEL.NS",
    "TATAMOTORS.NS"
  ];
  const midCapTickers = [
    "SUZLON.NS",            // Suzlon Energy Ltd
    "GETD.NS",              // GE Vernova T&D India Ltd (Now listed as GE T&D, ticker GETD.NS)
    "RADICO.NS",            // Radico Khaitan Ltd
    "WAAREE.NS",            // Waaree Energies Ltd  (Please verify, if not found, company may be unlisted or different ticker)
    "KAYNES.NS",            // Kaynes Technology India Ltd
    "POWERINDIA.NS",        // Hitachi Energy India Ltd (Hitachi ABB Power Grids is 'POWERINDIA.NS')
    "JSL.NS",               // Jindal Stainless Ltd
    "NH.NS",                // Narayana Hrudayalaya Ltd
    "HEROMOTOCO.NS",        // Hero MotoCorp Ltd
    "VISHAL.NS",            // Vishal Mega Mart Ltd (verify ticker, sometimes not listed as 'VISHAL.NS')
    "MOTILALOFS.NS",        // Motilal Oswal Financial Services Ltd
    "DABUR.NS",             // Dabur India Ltd
    "M&MFIN.NS",            // Mahindra & Mahindra Financial Services Ltd
    "COLPAL.NS",            // Colgate-Palmolive (India) Ltd
    "BERGEPAINT.NS",        // Berger Paints India Ltd
    "ASTRAL.NS",            // Astral Ltd
    "UNOMINDA.NS",          // UNO Minda Ltd
    "3MINDIA.NS",           // 3M India Ltd
    "ACC.NS",               // ACC Ltd
    "FORTIS.NS",            // Fortis Healthcare Ltd
    "CUMMINSIND.NS",        // Cummins India Ltd
    "NGEL.NS",              // NTPC Green Energy Ltd (recent spinoff, verify ticker or consider only parent NTPC.NS)
    "MARICO.NS",            // Marico Ltd
    "SCHAEFFLER.NS",        // Schaeffler India Ltd
    "NYKAA.NS",             // FSN E-Commerce Ventures Ltd (popularly known as Nykaa)
    "INDIANB.NS",           // Indian Bank
    "JKCEMENT.NS",          // JK Cement Ltd
    "AUBANK.NS",            // AU Small Finance Bank Ltd
    "BOSCHLTD.NS",          // Bosch Ltd
    "DIXON.NS",             // Dixon Technologies (India) Ltd
    "NHPC.NS",              // NHPC Ltd
    "LINDEINDIA.NS",        // Linde India Ltd
    "360ONE.NS"             // 360 One Wam Ltd
  ];
  const smallCapTickers = [
    "MAXGROW.NS",             // Maxgrow India Ltd
    "JUMBOLC.NS",             // Jumbo Bag Ltd (verify ticker accuracy, sometimes could differ)
    "MACCHARLS.NS",           // Mac Charles (India) Ltd (verify ticker)
    "KIOCL.NS",               // KIOCL Ltd
    "PURPLEENT.NS",           // Purple Entertainment Ltd (verify ticker)
    "SUBAMPAP.NS",            // Subam Papers Ltd
    "HESTERBIO.NS",           // Hester Biosciences Ltd
    "DIGGIMULT.NS",           // Diggi Multitrade Ltd
    "OMNIAXS.NS",             // Omni AxS Software Ltd (verify ticker)
    "GKBOPHTL.NS",            // GKB Ophthalmics Ltd
    "WPIL.NS",                // WPIL Ltd
    "JAYBHARAT.NS",           // Jay Bharat Maruti Ltd
    "SRILAKSAR.NS",           // Sri Lakshmi Saraswathi Textiles (Arni) Ltd (verify ticker)
    "SCAGROTECH.NS",          // SC Agrotech Ltd
    "GALLOPS.NS",             // Gallops Enterprises Ltd
    "ELEGANTFLO.NS",          // Elegant Floriculture & Agrotech (India) Ltd
    "ARFININD.NS",            // Arfin India Ltd
    "INTEGRATEDC.NS",         // Integrated Capital Services Ltd
    "LINKPHARMA.NS",          // Link Pharma Chem Ltd
    "ASHRAMONLINE.NS",        // Ashram Online.Com Ltd
    "WEEKSENT.NS",            // 52 Weeks Entertainment Ltd
    "MUKATPIPES.NS",          // Mukat Pipes Ltd
    "PHOTOQUIP.NS",           // Photoquip (India) Ltd
    "SHIVAMCHEM.NS",          // Shivam Chemicals Ltd
    "SURYOFOOD.NS",           // Suryo Foods & Industries Ltd
    "ANUROOPPKG.NS",          // Anuroop Packaging Ltd
    "SAYAJIHOTEL.NS",         // Sayaji Hotels Ltd
    "NELCAST.NS",             // Nelcast Ltd
    "OBJECTONE.NS",           // ObjectOne Information Systems Ltd
    "FIRSTCUSTO.NS",          // First Custodian Fund (India) Ltd
    "NEILINDIA.NS",           // NEIL Industries Ltd
    "POPULARFND.NS",          // Popular Foundations Ltd
    "DIVYASHAKT.NS",          // Divyashakti Ltd
    "ABHINAVLF.NS"            // Abhinav Leasing & Finance Ltd (verify ticker)
  ];
      

// Example combined stocks array—make sure you include all tickers with category
const stocks = [
  // Large caps
  ...largeCapTickers.map(ticker => ({ ticker, market_cap_category: 'large' })),
  // Mid caps
  ...midCapTickers.map(ticker => ({ ticker, market_cap_category: 'mid' })),
  // Small caps
  ...smallCapTickers.map(ticker => ({ ticker, market_cap_category: 'small' })),
];

async function populateStocks() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'n3u3da!',
    database: 'portfolio_management',
  });

  for (const stock of stocks) {
    try {
      await connection.execute(
        'INSERT IGNORE INTO stocks (ticker, market_cap_category) VALUES (?, ?)',
        [stock.ticker, stock.market_cap_category]
      );
      console.log(`Inserted stock ${stock.ticker}`);
    } catch (err) {
      console.error(`Error inserting ${stock.ticker}:`, err.message);
    }
  }

  await connection.end();
}

populateStocks().catch(console.error);
