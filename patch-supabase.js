const fs = require('fs');
const path = 'supabase-data.js';

let content = fs.readFileSync(path, 'utf8');

const insertPoint = "window.renderDonation = renderDonationList\n\t}";
const overrideCode = `window.renderDonation = renderDonationList
	}

	/* ----------------------------------------------------------------------
	   OVERRIDE renderDonationList untuk pakai data Supabase
	   ---------------------------------------------------------------------- */
	window.renderDonationList = function() {
		var approved = [];
		try {
			if (_dnRows) approved = _dnRows.filter(function(d) { return d.astatus === 'disetujui'; });
		} catch(e) {}
		if (!approved.length) {
			try {
				var local = (typeof _lsGet === 'function') ? _lsGet('bivak_donations', []) : [];
				approved = local.filter(function(d) { return d && d.astatus === 'disetujui'; });
			} catch(e) {}
		}
		if (!approved.length) {
			approved = [
				{nama: 'Andi Mappanyukki', amt: 10000000},
				{nama: 'Komunitas Pencinta Alam Makassar', amt: 7500000},
				{nama: 'Nurul Fadhilah', amt: 5000000},
				{nama: 'Baso Dg. Nassa', amt: 5000000},
				{nama: 'Rina Kartika', amt: 3500000}
			];
		}
		var sorted = approved.slice().sort(function(a,b) { return (b.amt||0) - (a.amt||0); });
		var total = sorted.reduce(function(s,d) { return s + (d.amt||0); }, 0);
		var pct = Math.min(100, Math.round(total / 75000000 * 100));
		var col = document.getElementById('dnCollected');
		var bar = document.getElementById('dnBar');
		var pc = document.getElementById('dnPct');
		var box = document.getElementById('dnDonors');
		if (col) col.textContent = 'Rp ' + total.toLocaleString('id-ID');
		if (bar) bar.style.width = pct + '%';
		if (pc) pc.textContent = pct + '%';
		if (box) {
			var medals = ['\u{1F947}','\u{1F948}','\u{1F949}'];
			box.innerHTML = sorted.slice(0, 15).map(function(d,i) {
				var nm = escapeHtml(d.nama || 'Donatur');
				var top = i < 3;
				var rank = top ? medals[i] : '<span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:rgba(140,150,170,.18);color:#8c96aa;font-size:12px;font-weight:800">' + (i+1) + '</span>';
				var bg = top ? 'rgba(16,185,129,.08)' : 'rgba(140,150,170,.05)';
				var bd = top ? '1px solid rgba(16,185,129,.25)' : '1px solid rgba(140,150,170,.14)';
				return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;margin-bottom:6px;background:' + bg + ';border:' + bd + '"><div style="width:28px;text-align:center;flex-shrink:0">' + rank + '</div><div style="flex:1;min-width:0;font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + nm + '</div><div style="font-size:13px;font-weight:800;color:#10b981;white-space:nowrap">Rp ' + (d.amt||0).toLocaleString('id-ID') + '</div></div>';
			}).join('');
		}
	};`;

if (content.includes(insertPoint) && !content.includes("OVERRIDE renderDonationList")) {
    content = content.replace(insertPoint, overrideCode);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Override added successfully!');
} else if (content.includes("OVERRIDE renderDonationList")) {
    console.log('Override already exists, skipping.');
} else {
    console.log('Insert point not found');
}
