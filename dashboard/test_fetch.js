const https = require('https');

const BASE = 'script.google.com';
const SCRIPT_PATH = '/macros/s/AKfycbyq_MQYSZduVAftUiE9EQ1y8hdlqfU4FCGquP0--BmDzHemCOHnN4w2qEUZtmdyXwxz/exec';
const company = 'Augusta University';
const query = '';

function get(host, path, cb) {
  https.get({ hostname: host, path: path }, (res) => {
    console.log(`  → ${host}${path.substring(0,80)} [${res.statusCode}]`);
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      const loc = new URL(res.headers.location);
      return get(loc.hostname, loc.pathname + loc.search, cb);
    }
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => cb(res.statusCode, body));
  }).on('error', cb);
}

get(BASE, SCRIPT_PATH + query, (status, body) => {
  console.log('\nFinal Status:', status);
  console.log('Response (first 500 chars):', body.substring(0, 500));
});
