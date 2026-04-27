const express = require('express');
const cors = require('cors');
const imsRoutes = require('./routes/ims');

const app = express();
const PORT = process.env.PORT || 7000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/ims', imsRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'IMS Backend is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

