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
    } catch(e) {}
  },

  save: function() {
    try {
      localStorage.setItem('bivak_vendors', JSON.stringify(this.vendors));
      localStorage.setItem('bivak_pending', JSON.stringify(this.pendingVendors));
      localStorage.setItem('bivak_donations', JSON.stringify(this.donations));
    } catch(e) {}
  },

  rupiah: function(num) {
    return 'Rp ' + Number(num).toLocaleString('id-ID');
  },

  escape: function(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  el: function(id) { return document.getElementById(id); }
};

// Image preview handlers
window.previewVendorLogo = function(input) {
  var container = BIVAK.el('logoPreviewContainer');
  var preview = BIVAK.el('logoPreview');
  if (!input || !input.files || !input.files[0]) {
    if (container) container.style.display = 'none';
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    if (preview) preview.src = e.target.result;
    if (container) container.style.display = 'block';
  };
  reader.readAsDataURL(input.files[0]);
};

window.previewVendorCollage = function(input) {
  var container = BIVAK.el('collagePreviewContainer');
  var preview = BIVAK.el('collagePreview');
  if (!input || !input.files || !input.files[0]) {
    if (container) container.style.display = 'none';
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    if (preview) preview.src = e.target.result;
    if (container) container.style.display = 'block';
  };
  reader.readAsDataURL(input.files[0]);
};

document.addEventListener('DOMContentLoaded', function() {
  BIVAK.load();
  renderVendors();
  updateBadges();
});

window.renderVendors = function(filteredList) {
  var container = BIVAK.el('vendorGridContainer');
  if (!container) return;

  var list = filteredList || BIVAK.vendors;

  if (list.length === 0) {
    container.innerHTML = '<div style="grid-column:span 3;text-align:center;padding:4rem 1rem;background:var(--bg-card);border-radius:var(--radius-lg);border:1px dashed var(--border-glass);"><i class="fa-solid fa-store-slash" style="font-size:3rem;color:var(--text-dim);margin-bottom:1rem;"></i><h3 style="color:#fff;">Tidak Ada Vendor</h3><p style="color:var(--text-muted)">Coba ubah filter pencarian.</p></div>';
    return;
  }

  container.innerHTML = list.map(function(v) {
    var logoSrc = v.logo || 'assets/gear-fallback.jpg';
    var collageSrc = v.collage || '';
    var hasCollage = collageSrc && collageSrc !== '';

    return '<div class="vendor-card">' +
      '<div class="vendor-cover">' +
        (hasCollage
          ? '<img src="' + BIVAK.escape(collageSrc) + '" srcset="" alt="Kolase peralatan ' + BIVAK.escape(v.name) + '" width="600" height="400" loading="lazy" decoding="async" style="object-fit:cover">'
          : '<img src="' + BIVAK.vendorImg(v) + '" srcset="' + BIVAK.vendorImg(v, 600) + ' 600w, ' + BIVAK.vendorImg(v) + ' 1200w" sizes="(max-width:640px) 100vw, 360px" alt="Foto perlengkapan ' + BIVAK.escape(v.name) + '" width="600" height="400" loading="lazy" decoding="async" onerror="this.onerror=null;this.removeAttribute(\'srcset\');this.src=\'' + BIVAK.escape(BIVAK.photoForVendor(v.name, v.city)) + '\'">') +
        '<div class="location-badge"><i class="fa-solid fa-location-dot"></i> ' + BIVAK.escape(v.city) + '</div>' +
        (v.verified ? '<div class="verified-badge"><i class="fa-solid fa-circle-check"></i> Terverifikasi</div>' : '') +
        (hasCollage ? '<div class="collage-badge"><i class="fa-solid fa-images"></i> Foto Koleksi</div>' : '') +
      '</div>' +
      '<div class="vendor-body">' +
        '<div class="vendor-header">' +
          '<div class="vendor-avatar">' +
            '<img src="' + BIVAK.escape(logoSrc) + '" alt="Logo ' + BIVAK.escape(v.name) + '" width="40" height="40" loading="lazy" decoding="async" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid var(--primary-emerald)">' +
          '</div>' +
          '<div class="vendor-title-wrap">' +
            '<h3 class="vendor-title">' + BIVAK.escape(v.name) + '</h3>' +
            '<div class="vendor-rating"><i class="fa-solid fa-star"></i> ' + (v.rating || 4.8) + ' (' + (v.reviews || 25) + ')</div>' +
          '</div>' +
        '</div>' +
        '<div class="vendor-address"><i class="fa-solid fa-map-pin"></i> ' + BIVAK.escape(v.address || v.city) + '</div>' +
        '<div class="gear-tags">' + (v.gears || []).slice(0,4).map(function(g) {
          return '<span class="tag"><i class="fa-solid fa-campground"></i> ' + BIVAK.escape(g) + '</span>';
        }).join('') + '</div>' +
        '<div class="vendor-footer">' +
          '<div class="vendor-price">Sewa Mulai <span>' + BIVAK.rupiah(v.minPrice || 15000) + '/hr</span></div>' +
          '<div style="display:flex;gap:0.5rem">' +
            '<button class="btn btn-outline" onclick="openVendorDetail(' + v.id + ')" style="padding:0.5rem 0.8rem;font-size:0.82rem"><i class="fa-solid fa-eye"></i> <span class="btn-label-detail">Lihat</span></button>' +
            '<a href="https://wa.me/' + v.phone + '?text=Halo%20' + encodeURIComponent(v.name) + '%2C%20saya%20menemukan%20vendor%20Anda%20di%20BIVAK" target="_blank" class="btn btn-whatsapp" style="padding:0.5rem 0.8rem;font-size:0.82rem"><i class="fa-brands fa-whatsapp"></i> WA</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

window.filterVendors = function() {
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

window.openVendorDetail = function(id) {
  var v = BIVAK.vendors.find(function(x) { return x.id === id; });
  if (!v) return;

  var logoSrc = v.logo || 'assets/gear-fallback.jpg';
  var collageSrc = v.collage || '';
  var hasCollage = collageSrc && collageSrc !== '';

  BIVAK.el('detailVendorTitle').textContent = v.name;
  BIVAK.el('detailVendorBody').innerHTML =
    '<div style="display:flex;gap:1.5rem;flex-wrap:wrap;margin-bottom:1.5rem">' +
      (hasCollage
        ? '<img src="' + BIVAK.escape(collageSrc) + '" alt="Kolase peralatan ' + BIVAK.escape(v.name) + '" width="200" height="160" loading="lazy" decoding="async" style="width:200px;height:160px;object-fit:cover;border-radius:var(--radius-md)">'
        : '<img src="' + BIVAK.vendorImg(v) + '" alt="Foto perlengkapan ' + BIVAK.escape(v.name) + '" width="200" height="160" loading="lazy" decoding="async" style="width:200px;height:160px;object-fit:cover;border-radius:var(--radius-md)" onerror="this.onerror=null;this.src=\'assets/gear-fallback.jpg\'">') +
      '<div style="flex:1">' +
        '<div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem">' +
          '<img src="' + BIVAK.escape(logoSrc) + '" alt="Logo" width="40" height="40" style="border-radius:50%;object-fit:cover;border:2px solid var(--primary-emerald)">' +
          '<div>' +
            '<div style="font-size:0.85rem;color:var(--primary-emerald);font-weight:700"><i class="fa-solid fa-location-dot"></i> ' + BIVAK.escape(v.city) + (v.verified ? ' - TERVERIFIKASI' : '') + '</div>' +
            '<h3 style="color:#fff;font-size:1.1rem;margin:0">' + BIVAK.escape(v.name) + '</h3>' +
          '</div>' +
        '</div>' +
        '<p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:0.75rem"><i class="fa-solid fa-map-pin"></i> ' + BIVAK.escape(v.address || v.city) + '</p>' +
        '<div style="display:flex;gap:0.5rem;align-items:center">' +
          '<span class="vendor-rating"><i class="fa-solid fa-star"></i> ' + (v.rating || 4.8) + '</span>' +
          '<span style="color:var(--text-muted);font-size:0.85rem">Sewa mulai <strong>' + BIVAK.rupiah(v.minPrice || 15000) + '/hari</strong></span>' +
        '</div>' +
        (hasCollage ? '<div style="margin-top:0.5rem"><span class="tag"><i class="fa-solid fa-images"></i> Kolase Tersedia</span></div>' : '') +
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

window.selTier = function(n) {
  BIVAK.tierSelected = n;
  var btns = document.querySelectorAll('.tier-btn');
  for (var i = 0; i < btns.length; i++) {
    var match = parseInt(btns[i].getAttribute('data-amount'), 10) === n;
    btns[i].classList.toggle('on', match);
    btns[i].setAttribute('aria-pressed', match ? 'true' : 'false');
  }
  BIVAK.fillDonasiNominal();
}

BIVAK.fillDonasiNominal = function() {
  var input = BIVAK.el('inputDonasiNominal');
  if (input) input.value = BIVAK.tierSelected || '';
  var hint = BIVAK.el('donasiNominalHint');
  if (!hint) return;
  hint.textContent = BIVAK.tierSelected
    ? 'Terisi dari pilihan Anda: Rp ' + Number(BIVAK.tierSelected).toLocaleString('id-ID') + '. Ubah bila perlu.'
    : 'Pilih nominal diatas atau isi manual.';
};

window.donasi = function() {
  BIVAK.fillDonasiNominal();
  openModal('modalDonasi');
}

window.handleDonasiSubmit = function(e) {
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

window.renderDonationList = function() {
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
    var medals = ['ðŸ¥‡', 'ðŸ¥ˆ', 'ðŸ¥‰'];
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

window.donasiApprove = function(i, st) {
  if (i < 0 || i >= BIVAK.donations.length) return;

  BIVAK.donations[i].astatus = st;
  BIVAK.save();

  renderAdminTables();
  updateBadges();

  BIVAK.notify(st === 'disetujui' ? "success" : "info", st === 'disetujui' ? "Donasi Disetujui" : "Donasi Ditolak", "Status donasi berhasil diperbarui.");
}

window.donasiDeleteLocal = function(i) {
  if (i < 0 || i >= BIVAK.donations.length) return;
  var d = BIVAK.donations[i];
  if (!confirm('Hapus permanen donasi dari "' + (d.nama || 'Donatur') + '"? Tindakan ini tidak bisa dibatalkan.')) return;
  BIVAK.donations.splice(i, 1);
  BIVAK.save();
  renderAdminTables();
  updateBadges();
  BIVAK.notify("info", "Donasi Dihapus", "Data donasi telah dihapus dari daftar.");
}

window.handleVendorSubmit = function(e) {
  e.preventDefault();
  console.log('[DEBUG] handleVendorSubmit called');

  var nameEl = BIVAK.el('inputVendorName');
  var cityEl = BIVAK.el('inputVendorCity');
  var phoneEl = BIVAK.el('inputVendorPhone');
  var addrEl = BIVAK.el('inputVendorAddress');
  var gearsEl = BIVAK.el('inputVendorGears');
  var priceEl = BIVAK.el('inputVendorMinPrice');
  var logoInput = BIVAK.el('inputVendorLogo');
  var collageInput = BIVAK.el('inputVendorCollage');

  console.log('[DEBUG] Form elements:', {
    name: nameEl ? nameEl.value : 'NULL',
    city: cityEl ? cityEl.value : 'NULL',
    phone: phoneEl ? phoneEl.value : 'NULL',
    gears: gearsEl ? gearsEl.value : 'NULL'
  });

  var vendor = {
    id: Date.now(),
    name: nameEl ? nameEl.value.trim() : '',
    city: cityEl ? cityEl.value : '',
    phone: phoneEl ? phoneEl.value.trim() : '',
    address: addrEl ? addrEl.value.trim() : '',
    gears: gearsEl ? gearsEl.value.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [],
    minPrice: priceEl ? (parseInt(priceEl.value) || 15000) : 15000,
    image: 'assets/gear-fallback.jpg',
    verified: false,
    logo: null,
    collage: null
  };

  console.log('[DEBUG] Vendor object created:', vendor);

  if (!vendor.name || !vendor.phone) {
    BIVAK.notify("error", "Data Belum Lengkap", "Lengkapi nama dan nomor WhatsApp.");
    return;
  }

  // Read logo file
  if (logoInput && logoInput.files && logoInput.files[0]) {
    var logoReader = new FileReader();
    logoReader.onload = function(evt) {
      vendor.logo = evt.target.result;
      // Read collage file then save
      if (collageInput && collageInput.files && collageInput.files[0]) {
        var collageReader = new FileReader();
        collageReader.onload = function(evt) {
          vendor.collage = evt.target.result;
          finishVendorSubmit(vendor);
        };
        collageReader.readAsDataURL(collageInput.files[0]);
      } else {
        finishVendorSubmit(vendor);
      }
    };
    logoReader.readAsDataURL(logoInput.files[0]);
  } else {
    // Read collage file only
    if (collageInput && collageInput.files && collageInput.files[0]) {
      var collageReader = new FileReader();
      collageReader.onload = function(evt) {
        vendor.collage = evt.target.result;
        finishVendorSubmit(vendor);
      };
      collageReader.readAsDataURL(collageInput.files[0]);
    } else {
      finishVendorSubmit(vendor);
    }
  }
}

window.finishVendorSubmit = function(vendor) {
  console.log('[DEBUG] finishVendorSubmit called with:', vendor);
  BIVAK.pendingVendors.push(vendor);
  BIVAK.save();
  console.log('[DEBUG] pendingVendors after push:', BIVAK.pendingVendors.length);
  console.log('[DEBUG] localStorage bivak_pending:', localStorage.getItem('bivak_pending'));

  closeModal('modalVendor');
  var form = BIVAK.el('formAddVendor');
  if (form) form.reset();

  // Reset previews
  var logoContainer = BIVAK.el('logoPreviewContainer');
  var collageContainer = BIVAK.el('collagePreviewContainer');
  if (logoContainer) logoContainer.style.display = 'none';
  if (collageContainer) collageContainer.style.display = 'none';

  updateBadges();
  renderAdminTables();
  BIVAK.notify("success", "Pengajuan Terkirim", "Iklan Anda masuk antrean approval admin.");
}


window.switchAdminTab = function(tabName) {
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

  if (tabName === 'adopsi') {
    if (typeof renderAdopsiAdmin === 'function') {
      renderAdopsiAdmin()
    } else {
      if (typeof window.renderAdopsiAdmin === 'function') {
        window.renderAdopsiAdmin()
      } else {
      }
    }
  }
}

window.renderAdminTables = function() {
  console.log('[DEBUG] renderAdminTables called, pendingVendors count:', BIVAK.pendingVendors.length);
  var pendingBody = BIVAK.el('tablePendingVendorsBody');
  console.log('[DEBUG] pendingBody element:', pendingBody ? 'FOUND' : 'NULL');
  if (pendingBody) {
    if (BIVAK.pendingVendors.length === 0) {
      pendingBody.innerHTML = '<tr><td colspan="7" class="admin-tab-desc" style="text-align:center">Tidak ada antrean.</td></tr>';
    } else {
      pendingBody.innerHTML = BIVAK.pendingVendors.map(function(pv, i) {
        var logoThumb = pv.logo
          ? '<img src="' + BIVAK.escape(pv.logo) + '" alt="Logo" width="32" height="32" style="border-radius:50%;object-fit:cover;border:1px solid var(--primary-emerald)">'
          : '<div style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:var(--text-muted)"><i class="fa-solid fa-camera"></i></div>';
        var collageThumb = pv.collage
          ? '<img src="' + BIVAK.escape(pv.collage) + '" alt="Kolase" width="64" height="48" style="border-radius:4px;object-fit:cover;border:1px solid var(--border-glass)">'
          : '<span style="color:var(--text-muted);font-size:0.78rem">-</span>';
        return '<tr>' +
          '<td><strong>' + BIVAK.escape(pv.name) + '</strong><br><small style="color:var(--text-muted)">' + BIVAK.escape(pv.city) + '</small></td>' +
          '<td>' + BIVAK.escape(pv.phone) + '</td>' +
          '<td><small>' + (pv.gears || []).slice(0,3).join(', ') + '</small></td>' +
          '<td>' + BIVAK.rupiah(pv.minPrice) + '</td>' +
          '<td style="text-align:center">' + logoThumb + '</td>' +
          '<td>' + collageThumb + '</td>' +
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
      var logoThumb = av.logo
        ? '<img src="' + BIVAK.escape(av.logo) + '" alt="Logo" width="32" height="32" style="border-radius:50%;object-fit:cover;border:1px solid var(--primary-emerald)">'
        : '<div style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:var(--text-muted)"><i class="fa-solid fa-camera"></i></div>';
      var collageThumb = av.collage
        ? '<img src="' + BIVAK.escape(av.collage) + '" alt="Kolase" width="64" height="48" style="border-radius:4px;object-fit:cover;border:1px solid var(--border-glass)">'
        : '<span style="color:var(--text-muted);font-size:0.78rem">-</span>';
      return '<tr>' +
        '<td><strong>' + BIVAK.escape(av.name) + '</strong></td>' +
        '<td>' + BIVAK.escape(av.city) + '</td>' +
        '<td><i class="fa-solid fa-star color-amber"></i> ' + (av.rating || 4.8) + '</td>' +
        '<td><span class="status-tag status-approved">Tayang</span></td>' +
        '<td style="text-align:center">' + logoThumb + '</td>' +
        '<td>' + collageThumb + '</td>' +
        '<td><button class="btn btn-outline" onclick="removeActiveVendor(' + i + ')" style="padding:0.3rem 0.6rem;font-size:0.75rem">Hapus</button></td>' +
      '</tr>';
    }).join('');
  }

  var donasiBody = BIVAK.el('tableDonasiBody');
  if (donasiBody) {
    if (BIVAK.donations.length === 0) {
      donasiBody.innerHTML = '<tr><td colspan="5" class="admin-tab-desc" style="text-align:center">Belum ada donasi.</td></tr>';
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
            '<button class="btn btn-outline" onclick="donasiApprove(' + i + ',\'ditolak\')" style="padding:0.3rem 0.5rem;font-size:0.75rem"><i class="fa-solid fa-xmark"></i></button> ' +
            '<button class="btn btn-outline" onclick="donasiDeleteLocal(' + i + ')" title="Hapus donasi" style="padding:0.3rem 0.5rem;font-size:0.75rem;border-color:var(--accent-rose);color:var(--accent-rose)"><i class="fa-solid fa-trash"></i></button>' +
          '</td>' +
        '</tr>';
      }).join('');
    }
  }
}

window.approveVendor = function(i) {
  var item = BIVAK.pendingVendors.splice(i, 1)[0];
  if (!item) return;
  BIVAK.vendors.unshift(item);
  BIVAK.save();
  renderVendors();
  renderAdminTables();
  updateBadges();
  BIVAK.notify("success", "Vendor Disetujui", "Vendor kini tampil di daftar publik.");
}

window.rejectVendor = function(i) {
  BIVAK.pendingVendors.splice(i, 1);
  BIVAK.save();
  renderAdminTables();
  updateBadges();
  BIVAK.notify("info", "Vendor Ditolak", "Pengajuan vendor telah dihapus dari antrean.");
}

window.removeActiveVendor = function(i) {
  if (!confirm('Hapus vendor ini dari katalog?')) return;
  BIVAK.vendors.splice(i, 1);
  BIVAK.save();
  renderVendors();
  renderAdminTables();
  updateBadges();
}


window.goMobileSection = function(id) {
  var target = document.getElementById(id);
  if (!target) return;
  closeMobileMenu();
  var y = target.getBoundingClientRect().top + window.pageYOffset - 76;
  window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
}

window.openModal = function(id) {
  var m = BIVAK.el(id);
  if (!m) return;
  m.classList.add('active');
  closeMobileMenu();
  BIVAK.lockScroll(true);
}

window.closeModal = function(id) {
  var m = BIVAK.el(id);
  if (m) m.classList.remove('active');
  if (!document.querySelector('.modal-overlay.active')) BIVAK.lockScroll(false);
}

window.updateBadges = function() {
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

window.toggleMobileMenu = function() {
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

window.closeMobileMenu = function() {
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

window.filterByCity = function(city) {
  var c = BIVAK.el('cityFilter');
  if (c) c.value = city;
  filterVendors();
  var k = BIVAK.el('katalog');
  if (k) k.scrollIntoView({behavior: 'smooth'});
}

/* ---------------------------------------------------------------------
   Helper tampilan
   --------------------------------------------------------------------- */

BIVAK.vendorPhotos = ['makassar', 'gowa', 'malino', 'maros', 'toraja', 'palopo'];

BIVAK.isGenericPhoto = function(src) {
  if (!src) return true;
  if (src.indexOf('unsplash') !== -1) return true;
  return /assets\/(gear-tent|gear-carrier|gear-fallback|hero-bg)/.test(src);
};

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
  var seed = String(name || '') + key;
  var h = 2166136261;
  for (var j = 0; j < seed.length; j++) {
    h ^= seed.charCodeAt(j);
    h = (h * 16777619) >>> 0;
  }
  return 'assets/vendor-' + BIVAK.vendorPhotos[h % BIVAK.vendorPhotos.length] + '.jpg';
};

BIVAK.vendorImg = function(v, width) {
  var src = (v && v.image) ? v.image : '';
  if (BIVAK.isGenericPhoto(src)) {
    src = BIVAK.photoForVendor(v && v.name, v && v.city);
  }
  if (width === 600 && /^assets\/vendor-[a-z]+\.jpg$/.test(src)) {
    return src.replace(/\.jpg$/, '@600.jpg');
  }
  if (!src) return BIVAK.photoForVendor(v && v.name, v && v.city);
  return src;
};

BIVAK.notify = function(type, title, message) {
  if (typeof window.toast === 'function') { window.toast(type, title, message); return; }
  alert(title + '\n' + message);
};

BIVAK.lockScroll = function(locked) {
  document.body.classList.toggle('no-scroll', !!locked);
};


/* ==========================================================================
   Panel tergulung: Donasi & Adopsi
   ==========================================================================
   Di HP kedua panel tertutup secara bawaan supaya scroll jauh lebih pendek.
   Di layar lebar panel dibuka agar tampilan desktop tidak terasa kosong.
   ========================================================================== */
window.toggleSection = function (id, btn, forceOpen) {
  var panel = document.getElementById(id);
  if (!panel) return false;

  var open = (typeof forceOpen === 'boolean')
    ? forceOpen
    : !panel.classList.contains('open');

  if (open) panel.classList.add('open');
  else panel.classList.remove('open');

  var b = btn || document.querySelector('[aria-controls=' + id + ']');
  if (b) {
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
    var teks = b.querySelector('.collapse-label-text');
    if (teks) {
      var label = open ? b.getAttribute('data-close') : b.getAttribute('data-open');
      if (label) teks.textContent = label;
    }
  }
  return open;
};

BIVAK.collapsiblePanels = ['donasiPanel', 'adopsiPanel', 'impactPanel'];

window.openPanelFromHash = function() {
  var peta = { donasi: 'donasiPanel', adopsi: 'adopsiPanel' };
  var kunci = (location.hash || '').replace('#', '');
  var id = peta[kunci];
  if (id) window.toggleSection(id, null, true);
}

window.initCollapsibles = function() {
  var hp = window.matchMedia('(max-width: 640px)').matches;
  for (var i = 0; i < BIVAK.collapsiblePanels.length; i++) {
    window.toggleSection(BIVAK.collapsiblePanels[i], null, !hp);
  }
  openPanelFromHash();
}

window.addEventListener('hashchange', openPanelFromHash);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCollapsibles);
} else {
  initCollapsibles();
}
