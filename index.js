const request = require('request'),
      crypto = require('crypto'),
      url = require('url'),
      querystring = require('querystring');

function isValidJson(json) {
  try {
    JSON.parse(json);
  } catch(err) {
    return false;
  }
  return true;
}

module.exports = {
  Strategy: function(obj, callback) {
    if (!obj.name || !obj.returnURL || !obj.apiKey)
      throw new Error('Missing name, returnURL or apiKey parameter. These are required.');
    
    this.apiKey = Buffer.from(obj.apiKey + ':', 'ascii').toString('base64');
    this.siteName = obj.name;
    this.returnURL = obj.returnURL;
    this.mobile = obj.mobile;
    this.scopes = obj.scopes || 'identity';
    this.states = [];
    this.mobileStr = obj.mobile ? `&mobile=1` : ``;
    this.permanentStr = obj.permanent ? `&duration=permanent` : ``;
    this.clientID = null;
    this.clientSecret = null;
    this.name = 'opskins';
    this.callback = callback;
    
    this.setIdAndSecret = function(id, secret) {
      this.clientID = id;
      this.clientSecret = secret;
    };
    
    this.deleteClient = function(clientid) {
      let options = {
        url: 'https://api.opskins.com/IOAuth/DeleteClient/v1/', 
        headers: {
          'authorization': `Basic ${this.apiKey}`, 
          'Content-Type': 'application/x-www-form-urlencoded'
        }, 
        body: `client_id=${clientid}`
      };
      request.post(options, (err, response, body) => {
        if (err)
          console.error(err);
      });
    };
    
    let _self = this;
    this.getClientList = function(cb) {
      let options = {
        url: 'https://api.opskins.com/IOAuth/GetOwnedClientList/v1/', 
        headers: {
          'authorization': `Basic ${_self.apiKey}`, 
          'Content-Type': 'application/json; charset=utf-8'
        }
      };

      request.get(options, (err, response, body) => {
        if (err)
          return cb(err);
        if (!isValidJson(body))
          return cb(new Error(`Invalid JSON response`));
        let realBody = JSON.parse(body);
        if (realBody.status !== 1)
          return cb(new Error(`An error occurred`));
        cb(null, realBody.response.clients);
      });
    };
    
    this.refreshClientList = function() {
      let datApiKey = this.apiKey;
      
      this.getClientList((err, clients) => {
        if (err) return console.error(err);
        let _self = this;
        clients.forEach(function (client) {
          if (client.name == _this.siteName || client.redirect_uri == _this.returnURL) {
            _self.deleteClient(client.client_id);
          }
        });
        let options = {
          url: 'https://api.opskins.com/IOAuth/CreateClient/v1/', 
          headers: {
            'authorization': `Basic ${datApiKey}`, 
            'Content-Type': 'application/json; charset=utf-8'
          }, 
          body: `{"name": "${this.siteName}", "redirect_uri": "${this.returnURL}"}`
        };
        request.post(options, (err, response, body) => {
          if (err)
            return console.error(err);
          if (!isValidJson(body))
            return console.error(new Error(`Invalid JSON response`));
          body = JSON.parse(body);
          if (!body.response || !body.response.client || !body.response.client.client_id || !body.response.secret)
            throw new Error(body.message);
          
          this.setIdAndSecret(body.response.client.client_id, body.response.secret);
        });
      });
    };
    this.refreshClientList();
    
    this.updateStates = function(states) {
      this.states = states;
    };
    
    this.goLogin = function() {
      const rand = crypto.randomBytes(4).toString('hex');
			this.states.push(rand);
      
      setTimeout(function () {
				for (let i = 0; i < this.states.length; i++) {
					if (this.states[i] == rand) {
						this.states.splice(i, 1);
					}
				}
			}, 600000);
      
      return `https://oauth.opskins.com/v1/authorize?state=${rand}&client_id=${this.clientID}&response_type=code&scope=${this.scopes}${this.mobileStr}${this.permanentStr}`;
    };
    
    let _this = this;
    this.authenticate = function(data, redirect) {
      let urlOptions = data._parsedUrl;
      if (url.parse(_this.returnURL).pathname == urlOptions.pathname) {
        let parsedQuery = querystring.parse(urlOptions.query);
        
        let originated;
				_this.states.forEach(function (state) {
					if (state == parsedQuery.state) {
						originated = true;
					}
				});
				if (!originated)
					this.error(new Error(`Authentication did not originate on this server`));
        
        let auth = 'Basic ' + Buffer.from(_this.clientID + ':' + _this.clientSecret).toString('base64');
        
        let headers = {
          'Authorization': auth, 
          'Content-Type': 'application/x-www-form-urlencoded'
        };
        let options = {
          url: 'https://oauth.opskins.com/v1/access_token', 
          method: 'POST', 
          headers: headers, 
          body: `grant_type=authorization_code&code=${parsedQuery.code}`
        };
        request.post(options, (err, response, body) => {
          if (err)
            return this.error(err);
          
          if (!isValidJson(body))
            return this.error(new Error(`Invalid JSON response`));
          body = JSON.parse(body);
          if (body.error)
            return this.error(new Error(`Failed to serialize user into session: ${body.error}`));
            
          let headers2 = {
            'Authorization': `Bearer ${body.access_token}`
          };
          let options2 = {
            url: 'https://api.opskins.com/IUser/GetProfile/v1/', 
            headers: headers2
          };
          request.get(options2, (err, response, body3) => {
            if (err)
              return this.error(err);
            
            if (!isValidJson(body3))
              return this.error(new Error(`Invalid JSON response`));
            
            let realBody = JSON.parse(body3);
            console.log(realBody)
            if (realBody.error)
              return this.error(new Error(`Failed to serialize user into session: ${realBody.error}`));
            
            let userObj = realBody.response;
            
            // OPSkins don't give these anymore
//            userObj.balance = realBody.balance;
//            userObj.credits = realBody.credits;
//            userObj.cryptoBalances = realBody.cryptoBalances;
            
            userObj.access = body;
            userObj.access.code = parsedQuery.code;
            
            let datErr = this.error;
            let datSuccess = this.success;
            _this.callback(userObj, function(err, user) {
              if (err) return datErr(err);
              datSuccess(user);
            });
          });
        });
      } else {
        data.res.redirect(_this.goLogin());
      }
    };
  }
};