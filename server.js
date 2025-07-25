const express = require('express');
const http = require('http');
const path = require('path');

// Create Express app
const app = express();
const server = http.createServer(app);

// Set port from environment variable or default to 3000
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from 'public' directory if it exists
app.use(express.static(path.join(__dirname, 'public')));

// Dashboard route
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>*Bizz Bazzar* Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          h1 { color: #075e54; }
          .stats { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 20px; }
          .stat-card { background: #f0f0f0; padding: 15px; border-radius: 8px; min-width: 200px; }
          .stat-card h2 { margin-top: 0; color: #128c7e; }
        </style>
      </head>
      <body>
        <h1>*Bizz Bazzar* Dashboard</h1>
    <p>Welcome to the *Bizz Bazzar* analytics dashboard.</p>
        
        <div class="stats">
          <div class="stat-card">
            <h2>Sellers</h2>
            <p>Total: <span id="seller-count">Loading...</span></p>
          </div>
          
          <div class="stat-card">
            <h2>Buyers</h2>
            <p>Total: <span id="buyer-count">Loading...</span></p>
          </div>
          
          <div class="stat-card">
            <h2>Connections</h2>
            <p>Total: <span id="connection-count">Loading...</span></p>
          </div>
        </div>
        
        <script>
          // Simple script to fetch stats
          fetch('/api/stats')
            .then(response => response.json())
            .then(data => {
              document.getElementById('seller-count').textContent = data.sellers || 0;
              document.getElementById('buyer-count').textContent = data.buyers || 0;
              document.getElementById('connection-count').textContent = data.connections || 0;
            })
            .catch(err => {
              console.error('Error fetching stats:', err);
            });
        </script>
      </body>
    </html>
  `);
});

// API route for stats
app.get('/api/stats', (req, res) => {
  // This would be connected to actual data in a full implementation
  res.json({
    sellers: 0,
    buyers: 0,
    connections: 0
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { server, app };