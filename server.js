
const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'skillfultiers_secret_change_me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true }
}));

app.use(express.static(path.join(__dirname, 'public')));

const usersPath = path.join(__dirname, 'data', 'users.json');
const playersPath = path.join(__dirname, 'data', 'players.json');

function load(p){ return JSON.parse(fs.readFileSync(p)); }

function requireAdmin(req,res,next){
  if(req.session.user && req.session.user.role === 'admin') return next();
  res.redirect('/login');
}

app.get('/', (req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.get('/login',(req,res)=>res.sendFile(path.join(__dirname,'public','login.html')));

app.post('/login', async (req,res)=>{
  const { username, password } = req.body;
  const data = load(usersPath);
  const user = data.users.find(u=>u.username===username);
  if(!user) return res.send('Invalid credentials');
  const ok = await bcrypt.compare(password, user.password_hash);
  if(!ok) return res.send('Invalid credentials');
  req.session.user = { username:user.username, role:user.role };
  res.redirect('/');
});

app.post('/logout',(req,res)=>req.session.destroy(()=>res.redirect('/')));

app.get('/admin', requireAdmin, (req,res)=>{
  res.sendFile(path.join(__dirname,'public','admin.html'));
});

app.post('/admin/update', requireAdmin, (req,res)=>{
  const { username, tier } = req.body;
  const players = load(playersPath);
  const p = players.find(x=>x.username===username);
  if(p){
    p.tier = tier;
    fs.writeFileSync(playersPath, JSON.stringify(players,null,2));
  }
  res.redirect('/admin');
});

app.get('/api/players',(req,res)=>res.json(load(playersPath)));

app.listen(PORT,()=>console.log('SkillfulTiers live on port '+PORT));
