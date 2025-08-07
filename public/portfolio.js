let portfolioChart = null, pieChart = null;

// Cash tracking in JS
let cash = 19000 + Math.floor(Math.random() * 10000);
const cashDisplay = document.getElementById('cashValue');
function formatUSD(num) {
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
function updateCashDisplay() {
  if (cashDisplay) cashDisplay.textContent = formatUSD(cash);
}

// Main portfolio value graph
async function loadMainChart(range = "year") {
  document.querySelectorAll("#ranges button").forEach(btn => btn.classList.remove("active"));
  document.querySelector(`#ranges button[data-range="${range}"]`).classList.add("active");
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
}

document.getElementById("ranges").addEventListener("click", e => {
  if (e.target.tagName === "BUTTON") {
    loadMainChart(e.target.dataset.range);
  }
});

// Sidebar left tabs collapsible behavior
document.querySelectorAll("#sidebar .tab-button").forEach(button => {
  button.addEventListener("click", () => {
    const parentTab = button.parentElement;
    const content = parentTab.querySelector(".tab-content");
    const isExpanded = content.classList.contains("expanded");

    document.querySelectorAll("#sidebar .tab .tab-content").forEach(tc => tc.classList.remove("expanded"));
    document.querySelectorAll("#sidebar .tab-button").forEach(tb => tb.classList.remove("active"));

    if (!isExpanded) {
      content.classList.add("expanded");
      button.classList.add("active");
    }
  });
});

// Major Holdings section
async function loadMajorHoldings() {
  const resp = await fetch('/api/portfolio');
  const data = await resp.json();

  let totalInvestment = 0;
  data.forEach(s => {
    const avgPrice = Number(s.avg_price) || 0;
    const shares = Number(s.shares) || 0;
    totalInvestment += avgPrice * shares;
  });

  const investmentEl = document.getElementById('totalInvestment');
  if (investmentEl) investmentEl.textContent = `Total Investment: ${formatUSD(totalInvestment)}`;
  const majorStocksEl = document.getElementById('majorStocks');
  if (majorStocksEl) {
    data.sort((a, b) => (Number(b.shares) || 0) - (Number(a.shares) || 0));
    majorStocksEl.innerHTML = data.slice(0, 10).map(s => `
      <li><b>${s.ticker}</b> &nbsp;${s.company_name}<br>
      <small>Shares: ${(Number(s.shares) || 0).toFixed(2)}</small></li>`
    ).join('');
  }
}

// Watchlist with price and details page
async function loadWatchlist() {
  // Use server-driven watchlist if available, else fall back to demo array
  let watchlistTickers = [];
  try {
    const apiWatchlist = await fetch('/api/watchlist');
    if (apiWatchlist.ok) {
      const watchArr = await apiWatchlist.json();
      watchlistTickers = watchArr.map(s => s.ticker);
    }
  } catch (e) {
    // fallback
    watchlistTickers = ['AAPL', 'MSFT', 'TSLA', 'GOOGL', 'META', 'NVDA', 'JPM', 'AMZN', 'DIS'];
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
}

// Pie chart, now smaller, with subtle 3D shading (uses Chart.js shadow and gradient hacks)
async function loadSectorAllocation() {
  const ctx = document.getElementById('pieChart').getContext('2d');
  const resp = await fetch('/api/sector-allocation');
  const sectors = await resp.json();
  const labels = sectors.map(x => x.sector);
  const data = sectors.map(x => x.sector_value);
  const colors = labels.map((_, i) => {
    // Subtle 3D: radial gradient color stops
    // Fallback to light/dark shade if gradients are not practical
    const h = i * 360 / labels.length;
    return `linear-gradient(120deg, hsl(${h},70%,75%) 60%, hsl(${h},64%,62%) 100%)`;
  });

  // Custom plugin for drop shadow (Chart.js 3+)
  const shadowPlugin = {
    beforeDraw: function(chart) {
      const ctx = chart.ctx;
      ctx.save();
      ctx.shadowColor = "rgba(55,90,155,0.18)";
      ctx.shadowBlur = 13;
    },
    afterDraw: function(chart) {
      chart.ctx.restore();
    }
  };

  if (pieChart) pieChart.destroy();
  pieChart = new Chart(ctx, {
    type: 'pie',
    data: { labels, datasets: [{ data, backgroundColor: colors.map((c,i)=>`hsl(${i*360/labels.length},72%,62%)`) }] },
    options: {
      responsive: false,
      cutout: '0%', // pie (not doughnut)
      plugins: { legend: { display: false }},
      animation: { animateRotate: true, duration: 800 }
    },
    plugins: [shadowPlugin]
  });

  // Clickable legend as before
  const legendEl = document.getElementById('pieLegend');
  legendEl.innerHTML = labels.map((l, i) => `
    <div class="pie-label" data-sector="${l}">
      <span style="background:hsl(${i*360/labels.length},72%,62%)"></span>${l}
    </div>
  `).join('');
  document.querySelectorAll('.pie-label').forEach(el => {
    el.onclick = () => loadSectorStocks(el.dataset.sector);
  });
}

// Drilldown stocks for selected sector (show on right of pie)
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

// Initialization and event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Portfolio Manager button navigates directly
  const portfolioManagerBtn = document.getElementById('portfolioManagerBtn');
  if (portfolioManagerBtn) {
    portfolioManagerBtn.addEventListener('click', () => {
      window.location.href = '/portfolio/manage';
    });
  }

  // Toggle dropdown tabs (except Portfolio Manager)
  document.querySelectorAll('.tab-button').forEach(btn => {
    if (btn.id !== 'portfolioManagerBtn') {
      btn.addEventListener('click', () => {
        const parentTab = btn.parentElement;
        const contentDiv = parentTab.querySelector('.tab-content');

        // Collapse other tab contents
        document.querySelectorAll('.tab-content').forEach(div => {
          if (div !== contentDiv) div.classList.remove('expanded');
        });

        // Toggle current tab content
        contentDiv.classList.toggle('expanded');

        // Manage active states on buttons
        document.querySelectorAll('.tab-button').forEach(tb => tb.classList.remove('active'));
        if (contentDiv.classList.contains('expanded')) {
          btn.classList.add('active');
        }
      });
    }
  });

  // Watchlist tab double-click (optional)
  const sidebarWatchlistTab = document.getElementById('sidebarWatchlistTab');
  if (sidebarWatchlistTab) {
    sidebarWatchlistTab.addEventListener('dblclick', () => {
      window.location.href = '/watchlist';
    });
  }
});
async function loadProfitLossInfo(range) {
  try {
    // Fetch total invested amount
    const investedResp = await fetch('/api/portfolio/total-invested');
    const investedData = investedResp.ok ? await investedResp.json() : { totalInvested: 0 };
    const totalInvested = investedData.totalInvested || 0;

    // Fetch current portfolio value — use portfolio/history API and get last value
    const histResp = await fetch(`/api/portfolio/history?range=${range}`);
    const histData = histResp.ok ? await histResp.json() : { values: [] };
    const currentValue = (histData.values && histData.values.length) ? histData.values[histData.values.length - 1] : 0;

    // Calculate profit/loss
    const profitLoss = currentValue - totalInvested;
    const profitLossPercent = totalInvested ? (profitLoss / totalInvested) * 100 : 0;

    // Update UI elements
    document.getElementById('plTotalInvestment').textContent = formatUSD(totalInvested);
    document.getElementById('plCurrentValue').textContent = formatUSD(currentValue);

    const plElement = document.getElementById('plProfitLoss');
    plElement.textContent = formatUSD(profitLoss);
    plElement.style.color = profitLoss >= 0 ? '#0a74da' : '#f44336'; // blue or red

    const plPercentElement = document.getElementById('plProfitLossPercent');
    plPercentElement.textContent = profitLossPercent.toFixed(2) + '%';
    plPercentElement.style.color = profitLoss >= 0 ? '#0a74da' : '#f44336';

  } catch (err) {
    console.error('Error loading profit/loss info:', err);
    document.getElementById('plTotalInvestment').textContent = 'Error';
    document.getElementById('plCurrentValue').textContent = 'Error';
    document.getElementById('plProfitLoss').textContent = 'Error';
    document.getElementById('plProfitLossPercent').textContent = 'Error';
  }
}

async function loadMainChart(range = "year") {
  document.querySelectorAll("#ranges button").forEach(btn => btn.classList.remove("active"));
  document.querySelector(`#ranges button[data-range="${range}"]`).classList.add("active");

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

  // Load and update profit/loss info bar
  loadProfitLossInfo(range);
}

// Event listener for range selector (already in your code)
document.getElementById("ranges").addEventListener("click", e => {
  if (e.target.tagName === "BUTTON") {
    loadMainChart(e.target.dataset.range);
  }
});

// Format USD helper function (reuse your existing one)
function formatUSD(num) {
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

window.onload = function() {
  updateCashDisplay();
  loadMainChart();
  loadMajorHoldings();
  loadWatchlist();
  loadSectorAllocation();
};
