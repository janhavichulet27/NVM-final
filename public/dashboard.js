let portfolioChart = null, pieChart = null;

// Format number as USD string
function formatUSD(num) {
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

// Load Major Holdings with total investment and profit/loss display
async function loadMajorHoldings() {
  try {
    const resp = await fetch('/api/portfolio');
    const data = await resp.json();

    let totalInvestment = 0;
    let currentValue = 0;

    data.forEach(s => {
      const avgPrice = Number(s.avg_price) || 0;
      const shares = Number(s.shares) || 0;
      totalInvestment += avgPrice * shares;
      currentValue += avgPrice * shares; // Replace with real-time valuation if available
    });

    const profitLoss = currentValue - totalInvestment;
    const profitLossPercent = totalInvestment ? (profitLoss / totalInvestment) * 100 : 0;

    const investmentEl = document.querySelector('#majorHoldingsSummary .total-investment');
    const profitLossEl = document.getElementById('majorProfitLoss');

    if (investmentEl) investmentEl.textContent = `Total Investment: ${formatUSD(totalInvestment)}`;
    if (profitLossEl) {
      profitLossEl.textContent = `P/L: ${profitLoss >= 0 ? '+' : ''}${formatUSD(profitLoss)} (${profitLossPercent.toFixed(2)}%)`;
      profitLossEl.classList.remove('profit', 'loss');
    }

    const majorStocksEl = document.getElementById('majorStocks');
    if (majorStocksEl) {
      data.sort((a, b) => (Number(b.shares) || 0) - (Number(a.shares) || 0));
      majorStocksEl.innerHTML = data.slice(0, 10).map(s => `
        <li><b>${s.ticker}</b> &nbsp;&mdash;&nbsp; ${s.company_name}<br>
        <small>Shares: ${(Number(s.shares) || 0).toFixed(2)}</small></li>`
      ).join('');
    }
  } catch (err) {
    console.error("Error loading major holdings:", err);
  }
}

// Load the profit/loss info bar above the main graph
async function loadProfitLossInfo(range) {
  try {
    const investedResp = await fetch('/api/portfolio/total-invested');
    const investedData = investedResp.ok ? await investedResp.json() : { totalInvested: 0 };
    const totalInvested = investedData.totalInvested || 0;

    const histResp = await fetch(`/api/portfolio/history?range=${range}`);
    const histData = histResp.ok ? await histResp.json() : { values: [] };
    const currentValue = (histData.values && histData.values.length) ? histData.values[histData.values.length - 1] : 0;

    const profitLoss = currentValue - totalInvested;
    const profitLossPercent = totalInvested ? (profitLoss / totalInvested) * 100 : 0;

    document.getElementById('plTotalInvestment').textContent = formatUSD(totalInvested);
    document.getElementById('plCurrentValue').textContent = formatUSD(currentValue);

    const plElement = document.getElementById('plProfitLoss');
    plElement.textContent = `${profitLoss >= 0 ? '+' : ''}${formatUSD(profitLoss)}`;
    plElement.className = 'profit-loss'; // No color

    const plPercentElement = document.getElementById('plProfitLossPercent');
    plPercentElement.textContent = `${profitLossPercent.toFixed(2)}%`;
    plPercentElement.className = 'profit-loss'; // No color
  } catch (err) {
    console.error('Error loading profit/loss info:', err);
    ['plTotalInvestment', 'plCurrentValue', 'plProfitLoss', 'plProfitLossPercent'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = 'Error';
    });
  }
}

// Load the main portfolio value chart
async function loadMainChart(range = "year") {
  document.querySelectorAll("#ranges button").forEach(btn => btn.classList.remove("active"));
  document.querySelector(`#ranges button[data-range="${range}"]`).classList.add("active");

  try {
    const resp = await fetch(`/api/portfolio/history?range=${range}`);
    const data = await resp.json();

    if (portfolioChart) portfolioChart.destroy();
    portfolioChart = new Chart(document.getElementById('mainChart').getContext('2d'), {
      type: 'line',
      data: {
        labels: data.dates,
        datasets: [{
          label: 'Portfolio Value',
          data: data.values,
          borderColor: '#1976d2',
          fill: true,
          backgroundColor: 'rgba(25,118,210,0.09)',
          pointRadius: 0,
          tension: 0.13
        }]
      },
      options: {
        scales: {
          x: { title: { display: true, text: 'Date' } },
          y: { title: { display: true, text: 'USD' } }
        }
      }
    });

    await loadProfitLossInfo(range);
  } catch (e) {
    document.getElementById('message').textContent = 'Error loading chart data.';
    if (portfolioChart) portfolioChart.destroy();
  }
}

// Load sector allocation pie chart with clear color boxes
async function loadSectorAllocation() {
  const ctx = document.getElementById('pieChart').getContext('2d');
  try {
    const resp = await fetch('/api/sector-allocation');
    const sectors = await resp.json();

    if (!Array.isArray(sectors) || sectors.length === 0) {
      document.getElementById('pieLegend').innerHTML = '<p style="color:#bbb;">No sector allocation data</p>';
      if (pieChart) pieChart.destroy();
      return;
    }

    const labels = sectors.map(x => x.sector);
    const data = sectors.map(x => x.sector_value);

    const colors = labels.map((_, i) => `hsl(${i * 360 / labels.length}, 72%, 58%)`);

    if (pieChart) pieChart.destroy();
    pieChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors
        }]
      },
      options: {
        responsive: false,
        cutout: '0%',
        plugins: { legend: { display: false } },
        animation: { animateRotate: true, duration: 950 }
      }
    });

    const legendEl = document.getElementById('pieLegend');
    legendEl.innerHTML = labels.map((sector, i) =>
      `<div class="pie-label" data-sector="${sector}">
        <span class="color-box" style="background:${colors[i]};"></span>${sector}
      </div>`
    ).join('');

    document.querySelectorAll('.pie-label').forEach(el => {
      el.onclick = () => loadSectorStocks(el.dataset.sector);
    });
  } catch (err) {
    console.error('Error loading sector allocation:', err);
  }
}

// Sector drilldown stocks
function loadSectorStocks(sector) {
  const container = document.getElementById('sectorDetails');
  fetch(`/api/sector-stocks/${encodeURIComponent(sector)}`).then(r => r.json()).then(list => {
    if (!list.length) { container.innerHTML = ''; return; }
    container.innerHTML = `
      <h4>Stocks in sector: ${sector}</h4>
      <table>
        <tr><th>Ticker</th><th>Name</th><th>Shares Held</th></tr>
        ${list.map(stock => `
          <tr>
            <td>${stock.ticker}</td>
            <td>${stock.company_name}</td>
            <td>${Number(stock.shares).toFixed(2)}</td>
          </tr>`).join('')}
      </table>
    `;
  });
}

// Sidebar and UI event handlers
document.addEventListener('DOMContentLoaded', () => {
  // Tab toggling
  document.querySelectorAll('#sidebar .tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const parentTab = btn.parentElement;
      const contentDiv = parentTab.querySelector('.tab-content');
      document.querySelectorAll('#sidebar .tab-content').forEach(div => div.classList.remove('expanded'));
      document.querySelectorAll('#sidebar .tab-button').forEach(tb => tb.classList.remove('active'));
      contentDiv.classList.toggle('expanded');
      if (contentDiv.classList.contains('expanded')) {
        btn.classList.add('active');
      }
    });
  });

  // Portfolio Manager button
  const pmBtn = document.getElementById('portfolioManagerBtn');
  if(pmBtn) pmBtn.addEventListener('click', () => window.location.href = '/portfolio/manage');

  // Watchlist double-click
  const watchlistTab = document.getElementById('sidebarWatchlistTab');
  if (watchlistTab) watchlistTab.addEventListener('dblclick', () => window.location.href = '/watchlist');

  // View All Transactions button
  const viewBtn = document.getElementById('viewTransactionsBtn');
  if(viewBtn) viewBtn.addEventListener('click', () => window.location.href = '/transactions');

  // Load sidebar content
  loadRecentTransactions();
  loadWatchlist();

  // Load major holdings data
  loadMajorHoldings();

  // Load sector allocation
  loadSectorAllocation();

  // Load main portfolio chart default range
  loadMainChart('year');

  // Range buttons handler
  document.getElementById("ranges").addEventListener("click", e => {
    if (e.target.tagName === "BUTTON") {
      loadMainChart(e.target.dataset.range);
    }
  });
});

// Load recent transactions
async function loadRecentTransactions() {
  const ul = document.getElementById('recentTransactionsList');
  if (!ul) return;
  ul.innerHTML = '<li>Loading recent transactions...</li>';
  try {
    const resp = await fetch('/api/transactions?page=1&limit=5');
    const data = await resp.json();
    if (!data.transactions || data.transactions.length === 0) {
      ul.innerHTML = '<li><em>No recent transactions.</em></li>';
      return;
    }
    ul.innerHTML = data.transactions.map(tx => {
      const dateStr = new Date(tx.tx_date).toLocaleDateString();
      const shares = parseFloat(tx.shares).toFixed(3);
      const price = parseFloat(tx.price).toFixed(2);
      return `<li><strong>${tx.ticker}</strong> &times; ${shares} shares<br/><small>${tx.action} @ $${price} on ${dateStr}</small></li>`;
    }).join('');
  } catch {
    ul.innerHTML = '<li><em>Error loading transactions.</em></li>';
  }
}

// Load watchlist
async function loadWatchlist() {
  try {
    const apiWatchlist = await fetch('/api/watchlist');
    let watchlistTickers = [];
    if (apiWatchlist.ok) {
      const watchArr = await apiWatchlist.json();
      watchlistTickers = watchArr.map(s => s.ticker);
    }
    const resp = await fetch('/api/tickers');
    const allStocks = await resp.json();
    const tickerSet = new Set(watchlistTickers);
    const filteredStocks = allStocks.filter(s => tickerSet.has(s.ticker));
    const watchlistEl = document.getElementById('watchlistStocks');
    if (!watchlistEl) return;
    if (!filteredStocks.length) {
      watchlistEl.innerHTML = "<li style='color:#bbb;font-style:italic;'>No stocks in watchlist. <a href='/watchlist' style='color:#0a74da;'>Open full Watchlist</a></li>";
      return;
    }
    watchlistEl.innerHTML = "<li>Loading watchlist prices...</li>";

    const pricesPromises = filteredStocks.slice(0,5).map(async stock => {
      const priceResp = await fetch(`/api/latest-price/${stock.ticker}`);
      if (!priceResp.ok) return {ticker: stock.ticker, company_name: stock.company_name, price: 'N/A'};
      const priceData = await priceResp.json();
      return {
        ticker: stock.ticker,
        company_name: stock.company_name,
        price: priceData.close ? Number(priceData.close).toFixed(2) : 'N/A'
      };
    });
    const stocksWithPrices = await Promise.all(pricesPromises);
    watchlistEl.innerHTML =
      stocksWithPrices.map(s => `
        <li>
          <span style="display:inline-block;width:60px;"><b>${s.ticker}</b></span>
          <span style="color:#bbb;">${s.company_name}</span><br>
          <small style="color:#aaa;">Price: $${s.price}</small>
        </li>
      `).join('') +
      `<li style="text-align:center;margin-top:8px;">
        <a href="/watchlist" style="color:#0a74da;font-weight:bold;">More &raquo;</a>
      </li>`;
  } catch (err) {
    console.error('Error loading watchlist:', err);
  }
}
