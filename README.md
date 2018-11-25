# passport-opskins
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/almatrass/passport-opskins/blob/master/LICENSE)
***

passport-opskins is a simple passport strategy for authenticating users through the OPSkins platform.

### Installation

```bash
npm i passport-opskins
```

### Usage

#### Setup
```js
const opStrategy = require('passport-opskins').Strategy;
```
```js
passport.use('opskins', new opStrategy({
  name: 'YOUR SITE NAME',
  returnURL: 'http://localhost/auth/opskins/return',
  apiKey: 'YOUR OPSKINS API KEY',
  scopes: 'identity',
  mobile: true, // Remove OPSkins NavBar
  permanent: true, // Maintain permanent access to the account
  debug: true // Displays error messages in the browser
}, (user, done) => {
  return done(null, user);
}));
```
#### Routes
```js
app.get(/^\/auth\/opskins(\/return)?$/, passport.authenticate('opskins', {
  successRedirect: '/',
  failureRedirect: '/'
}));
```
#### Direct your user to logon
```html
<a href="/auth/opskins">Login</a>
```
#### The standard identity user object looks like this:
```js
user = {
  id: 1688432,
  id64: '76561198089553444',
  username: 'Alma|Free stuff: gain.gg',
  avatar: 'https://steamcdn-a.opskins.media/steamcommunity/public/images/avatars/57/579f19ab99a8e0b034e9a94a8d0530d4c621a26f_full.jpg',
  preferred_currency: 102,
  preferred_lang: 'en',
  create_time: 1465080063,
  password_set_time: 1474996832,
  showcases: 0,
  bumps: 0,
  name: { first: 'Almatrass', last: 'SecondName' },
  email:
   { contact_email: 'almatrass@gmail.com',
     verified: true,
     notifications: true },
  twofactor: { enabled: true, enable_time: 1530483878 },
  options:
   { trade_url: 'https://steamcommunity.com/tradeoffer/new/?partner=129287716&token=JAYlMeXY',
     balance_notify: null,
     suggestion_type: 2,
     hidden_balance: false,
     private_sales_list: false },
  sales_list: 'https://opsk.in/u/24e61h',
  access:
   { access_token: 'AQAASRAAAAAAABnDcAAAAAFe+ctf/j6D0W1ZbCGSbORrhdjMwhsL8qSKDX6bhUrsn+kNoud=',
     token_type: 'bearer',
     expires_in: 1800,
     scope: 'identity',
     code: 'ZRufVQu8MTEVLCnN'} 
}
```
#### Scopes
You can find a full range of available scopes here: https://docs.opskins.com/public/en.html#scopes. For a simple logon page, only use identity.
#### Other
##### Ignore this if you're only using this module for the purposes of logging a user on
The user object returned will contain an `access` object, which can be used when calling API endpoints on behalf of the user:
```js
let headers = {
	'Authorization': `Bearer ${req.user.access.access_token}`
};
```
This access token is valid for 30 minutes. Endpoints will return an error like this after 30 minutes:
```json
{
    "error": "invalid_token",
    "error_description": "Bearer token has expired"
}
```
You can get a new access token by POSTing `https://oauth.opskins.com/v1/access_token` with the `user.access.code` as the code. More details: https://docs.opskins.com/public/en.html#getting-a-bearer-token

You can POST this unlimited times if you specify `permanent`. If your access is not permanent, you'll need to just redirect the user to login again.

#### Test
`git clone https://github.com/liamcurry/passport-steam.git`

`cd passport-opskins/examples`

`npm i`

`node index`

The server will run on `localhost:3037`. 

#### Extra notes
OPSkins limits the clients you can own. The module deletes all previous clients with the same `name`, or the same `returnURL` values. This should be fine, but if you reach the limit, you can simply call the `getClientList` along with the `deleteClientList` functions on the strategy object:

```js
let strat = new opStrategy({
  // config blah blah...
});

passport.use('opskins', strat);

strat.getClientList((err, result) => {
  if (err) return console.error(err);
  result.forEach(function(client) {
    strat.deleteClient(client.client_id);
  });
});
```