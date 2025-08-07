const ctx = document.getElementById('priceChart').getContext('2d');
let chart = null;

async function fetchAndDraw(ticker, range) {
  document.getElementById('message').innerText = '';
  try {
    // Fetch price history data
    const res = await fetch(`/api/prices/${ticker}?range=${range}`);
    if (!res.ok) {
      document.getElementById('message').innerText = `No data for ${ticker}`;
      if (chart) chart.destroy();
      return;
    }
    const data = await res.json();
    if (!data.labels.length) {
      document.getElementById('message').innerText = `No data for this ticker/range.`;
      if (chart) chart.destroy();
      return;
    }

    // Fetch total invested amount from backend API (sum of buy transactions)
    let invested = 0;
    try {
      const investResp = await fetch(`/api/invested?ticker=${ticker}`);
      if (investResp.ok) {
        const investData = await investResp.json();
        invested = investData.invested || 0;
      }
    } catch (e) {
      // Ignore error, invested stays 0
      console.error('Error fetching invested amount:', e);
    }

    // Fetch current shares held from portfolio API
    let currentShares = 0;
    try {
      const portResp = await fetch('/api/portfolio');
      if (portResp.ok) {
        const portfolioData = await portResp.json();
        const stock = portfolioData.find(s => s.ticker === ticker);
        if (stock) currentShares = parseFloat(stock.shares) || 0;
      }
    } catch (e) {
      console.error('Error fetching portfolio data:', e);
    }

    // Calculate current value = last closing price * current shares
    const lastClosePrice = data.closes[data.closes.length - 1];
    const currentValue = lastClosePrice * currentShares;

    // Destroy previous chart instance if exists
    if (chart) chart.destroy();

    // Define Chart.js custom plugin to display profit/loss info on chart
    const profitLossPlugin = {
      id: 'profitLossPlugin',
      afterDraw(chartInstance) {
        if (invested === 0) return; // no invested data to show

        const { ctx, chartArea: { top, left } } = chartInstance;
        ctx.save();

        const profitLoss = currentValue - invested;
        const profitLossPercent = invested ? (profitLoss / invested) * 100 : 0;

        ctx.fillStyle = profitLoss >= 0 ? '#1976d2' : '#d32f2f'; // blue if profit, red if loss
        ctx.font = 'bold 14px Segoe UI, Tahoma, Geneva, Verdana, sans-serif';

        const xPos = left + 10;
        const yPos = top + 20;

        ctx.fillText(`Invested: $${invested.toFixed(2)}`, xPos, yPos);
        ctx.fillText(`P/L: $${profitLoss.toFixed(2)} (${profitLossPercent.toFixed(2)}%)`, xPos, yPos + 20);

        ctx.restore();
      }
    };

    // Create new Chart.js instance with profit/loss plugin
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: `Close (${data.ticker})`,
          data: data.closes,
          borderColor: '#1976d2',
          fill: true,
          backgroundColor: 'rgba(25, 118, 210, 0.10)',
          pointRadius: 1.7,
        }]
      },
      options: {
        responsive: false,
        scales: {
          x: { title: { display: true, text: 'Date' } },
          y: { title: { display: true, text: 'Close Price (USD)' } }
        }
      },
      plugins: [profitLossPlugin]
    });

  } catch (err) {
    document.getElementById('message').innerText = 'Error: ' + err.message;
    if (chart) chart.destroy();
  }
}

// Button click handler for range selection
document.getElementById('controlForm').addEventListener('click', function(e) {
  if (e.target.tagName === "BUTTON") {
    e.preventDefault();
    const ticker = document.getElementById('ticker').value.trim().toUpperCase();
    const range = e.target.getAttribute('data-range');
    fetchAndDraw(ticker, range);
  }
});

window.onload = async () => {
  // Load tickers for datalist autocomplete
  const datalist = document.getElementById('tickerlist');
  const resp = await fetch('/api/tickers');
  if (resp.ok) {
    const tickers = await resp.json();
    tickers.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.ticker;
      opt.label = v.company_name || v.ticker;
      datalist.append(opt);
    });
  }
  // Initial chart load for AAPL and 1 year range
  fetchAndDraw('AAPL', 'year');
};
