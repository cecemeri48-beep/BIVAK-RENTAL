const fs = require('fs');
const path = 'supabase-data.js';

let content = fs.readFileSync(path, 'utf8');

// Fix 1: Wrap renderVendors and updateBadges with try-catch
content = content.replace(
    '\t\trenderVendors(vendorsData)\n\t\tupdateBadges()',
    '\t\ttry { renderVendors(vendorsData); } catch(e) { console.warn("[BIVAK] renderVendors error:", e.message); }\n\t\ttry { updateBadges(); } catch(e) { console.warn("[BIVAK] updateBadges error:", e.message); }'
);

// Fix 2: Replace corrupted emoji medals with text-based ones
content = content.replace(
    "var medals = ['??','??','??']",
    "var medals = ['1','2','3']"
);

// Fix 3: Also fix in app.js if there are any emoji issues there
const appPath = 'app.js';
if (fs.existsSync(appPath)) {
    let appContent = fs.readFileSync(appPath, 'utf8');
    // Remove comment lines that might have invalid characters
    appContent = appContent.replace(/# .*renderDonationList/g, '# SKIP');
    fs.writeFileSync(appPath, appContent, 'utf8');
}

fs.writeFileSync(path, content, 'utf8');
console.log('All fixes applied');
