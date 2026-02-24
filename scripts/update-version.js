const fs = require('fs');
const path = require('path');

const versionPath = path.join(__dirname, '..', 'public', 'version.json');

const versionData = {
  version: `1.0.${Date.now()}`,
  timestamp: Date.now(),
  buildDate: new Date().toISOString()
};

fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2));

console.log('Version updated:', versionData);
