const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Data paths
const USERS_PATH = path.join(__dirname, 'data', 'users.json');
const PLAYERS_PATH = path.join(__dirname, 'data', 'players.json');

// Helpers
function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const users = readJSON(USERS_PATH).users;
  const user = users.find(u => u.username === username);

  if (!user) return res.status(401).send('Invalid credentials');

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).send('Invalid credentials');

  req.session.user = { username: user.username, role: user.role };
  res.redirect('/');
});

app.get('/admin', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/login');
  }
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.post('/admin/update', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).send('Forbidden');
  }

  const { username, tier } = req.body;
  const players = readJSON(PLAYERS_PATH);

  const p = players.find(pl => pl.username === username);
  if (p) {
    p.tier = tier;
    fs.writeFileSync(PLAYERS_PATH, JSON.stringify(players, null, 2));
  }

  res.redirect('/admin');
});

app.get('/api/players', (req, res) => {
  res.json(readJSON(PLAYERS_PATH));
});

// START SERVER (THIS IS WHY RAILWAY WAS OFFLINE)
app.listen(PORT, () => {
  console.log(`SkillfulTiers running on port ${PORT}`);
});
