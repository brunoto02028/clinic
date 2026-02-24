const http = require('http');

// Check the main page chunk for errors
http.get('http://localhost:4002/', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Find the page-specific chunk
    const pageChunk = data.match(/chunks\/app\/page-([^"]+)\.js/);
    if (pageChunk) {
      console.log('Page chunk:', pageChunk[0]);
      // Fetch that chunk
      http.get('http://localhost:4002/_next/static/' + pageChunk[0], (r2) => {
        let d2 = '';
        r2.on('data', c => d2 += c);
        r2.on('end', () => {
          console.log('Chunk status:', r2.statusCode, 'size:', d2.length);
          // Look for obvious errors
          if (d2.includes('framer-motion')) console.log('Has framer-motion: YES');
          if (d2.includes('i18n')) console.log('Has i18n: YES');
        });
      });
    }
    
    // Also check for RSC errors in the payload
    const rscErrors = data.match(/\$L[a-z0-9]+.*?error/gi);
    if (rscErrors) console.log('RSC errors:', rscErrors.slice(0,3));
    
    // Check for notFound or error states
    if (data.includes('"notFound"')) console.log('Has notFound state');
    if (data.includes('"error"')) console.log('Has error state');
  });
});
