/**
 * BIVAK v5 - Clean Build (ES5 Compatible)
 * Simple, reliable, no external dependencies
 */

var BIVAK = {
  vendors: [
    {id:1,name:"Celebes Outdoor Rental Makassar",city:"Makassar",phone:"6281245678901",rating:4.9,reviews:128,minPrice:15000,gears:["Tenda Dome 4P","Carrier 75L","Sleeping Bag","Kompor Portable"],image:"assets/vendor-makassar.jpg",verified:true},
    {id:2,name:"Bawakaraeng Adventure Gowa",city:"Gowa",phone:"6285299887766",rating:4.8,reviews:95,minPrice:12000,gears:["Tenda 2-6P","Tracking Pole Carbon","Nesting Cookset","Lampu LED"],image:"assets/vendor-gowa.jpg",verified:true},
    {id:3,name:"Malino Highland Camp Gear",city:"Malino",phone:"6282188990011",rating:5.0,reviews:74,minPrice:20000,gears:["Tenda Family Luxury","Matras Thermal","Hammock Double","Grill Barbeque"],image:"assets/vendor-malino.jpg",verified:true},
    {id:4,name:"Rammang-Rammang Outdoor Maros",city:"Maros",phone:"6281355443322",rating:4.7,reviews:62,minPrice:15000,gears:["Tenda Glamping","Life Jacket","Kompor Ultralight","Headlamp"],image:"assets/vendor-maros.jpg",verified:true},
    {id:5,name:"Toraja Highland Explorer",city:"Toraja",phone:"6281142009988",rating:4.9,reviews:110,minPrice:25000,gears:["Sepatu Tracking","Jaket Windproof","Carrier 60L","GPS Navigation"],image:"assets/vendor-toraja.jpg",verified:true},
    {id:6,name:"Palopo Camp & Trail Base",city:"Palopo",phone:"6285341122334",rating:4.6,reviews:48,minPrice:15000,gears:["Tenda Dome","Sleeping Bag","Kompor Mawar","Botol Tumbler"],image:"assets/vendor-palopo.jpg",verified:true}
  ],
  pendingVendors: [],
  donations: [],
  tierSelected: 50000,
  tiers: [20000, 50000, 100000, 250000],

  load: function() {
    try {
      var v = localStorage.getItem('bivak_vendors');
      if (v) this.vendors = JSON.parse(v);
      var p = localStorage.getItem('bivak_pending');
      if (p) this.pendingVendors = JSON.parse(p);
      var d = localStorage.getItem('bivak_donations');
      if (d) this.donations = JSON.parse(d);
    } catch(e) { console.error('Load error:', e); }
  },

  save: function() {
    try {
      localStorage.setItem('bivak_vendors', JSON.stringify(this.vendors));
      localStorage.setItem('bivak_pending', JSON.stringify(this.pendingVendors));
      localStorage.setItem('bivak_donations', JSON.stringify(this.donations));
    } catch(e) { console.error('Save error:', e); }
  },

  rupiah: function(num) {
    return 'Rp ' + Number(num).toLocaleString('id-ID');
  },

  escape: function(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  el: function(id) { return document.getElementById(id); }
};

document.addEventListener('DOMContentLoaded', function() {
  BIVAK.load();
  renderVendors();
  updateBadges();
});

function renderVendors(filteredList) {
  var container = BIVAK.el('vendorGridContainer');
  if (!container) return;

  var list = filteredList || BIVAK.vendors;

  if (list.length === 0) {
    container.innerHTML = '<div style="grid-column:span 3;text-align:center;padding:4rem 1rem;background:var(--bg-card);border-radius:var(--radius-lg);border:1px dashed var(--border-glass);"><i class="fa-solid fa-store-slash" style="font-size:3rem;color:var(--text-dim);margin-bottom:1rem;"></i><h3 style="color:#fff;">Tidak Ada Vendor</h3><p style="color:var(--text-muted)">Coba ubah filter pencarian.</p></div>';
    return;
  }

  container.innerHTML = list.map(function(v) {
    return '<div class="vendor-card">' +
      '<div class="vendor-cover">' +
        '<img src="' + BIVAK.vendorImg(v) + '" srcset="' + BIVAK.vendorImg(v, 600) + ' 600w, ' + BIVAK.vendorImg(v) + ' 1200w" sizes="(max-width:640px) 100vw, 360px" alt="Foto perlengkapan ' + BIVAK.escape(v.name) + '" width="600" height="400" loading="lazy" decoding="async" onerror="this.onerror=null;this.removeAttribute(\'srcset\');this.src=\'assets/gear-fallback.jpg\'">' +
        '<div class="location-badge"><i class="fa-solid fa-location-dot"></i> ' + BIVAK.escape(v.city) + '</div>' +
        (v.verified ? '<div class="verified-badge"><i class="fa-solid fa-circle-check"></i> Terverifikasi</div>' : '') +
      '</div>' +
      '<div class="vendor-body">' +
        '<div class="vendor-header">' +
          '<h3 class="vendor-title">' + BIVAK.escape(v.name) + '</h3>' +
          '<div class="vendor-rating"><i class="fa-solid fa-star"></i> ' + (v.rating || 4.8) + ' (' + (v.reviews || 25) + ')</div>' +
        '</div>' +
        '<div class="vendor-address"><i class="fa-solid fa-map-pin"></i> ' + BIVAK.escape(v.address || v.city) + '</div>' +
        '<div class="gear-tags">' + (v.gears || []).slice(0,4).map(function(g) {
          return '<span class="tag"><i class="fa-solid fa-campground"></i> ' + BIVAK.escape(g) + '</span>';
        }).join('') + '</div>' +
        '<div class="vendor-footer">' +
          '<div class="vendor-price">Sewa Mulai <span>' + BIVAK.rupiah(v.minPrice || 15000) + '/hr</span></div>' +
          '<div style="display:flex;gap:0.5rem">' +
            '<button class="btn btn-outline" onclick="openVendorDetail(' + v.id + ')" style="padding:0.5rem 0.8rem;font-size:0.82rem"><i class="fa-solid fa-eye"></i> Detail</button>' +
            '<a href="https://wa.me/' + v.phone + '?text=Halo%20' + encodeURIComponent(v.name) + '%2C%20saya%20menemukan%20vendor%20Anda%20di%20BIVAK" target="_blank" class="btn btn-whatsapp" style="padding:0.5rem 0.8rem;font-size:0.82rem"><i class="fa-brands fa-whatsapp"></i> WA</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function filterVendors() {
  var q = BIVAK.el('searchInput');
  var query = q ? q.value.toLowerCase() : '';
  var c = BIVAK.el('cityFilter');
  var city = c ? c.value : '';

  var filtered = BIVAK.vendors.filter(function(v) {
    var matchQuery = !query || v.name.toLowerCase().indexOf(query) > -1 || (v.gears || []).some(function(g) { return g.toLowerCase().indexOf(query) > -1; });
    var matchCity = !city || v.city === city;
    return matchQuery && matchCity;
  });

  renderVendors(filtered);
}

function openVendorDetail(id) {
  var v = BIVAK.vendors.find(function(x) { return x.id === id; });
  if (!v) return;

  BIVAK.el('detailVendorTitle').textContent = v.name;
  BIVAK.el('detailVendorBody').innerHTML =
    '<div style="display:flex;gap:1.5rem;flex-wrap:wrap;margin-bottom:1.5rem">' +
      '<img src="' + BIVAK.vendorImg(v) + '" alt="Foto perlengkapan ' + BIVAK.escape(v.name) + '" width="200" height="160" loading="lazy" decoding="async" style="width:200px;height:160px;object-fit:cover;border-radius:var(--radius-md)" onerror="this.onerror=null;this.src=\'assets/gear-fallback.jpg\'">' +
      '<div style="flex:1">' +
        '<div style="font-size:0.85rem;color:var(--primary-emerald);font-weight:700;margin-bottom:0.3rem"><i class="fa-solid fa-location-dot"></i> ' + BIVAK.escape(v.city) + (v.verified ? ' - TERVERIFIKASI' : '') + '</div>' +
        '<h3 style="color:#fff;margin-bottom:0.5rem">' + BIVAK.escape(v.name) + '</h3>' +
        '<p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:0.75rem"><i class="fa-solid fa-map-pin"></i> ' + BIVAK.escape(v.address || v.city) + '</p>' +
        '<div style="display:flex;gap:0.5rem;align-items:center">' +
          '<span class="vendor-rating"><i class="fa-solid fa-star"></i> ' + (v.rating || 4.8) + '</span>' +
          '<span style="color:var(--text-muted);font-size:0.85rem">Sewa mulai <strong>' + BIVAK.rupiah(v.minPrice || 15000) + '/hari</strong></span>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<h4 style="color:#fff;margin-bottom:0.75rem;border-bottom:1px solid var(--border-glass);padding-bottom:0.4rem">Daftar Peralatan</h4>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:0.75rem;margin-bottom:1.5rem">' +
      (v.gears || []).map(function(g) {
        return '<div style="background:rgba(255,255,255,0.03);padding:0.6rem 0.9rem;border-radius:var(--radius-sm);border:1px solid var(--border-glass);color:#e5e7eb;font-size:0.88rem"><i class="fa-solid fa-circle-check text-emerald" style="color:#10b981"></i> ' + BIVAK.escape(g) + '</div>';
      }).join('') +
    '</div>' +
    '<div style="display:flex;justify-content:flex-end;gap:0.75rem">' +
      '<button class="btn btn-outline" onclick="closeModal(\'modalVendorDetail\')">Tutup</button>' +
      '<a href="https://wa.me/' + v.phone + '?text=Halo%20' + encodeURIComponent(v.name) + '%2C%20saya%20mau%20booking%20sewa%20alat%20outdoor%20lewat%20BIVAK" target="_blank" class="btn btn-whatsapp"><i class="fa-brands fa-whatsapp"></i> Hubungi WhatsApp</a>' +
    '</div>';

  openModal('modalVendorDetail');
}

function selTier(n) {
  BIVAK.tierSelected = n;
  var btns = document.querySelectorAll('.tier-btn');
  btns.forEach(function(btn) {
    var isMatch = btn.textContent.indexOf(n.toLocaleString('id-ID')) > -1;
    btn.classList.toggle('on', isMatch);
  });
}

function donasi() { openModal('modalDonasi'); }

function handleDonasiSubmit(e) {
  e.preventDefault();

  var namaEl = BIVAK.el('inputDonasiNama');
  var nominalEl = BIVAK.el('inputDonasiNominal');
  var emailEl = BIVAK.el('inputDonasiEmail');

  var nama = namaEl ? namaEl.value.trim() : '';
  var nominal = nominalEl ? parseInt(nominalEl.value) : 0;
  var email = emailEl ? emailEl.value.trim() : '';

  if (!nama || !nominal || nominal <= 0) {
    BIVAK.notify("error", "Data Belum Lengkap", "Isi nama dan nominal donasi dengan benar.");
    return;
  }

  var donation = {
    id: 'D' + Date.now(),
    nama: nama,
    email: email,
    amt: nominal,
    source: 'bivak',
    astatus: 'baru',
    created_at: new Date().toISOString()
  };

  BIVAK.donations.unshift(donation);
  BIVAK.save();

  closeModal('modalDonasi');
  var form = BIVAK.el('formDonasi');
  if (form) form.reset();

  updateBadges();

  BIVAK.notify("success", "Terima Kasih!", "Donasi tersimpan. Nama Anda muncul setelah diverifikasi admin.");
}

function renderDonationList() {
  var approved = BIVAK.donations.filter(function(d) { return d.astatus === 'disetujui'; });
  var allDonors = approved.slice();

  var sorted = allDonors.slice().sort(function(a,b) { return b.amt - a.amt; });
  var total = sorted.reduce(function(s,d) { return s + (d.amt || 0); }, 0);
  var pct = Math.min(100, Math.round(total / 75000000 * 100));

  var col = BIVAK.el('dnCollected');
  var bar = BIVAK.el('dnBar');
  var pc = BIVAK.el('dnPct');
  var box = BIVAK.el('dnDonors');

  if (col) col.textContent = BIVAK.rupiah(total);
  if (bar) bar.style.width = pct + '%';
  if (pc) pc.textContent = pct + '%';

  if (box && sorted.length === 0) {
    box.innerHTML = '<div style="padding:1.5rem;text-align:center;color:var(--text-dim);font-size:0.85rem;border:1px dashed rgba(140,150,170,.25);border-radius:12px">Belum ada donasi terverifikasi. Jadilah yang pertama mendukung konservasi Bawakaraeng.</div>';
  } else if (box) {
    var medals = ['🥇', '🥈', '🥉'];
    box.innerHTML = sorted.slice(0, 15).map(function(d, i) {
      var nm = BIVAK.escape(d.nama || 'Donatur');
      var top = i < 3;
      var rank = top ? medals[i] : '<span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:rgba(140,150,170,.18);color:#8c96aa;font-size:12px;font-weight:800">' + (i+1) + '</span>';
      var bg = top ? 'rgba(16,185,129,.08)' : 'rgba(140,150,170,.05)';
      var bd = top ? '1px solid rgba(16,185,129,.25)' : '1px solid rgba(140,150,170,.14)';
      return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;margin-bottom:6px;background:' + bg + ';border:' + bd + '"><div style="width:28px;text-align:center;flex-shrink:0">' + rank + '</div><div style="flex:1;min-width:0;font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + nm + '</div><div style="font-size:13px;font-weight:800;color:#10b981;white-space:nowrap">' + BIVAK.rupiah(d.amt || 0) + '</div></div>';
    }).join('');
  }
}

function donasiApprove(i, st) {
  if (i < 0 || i >= BIVAK.donations.length) return;

  BIVAK.donations[i].astatus = st;
  BIVAK.save();

  renderAdminTables();
  updateBadges();

  BIVAK.notify(st === 'disetujui' ? "success" : "info", st === 'disetujui' ? "Donasi Disetujui" : "Donasi Ditolak", "Status donasi berhasil diperbarui.");
}

function handleVendorSubmit(e) {
  e.preventDefault();

  var nameEl = BIVAK.el('inputVendorName');
  var cityEl = BIVAK.el('inputVendorCity');
  var phoneEl = BIVAK.el('inputVendorPhone');
  var addrEl = BIVAK.el('inputVendorAddress');
  var gearsEl = BIVAK.el('inputVendorGears');
  var priceEl = BIVAK.el('inputVendorMinPrice');

  var vendor = {
    id: Date.now(),
    name: nameEl ? nameEl.value.trim() : '',
    city: cityEl ? cityEl.value : '',
    phone: phoneEl ? phoneEl.value.trim() : '',
    address: addrEl ? addrEl.value.trim() : '',
    gears: gearsEl ? gearsEl.value.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [],
    minPrice: priceEl ? (parseInt(priceEl.value) || 15000) : 15000,
    image: 'assets/gear-fallback.jpg',
    verified: false
  };

  if (!vendor.name || !vendor.phone) {
    BIVAK.notify("error", "Data Belum Lengkap", "Lengkapi nama dan nomor WhatsApp.");
    return;
  }

  BIVAK.pendingVendors.push(vendor);
  BIVAK.save();

  closeModal('modalVendor');
  var form = BIVAK.el('formAddVendor');
  if (form) form.reset();

  updateBadges();
  BIVAK.notify("success", "Pengajuan Terkirim", "Iklan Anda masuk antrean approval admin.");
}


function switchAdminTab(tabName) {
  var btns = document.querySelectorAll('.tab-btn');
  btns.forEach(function(btn) { btn.classList.remove('active'); });

  var contents = document.querySelectorAll('.admin-tab-content');
  contents.forEach(function(el) { el.style.display = 'none'; });

  var map = {
    'pendingVendors': {idx: 0, id: 'tabPendingVendors'},
    'activeVendors': {idx: 1, id: 'tabActiveVendors'},
    'donasi': {idx: 2, id: 'tabDonasi'},
    'adopsi': {idx: 3, id: 'tabAdopsi'}
  };

  var pair = map[tabName] || map['pendingVendors'];
  if (btns[pair.idx]) btns[pair.idx].classList.add('active');
  var tabEl = BIVAK.el(pair.id);
  if (tabEl) tabEl.style.display = 'block';

  // Load data for the selected tab
  if (tabName === 'adopsi') {
    if (typeof renderAdopsiAdmin === 'function') {
      renderAdopsiAdmin()
    } else {
      console.warn("[BIVAK] renderAdopsiAdmin not found in local scope, trying window...")
      if (typeof window.renderAdopsiAdmin === 'function') {
        window.renderAdopsiAdmin()
      } else {
        console.error("[BIVAK] renderAdopsiAdmin still not available!")
        console.error("[BIVAK] Available global functions:", Object.keys(window).filter(k => k.includes('render')))
      }
    }
  }
}

function renderAdminTables() {
  var pendingBody = BIVAK.el('tablePendingVendorsBody');
  if (pendingBody) {
    if (BIVAK.pendingVendors.length === 0) {
      pendingBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Tidak ada antrean.</td></tr>';
    } else {
      pendingBody.innerHTML = BIVAK.pendingVendors.map(function(pv, i) {
        return '<tr>' +
          '<td><strong>' + BIVAK.escape(pv.name) + '</strong><br><small style="color:var(--text-muted)">' + BIVAK.escape(pv.city) + '</small></td>' +
          '<td>' + BIVAK.escape(pv.phone) + '</td>' +
          '<td><small>' + (pv.gears || []).slice(0,3).join(', ') + '</small></td>' +
          '<td>' + BIVAK.rupiah(pv.minPrice) + '</td>' +
          '<td>' +
            '<button class="btn btn-primary" onclick="approveVendor(' + i + ')" style="padding:0.35rem 0.7rem;font-size:0.78rem"><i class="fa-solid fa-check"></i></button> ' +
            '<button class="btn btn-outline" onclick="rejectVendor(' + i + ')" style="padding:0.35rem 0.7rem;font-size:0.78rem;border-color:var(--accent-rose);color:var(--accent-rose)"><i class="fa-solid fa-xmark"></i></button>' +
          '</td>' +
        '</tr>';
      }).join('');
    }
  }

  var activeBody = BIVAK.el('tableActiveVendorsBody');
  if (activeBody) {
    activeBody.innerHTML = BIVAK.vendors.map(function(av, i) {
      return '<tr>' +
        '<td><strong>' + BIVAK.escape(av.name) + '</strong></td>' +
        '<td>' + BIVAK.escape(av.city) + '</td>' +
        '<td><i class="fa-solid fa-star" style="color:var(--accent-amber)"></i> ' + (av.rating || 4.8) + '</td>' +
        '<td><span class="status-tag status-approved">Tayang</span></td>' +
        '<td><button class="btn btn-outline" onclick="removeActiveVendor(' + i + ')" style="padding:0.3rem 0.6rem;font-size:0.75rem">Hapus</button></td>' +
      '</tr>';
    }).join('');
  }

  var donasiBody = BIVAK.el('tableDonasiBody');
  if (donasiBody) {
    if (BIVAK.donations.length === 0) {
      donasiBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Belum ada donasi.</td></tr>';
    } else {
      donasiBody.innerHTML = BIVAK.donations.map(function(r, i) {
        var nm = BIVAK.escape(r.nama || 'Donatur');
        var amt = BIVAK.rupiah(r.amt || 0);
        var when = r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID') : '-';
        var st = r.astatus || 'baru';
        var stBadge = st === 'disetujui' ? '<span style="color:#10b981;font-weight:700">? Diterima</span>' :
                       st === 'ditolak' ? '<span style="color:#f43f5e;font-weight:700">? Ditolak</span>' :
                       '<span style="color:#f59e0b;font-weight:700">? Baru</span>';
        return '<tr>' +
          '<td>' + nm + '</td>' +
          '<td>' + amt + '</td>' +
          '<td>' + when + '</td>' +
          '<td>' + stBadge + '</td>' +
          '<td>' +
            '<button class="btn btn-primary" onclick="donasiApprove(' + i + ',\'disetujui\')" style="padding:0.3rem 0.5rem;font-size:0.75rem"><i class="fa-solid fa-check"></i></button> ' +
            '<button class="btn btn-outline" onclick="donasiApprove(' + i + ',\'ditolak\')" style="padding:0.3rem 0.5rem;font-size:0.75rem"><i class="fa-solid fa-xmark"></i></button>' +
          '</td>' +
        '</tr>';
      }).join('');
    }
  }
}

function approveVendor(i) {
  var item = BIVAK.pendingVendors.splice(i, 1)[0];
  if (!item) return;
  BIVAK.vendors.unshift(item);
  BIVAK.save();
  renderVendors();
  renderAdminTables();
  updateBadges();
  BIVAK.notify("success", "Vendor Disetujui", "Vendor kini tampil di daftar publik.");
}

function rejectVendor(i) {
  BIVAK.pendingVendors.splice(i, 1);
  BIVAK.save();
  renderAdminTables();
  updateBadges();
  BIVAK.notify("info", "Vendor Ditolak", "Pengajuan vendor telah dihapus dari antrean.");
}

function removeActiveVendor(i) {
  if (!confirm('Hapus vendor ini dari katalog?')) return;
  BIVAK.vendors.splice(i, 1);
  BIVAK.save();
  renderVendors();
  renderAdminTables();
  updateBadges();
}

function openModal(id) {
  var m = BIVAK.el(id);
  if (!m) return;
  m.classList.add('active');
  closeMobileMenu();
  BIVAK.lockScroll(true);
}

function closeModal(id) {
  var m = BIVAK.el(id);
  if (m) m.classList.remove('active');
  // Buka kunci hanya kalau tidak ada modal lain yang masih terbuka
  if (!document.querySelector('.modal-overlay.active')) BIVAK.lockScroll(false);
}

function updateBadges() {
  var coinBadge = BIVAK.el('coinAdminBadge');
  if (coinBadge) {
    var count = BIVAK.pendingVendors.length;
    coinBadge.textContent = count;
    coinBadge.style.display = count > 0 ? 'inline-flex' : 'none';
  }

  var pendingBadge = BIVAK.el('pendingTabBadge');
  if (pendingBadge) pendingBadge.textContent = BIVAK.pendingVendors.length;

  var activeBadge = BIVAK.el('activeTabBadge');
  if (activeBadge) activeBadge.textContent = BIVAK.vendors.length;

  var donasiBadge = BIVAK.el('donasiTabBadge');
  if (donasiBadge) donasiBadge.textContent = BIVAK.donations.length;

  var statVendors = BIVAK.el('statVendorsCount');
  if (statVendors) statVendors.textContent = BIVAK.vendors.length;

  var statDonation = BIVAK.el('statDonationTotal');
  if (statDonation) {
    var total = BIVAK.donations.filter(function(d) { return d.astatus === 'disetujui'; }).reduce(function(s, d) { return s + d.amt; }, 0);
    statDonation.textContent = total.toLocaleString('id-ID');
  }
}

// Backdrop dibuat sekali lalu dipakai ulang
BIVAK.navBackdrop = function() {
  var el = document.getElementById('navBackdrop');
  if (!el) {
    el = document.createElement('div');
    el.id = 'navBackdrop';
    el.className = 'nav-backdrop';
    el.addEventListener('click', closeMobileMenu);
    document.body.appendChild(el);
  }
  return el;
};

function toggleMobileMenu() {
  var menu = BIVAK.el('navMenu');
  var icon = BIVAK.el('mobileToggleIcon');
  var open = menu ? !menu.classList.contains('active') : false;
  if (menu) menu.classList.toggle('active', open);
  if (icon) {
    icon.classList.toggle('fa-bars', !open);
    icon.classList.toggle('fa-xmark', open);
  }
  BIVAK.navBackdrop().classList.toggle('active', open);
  BIVAK.lockScroll(open);
}

function closeMobileMenu() {
  var menu = BIVAK.el('navMenu');
  var icon = BIVAK.el('mobileToggleIcon');
  if (menu) menu.classList.remove('active');
  if (icon) {
    icon.classList.add('fa-bars');
    icon.classList.remove('fa-xmark');
  }
  BIVAK.navBackdrop().classList.remove('active');
  if (!document.querySelector('.modal-overlay.active')) BIVAK.lockScroll(false);
}

function filterByCity(city) {
  var c = BIVAK.el('cityFilter');
  if (c) c.value = city;
  filterVendors();
  var k = BIVAK.el('katalog');
  if (k) k.scrollIntoView({behavior: 'smooth'});
}

/* ---------------------------------------------------------------------
   Helper tampilan
   --------------------------------------------------------------------- */

// Daftar foto vendor yang tersedia di assets/.
BIVAK.vendorPhotos = ['makassar', 'gowa', 'malino', 'maros', 'toraja', 'palopo'];

// Foto placeholder lama/generik yang harus diganti foto per-kota.
BIVAK.isGenericPhoto = function(src) {
  if (!src) return true;
  if (src.indexOf('unsplash') !== -1) return true;
  return /assets\/(gear-tent|gear-carrier|gear-fallback|hero-bg)/.test(src);
};

// Pilih foto berdasarkan kota. Kota tak dikenal dipetakan secara
// deterministik ke salah satu foto, supaya tidak ada dua vendor
// berurutan yang memakai gambar sama.
BIVAK.photoForVendor = function(name, city) {
  var key = String(city || '').toLowerCase();
  var map = [
    ['makassar', 'makassar'], ['gowa', 'gowa'], ['sungguminasa', 'gowa'],
    ['malino', 'malino'], ['maros', 'maros'], ['rammang', 'maros'],
    ['toraja', 'toraja'], ['tator', 'toraja'], ['rantepao', 'toraja'],
    ['palopo', 'palopo'], ['luwu', 'palopo']
  ];
  for (var i = 0; i < map.length; i++) {
    if (key.indexOf(map[i][0]) !== -1) return 'assets/vendor-' + map[i][1] + '.jpg';
  }
  // FNV-1a: stabil antar-reload dan menyebar jauh lebih rata daripada
  // hash shift-kurang, supaya kota tak dikenal tidak menumpuk di satu foto.
  var seed = String(name || '') + key;
  var h = 2166136261;
  for (var j = 0; j < seed.length; j++) {
    h ^= seed.charCodeAt(j);
    h = (h * 16777619) >>> 0;
  }
  return 'assets/vendor-' + BIVAK.vendorPhotos[h % BIVAK.vendorPhotos.length] + '.jpg';
};

// Sumber tunggal untuk foto vendor + varian lebar 600px untuk srcset.
BIVAK.vendorImg = function(v, width) {
  var src = (v && v.image) ? v.image : '';
  // Apa pun sumber datanya (hardcoded / Supabase / vendor baru), foto
  // generik selalu diganti foto per-kota supaya tidak seragam.
  if (BIVAK.isGenericPhoto(src)) {
    src = BIVAK.photoForVendor(v && v.name, v && v.city);
  }
  if (width === 600 && /^assets\/vendor-[a-z]+\.jpg$/.test(src)) {
    return src.replace(/\.jpg$/, '@600.jpg');
  }
  return src;
};

// Pakai toast bila tersedia, alert hanya sebagai jaring pengaman.
BIVAK.notify = function(type, title, message) {
  if (typeof window.toast === 'function') { window.toast(type, title, message); return; }
  alert(title + '\n' + message);
};

// Kunci scroll body saat modal / menu terbuka supaya latar tidak ikut bergerak.
BIVAK.lockScroll = function(locked) {
  document.body.classList.toggle('no-scroll', !!locked);
};
