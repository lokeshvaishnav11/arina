require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const authRoutes = require('./auth');
const adminRoutes = require('./admin');
const apiRoutes = require('./api');

const app = express();

app.use(helmet({ contentSecurityPolicy:false }));
app.use(express.json({ limit:'1mb' }));
app.use(express.urlencoded({ extended:true }));
app.use(cookieParser());
app.use(session({
  name:'arina.sid',
  secret:process.env.SESSION_SECRET || 'CHANGE_THIS_SECRET',
  resave:false,
  saveUninitialized:false,
  cookie:{
    httpOnly:true,
    sameSite:'lax',
    secure:false,
    maxAge:1000*60*60*12
  }
}));

app.use('/auth', authRoutes);
app.use('/admin-api', adminRoutes);
app.use('/api', apiRoutes);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// HAMESHA LAST
app.get('*', (req, res) => {
  res.status(404).send('Page not found');
});

const port = Number(process.env.PORT || 3980);
app.listen(port, ()=> console.log(`Arina Node server running on http://localhost:${port}`));
