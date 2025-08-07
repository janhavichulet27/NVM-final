document.addEventListener('DOMContentLoaded', () => {
    const tradeForm = document.getElementById('tradeForm');
    const tradeMessage = document.getElementById('tradeMessage');
  
    tradeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      tradeMessage.textContent = '';
  
      const ticker = tradeForm.tradeTicker.value.trim().toUpperCase();
      const shares = parseInt(tradeForm.tradeShares.value, 10);
      const action = tradeForm.tradeAction.value;
  
      if (!ticker || shares <= 0) {
        tradeMessage.textContent = 'Please enter a valid ticker and positive shares.';
        return;
      }
  
      try {
        // Example API call, adjust the endpoint and method as per your backend
        const response = await fetch(`/api/portfolio/${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker, shares }),
        });
  
        if (response.ok) {
          tradeMessage.style.color = '#4caf50';
          tradeMessage.textContent = `${action === 'buy' ? 'Bought' : 'Sold'} ${shares} shares of ${ticker} successfully.`;
          tradeForm.reset();
          // Optionally refresh holdings data here
        } else {
          const errorData = await response.json();
          tradeMessage.style.color = '#ff6b6b';
          tradeMessage.textContent = `Failed: ${errorData.message || 'Unknown error'}`;
        }
      } catch (err) {
        tradeMessage.style.color = '#ff6b6b';
        tradeMessage.textContent = `Error: ${err.message}`;
      }
    });
  
    // Load holdings and news - you should implement according to your backend
    // Example placeholders:
    // loadHoldings();
    // loadStockNews();
  
  });
  