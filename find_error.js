const http = require('http');
const fs = require('fs');

// Step 1: Get the main page HTML
http.get('http://localhost:4002/', (res) => {
  let html = '';
  res.on('data', c => html += c);
  res.on('end', () => {
    // Find all JS chunks referenced
    const chunks = [...html.matchAll(/\/_next\/static\/chunks\/([^"']+\.js)/g)].map(m => m[1]);
    const pageChunk = chunks.find(c => c.includes('app/page-'));
    console.log('Page chunk:', pageChunk);
    
    if (!pageChunk) { console.log('No page chunk found'); return; }
    
    // Fetch the page chunk
    http.get('http://localhost:4002/_next/static/chunks/' + pageChunk, (r2) => {
      let js = '';
      r2.on('data', c => js += c);
      r2.on('end', () => {
        fs.writeFileSync('/tmp/page_chunk.js', js);
        console.log('Chunk saved, size:', js.length);
        
        // Look for common crash patterns
        if (js.includes('localStorage')) console.log('USES: localStorage');
        if (js.includes('window.')) console.log('USES: window object');
        if (js.includes('document.')) console.log('USES: document object');
        
        // Check for framer-motion
        if (js.includes('framer')) console.log('USES: framer-motion');
        
        // Look for any obvious throw/error
        const throws = js.match(/throw new Error\([^)]{0,100}\)/g);
        if (throws) console.log('THROWS:', throws.slice(0,5));
      });
    });
    
    // Also check main-app chunk
    const mainChunk = chunks.find(c => c.includes('main-app'));
    if (mainChunk) {
      http.get('http://localhost:4002/_next/static/chunks/' + mainChunk, (r3) => {
        let js2 = '';
        r3.on('data', c => js2 += c);
        r3.on('end', () => {
          console.log('Main-app chunk size:', js2.length);
          if (js2.includes('clinic.bpr.rehab')) console.log('STILL HAS: clinic.bpr.rehab in main-app!');
        });
      });
    }
  });
});
