const fs = require('fs');
const path = 'supabase-data.js';

let content = fs.readFileSync(path, 'utf8');

// Replace escapeHtml with BIVAK.escape in the override
content = content.replace(/escapeHtml\(/g, 'BIVAK.escape(');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed escapeHtml -> BIVAK.escape');
