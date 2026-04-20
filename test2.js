const https = require('https');
const url = require('url');

function get(target, isRedirect = false) {
  const parsed = new url.URL(target);
  https.get({
    hostname: parsed.hostname,
    path: parsed.pathname + parsed.search,
  }, (res) => {
    console.log(`[HTTP ${res.statusCode}] ${target}`);
    
    // Follow redirect
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      console.log(`Redirecting to: ${res.headers.location.substring(0, 100)}...`);
      return get(res.headers.location, true);
    }
    
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('--- RESPONSE BODY ---');
      console.log(data.substring(0, 500));
      console.log('---------------------');
    });
  }).on('error', (e) => {
    console.error('Request Error:', e.message);
  });
}

get('https://script.google.com/macros/s/AKfycbyq_MQYSZduVAftUiE9EQ1y8hdlqfU4FCGquP0--BmDzHemCOHnN4w2qEUZtmdyXwxz/exec');
