const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const Redis = require('ioredis');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const redis = new Redis(process.env.REDIS_URL);

app.use(session({
  store: new RedisStore({ client: redis }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));

function checkOwner(req, res, next) {
  if (req.session && req.session.owner === process.env.OWNER_NUMBER) {
    return next();
  }
  res.redirect('/login');
}

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { number } = req.body;
  if (number === process.env.OWNER_NUMBER) {
    req.session.owner = number;
    return res.redirect('/dashboard');
  }
  res.render('login', { error: 'Unauthorized' });
});

app.get('/dashboard', checkOwner, async (req, res) => {
  try {
    const resp = await axios.get(`${process.env.PTERO_API_URL}/application/servers`, {
      headers: { Authorization: `Bearer ${process.env.PTERO_API_KEY}` }
    });
    const servers = resp.data.data;
    res.render('dashboard', { servers });
  } catch (err) {
    res.render('dashboard', { servers: [], error: 'API Error' });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.use('/static', express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));