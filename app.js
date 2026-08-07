/* ==========================================================================
   BIVAK - Bursa Interaktif Vendor Alam & Komunitas Sulawesi Selatan
   Application Logic & State Management
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
    image: "assets/auction-jacket.png",
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
  },
  {
    id: 102,
    name: "Tanjung Bira Beach Camp Bulukumba",
    city: "Bulukumba",
    address: "Jl. Raya Pantai Bira, Bontobahari, Bulukumba",
    phone: "6281299882211",
    minPrice: 18000,
    gears: ["Tenda Beach Dome", "Alat Snorkeling", "Perahu Karet Kayak", "Lampu Sorot Portable"],
    image: "assets/hero-bg.png",
    status: "pending"
  }
];

let auctionsData = [
  {
    id: 1,
    title: "Jaket Gore-Tex Expedition Limited Edition",
    donor: "Celebes Outdoor Club Makassar",
    phone: "6281245678901",
    cause: "🌱 Reboisasi Bawakaraeng",
    startingBid: 250000,
    currentBid: 850000,
    highestBidder: "Rian (Pendaki Makassar)",
    bidCount: 14,
    hoursLeft: 4,
    minutesLeft: 15,
    image: "assets/auction-jacket.png",
    description: "Jaket Gore-Tex waterproof kualitas ekspedisi. 100% donasi dialokasikan untuk pembibitan 200 bibit pohon di jalur Bawakaraeng."
  },
  {
    id: 2,
    title: "Carrier Deuter Aircontact Pro 75+10L",
    donor: "Komunitas KPA Latimojong",
    phone: "6285299887766",
    cause: "🧹 Clean-Up Latimojong",
    startingBid: 300000,
    currentBid: 1200000,
    highestBidder: "Fikri (Maros)",
    bidCount: 19,
    hoursLeft: 8,
    minutesLeft: 42,
    image: "assets/gear-carrier.png",
    description: "Tas Carrier tangguh pemakaian 2x naik gunung. Hasil lelang untuk dana operasional pembersihan sampah plastik Jalur Latimojong."
  },
  {
    id: 3,
    title: "Tenda Dome Expedition 4 Person Aluminum Pole",
    donor: "Mapala UMI Makassar",
    phone: "6282188990011",
    cause: "🆘 Tanggap Bencana Sulsel",
    startingBid: 200000,
    currentBid: 650000,
    highestBidder: "Andi Toraja",
    bidCount: 9,
    hoursLeft: 12,
    minutesLeft: 0,
    image: "assets/gear-tent.png",
    description: "Tenda tahan angin badai dengan pasak aluminium alloy. Donasi disalurkan untuk posko bantuan banjir dan tanah longsor Sulsel."
  }
];

let totalDonationRaised = 45800000;

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  renderVendors(vendorsData);
  renderAuctions();
  updateBadgesAndStats();
});

// --- MOBILE NAVIGATION CONTROLLER ---
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
    if (icon) {
      icon.classList.remove("fa-xmark");
      icon.classList.add("fa-bars");
    }
  }
}

// --- RENDER VENDORS ---
function renderVendors(list) {
  const container = document.getElementById("vendorGridContainer");
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `
      <div style="grid-column: span 3; text-align: center; padding: 4rem 1rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-glass);">
        <i class="fa-solid fa-store-slash" style="font-size: 3rem; color: var(--text-dim); margin-bottom: 1rem;"></i>
        <h3 style="color: #fff;">Tidak Ada Vendor Ditemukan</h3>
        <p style="color: var(--text-muted);">Coba ubah kata kunci pencarian atau filter lokasi Anda.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(v => `
    <div class="vendor-card">
      <div class="vendor-cover">
        <img src="${v.image || 'assets/gear-tent.png'}" alt="${v.name}">
        <div class="location-badge">
          <i class="fa-solid fa-location-dot"></i> ${v.city}
        </div>
        ${v.isVerified ? `<div class="verified-badge"><i class="fa-solid fa-circle-check"></i> Terverifikasi</div>` : ''}
      </div>
      <div class="vendor-body">
        <div class="vendor-header">
          <h3 class="vendor-title">${v.name}</h3>
          <div class="vendor-rating">
            <i class="fa-solid fa-star"></i> ${v.rating || '4.8'} (${v.reviews || '25'})
          </div>
        </div>
        <div class="vendor-address">
          <i class="fa-solid fa-map-pin"></i> ${v.address}
        </div>
        <div class="gear-tags">
          ${v.gears.map(g => `<span class="tag"><i class="fa-solid fa-campground"></i> ${g}</span>`).join('')}
        </div>
        <div class="vendor-footer">
          <div class="vendor-price">
            Sewa Mulai
            <span>Rp ${v.minPrice.toLocaleString('id-ID')}/hr</span>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-outline" onclick="openVendorDetail(${v.id})" style="padding: 0.5rem 0.8rem; font-size: 0.82rem;">
              <i class="fa-solid fa-eye"></i> Detail
            </button>
            <a href="https://wa.me/${v.phone}?text=Halo%20${encodeURIComponent(v.name)},%20saya%20menemukan%20vendor%20Anda%20di%20RCS.CBS%20-%20BIVAK%20(Reichas%20Chelebes)%20dan%20ingin%20tanya%20sewa%20alat%20outdoor." 
               target="_blank" class="btn btn-whatsapp" style="padding: 0.5rem 0.8rem; font-size: 0.82rem;">
              <i class="fa-brands fa-whatsapp"></i> WA
            </a>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// --- RENDER AUCTIONS ---
function renderAuctions() {
  const container = document.getElementById("auctionGridContainer");
  if (!container) return;

  container.innerHTML = auctionsData.map(a => `
    <div class="auction-card">
      <div style="position: relative; height: 200px;">
        <img src="${a.image}" alt="${a.title}" style="width: 100%; height: 100%; object-fit: cover;">
        <div class="auction-badge-cause">${a.cause}</div>
      </div>
      <div style="padding: 1.5rem;">
        <h3 style="color: #fff; font-size: 1.2rem; margin-bottom: 0.4rem;">${a.title}</h3>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">
          <i class="fa-solid fa-user-heart" style="color: var(--accent-amber);"></i> Didonasikan oleh: <strong>${a.donor}</strong>
        </p>

        <div class="timer-box" data-remain="${a.hoursLeft * 3600 + a.minutesLeft * 60 + 15}">
          <i class="fa-solid fa-clock"></i> Sisa Waktu: <span class="tick">${String(a.hoursLeft).padStart(2, '0')}j ${String(a.minutesLeft).padStart(2, '0')}m 15s</span>
        </div>

        <div class="bid-status">
          <div class="bid-row">
            <span style="color: var(--text-muted); font-size: 0.85rem;">Bid Tertinggi Saat Ini:</span>
            <span class="bid-val">Rp ${a.currentBid.toLocaleString('id-ID')}</span>
          </div>
          <div class="bid-row">
            <span style="color: var(--text-muted); font-size: 0.78rem;">Oleh: ${a.highestBidder}</span>
            <span style="color: var(--primary-emerald); font-size: 0.78rem;">${a.bidCount} Penawaran</span>
          </div>
        </div>

        <button class="btn btn-amber" style="width: 100%;" onclick="openBidModal(${a.id})">
          <i class="fa-solid fa-gavel"></i> Tawar Sekarang (Bid)
        </button>
      </div>
    </div>
  `).join('');
}

// --- FILTER VENDORS ---
function filterVendors() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  const city = document.getElementById("cityFilter").value;
  const category = document.getElementById("categoryFilter").value;

  const filtered = vendorsData.filter(v => {
    const matchesQuery = v.name.toLowerCase().includes(query) || v.gears.some(g => g.toLowerCase().includes(query));
    const matchesCity = !city || v.city === city;
    const matchesCategory = !category || v.gears.some(g => g.toLowerCase().includes(category.toLowerCase()));
    return matchesQuery && matchesCity && matchesCategory;
  });

  renderVendors(filtered);
}

function filterByCity(cityName) {
  document.getElementById("cityFilter").value = cityName;
  filterVendors();
  document.getElementById("katalog").scrollIntoView({ behavior: 'smooth' });
}

function filterByCategory(categoryName) {
  document.getElementById("categoryFilter").value = categoryName;
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
    image: document.getElementById("inputVendorImage").value || "assets/gear-tent.png",
    status: "pending"
  };

  pendingVendorsData.push(newVendor);
  updateBadgesAndStats();
  closeModal("modalVendor");
  document.getElementById("formAddVendor").reset();

  alert("🎉 Pengajuan Iklan Vendor Berhasil Diterima!\n\nIklan Anda telah masuk ke Antrean Approval Admin BIVAK. Setelah ditinjau oleh Admin, iklan Anda akan otomatis terbit di marketplace.");
}

function handleAuctionSubmit(e) {
  e.preventDefault();
  const newItem = {
    id: Date.now(),
    title: document.getElementById("inputAuctionItem").value,
    donor: document.getElementById("inputDonorName").value,
    phone: document.getElementById("inputDonorPhone").value,
    cause: document.getElementById("inputAuctionCause").value,
    startingBid: parseInt(document.getElementById("inputStartingBid").value) || 100000,
    currentBid: parseInt(document.getElementById("inputStartingBid").value) || 100000,
    highestBidder: "Belum ada",
    bidCount: 0,
    hoursLeft: 24,
    minutesLeft: 0,
    image: "assets/auction-jacket.png",
    description: document.getElementById("inputAuctionDesc").value
  };

  auctionsData.unshift(newItem);
  renderAuctions();
  closeModal("modalLelang");
  document.getElementById("formAddAuction").reset();

  alert("❤️ Terima Kasih Atas Donasi Anda!\n\nBarang donasi outdoor Anda telah dipublikasikan di halaman Lelang Konservasi Alam BIVAK.");
}

function openBidModal(auctionId) {
  const item = auctionsData.find(a => a.id === auctionId);
  if (!item) return;

  document.getElementById("bidItemId").value = item.id;
  document.getElementById("bidItemName").innerText = item.title;
  document.getElementById("bidItemCause").innerText = item.cause;
  document.getElementById("bidCurrentAmount").innerText = `Rp ${item.currentBid.toLocaleString('id-ID')}`;
  document.getElementById("inputBidAmount").value = item.currentBid + 25000;
  
  openModal("modalBid");
}

function handleBidSubmit(e) {
  e.preventDefault();
  const itemId = parseInt(document.getElementById("bidItemId").value);
  const bidderName = document.getElementById("inputBidderName").value;
  const bidAmount = parseInt(document.getElementById("inputBidAmount").value);

  const item = auctionsData.find(a => a.id === itemId);
  if (!item) return;

  if (bidAmount <= item.currentBid) {
    alert(`Nilai penawaran (Bid) harus lebih tinggi dari penawaran saat ini (Rp ${item.currentBid.toLocaleString('id-ID')})!`);
    return;
  }

  item.currentBid = bidAmount;
  item.highestBidder = bidderName;
  item.bidCount += 1;

  totalDonationRaised += 25000; // Increment raised fund simulation

  renderAuctions();
  updateBadgesAndStats();
  closeModal("modalBid");
  document.getElementById("formSubmitBid").reset();

  alert(`🔥 Penawaran Berhasil!\n\nAnda resmi memegang bid tertinggi sebesar Rp ${bidAmount.toLocaleString('id-ID')} untuk ${item.title}.`);
}

// --- VENDOR DETAIL MODAL ---
function openVendorDetail(vendorId) {
  const v = vendorsData.find(item => item.id === vendorId);
  if (!v) return;

  document.getElementById("detailVendorTitle").innerText = v.name;
  document.getElementById("detailVendorBody").innerHTML = `
    <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
      <img src="${v.image}" style="width: 200px; height: 160px; object-fit: cover; border-radius: var(--radius-md); border: 1px solid var(--border-glass);">
      <div style="flex: 1;">
        <div style="font-size: 0.85rem; color: var(--primary-emerald); font-weight: 700; margin-bottom: 0.3rem;">
          <i class="fa-solid fa-location-dot"></i> ${v.city} - TERVERIFIKASI
        </div>
        <h3 style="color: #fff; margin-bottom: 0.5rem;">${v.name}</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.75rem;">
          <i class="fa-solid fa-map-pin"></i> ${v.address}
        </p>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <span class="vendor-rating"><i class="fa-solid fa-star"></i> ${v.rating || '4.8'} (${v.reviews || '25'} ulasan pendaki)</span>
          <span style="color: var(--text-muted); font-size: 0.85rem;">Sewa mulai <strong>Rp ${v.minPrice.toLocaleString('id-ID')}/hari</strong></span>
        </div>
      </div>
    </div>

    <h4 style="color: #fff; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.4rem;">
      <i class="fa-solid fa-boxes-packing text-emerald" style="color:#10b981;"></i> Daftar Katalog Peralatan Tersedia
    </h4>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.5rem;">
      ${v.gears.map(g => `
        <div style="background: rgba(255,255,255,0.03); padding: 0.6rem 0.9rem; border-radius: var(--radius-sm); border: 1px solid var(--border-glass); color: #e5e7eb; font-size: 0.88rem; display: flex; align-items: center; justify-content: space-between;">
          <span><i class="fa-solid fa-circle-check text-emerald" style="color:#10b981;"></i> ${g}</span>
          <span style="color: var(--text-muted); font-size: 0.75rem;">Stok Ready</span>
        </div>
      `).join('')}
    </div>

    <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid var(--border-emerald); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
      <h5 style="color: var(--primary-emerald); margin-bottom: 0.3rem;"><i class="fa-solid fa-shield-halved"></i> Syarat & Ketentuan Sewa Vendor</h5>
      <p style="color: var(--text-muted); font-size: 0.82rem;">Wajib menyertakan KTP/SIM asli sebagai jaminan. Pengambilan dan pengembalian alat dilakukan di lokasi vendor. Harap menjaga kebersihan dan keutuhan gear.</p>
    </div>

    <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
      <button class="btn btn-outline" onclick="closeModal('modalVendorDetail')">Tutup</button>
      <a href="https://wa.me/${v.phone}?text=Halo%20${encodeURIComponent(v.name)},%20saya%20mau%20booking%20sewa%20alat%20outdoor%20lewat%20BIVAK." target="_blank" class="btn btn-whatsapp">
        <i class="fa-brands fa-whatsapp"></i> Hubungi WhatsApp Vendor
      </a>
    </div>
  `;

  openModal("modalVendorDetail");
}

// --- ADMIN PANEL FUNCTIONS ---
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
  } else if (tabName === "auctions") {
    document.querySelectorAll(".tab-btn")[2].classList.add("active");
    document.getElementById("tabAuctions").style.display = "block";
  }
}

function renderAdminTables() {
  // Pending Vendors Table
  const pendingBody = document.getElementById("tablePendingVendorsBody");
  if (pendingVendorsData.length === 0) {
    pendingBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Tidak ada antrean iklan vendor pending.</td></tr>`;
  } else {
    pendingBody.innerHTML = pendingVendorsData.map(pv => `
      <tr>
        <td>
          <strong>${pv.name}</strong><br>
          <span style="font-size: 0.78rem; color: var(--text-muted);">${pv.city} • ${pv.address}</span>
        </td>
        <td>${pv.phone}</td>
        <td><span style="font-size: 0.8rem; color: var(--text-muted);">${pv.gears.join(', ')}</span></td>
        <td>Rp ${pv.minPrice.toLocaleString('id-ID')}</td>
        <td>
          <button class="btn btn-primary" onclick="approveVendor(${pv.id})" style="padding: 0.35rem 0.7rem; font-size: 0.78rem;">
            <i class="fa-solid fa-check"></i> Approve
          </button>
          <button class="btn btn-outline" onclick="rejectVendor(${pv.id})" style="padding: 0.35rem 0.7rem; font-size: 0.78rem; border-color: var(--accent-rose); color: var(--accent-rose);">
            <i class="fa-solid fa-xmark"></i> Tolak
          </button>
        </td>
      </tr>
    `).join('');
  }

  // Active Vendors Table
  const activeBody = document.getElementById("tableActiveVendorsBody");
  activeBody.innerHTML = vendorsData.map(av => `
    <tr>
      <td><strong>${av.name}</strong></td>
      <td>${av.city}</td>
      <td><i class="fa-solid fa-star" style="color: var(--accent-amber);"></i> ${av.rating || '4.8'}</td>
      <td><span class="status-tag status-approved"><i class="fa-solid fa-check-circle"></i> Tayang</span></td>
      <td>
        <button class="btn btn-outline" onclick="removeActiveVendor(${av.id})" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">
          Hapus
        </button>
      </td>
    </tr>
  `).join('');

  // Auctions Table
  const auctionBody = document.getElementById("tableAuctionsBody");
  auctionBody.innerHTML = auctionsData.map(ac => `
    <tr>
      <td><strong>${ac.title}</strong></td>
      <td>${ac.donor}</td>
      <td>${ac.cause}</td>
      <td>Rp ${ac.currentBid.toLocaleString('id-ID')}</td>
      <td><span class="status-tag status-approved">Aktif (${ac.bidCount} bid)</span></td>
    </tr>
  `).join('');
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

    alert(`✅ Iklan "${item.name}" berhasil di-APPROVE! Iklan kini tampil secara publik di marketplace BIVAK.`);
  }
}

function rejectVendor(id) {
  const index = pendingVendorsData.findIndex(pv => pv.id === id);
  if (index !== -1) {
    const item = pendingVendorsData.splice(index, 1)[0];
    renderAdminTables();
    updateBadgesAndStats();
    alert(`❌ Iklan "${item.name}" telah ditolak.`);
  }
}

function removeActiveVendor(id) {
  if (confirm("Apakah Anda yakin ingin menghapus vendor ini dari katalog publik?")) {
    vendorsData = vendorsData.filter(v => v.id !== id);
    renderVendors(vendorsData);
    renderAdminTables();
    updateBadgesAndStats();
  }
}

function updateBadgesAndStats() {
  const pendingCount = pendingVendorsData.length;
  document.querySelectorAll(".pendingCountBadge").forEach(el => el.innerText = pendingCount);

  const coinBadge = document.getElementById("coinAdminBadge");
  if (coinBadge) {
    coinBadge.innerText = pendingCount;
    coinBadge.style.display = pendingCount > 0 ? "inline-flex" : "none";
  }
  const pendingCountBadge = document.getElementById("pendingCountBadge");
  if (pendingCountBadge) pendingCountBadge.innerText = pendingCount;
  
  const pendingTabBadge = document.getElementById("pendingTabBadge");
  if (pendingTabBadge) pendingTabBadge.innerText = pendingCount;
  
  const activeTabBadge = document.getElementById("activeTabBadge");
  if (activeTabBadge) activeTabBadge.innerText = vendorsData.length;
  
  const auctionTabBadge = document.getElementById("auctionTabBadge");
  if (auctionTabBadge) auctionTabBadge.innerText = auctionsData.length;
  
  const statVendorsCount = document.getElementById("statVendorsCount");
  if (statVendorsCount) statVendorsCount.innerText = vendorsData.length;
  
  const statDonationTotal = document.getElementById("statDonationTotal");
  if (statDonationTotal) statDonationTotal.innerText = totalDonationRaised.toLocaleString('id-ID');
}

/* ==========================================================================
   Countdown lelang berdetak
   Setiap kartu lelang menyimpan sisa detik di atribut data-remain.
   Interval ini menguranginya tiap detik dan menulis ulang teksnya,
   sehingga timer terasa hidup tanpa perlu reload halaman.
   ========================================================================== */
setInterval(() => {
  document.querySelectorAll('.timer-box[data-remain]').forEach((box) => {
    let t = parseInt(box.dataset.remain, 10);
    if (isNaN(t) || t <= 0) return;
    t -= 1;
    box.dataset.remain = t;
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    const tick = box.querySelector('.tick');
    if (tick) {
      tick.textContent = `${String(h).padStart(2, '0')}j ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
    }
  });
}, 1000);
