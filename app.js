/**
 * BIVAK v5 - Clean Build (ES5 Compatible)
 * Simple, reliable, no external dependencies
 */

var BIVAK = {
  vendors: [
    {id:1,name:"Celebes Outdoor Rental Makassar",city:"Makassar",phone:"6281245678901",rating:4.9,reviews:128,minPrice:15000,gears:["Tenda Dome 4P","Carrier 75L","Sleeping Bag","Kompor Portable"],image:"assets/gear-tent.png",verified:true},
    {id:2,name:"Bawakaraeng Adventure Gowa",city:"Gowa",phone:"6285299887766",rating:4.8,reviews:95,minPrice:12000,gears:["Tenda 2-6P","Tracking Pole Carbon","Nesting Cookset","Lampu LED"],image:"assets/gear-carrier.png",verified:true},
    {id:3,name:"Malino Highland Camp Gear",city:"Malino",phone:"6282188990011",rating:5.0,reviews:74,minPrice:20000,gears:["Tenda Family Luxury","Matras Thermal","Hammock Double","Grill Barbeque"],image:"assets/hero-bg.png",verified:true},
    {id:4,name:"Rammang-Rammang Outdoor Maros",city:"Maros",phone:"6281355443322",rating:4.7,reviews:62,minPrice:15000,gears:["Tenda Glamping","Life Jacket","Kompor Ultralight","Headlamp"],image:"assets/gear-tent.png",verified:true},
    {id:5,name:"Toraja Highland Explorer",city:"Toraja",phone:"6281142009988",rating:4.9,reviews:110,minPrice:25000,gears:["Sepatu Tracking","Jaket Windproof","Carrier 60L","GPS Navigation"],image:"assets/gear-tent.png",verified:true},
    {id:6,name:"Palopo Camp & Trail Base",city:"Palopo",phone:"6285341122334",rating:4.6,reviews:48,minPrice:15000,gears:["Tenda Dome","Sleeping Bag","Kompor Mawar","Botol Tumbler"],image:"assets/gear-carrier.png",verified:true}
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
    container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-store-slash empty-state-icon"></i><h3 class="empty-state-title">Tidak Ada Vendor</h3><p class="empty-state-desc">Coba ubah filter pencarian.</p></div>';
    return;
  }

  container.innerHTML = list.map(function(v) {
    return '<div class="vendor-card">' +
      '<div class="vendor-cover">' +
        '<img src="' + (v.image || 'assets/gear-tent.png') + '" alt="' + BIVAK.escape(v.name) + '" onerror="this.src=\'assets/gear-tent.png\'">' +
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
          '<div class="btn-row-gap">' +
            '<button class="btn btn-outline btn-with-icon" onclick="openVendorDetail(' + v.id + ')"><i class="fa-solid fa-eye"></i> Detail</button>' +
            '<a href="https://wa.me/' + v.phone + '?text=Halo%20' + encodeURIComponent(v.name) + '%2C%20saya%20menemukan%20vendor%20Anda%20di%20BIVAK" target="_blank" class="btn btn-whatsapp btn-with-icon"><i class="fa-brands fa-whatsapp"></i> WA</a>' +
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
    '<div class="detail-grid">' +
      '<img src="' + (v.image || 'assets/gear-tent.png') + '" class="detail-img" onerror="this.src=\'assets/gear-tent.png\'">' +
      '<div class="detail-content">' +
        '<div class="detail-location"><i class="fa-solid fa-location-dot"></i> ' + BIVAK.escape(v.city) + (v.verified ? ' - TERVERIFIKASI' : '') + '</div>' +
        '<h3 class="detail-title">' + BIVAK.escape(v.name) + '</h3>' +
        '<p class="detail-address"><i class="fa-solid fa-map-pin"></i> ' + BIVAK.escape(v.address || v.city) + '</p>' +
        '<div class="detail-price">' +
          '<span class="vendor-rating"><i class="fa-solid fa-star"></i> ' + (v.rating || 4.8) + '</span>' +
          ' Sewa mulai <strong>' + BIVAK.rupiah(v.minPrice || 15000) + '/hari</strong>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<h4 class="gear-list-title">Daftar Peralatan</h4>' +
    '<div class="gear-list">' +
      (v.gears || []).map(function(g) {
        return '<div class="gear-item"><i class="fa-solid fa-circle-check color-emerald"></i> ' + BIVAK.escape(g) + '</div>';
      }).join('') +
    '</div>' +
    '<div class="detail-actions">' +
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
    alert('Isi nama dan nominal donasi dengan benar!');
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

  alert('Donasi berhasil disimpan! Nama Anda akan muncul setelah diverifikasi admin. Terima kasih! ??');
}

function renderDonationList() {
  var approved = BIVAK.donations.filter(function(d) { return d.astatus === 'disetujui'; });
  var allDonors = approved.slice();

  if (allDonors.length === 0) {
    allDonors = [
      {nama:'Andi Mappanyukki',amt:10000000},
      {nama:'Komunitas Pencinta Alam Makassar',amt:7500000},
      {nama:'Nurul Fadhilah',amt:5000000},
      {nama:'Baso Dg. Nassa',amt:5000000},
      {nama:'Rina Kartika',amt:3500000}
    ];
  }

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

  if (box) {
    var medals = ['🥇','🥈','🥉'];
    box.innerHTML = sorted.slice(0, 15).map(function(d, i) {
      var nm = BIVAK.escape(d.nama || 'Donatur');
      var top = i < 3;
      var rank = top ? medals[i] : '<span class="donor-rank-badge">' + (i+1) + '</span>';
      return '<div class="donor-row' + (top ? ' top' : '') + '"><div class="donor-rank">' + rank + '</div><div class="donor-name">' + nm + '</div><div class="donor-amt">' + BIVAK.rupiah(d.amt || 0) + '</div></div>';
    }).join('');
  }
}

function donasiApprove(i, st) {
  if (i < 0 || i >= BIVAK.donations.length) return;

  BIVAK.donations[i].astatus = st;
  BIVAK.save();

  renderAdminTables();
  updateBadges();

  alert(st === 'disetujui' ? 'Donasi disetujui!' : 'Donasi ditolak.');
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
    image: 'assets/gear-tent.png',
    verified: false
  };

  if (!vendor.name || !vendor.phone) {
    alert('Lengkapi nama dan nomor WhatsApp!');
    return;
  }

  BIVAK.pendingVendors.push(vendor);
  BIVAK.save();

  closeModal('modalVendor');
  var form = BIVAK.el('formAddVendor');
  if (form) form.reset();

  updateBadges();
  alert('Pengajuan berhasil! Iklan Anda masuk antrean approval admin.');
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
  console.log("[BIVAK] switchAdminTab called with:", tabName)
  console.log("[BIVAK] renderAdopsiAdmin available:", typeof renderAdopsiAdmin)
  console.log("[BIVAK] window.renderAdopsiAdmin available:", typeof window.renderAdopsiAdmin)
  if (tabName === 'adopsi') {
    if (typeof renderAdopsiAdmin === 'function') {
      console.log("[BIVAK] Calling renderAdopsiAdmin from local scope")
      renderAdopsiAdmin()
    } else {
      console.warn("[BIVAK] renderAdopsiAdmin not found in local scope, trying window...")
      if (typeof window.renderAdopsiAdmin === 'function') {
        console.log("[BIVAK] Calling renderAdopsiAdmin from window scope")
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
      pendingBody.innerHTML = '<tr><td colspan="5" class="admin-tab-desc" style="text-align:center">Tidak ada antrean.</td></tr>';
    } else {
      pendingBody.innerHTML = BIVAK.pendingVendors.map(function(pv, i) {
        return '<tr>' +
          '<td><strong>' + BIVAK.escape(pv.name) + '</strong><br><small class="admin-tab-desc">' + BIVAK.escape(pv.city) + '</small></td>' +
          '<td>' + BIVAK.escape(pv.phone) + '</td>' +
          '<td><small>' + (pv.gears || []).slice(0,3).join(', ') + '</small></td>' +
          '<td>' + BIVAK.rupiah(pv.minPrice) + '</td>' +
          '<td>' +
            '<button class="btn btn-primary btn-sm" onclick="approveVendor(' + i + ')"><i class="fa-solid fa-check"></i></button> ' +
            '<button class="btn btn-outline btn-reject btn-sm" onclick="rejectVendor(' + i + ')"><i class="fa-solid fa-xmark"></i></button>' +
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
        '<td><i class="fa-solid fa-star color-amber"></i> ' + (av.rating || 4.8) + '</td>' +
        '<td><span class="status-tag status-approved">Tayang</span></td>' +
        '<td><button class="btn btn-outline btn-sm-table" onclick="removeActiveVendor(' + i + ')">Hapus</button></td>' +
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
        var stBadge = st === 'disetujui' ? '<span class="status-dot status-dot-green">✓ Diterima</span>' :
                       st === 'ditolak' ? '<span class="status-dot status-dot-rose">✗ Ditolak</span>' :
                       '<span class="status-dot status-dot-amber">○ Baru</span>';
        return '<tr>' +
          '<td>' + nm + '</td>' +
          '<td>' + amt + '</td>' +
          '<td>' + when + '</td>' +
          '<td>' + stBadge + '</td>' +
          '<td>' +
            '<button class="btn btn-primary btn-approve" onclick="donasiApprove(' + i + ',\'disetujui\')"><i class="fa-solid fa-check"></i></button> ' +
            '<button class="btn btn-outline btn-reject" onclick="donasiApprove(' + i + ',\'ditolak\')"><i class="fa-solid fa-xmark"></i></button>' +
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
  alert('Vendor disetujui!');
}

function rejectVendor(i) {
  BIVAK.pendingVendors.splice(i, 1);
  BIVAK.save();
  renderAdminTables();
  updateBadges();
  alert('Vendor ditolak.');
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
  if (m) m.classList.add('active');
}

function closeModal(id) {
  var m = BIVAK.el(id);
  if (m) m.classList.remove('active');
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

function toggleMobileMenu() {
  var menu = BIVAK.el('navMenu');
  var icon = BIVAK.el('mobileToggleIcon');
  if (menu) menu.classList.toggle('active');
  if (icon) {
    icon.classList.toggle('fa-bars');
    icon.classList.toggle('fa-xmark');
  }
}

function closeMobileMenu() {
  var menu = BIVAK.el('navMenu');
  var icon = BIVAK.el('mobileToggleIcon');
  if (menu) menu.classList.remove('active');
  if (icon) {
    icon.classList.add('fa-bars');
    icon.classList.remove('fa-xmark');
  }
}

function filterByCity(city) {
  var c = BIVAK.el('cityFilter');
  if (c) c.value = city;
  filterVendors();
  var k = BIVAK.el('katalog');
  if (k) k.scrollIntoView({behavior: 'smooth'});
}
