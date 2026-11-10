// const express = require('express');
// const bodyParser = require('body-parser');
// const cors = require('cors');
// const path = require('path');
// require('dotenv').config();

// const authRoutes = require('./routes/authRoutes');
// const bookingRoutes = require('./routes/bookingRoutes');

// const app = express();
// const PORT = process.env.PORT || 3000;

// app.use(cors());
// app.use(bodyParser.json());

// // ✅ Сначала API роуты
// app.use('/api', bookingRoutes); // все маршруты бронирования
// app.use('/api', authRoutes);    // маршруты авторизации

// // ✅ Статика
// app.use(express.static('public'));

// // Healthcheck и terms
// app.get('/', (req, res) => res.send('Server is up and running!'));
// app.get('/terms', (req, res) => res.sendFile(path.join(__dirname, 'public', 'terms.html')));

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

























const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path'); // добавь в начало, если ещё не импортировал
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// МАРШРУТ ДЛЯ ВЫБОРА ДОСТУПНОГО СЛОТА
const bookingRoutes = require('./routes/bookingRoutes');
app.use(bookingRoutes);
// app.use('/api', bookingRoutes); // все маршруты бронирования доступны как /api/...
// server.js
app.use('/api', bookingRoutes);


// Подключаем все роуты
app.use('/', authRoutes);
app.use('/api', authRoutes);

// ✅ Healthcheck endpoint для Railway
app.get('/', (req, res) => {
  res.send('Server is up and running!');
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
