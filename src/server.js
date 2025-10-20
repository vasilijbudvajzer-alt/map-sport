const express = require('express');
const path = require('path');
const cors = require('cors');
const { fetchRunningEvents } = require('./parser');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/events', async (req, res) => {
  try {
    const events = await fetchRunningEvents();
    res.json(events);
  } catch (error) {
    console.error('Ошибка сервера:', error);
    res.status(500).json({ error: 'Не удалось загрузить события' });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});