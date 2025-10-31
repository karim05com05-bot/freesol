const axios = require('axios');
const { Connection, PublicKey } = require('@solana/web3.js');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Modèle Transaction
const transactionSchema = new mongoose.Schema({
  txId: { type: String, required: true, unique: true },
  userReceived: { type: Number, required: true },
  userWallet: { type: String, required: true },
  bossReceived: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// Route santé
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'FreeSol Backend PRO - SCAN RÉEL ACTIVÉ',
    timestamp: new Date().toISOString(),
    network: 'mainnet-beta',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Route pour récupérer les transactions globales
app.get('/api/transactions/global', async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .sort({ timestamp: -1 })
      .limit(10);
    
    res.json({ success: true, transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.json({ success: false, transactions: [] });
  }
});

// Route pour ajouter une transaction
app.post('/api/transactions/add', async (req, res) => {
  try {
    const { txId, userReceived, userWallet, bossReceived } = req.body;
    
    // Éviter les doublons
    const existingTx = await Transaction.findOne({ txId });
    if (existingTx) {
      return res.json({ success: true });
    }
    
    const newTransaction = new Transaction({
      txId,
      userReceived,
      userWallet,
      bossReceived,
      timestamp: new Date()
    });
    
    await newTransaction.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving transaction:', error);
    res.json({ success: false });
  }
});

// Route pour les stats globales
app.get('/api/global-stats', async (req, res) => {
  try {
    const totalUsers = await Transaction.distinct('userWallet').countDocuments();
    const totalSOLResult = await Transaction.aggregate([
      { $group: { _id: null, total: { $sum: '$userReceived' } } }
    ]);
    const totalTokens = await Transaction.countDocuments();
    
    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers || 0,
        totalSOL: totalSOLResult[0]?.total || 0,
        totalTokens: totalTokens || 0
      }
    });
  } catch (error) {
    console.error('Error fetching global stats:', error);
    res.json({ 
      success: false, 
      stats: { totalUsers: 0, totalSOL: 0, totalTokens: 0 } 
    });
  }
});

// Routes existantes (scan tokens, verify tx)
app.post('/api/tokens/scan', async (req, res) => {
    try {
        const walletAddress = req.headers['wallet-address'] || req.body.walletAddress;
        
        if (!walletAddress) {
            return res.json({ 
                success: false, 
                error: "Adresse wallet manquante" 
            });
        }

        console.log("🔍 SCAN AVEC SOLSCAN - Wallet:", walletAddress);

        // 1. UTILISER L'API SOLSCAN PUBLIQUE
        const solscanResponse = await axios.get(
            `https://public-api.solscan.io/account/tokens?account=${walletAddress}`,
            {
                headers: {
                    'User-Agent': 'FreeSol/1.0',
                    'Accept': 'application/json'
                },
                timeout: 10000
            }
        );

        console.log("📊 Données Solscan reçues");

        const recoverableTokens = [];
        const RENT_EXEMPT_AMOUNT = 2039280;

        // 2. FILTRER LES TOKENS RÉCUPÉRABLES
        if (solscanResponse.data && solscanResponse.data.data) {
            for (let token of solscanResponse.data.data) {
                try {
                    // Vérifier si le compte existe encore et a de la rent récupérable
                    const connection = new Connection("https://solana-rpc.publicnode.com");
                    const accountInfo = await connection.getAccountInfo(new PublicKey(token.tokenAddress));
                    
                    if (accountInfo) {
                        const rentAmount = (accountInfo.lamports - RENT_EXEMPT_AMOUNT) / 1000000000;
                        
                        // TOKENS AVEC BALANCE 0 MAIS RENT RÉCUPÉRABLE
                        if (token.tokenAmount.uiAmount === 0 && rentAmount > 0.000001) {
                            recoverableTokens.push({
                                account: token.tokenAddress,
                                recoverable: rentAmount,
                                mint: token.tokenSymbol || token.tokenName || "Unknown",
                                type: 'SOLSCAN_ACTIVE_ACCOUNT'
                            });
                            console.log("🎯 TOKEN TROUVÉ:", rentAmount, "SOL");
                        }
                    }
                } catch (e) {
                    console.log("Erreur token:", token.tokenAddress, e.message);
                }
            }
        }

        console.log("✅ SCAN TERMINÉ - Tokens trouvés:", recoverableTokens.length);

        res.json({ 
            success: true, 
            data: recoverableTokens,
            message: `Scan Solscan complet - ${recoverableTokens.length} tokens trouvés`
        });

    } catch (error) {
        console.error('❌ ERREUR SCAN SOLSCAN:', error);
        
        res.json({ 
            success: false, 
            error: error.message,
            data: [] 
        });
    }
});

app.post('/api/transactions/verify', (req, res) => {
  // Ton code de vérification existant
  res.json({ success: true, verified: true });
});

app.listen(PORT, () => {
  console.log(`FreeSol backend running on port ${PORT}`);
});
