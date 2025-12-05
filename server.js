const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Route santé
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'FreeSol Backend Running' });
});

// Stats globales
app.get('/api/global-stats', (req, res) => {
    res.json({
        success: true,
        stats: {
            totalUsers: 42,
            totalSOL: 1.234,
            totalTokens: 56
        }
    });
});

// Transactions globales
app.get('/api/global-transactions', (req, res) => {
    res.json({
        success: true,
        transactions: [
            {
                userReceived: 0.0234,
                userWallet: "Hx8a9...f3d2",
                timestamp: new Date().toISOString(),
                txId: "5xampleTXID123456789"
            },
            {
                userReceived: 0.0456,
                userWallet: "Ab3c9...g7h8",
                timestamp: new Date(Date.now() - 86400000).toISOString(),
                txId: "5xampleTXID987654321"
            }
        ]
    });
});

// Ajouter transaction
app.post('/api/transactions/add', (req, res) => {
    console.log('Transaction added:', req.body);
    res.json({ success: true, message: 'Transaction logged' });
});

// Scan tokens (mock)
app.post('/api/tokens/scan', (req, res) => {
    res.json({ success: true, tokens: [] });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ FreeSol Backend running on port ${PORT}`);
});
