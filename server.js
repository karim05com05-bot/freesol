const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// BASE DE DONNÉES SIMPLE (en mémoire)
let transactionsDB = [];
let globalStats = {
    totalUsers: 0,
    totalSOL: 0,
    totalTokens: 0
};

// ===== ROUTES =====

// 1. Route santé
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'FreeSol Backend Running' });
});

// 2. Stats GLOBALES (avec vraies données)
app.get('/api/global-stats', (req, res) => {
    res.json({
        success: true,
        stats: globalStats
    });
});

// 3. Transactions GLOBALES
app.get('/api/global-transactions', (req, res) => {
    res.json({
        success: true,
        transactions: transactionsDB.slice(0, 20) // 20 dernières
    });
});

// 4. AJOUTER une transaction RÉELLE (QUAND UN UTILISATEUR RÉCUPÈRE DES SOL)
app.post('/api/transactions/add', (req, res) => {
    const { txId, userReceived, userWallet } = req.body;
    
    if (!txId || !userReceived || !userWallet) {
        return res.json({ success: false, error: 'Données manquantes' });
    }
    
    // 1. Ajoute à la base de données
    transactionsDB.unshift({
        txId,
        userReceived: Number(userReceived),
        userWallet: userWallet.substring(0, 8) + '...',
        timestamp: new Date().toISOString()
    });
    
    // 2. Met à jour les STATS
    globalStats.totalSOL += Number(userReceived);
    globalStats.totalTokens += 1;
    
    // 3. Compte les utilisateurs UNIQUES
    const uniqueWallets = new Set(transactionsDB.map(tx => tx.userWallet));
    globalStats.totalUsers = uniqueWallets.size;
    
    console.log('✅ Transaction ajoutée :', {
        sol: userReceived,
        wallet: userWallet.substring(0, 8) + '...',
        totalSOL: globalStats.totalSOL.toFixed(3)
    });
    
    res.json({ 
        success: true, 
        message: 'Transaction enregistrée',
        stats: globalStats
    });
});

// 5. Scan tokens (mock - pour l'instant)
app.post('/api/tokens/scan', (req, res) => {
    res.json({ success: true, tokens: [] });
});

// 6. Vérification transaction (mock)
app.post('/api/transactions/verify', (req, res) => {
    res.json({ success: true, verified: true });
});

// Port d'écoute
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ FreeSol Backend running on port ${PORT}`);
    console.log(`📊 Stats initiales: ${globalStats.totalUsers} users, ${globalStats.totalSOL} SOL, ${globalStats.totalTokens} tokens`);
});
