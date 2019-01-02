const express = require('express'),
      handlebars = require('express-handlebars'),
      passport = require('passport'),
      session = require('express-session'),
      opStrategy = require('../').Strategy;

const config = require('./config');

const app = express();

const Handlebars = handlebars.create({
	extname: '.html'
});

app.engine('html', Handlebars.engine);
app.set('view engine', 'html');
app.set('views', './views');

let sessionMiddleware = session({
	key: 'session_id', 
  secret: 'almatrass', 
  resave: false, 
  saveUninitialized: true, 
  cookie: {
		maxAge: 1000 * 60 * 60 * 24 * 365
	}
});

app.use(sessionMiddleware);

passport.serializeUser((user, done) => {
	done(null, user);
});

passport.deserializeUser((obj, done) => {
	done(null, obj);
});

let strat = new opStrategy({
  name: 'passport-opskins-example',
  returnURL: 'http://localhost:3037/auth/opskins/return',
  apiKey: config.apiKey,
  scopes: 'identity_basic', // Space-separated list of identities
  mobile: true, // Remove OPSkins NavBar
  permanent: true, // Maintain permanent access to the account
  debug: false // Displays error messages in the browser
}, (user, done) => {
  return done(null, user);
});

passport.use('opskins', strat);

app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
  console.log(req.user);
  res.render('index', {
    user: req.user
  });
});

app.get('/refreshtoken', (req, res) => {
  if (req.user) {
    strat.refreshAccessToken(req.user.access.refresh_token, (err, token) => {
      if (err) return res.end('An error occurred');
      req.user.access.access_token = token;
      res.end(`Your new access token is: ${token}`);
    });
  } else {
    res.end(`<a href="/auth/opskins">Please login to see this</a>`);
  }
});

app.get(/^\/auth\/opskins(\/return)?$/, passport.authenticate('opskins', {
	failureRedirect: '/'
}), (req, res) => {
  res.redirect('/')
});

app.get('/logout', (req, res) => {
	req.logout();
	res.redirect('/');
});

app.listen(3037);