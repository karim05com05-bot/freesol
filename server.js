const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'FreeSol Backend' });
});

app.post('/api/tokens/scan', (req, res) => {
  res.json({ success: true, data: [], message: 'Backend ready' });
});

app.post('/api/transactions/verify', (req, res) => {
  res.json({ success: true, message: 'Verified' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 FreeSol Backend running on port ' + PORT);
});
