/* ==========================================================================
   BIVAK v4 - Bursa Interaktif Vendor Alam & Komunitas
   Application Logic & State Management
   LELANG DIHAPUS — DIGANTI SISTEM DONASI PINTU ANGIN
   ========================================================================== */

// --- INITIAL MOCK DATA STORAGE ---
let vendorsData = [
  {
    id: 1,
    name: "Celebes Outdoor Rental Makassar",
    city: "Makassar",
    address: "Jl. Sultan Alauddin No. 88, Rappocini, Makassar",
    phone: "6281245678901",
    rating: 4.9,
    reviews: 128,
    minPrice: 15000,
    gears: ["Tenda Dome 4P", "Carrier 75L", "Sleeping Bag", "Kompor Portable", "Flysheet 3x4"],
    image: "assets/gear-tent.png",
    status: "approved",
    isVerified: true
  },
  {
    id: 2,
    name: "Bawakaraeng Adventure Gowa",
    city: "Gowa",
    address: "Jl. Poros Malino Km. 12, Sungguminasa, Gowa",
    phone: "6285299887766",
    rating: 4.8,
    reviews: 95,
    minPrice: 12000,
    gears: ["Tenda Kapasitas 2-6P", "Tracking Pole Carbon", "Nesting Cookset", "Lampu Tenda LED"],
    image: "assets/gear-carrier.png",
    status: "approved",
    isVerified: true
  },
  {
    id: 3,
    name: "Malino Highland Camp Gear",
    city: "Malino",
    address: "Jl. Endang No. 15, kawasan Wisata Malino, Gowa",
    phone: "6282188990011",
    rating: 5.0,
    reviews: 74,
    minPrice: 20000,
    gears: ["Tenda Family Luxury", "Matras Thermal Foil", "Hammock Double", "Grill Barbeque"],
    image: "assets/hero-bg.png",
    status: "approved",
    isVerified: true
  },
  {
    id: 4,
    name: "Rammang-Rammang Outdoor Maros",
    city: "Maros",
    address: "Jl. Poros Maros-Pangkep Km. 5, Salewangang, Maros",
    phone: "6281355443322",
    rating: 4.7,
    reviews: 62,
    minPrice: 15000,
    gears: ["Tenda Glamping", "Life Jacket Water Sport", "Kompor Ultralight", "Headlamp waterproof"],
    image: "assets/gear-tent.png",
    status: "approved",
    isVerified: true
  },
  {
    id: 5,
    name: "Toraja Highland Explorer",
    city: "Toraja",
    address: "Jl. Ahmad Yani No. 24, Rantepao, Toraja Utara",
    phone: "6281142009988",
    rating: 4.9,
    reviews: 110,
    minPrice: 25000,
    gears: ["Sepatu Tracking Waterproof", "Jaket Windproof", "Carrier 60L-80L", "GPS Navigation"],
    image: "assets/gear-tent.png",
    status: "approved",
    isVerified: true
  },
  {
    id: 6,
    name: "Palopo Camp & Trail Base",
    city: "Palopo",
    address: "Jl. Jendral Sudirman No. 102, Wara, Palopo",
    phone: "6285341122334",
    rating: 4.6,
    reviews: 48,
    minPrice: 15000,
    gears: ["Tenda Dome", "Sleeping Bag Polar", "Kompor Mawar", "Botol Tumbler Thermal"],
    image: "assets/gear-carrier.png",
    status: "approved",
    isVerified: true
  }
];

let pendingVendorsData = [
  {
    id: 101,
    name: "Latimojong Peak Gear Enrekang",
    city: "Enrekang",
    address: "Jl. Swadaya No. 9, Baraka, Enrekang",
    phone: "6285211998877",
    minPrice: 20000,
    gears: ["Tenda Expedition Extreme", "Oxygen Canister", "Thermal Blanket", "Carrier 90L"],
    image: "assets/gear-tent.png",
    status: "pending"
  }
];

// --- DONASI (REPLACEMENT FOR LELANG) ---
var _tiers = [20000, 50000, 100000, 250000];
var _tierSel = 50000;
var DONATE_TARGET = 75000000;
var _dummyDonors = [
  {nama:'Andi Mappanyukki',amt:10000000},{nama:'Komunitas Pencinta Alam Makassar',amt:7500000},
  {nama:'Nurul Fadhilah',amt:5000000},{nama:'Baso Dg. Nassa',amt:5000000},
  {nama:'Rina Kartika',amt:3500000},{nama:'Alumni Rimba 45',amt:3000000},
  {nama:'Muh. Ilham',amt:2500000},{nama:'Sitti Aminah',amt:2500000},
  {nama:'Yusuf Pratama',amt:2000000},{nama:'Andi Dg. Tata',amt:1500000},
  {nama:'Hasan Basri',amt:1500000},{nama:'Wahyuni',amt:1000000},
  {nama:'Fajar Nugraha',amt:1000000},{nama:'Hamba Lestari',amt:1000000},
  {nama:'Reza Maulana',amt:500000}
];
var _alloc = [
  {l:'🌱 Bibit & penanaman',v:45},{l:'🛡️ Patroli & pengamanan',v:25},
  {l:'📚 Edukasi & sosialisasi',v:15},{l:'🛠️ Alat & logistik',v:15}
];

var _dnRows = [];
var _dnCloud = false;

function _rupiah(n){return 'Rp '+n.toLocaleString('id-ID');}
function escapeHtml(value){return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#039;');}

// Donasi Functions
function renderTier() {
  document.getElementById('donasiTier') && (document.getElementById('donasiTier').innerHTML = _tiers.map(function(t) {
    return '<button class="tier-btn'+(t===_tierSel?' on':'')+'" onclick="selTier('+t+')">'+_rupiah(t)+'</button>';
  }).join(''));
}
function selTier(t) {
  _tierSel = t;
  document.querySelectorAll('.tier-btn').forEach(function(btn) {
    btn.classList.toggle('on', btn.textContent.trim() === _rupiah(t));
  });
}
function renderAlloc() {
  var el = document.getElementById('allocList');
  if (!el) return;
  el.innerHTML = _alloc.map(function(a) {
    return '<div class="arow"><div class="atop"><span>'+a.l+'</span><span>'+a.v+'%</span></div><div class="quota"><i style="width:'+a.v+'%;background:var(--g-green)"></i></div></div>';
  }).join('');
}

function _approvedDonors() {
  var real = [];
  try {
    var arr = (typeof _lsGet === 'function') ? _lsGet('bivakDonasi', []) : [];
    real = (arr || []).filter(function(d) { return d && d.astatus === 'disetujui'; }).map(function(d) {
      return {nama: d.nama || 'Donatur', amt: +d.amt || 0, fresh: true};
    });
  } catch(e) {}
  return real.concat(_dummyDonors);
}

function _renderDonorList(donors) {
  donors = (donors || []).slice().sort(function(a, b) { return (+b.amt) - (+a.amt); });
  var total = donors.reduce(function(s, d) { return s + (+d.amt || 0); }, 0);
  var pct = Math.min(100, Math.round(total / DONATE_TARGET * 100));

  var col = document.getElementById('dnCollected'); if (col) col.textContent = _rupiah(total);
  var bar = document.getElementById('dnBar'); if (bar) bar.style.width = pct + '%';
  var pc = document.getElementById('dnPct'); if (pc) pc.textContent = pct + '%';

  var box = document.getElementById('dnDonors');
  if (!box) return;
  if (!donors.length) {
    box.innerHTML = '<p class="note" style="text-align:center;padding:20px">Jadilah donatur pertama! 💚</p>';
    return;
  }
  var medal = ['🥇','🥈','🥉'];
  box.innerHTML = donors.map(function(d, i) {
    var nm = escapeHtml(d.nama || 'Donatur');
    var top = i < 3;
    var rank = top ? medal[i] : ('<span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:rgba(140,150,170,.18);color:#8c96aa;font-size:12px;font-weight:800">'+(i+1)+'</span>');
    var bg = top ? 'rgba(16,185,129,.08)' : 'rgba(140,150,170,.05)';
    var bd = top ? '1px solid rgba(16,185,129,.25)' : '1px solid rgba(140,150,170,.14)';
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;margin-bottom:6px;background:'+bg+';border:'+bd+'"><div style="width:28px;text-align:center;flex-shrink:0">'+rank+'</div><div style="flex:1;min-width:0;font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+nm+'</div><div style="font-size:13px;font-weight:800;color:#10b981;white-space:nowrap">'+_rupiah(+d.amt||0)+'</div></div>';
  }).join('');
}

function renderDonation() {
  _renderDonorList(_approvedDonors());
  // If Supabase available, load real data
  if (window.bivakDb) {
    window.bivakDb.from('donasi').select('nama,amt,astatus,created_at')
      .eq('astatus','disetujui').order('created_at',{ascending:false}).then(function(res) {
        if (!res.error) {
          var real = (res.data || []).map(function(d) {
            return {nama: d.nama||'Donatur', amt:+d.amt||0, fresh:false, ts:d.created_at};
          });
          _renderDonorList(real.concat(_dummyDonors));
        }
      }).catch(function(){});
  }
}

function donasi() {
  // Just open the modal - the form inside handles everything
  openModal('modalDonasi');
}

function donasiKirim(n) {
  var nm = prompt('Masukkan nama Anda untuk sertifikat donasi:') || 'Donatur';
  nm = nm.trim();
  if (!nm) { alert('Nama tidak boleh kosong'); return; }

  // Save locally
  try {
    var arr = (typeof _lsGet === 'function') ? _lsGet('bivakDonasi', []) : [];
    arr = arr || [];
    arr.unshift({id: 'D'+Date.now(), nama: nm, amt: n, email: '', ts: new Date().toISOString(), astatus: 'baru'});
    if (typeof _lsSet === 'function') _lsSet('bivakDonasi', arr);
  } catch(e) {}

  // Send to Supabase if available
  if (window.bivakDb) {
    window.bivakDb.from('donasi').insert({nama: nm, amt: n, astatus: 'baru', source: 'bivak'})
      .then(function(res) {
        if (res.error) console.error('[BIVAK] Donasi insert error:', res.error);
        closeModal('modalDonasi');
        toast('success','Donasi Terkirim','Nama Anda akan muncul setelah diverifikasi admin. Terima kasih! 💚',5000);
        renderDonation();
      }).catch(function(){closeModal('modalDonasi'); toast('info','Catatan','Donasi tersimpan lokal, kirim ke admin via WA untuk verifikasi.' );});
  } else {
    closeModal('modalDonasi');
    toast('info','Catatan','Mode demo: donasi tersimpan lokal. Hubungi admin via WhatsApp untuk verifikasi.');
  }
}

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  renderVendors(vendorsData);
  renderDonation();
  renderTier();
  renderAlloc();
  updateBadgesAndStats();
});

// --- MOBILE NAVIGATION ---
function toggleMobileMenu() {
  const menu = document.getElementById("navMenu");
  const icon = document.getElementById("mobileToggleIcon");
  if (!menu) return;
  menu.classList.toggle("active");
  if (menu.classList.contains("active")) {
    icon.classList.remove("fa-bars");
    icon.classList.add("fa-xmark");
  } else {
    icon.classList.remove("fa-xmark");
    icon.classList.add("fa-bars");
  }
}

function closeMobileMenu() {
  const menu = document.getElementById("navMenu");
  const icon = document.getElementById("mobileToggleIcon");
  if (menu && menu.classList.contains("active")) {
    menu.classList.remove("active");
    if (icon) { icon.classList.remove("fa-xmark"); icon.classList.add("fa-bars"); }
  }
}

// --- RENDER VENDORS ---
function renderVendors(list) {
  const container = document.getElementById("vendorGridContainer");
  if (!container) return;
  if (list.length === 0) {
    container.innerHTML = '<div style="grid-column: span 3; text-align: center; padding: 4rem 1rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-glass);"><i class="fa-solid fa-store-slash" style="font-size: 3rem; color: var(--text-dim); margin-bottom: 1rem;"></i><h3 style="color: #fff;">Tidak Ada Vendor Ditemukan</h3><p style="color: var(--text-muted);">Coba ubah kata kunci pencarian atau filter lokasi Anda.</p></div>';
    return;
  }
  container.innerHTML = list.map(v => `
    <div class="vendor-card">
      <div class="vendor-cover">
        <img src="${v.image || 'assets/gear-tent.png'}" alt="${v.name}">
        <div class="location-badge"><i class="fa-solid fa-location-dot"></i> ${v.city}</div>
        ${v.isVerified ? `<div class="verified-badge"><i class="fa-solid fa-circle-check"></i> Terverifikasi</div>` : ''}
      </div>
      <div class="vendor-body">
        <div class="vendor-header">
          <h3 class="vendor-title">${v.name}</h3>
          <div class="vendor-rating"><i class="fa-solid fa-star"></i> ${v.rating || '4.8'} (${v.reviews || '25'})</div>
        </div>
        <div class="vendor-address"><i class="fa-solid fa-map-pin"></i> ${v.address}</div>
        <div class="gear-tags">${v.gears.map(g => `<span class="tag"><i class="fa-solid fa-campground"></i> ${g}</span>`).join('')}</div>
        <div class="vendor-footer">
          <div class="vendor-price">Sewa Mulai <span>Rp ${v.minPrice.toLocaleString('id-ID')}/hr</span></div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-outline" onclick="openVendorDetail(${v.id})" style="padding: 0.5rem 0.8rem; font-size: 0.82rem;"><i class="fa-solid fa-eye"></i> Detail</button>
            <a href="https://wa.me/${v.phone}?text=Halo%20${encodeURIComponent(v.name)},%20saya%20menemukan%20vendor%20Anda%20di%20RCS.CBS%20-%20BIVAK%20dan%20ingin%20tanya%20sewa%20alat%20outdoor." target="_blank" class="btn btn-whatsapp" style="padding: 0.5rem 0.8rem; font-size: 0.82rem;"><i class="fa-brands fa-whatsapp"></i> WA</a>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// --- FILTER VENDORS ---
function filterVendors() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  const city = document.getElementById("cityFilter").value;
  const filtered = vendorsData.filter(v => {
    const matchesQuery = v.name.toLowerCase().includes(query) || v.gears.some(g => g.toLowerCase().includes(query));
    const matchesCity = !city || v.city === city;
    return matchesQuery && matchesCity;
  });
  renderVendors(filtered);
}

function filterByCity(cityName) {
  document.getElementById("cityFilter").value = cityName;
  filterVendors();
  document.getElementById("katalog").scrollIntoView({ behavior: 'smooth' });
}

// --- MODAL CONTROLLERS ---
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("active");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
}

// --- FORM SUBMISSIONS ---
function handleVendorSubmit(e) {
  e.preventDefault();
  const newVendor = {
    id: Date.now(),
    name: document.getElementById("inputVendorName").value,
    city: document.getElementById("inputVendorCity").value,
    phone: document.getElementById("inputVendorPhone").value,
    address: document.getElementById("inputVendorAddress").value,
    gears: document.getElementById("inputVendorGears").value.split(',').map(s => s.trim()),
    minPrice: parseInt(document.getElementById("inputVendorMinPrice").value) || 15000,
    image: "assets/gear-tent.png",
    status: "pending"
  };
  pendingVendorsData.push(newVendor);
  updateBadgesAndStats();
  closeModal("modalVendor");
  document.getElementById("formAddVendor").reset();
  toast("success","Pengajuan Terkirim","Iklan Anda masuk antrean approval Admin BIVAK.");
}

// --- VENDOR DETAIL ---
function openVendorDetail(vendorId) {
  const v = vendorsData.find(item => item.id === vendorId);
  if (!v) return;
  document.getElementById("detailVendorTitle").innerText = v.name;
  document.getElementById("detailVendorBody").innerHTML = `
    <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
      <img src="${v.image}" style="width: 200px; height: 160px; object-fit: cover; border-radius: var(--radius-md); border: 1px solid var(--border-glass);">
      <div style="flex: 1;">
        <div style="font-size: 0.85rem; color: var(--primary-emerald); font-weight: 700; margin-bottom: 0.3rem;"><i class="fa-solid fa-location-dot"></i> ${v.city} - TERVERIFIKASI</div>
        <h3 style="color: #fff; margin-bottom: 0.5rem;">${v.name}</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.75rem;"><i class="fa-solid fa-map-pin"></i> ${v.address}</p>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <span class="vendor-rating"><i class="fa-solid fa-star"></i> ${v.rating || '4.8'} (${v.reviews || '25'} ulasan)</span>
          <span style="color: var(--text-muted); font-size: 0.85rem;">Sewa mulai <strong>Rp ${v.minPrice.toLocaleString('id-ID')}/hari</strong></span>
        </div>
      </div>
    </div>
    <h4 style="color: #fff; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.4rem;">Daftar Peralatan Tersedia</h4>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.5rem;">
      ${v.gears.map(g => `<div style="background: rgba(255,255,255,0.03); padding: 0.6rem 0.9rem; border-radius: var(--radius-sm); border: 1px solid var(--border-glass); color: #e5e7eb; font-size: 0.88rem;"><i class="fa-solid fa-circle-check text-emerald" style="color:#10b981"></i> ${g}</div>`).join('')}
    </div>
    <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
      <button class="btn btn-outline" onclick="closeModal('modalVendorDetail')">Tutup</button>
      <a href="https://wa.me/${v.phone}?text=Halo%20${encodeURIComponent(v.name)},%20saya%20mau%20booking%20sewa%20alat%20outdoor%20lewat%20BIVAK." target="_blank" class="btn btn-whatsapp"><i class="fa-brands fa-whatsapp"></i> Hubungi WhatsApp</a>
    </div>
  `;
  openModal("modalVendorDetail");
}

// --- ADMIN PANEL ---
function openAdminPanel() {
  renderAdminTables();
  openModal("modalAdmin");
}

function switchAdminTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".admin-tab-content").forEach(el => el.style.display = "none");
  if (tabName === "pendingVendors") {
    document.querySelectorAll(".tab-btn")[0].classList.add("active");
    document.getElementById("tabPendingVendors").style.display = "block";
  } else if (tabName === "activeVendors") {
    document.querySelectorAll(".tab-btn")[1].classList.add("active");
    document.getElementById("tabActiveVendors").style.display = "block";
  } else if (tabName === "donasi") {
    document.querySelectorAll(".tab-btn")[2].classList.add("active");
    document.getElementById("tabDonasi").style.display = "block";
  }
}

function renderAdminTables() {
  // Pending Vendors
  const pendingBody = document.getElementById("tablePendingVendorsBody");
  if (!pendingBody) return;
  if (pendingVendorsData.length === 0) {
    pendingBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Tidak ada antrean.</td></tr>';
  } else {
    pendingBody.innerHTML = pendingVendorsData.map(pv => `
      <tr>
        <td><strong>${pv.name}</strong><br><small style="color:var(--text-muted)">${pv.city}</small></td>
        <td>${pv.phone}</td>
        <td><small>${pv.gears.slice(0,3).join(', ')}</small></td>
        <td>Rp ${pv.minPrice.toLocaleString('id-ID')}</td>
        <td>
          <button class="btn btn-primary" onclick="approveVendor(${pv.id})" style="padding:0.35rem 0.7rem;font-size:0.78rem;"><i class="fa-solid fa-check"></i></button>
          <button class="btn btn-outline" onclick="rejectVendor(${pv.id})" style="padding:0.35rem 0.7rem;font-size:0.78rem;border-color:var(--accent-rose);color:var(--accent-rose)"><i class="fa-solid fa-xmark"></i></button>
        </td>
      </tr>
    `).join('');
  }

  // Active Vendors
  const activeBody = document.getElementById("tableActiveVendorsBody");
  if (activeBody) {
    activeBody.innerHTML = vendorsData.map(av => `
      <tr>
        <td><strong>${av.name}</strong></td>
        <td>${av.city}</td>
        <td><i class="fa-solid fa-star" style="color:var(--accent-amber)"></i> ${av.rating||'4.8'}</td>
        <td><span class="status-tag status-approved">Tayang</span></td>
        <td><button class="btn btn-outline" onclick="removeActiveVendor(${av.id})" style="padding:0.3rem 0.6rem;font-size:0.75rem">Hapus</button></td>
      </tr>
    `).join('');
  }

  // Donasi Table
  const donasiBody = document.getElementById("tableDonasiBody");
  if (donasiBody) {
    // Prioritize cloud data, fallback to localStorage
    var donasiRows = _dnRows.length ? _dnRows : (
      function(){try{return (typeof _lsGet==='function')?_lsGet('bivakDonasi',[]):[];}catch(e){return[];}}()
    );

    // Also check if localStorage has data that wasn't loaded to _dnRows
    var lsData = [];
    try {
      lsData = (typeof _lsGet === 'function') ? _lsGet('bivakDonasi', []) : [];
    } catch(e) {}

    // Merge: cloud data first, then add any local-only entries
    if (donasiRows.length === 0 && lsData.length > 0) {
      donasiRows = lsData;
    } else if (_dnCloud && donasiRows.length > 0) {
      // Cloud mode: check for any local entries not in cloud
      var cloudIds = {};
      donasiRows.forEach(function(r) { cloudIds[r.id] = true; });
      lsData.forEach(function(item) {
        if (!cloudIds[item.id]) donasiRows.push(item);
      });
    }

    if (donasiRows.length === 0) {
      donasiBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Belum ada donasi.</td></tr>';
    } else {
      donasiBody.innerHTML = donasiRows.map(function(r,i) {
        var nm = escapeHtml(r.nama||'Donatur');
        var amt = _rupiah(r.amt||0);
         var when = r.created_at || r.ts;
        var st = r.astatus || 'baru';
        var stBadge = st === 'disetujui' ? '<span style="color:#10b981;font-weight:700">✓ Diterima</span>' :
                      st === 'ditolak' ? '<span style="color:#f43f5e;font-weight:700">✗ Ditolak</span>' :
                      '<span style="color:#f59e0b;font-weight:700">⏳ Baru</span>';
        return '<tr><td>'+nm+'</td><td>'+amt+'</td><td>'+((when)?new Date(when).toLocaleDateString('id-ID'):'-')+'</td><td>'+stBadge+'</td><td><button class="btn btn-primary" onclick="donasiApprove('+i+',\'disetujui\')" style="padding:0.3rem 0.5rem;font-size:0.75rem"><i class="fa-solid fa-check"></i></button><button class="btn btn-outline" onclick="donasiApprove('+i+',\'ditolak\')" style="padding:0.3rem 0.5rem;font-size:0.75rem"><i class="fa-solid fa-xmark"></i></button></td></tr>';
      }).join('');
    }
  }
}

function approveVendor(id) {
  const index = pendingVendorsData.findIndex(pv => pv.id === id);
  if (index !== -1) {
    const item = pendingVendorsData.splice(index, 1)[0];
    item.status = "approved";
    item.rating = 5.0;
    item.reviews = 1;
    item.isVerified = true;
    vendorsData.unshift(item);
    renderVendors(vendorsData);
    renderAdminTables();
    updateBadgesAndStats();
    toast("success","Vendor Disetujui","Iklan '"+item.name+"' kini tampil publik.");
  }
}

function rejectVendor(id) {
  const index = pendingVendorsData.findIndex(pv => pv.id === id);
  if (index !== -1) {
    pendingVendorsData.splice(index, 1);
    renderAdminTables();
    updateBadgesAndStats();
    toast("info","Vendor Ditolak","Pengajuan telah dihapus.");
  }
}

function removeActiveVendor(id) {
  if (!confirm("Hapus vendor ini dari katalog publik?")) return;
  vendorsData = vendorsData.filter(v => v.id !== id);
  renderVendors(vendorsData);
  renderAdminTables();
  updateBadgesAndStats();
}

function donasiApprove(i, st) {
  var r = _dnRows[i];
  if (!r) return;
  if (_dnCloud) {
    if (window.bivakDb) {
      window.bivakDb.from('donasi').update({astatus: st}).eq('id', r.id).then(function(res) {
        if (res.error) toast("error", "Gagal", res.error.message);
        else {
          toast("success", "Berhasil", st === 'disetujui' ? 'Donasi disetujui' : 'Donasi ditolak');
          try { if (typeof renderDonation === 'function') renderDonation(); } catch(e) {}
          renderAdminTables();
        }
      });
    }
  } else {
    try {
      var arr = (typeof _lsGet === 'function') ? _lsGet('bivakDonasi', []) : [];
      arr = arr || [];
      if (arr[i]) arr[i].astatus = st;
      if (typeof _lsSet === 'function') _lsSet('bivakDonasi', arr);
    } catch(e) {}
    toast("success", "Berhasil", st === 'disetujui' ? 'Donasi disetujui' : 'Donasi ditolak');
    try { if (typeof renderDonation === 'function') renderDonation(); } catch(e) {}
    renderAdminTables();
  }
}

function updateBadgesAndStats() {
  const pendingCount = pendingVendorsData.length;
  const coinBadge = document.getElementById("coinAdminBadge");
  if (coinBadge) {
    coinBadge.innerText = pendingCount;
    coinBadge.style.display = pendingCount > 0 ? "inline-flex" : "none";
  }
  const pendingTabBadge = document.getElementById("pendingTabBadge");
  if (pendingTabBadge) pendingTabBadge.innerText = pendingCount;
  const activeTabBadge = document.getElementById("activeTabBadge");
  if (activeTabBadge) activeTabBadge.innerText = vendorsData.length;
  const donasiTabBadge = document.getElementById("donasiTabBadge");
  if (donasiTabBadge) {
    var donCount = _dnRows.length || (function(){try{return (typeof _lsGet==='function')?_lsGet('bivakDonasi',[]):[];}catch(e){return[];}}()).length;
    donasiTabBadge.innerText = donCount;
  }
  const statVendorsCount = document.getElementById("statVendorsCount");
  if (statVendorsCount) statVendorsCount.innerText = vendorsData.length;
  const statDonationTotal = document.getElementById("statDonationTotal");
  if (statDonationTotal) {
    var total = _dummyDonors.reduce(function(s,d){return s+(d.amt||0);},0);
    try{var arr=(typeof _lsGet==='function')?_lsGet('bivakDonasi',[]):[];(arr||[]).filter(function(d){return d&&d.astatus==='disetujui';}).forEach(function(d){total+=d.amt||0;});}catch(e){}
    statDonationTotal.innerText = total.toLocaleString('id-ID');
  }
}

// Simple toast replacement
function toast(kind, title, msg, ms) {
  if (!window.bivakToast) {
    alert(title + (msg ? ': ' + msg : ''));
    return;
  }
  window.bivakToast(kind, title, msg, ms || 4000);
}

// localStorage helpers (for demo mode)
function _lsGet(k, def) {
  try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch(e) { return def; }
}
function _lsSet(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {}
}
