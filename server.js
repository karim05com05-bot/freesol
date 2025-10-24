const express = require('express');
const cors = require('cors');
const { Connection, PublicKey } = require('@solana/web3.js');
const NodeCache = require('node-cache');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Cache pour performances
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes

// Configuration Solana
const connection = new Connection('https://api.mainnet-beta.solana.com');
const BOSS_WALLET = new PublicKey("AG7cszvmbcxpVAB5p9XAasgSArcsum7Z9wBpqt8Eu2Fg");

// ===== ROUTES =====

// Santé du serveur
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'FreeSol Backend Online',
    timestamp: new Date().toISOString()
  });
});

// Scan des tokens avec cache
app.post('/api/tokens/scan', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Adresse wallet requise' });
    }

    // Vérifier le cache
    const cacheKey = `tokens_${walletAddress}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    // Scan réel des tokens
    const tokens = await scanTokenAccounts(walletAddress);
    
    // Mettre en cache
    cache.set(cacheKey, tokens, 60); // 1 minute
    
    res.json({
      success: true,
      data: tokens,
      cached: false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erreur scan:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors du scan' 
    });
  }
});

// Vérification de transaction
app.post('/api/transactions/verify', async (req, res) => {
  try {
    const { signature, expectedAmount } = req.body;
    
    if (!signature) {
      return res.status(400).json({ error: 'Signature requise' });
    }

    const verification = await verifyTransaction(signature, expectedAmount);
    
    if (verification.success) {
      res.json({
        success: true,
        data: verification,
        message: 'Transaction vérifiée'
      });
    } else {
      res.status(400).json({
        success: false,
        error: verification.error
      });
    }

  } catch (error) {
    console.error('Erreur vérification:', error);
    res.status(500).json({ error: 'Erreur de vérification' });
  }
});

// Statistiques globales
app.get('/api/stats', async (req, res) => {
  try {
    // Ici tu pourras connecter une base de données plus tard
    const stats = {
      totalUsers: 0,
      totalSOL: 0,
      totalTokens: 0,
      timestamp: new Date().toISOString()
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ error: 'Erreur statistiques' });
  }
});

// ===== FONCTIONS SOLANA =====

async function scanTokenAccounts(walletAddress) {
  try {
    const publicKey = new PublicKey(walletAddress);
    const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    });

    const recoverableTokens = [];
    const RENT_EXEMPT_AMOUNT = 2039280;

    for (let account of tokenAccounts.value) {
      try {
        const accountInfo = await connection.getAccountInfo(account.pubkey);
        const accountData = await connection.getTokenAccountBalance(account.pubkey);
        
        if (accountData.value.uiAmount === 0 && accountInfo.lamports > RENT_EXEMPT_AMOUNT) {
          const rentAmount = (accountInfo.lamports - RENT_EXEMPT_AMOUNT) / 1000000000;
          
          if (rentAmount > 0.00001) {
            const mint = await getTokenMint(account.pubkey);
            recoverableTokens.push({
              account: account.pubkey.toString(),
              recoverable: rentAmount,
              mint: mint,
              type: 'TOKEN_ACCOUNT_RENT'
            });
          }
        }
      } catch (e) {
        console.log('Erreur account:', e);
      }
    }

    return recoverableTokens;
  } catch (error) {
    throw error;
  }
}

async function getTokenMint(tokenAccount) {
  try {
    const accountInfo = await connection.getAccountInfo(new PublicKey(tokenAccount));
    if (accountInfo && accountInfo.data) {
      const mint = new PublicKey(accountInfo.data.slice(0, 32));
      return mint.toString();
    }
  } catch (e) {
    return 'Inconnu';
  }
  return 'Inconnu';
}

async function verifyTransaction(signature, expectedAmount) {
  try {
    const tx = await connection.getTransaction(signature, {
      commitment: 'confirmed'
    });

    if (!tx) {
      return { success: false, error: 'Transaction non trouvée' };
    }

    if (tx.meta.err) {
      return { success: false, error: 'Transaction échouée' };
    }

    // Vérifier les transferts
    let bossReceived = 0;
    tx.transaction.message.instructions.forEach(instruction => {
      if (instruction.programId.equals(PublicKey.default)) {
        if (instruction.parsed && instruction.parsed.type === 'transfer') {
          const to = new PublicKey(instruction.parsed.info.destination);
          if (to.equals(BOSS_WALLET)) {
            bossReceived = instruction.parsed.info.lamports / 1000000000;
          }
        }
      }
    });

    if (bossReceived > 0) {
      return {
        success: true,
        signature,
        amount: bossReceived,
        timestamp: new Date(tx.blockTime * 1000)
      };
    } else {
      return { success: false, error: 'Transfert BOSS non détecté' };
    }

  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 FreeSol Backend running on port ${PORT}`);
});
