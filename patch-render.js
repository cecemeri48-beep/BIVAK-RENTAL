const fs = require('fs');
const path = 'supabase-data.js';

let content = fs.readFileSync(path, 'utf8');

// Replace the alias assignment with a wrapper function
const oldCode = 'window.renderDonation = renderDonationList';
const newCode = 'window.renderDonation = function() { if (typeof window.renderDonationList === "function") window.renderDonationList(); }';

if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Fixed: renderDonation now calls renderDonationList dynamically');
} else {
    console.log('Pattern not found, already fixed?');
}
