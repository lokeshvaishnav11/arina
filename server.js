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


// ========================================
// MIDDLEWARE
// ========================================

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(
  express.json({
    limit: '1mb'
  })
);

app.use(
  express.urlencoded({
    extended: true
  })
);

app.use(cookieParser());

app.use(
  session({
    name: 'arina.sid',

    secret:
      process.env.SESSION_SECRET ||
      'CHANGE_THIS_SECRET',

    resave: false,

    saveUninitialized: false,

    cookie: {
      httpOnly: true,
      sameSite: 'lax',

      // HTTPS properly configured ho to production me true kar dena
      secure: false,

      maxAge:
        1000 *
        60 *
        60 *
        12
    }
  })
);


// ========================================
// API ROUTES
// ========================================

app.use(
  '/auth',
  authRoutes
);

app.use(
  '/admin-api',
  adminRoutes
);

app.use(
  '/api',
  apiRoutes
);


// ========================================
// PAGE ROUTES
// IMPORTANT: STATIC SE PEHLE
// ========================================

// Login page
app.get('/', (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      'public',
      'login.html'
    )
  );

});


// Login alias
app.get('/login', (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      'public',
      'login.html'
    )
  );

});


// Main website
app.get('/home', (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      'public',
      'index.html'
    )
  );

});


// Admin panel
app.get('/admin', (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      'public',
      'admin.html'
    )
  );

});


// ========================================
// STATIC FILES
// IMPORTANT: index:false
// ========================================

app.use(
  express.static(
    path.join(
      __dirname,
      'public'
    ),
    {
      index: false
    }
  )
);


// ========================================
// 404 - ALWAYS LAST
// ========================================

app.use((req, res) => {

  res
    .status(404)
    .send('Page not found');

});


// ========================================
// SERVER
// ========================================

const port =
  Number(
    process.env.PORT ||
    3980
  );


app.listen(
  port,
  () => {

    console.log(
      `Arina Node server running on http://localhost:${port}`
    );

  }
);