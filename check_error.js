const http = require('http');
http.get('http://localhost:4002/', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    console.log('Page size:', data.length);
    // Find any error digests
    const digests = data.match(/"digest":"[^"]+"/g);
    if (digests) console.log('Digests:', digests);
    // Find script errors
    const scripts = data.match(/static\/chunks\/[^"]+\.js/g);
    if (scripts) console.log('Chunks:', [...new Set(scripts)].slice(0,5));
  });
}).on('error', e => console.log('Error:', e.message));
