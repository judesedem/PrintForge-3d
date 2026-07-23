const http = require('http');

const data = JSON.stringify({ email: 'designer@printforge.edu', password: 'password' });

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const token = JSON.parse(body).token;
    
    const mpOptions = {
      hostname: 'localhost',
      port: 8080,
      path: '/api/marketplace',
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    };
    
    http.request(mpOptions, mpRes => {
      let mpBody = '';
      mpRes.on('data', chunk => mpBody += chunk);
      mpRes.on('end', () => {
        console.log("RESPONSE HTTP", mpRes.statusCode);
        console.log("RESPONSE BODY:", mpBody);
      });
    }).end();
  });
});
req.write(data);
req.end();
