const http = require('http');
http.get('http://localhost:4002/', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Find page chunk
    const m = data.match(/chunks\/app\/page-[a-f0-9]+\.js/);
    if (!m) { console.log('No page chunk found'); return; }
    const chunkPath = '/_next/static/' + m[0];
    console.log('Fetching:', chunkPath);
    http.get('http://localhost:4002' + chunkPath, (r2) => {
      let d2 = '';
      r2.on('data', c => d2 += c);
      r2.on('end', () => {
        // Try to find syntax errors by checking for known patterns
        console.log('Chunk size:', d2.length);
        // Check for framer-motion
        if (d2.includes('framer')) console.log('framer-motion: present');
        // Check for undefined references
        const undef = d2.match(/Cannot read prop[^"]{0,80}/g);
        if (undef) console.log('Undef errors:', undef.slice(0,3));
      });
    }).on('error', e => console.log('chunk fetch error:', e.message));
  });
}).on('error', e => console.log('Error:', e.message));
