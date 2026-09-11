/**
 * BIVAK - Katalog Barang Vendor (vendor-shop.js)
 * ---------------------------------------------------------------------------
 * Versi sederhana. TIDAK ada keranjang, pengiriman, atau pembayaran.
 * Fungsinya hanya:
 *   1. Menampilkan barang milik setiap vendor: nama, jumlah unit, harga sewa
 *      per hari, kategori, deskripsi, dan foto.
 *   2. Dashboard vendor untuk mengelola daftar barang & stok (login PIN toko).
 *   3. Menampilkan catatan bahwa BIVAK RENTAL hanya mempertemukan penyewa
 *      dengan vendor; transaksi & komunikasi langsung dengan vendor.
 *
 * Prasyarat SQL (jalankan di Supabase SQL Editor, berurutan):
 *   db/OLSHOP-01-VENDOR-SECURITY.sql
 *   db/OLSHOP-02-VENDOR-ITEMS.sql
 *
 * Dimuat SETELAH app.js dan supabase-data.js.
 */
;(function () {
	"use strict"

	/* =====================================================================
	   0. Helper
	   ===================================================================== */
	var sb = window.bivakDb || null
	var ONLINE = !!(sb && sb.from)

	function toast(kind, title, msg) {
		if (typeof window.bivakToast === "function") return window.bivakToast(kind, title, msg)
		if (window.BIVAK && typeof BIVAK.notify === "function") return BIVAK.notify(kind, title, msg)
		return null
	}
	function esc(s) {
		if (window.BIVAK && BIVAK.escape) return BIVAK.escape(s)
		return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
	}
	function rp(n) {
		if (window.BIVAK && BIVAK.rupiah) return BIVAK.rupiah(n)
		return "Rp " + Number(n || 0).toLocaleString("id-ID")
	}
	function el(id) { return document.getElementById(id) }
	function intval(v) { var n = parseInt(v, 10); return isNaN(n) ? 0 : n }
	function numval(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n }
	function getVal(id) { var e = el(id); return e ? String(e.value || "").trim() : "" }
	function setVal(id, v) { var e = el(id); if (e) e.value = v == null ? "" : v }

	var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
	function isUuid(x) { return typeof x === "string" && UUID_RE.test(x) }

	// app.js memakai ID urut untuk UI; UUID asli dari database ada di dbId.
	function vendorKey(v) {
		if (!v) return null
		var key = v.dbId || v.id
		return isUuid(key) ? key : null
	}
	function findVendor(id) {
		var list = (window.BIVAK && BIVAK.vendors) || []
		for (var i = 0; i < list.length; i++) {
			if (String(list[i].id) === String(id) || String(list[i].dbId) === String(id)) return list[i]
		}
		return null
	}
	function normalizePhone(v) {
		var s = String(v || "").replace(/[^0-9]/g, "")
		if (s.indexOf("0") === 0) s = "62" + s.slice(1)
		if (s.length && s.indexOf("62") !== 0) s = "62" + s
		return s
	}
	// pgcrypto (crypt/gen_salt) tidak terlihat dari dalam fungsi karena
	// search_path. Pesan servernya juga berbunyi "does not exist", jadi harus
	// dipisahkan lebih dulu supaya SQL tidak salah dituduh belum dijalankan.
	function cryptIssue(err) {
		var msg = String((err && (err.message || err.hint || err.code)) || "")
		return /crypt|gen_salt|pgcrypto/i.test(msg)
	}
	function missingFn(err) {
		var msg = String((err && (err.message || err.hint || err.code)) || "")
		if (cryptIssue(err)) return false
		return /not find the function|schema cache|PGRST202|42883|42P01|relation .* does not exist/i.test(msg)
	}
	// Pesan error yang benar: sebutkan sebab aslinya, jangan menebak.
	function serverErr(err, hintBelumDipasang) {
		if (cryptIssue(err)) {
			return "Fungsinya sudah ada, tapi belum bisa membaca pgcrypto. Jalankan db/OLSHOP-05-PERBAIKI-CRYPT.sql di Supabase SQL Editor."
		}
		if (missingFn(err)) return hintBelumDipasang
		var msg = (err && err.message) || "Terjadi kendala di server."
		var code = (err && err.code) ? " (" + err.code + ")" : ""
		return esc(msg + code)
	}

	var CATS = (window.BIVAK && BIVAK.gearCategories) || {
		tenda: "Tenda", carrier: "Carrier", cooking: "Cooking Set", sleep: "Sleeping Bag",
		lighting: "Lighting", apparel: "Apparel", accessories: "Accessories"
	}

	/* =====================================================================
	   1. Catatan wajib platform
	   ===================================================================== */
	var NOTE_TITLE = "BIVAK RENTAL hanya mempertemukan penyewa dan vendor rental."
	var NOTE_BODY = "Setelah memilih vendor, seluruh transaksi \u2014 harga akhir, pembayaran, jaminan, serah terima, dan pengembalian barang \u2014 diurus dan dikomunikasikan langsung dengan vendor tersebut, tanpa perantaraan BIVAK RENTAL. Daftar barang, jumlah, dan harga di halaman ini diisi sendiri oleh masing-masing vendor."
	var NOTE_SHORT = "BIVAK RENTAL hanya mempertemukan penyewa dan vendor. Transaksi dan komunikasi selanjutnya langsung dengan pihak vendor."

	function noteHtml(compact) {
		if (compact) {
			return '<div class="shop-disclaimer compact"><i class="fa-solid fa-circle-info"></i> <span>' + NOTE_SHORT + '</span></div>'
		}
		return '<div class="shop-disclaimer"><i class="fa-solid fa-handshake-angle"></i>' +
			'<div><b>' + NOTE_TITLE + '</b><span>' + NOTE_BODY + '</span></div>' +
		'</div>'
	}

	/* =====================================================================
	   2. State
	   ===================================================================== */
	var SHOP = {
		online: ONLINE,
		itemsByVendor: {},   // uuid vendor -> daftar barang
		vendor: null,        // vendor yang detailnya dibuka
		items: [],           // barang vendor tersebut
		filterCat: null,
		// dashboard toko
		token: null,
		shop: null,
		manageItems: [],
		editingId: null,
		noteText: NOTE_TITLE + " " + NOTE_BODY
	}
	SHOP.noteHtml = noteHtml
	window.BIVAK_SHOP = SHOP

	/* =====================================================================
	   3. Katalog ringkas di kartu vendor (beranda)
	   ===================================================================== */
	var preloadTimer = null

	function preloadCatalog() {
		if (!ONLINE) { paintMiniItems(); return }
		var list = (window.BIVAK && BIVAK.vendors) || []
		var ids = []
		for (var i = 0; i < list.length; i++) {
			var k = vendorKey(list[i])
			if (k && ids.indexOf(k) === -1) ids.push(k)
		}
		if (!ids.length) { SHOP.itemsByVendor = {}; paintMiniItems(); return }

		sb.from("vendor_items")
			.select("id,vendor_id,name,category,price_per_day,photo_url,description,stock_total,stock_available,status")
			.in("vendor_id", ids)
			.neq("status", "archived")
			.order("name", { ascending: true })
			.then(function (res) {
				var map = {}
				if (!res.error) {
					var rows = res.data || []
					for (var i = 0; i < rows.length; i++) {
						if (!map[rows[i].vendor_id]) map[rows[i].vendor_id] = []
						map[rows[i].vendor_id].push(rows[i])
					}
				}
				SHOP.itemsByVendor = map
				paintMiniItems()
			})
	}
	SHOP.preloadCatalog = preloadCatalog

	function miniItemsHtml(v) {
		var key = vendorKey(v)
		if (!ONLINE) return '<div class="mini-items-empty"><i class="fa-solid fa-plug-circle-xmark"></i> Katalog butuh koneksi server.</div>'
		if (!key) return '<div class="mini-items-empty"><i class="fa-solid fa-circle-info"></i> Data vendor belum tersinkron.</div>'
		var items = SHOP.itemsByVendor[key]
		if (!items) return '<div class="mini-items-empty"><i class="fa-solid fa-spinner fa-spin"></i> Memuat katalog...</div>'
		if (!items.length) return '<div class="mini-items-empty"><i class="fa-solid fa-box-open"></i> Vendor belum menambahkan barang.</div>'

		var top = items.slice(0, 4)
		var html = ""
		for (var i = 0; i < top.length; i++) {
			var it = top[i]
			var stock = intval(it.stock_available)
			var photo = it.photo_url || (window.BIVAK && BIVAK.vendorImg ? BIVAK.vendorImg(v) : "assets/gear-fallback.jpg")
			html += '<div class="mini-item" title="' + esc(it.name) + '" onclick="openVendorDetail(\'' + esc(v.id) + '\',\'' + esc(it.id) + '\')">' +
				'<img src="' + esc(photo) + '" alt="' + esc(it.name) + '" loading="lazy" onerror="this.onerror=null;this.src=\'assets/gear-fallback.jpg\'">' +
				'<span class="mini-item-stock ' + (stock <= 0 ? "empty" : (stock <= 2 ? "low" : "ready")) + '">' + (stock <= 0 ? "Kosong" : stock + " unit") + '</span>' +
				'<div class="mini-item-info">' +
					'<span class="mini-item-name">' + esc(it.name) + '</span>' +
					'<span class="mini-item-price">' + rp(it.price_per_day) + '/hari</span>' +
				'</div>' +
			'</div>'
		}
		if (items.length > 4) html += '<div class="mini-items-more">+' + (items.length - 4) + ' barang lain</div>'
		return html
	}
	if (window.BIVAK) BIVAK.miniItemsHtml = miniItemsHtml

	function paintMiniItems() {
		var cards = document.querySelectorAll(".vendor-card")
		for (var i = 0; i < cards.length; i++) {
			var grid = cards[i].querySelector(".mini-items-grid")
			if (!grid) continue
			var v = findVendor(cards[i].getAttribute("data-vendor-id"))
			if (v) grid.innerHTML = miniItemsHtml(v)
		}
	}

	// Muat katalog nyata setiap kali daftar vendor dirender ulang.
	var originalRenderVendors = window.renderVendors
	if (typeof originalRenderVendors === "function") {
		window.renderVendors = function () {
			var out = originalRenderVendors.apply(this, arguments)
			if (preloadTimer) clearTimeout(preloadTimer)
			preloadTimer = setTimeout(function () {
				paintMiniItems()
				preloadCatalog()
			}, 60)
			return out
		}
	}

	/* =====================================================================
	   4. Detail vendor: daftar barang yang dimiliki
	   ===================================================================== */
	window.openVendorDetail = function (id, highlightItemId) {
		var v = findVendor(id)
		if (!v) return
		SHOP.vendor = v
		SHOP.filterCat = null
		var key = vendorKey(v)
		SHOP.items = (key && SHOP.itemsByVendor[key]) || []
		if (window.BIVAK) { BIVAK.currentVendorId = v.id; BIVAK.vendorItems = SHOP.items }

		var title = el("detailVendorTitle")
		if (title) title.textContent = v.name
		var body = el("detailVendorBody")
		if (body) body.innerHTML = detailShellHtml(v)
		if (typeof window.openModal === "function") openModal("modalVendorDetail")

		renderCatalog(null, highlightItemId)
		loadVendorItems(function () { renderCatalog(SHOP.filterCat, highlightItemId) })
	}

	function loadVendorItems(cb) {
		var key = vendorKey(SHOP.vendor)
		if (!ONLINE || !key) { if (cb) cb(); return }
		sb.from("vendor_items")
			.select("id,vendor_id,name,category,price_per_day,photo_url,description,stock_total,stock_available,status")
			.eq("vendor_id", key)
			.neq("status", "archived")
			.order("name", { ascending: true })
			.then(function (res) {
				if (res.error) {
					toast("error", "Katalog gagal dimuat", res.error.message || "Coba muat ulang halaman.")
				} else {
					SHOP.items = res.data || []
					SHOP.itemsByVendor[key] = SHOP.items
					if (window.BIVAK) BIVAK.vendorItems = SHOP.items
				}
				if (cb) cb()
			})
	}

	function detailShellHtml(v) {
		var logo = v.logo || "assets/gear-fallback.jpg"
		var cover = v.collage || (window.BIVAK && BIVAK.vendorImg ? BIVAK.vendorImg(v) : "assets/gear-fallback.jpg")
		var wa = "https://wa.me/" + normalizePhone(v.phone) + "?text=" +
			encodeURIComponent("Halo " + v.name + ", saya lihat daftar alat Anda di BIVAK RENTAL. Saya mau tanya ketersediaan dan cara sewanya.")
		return '' +
			'<div class="shop-head">' +
				'<img class="shop-head-cover" src="' + esc(cover) + '" alt="Peralatan ' + esc(v.name) + '" loading="lazy" onerror="this.onerror=null;this.src=\'assets/gear-fallback.jpg\'">' +
				'<div class="shop-head-info">' +
					'<div class="shop-head-title">' +
						'<img src="' + esc(logo) + '" alt="Logo ' + esc(v.name) + '" width="40" height="40" onerror="this.onerror=null;this.src=\'assets/gear-fallback.jpg\'">' +
						'<div>' +
							'<div class="shop-head-city"><i class="fa-solid fa-location-dot"></i> ' + esc(v.city) + (v.verified ? " &middot; TERVERIFIKASI" : "") + '</div>' +
							'<h3>' + esc(v.name) + '</h3>' +
						'</div>' +
					'</div>' +
					'<p class="shop-head-address"><i class="fa-solid fa-map-pin"></i> ' + esc(v.address || v.city) + '</p>' +
					'<div class="shop-head-meta" id="shopSummary"></div>' +
					'<a class="btn btn-whatsapp btn-sm shop-contact-btn" href="' + esc(wa) + '" target="_blank" rel="noopener">' +
						'<i class="fa-brands fa-whatsapp"></i> Hubungi Vendor Langsung' +
					'</a>' +
				'</div>' +
			'</div>' +
			noteHtml(false) +
			'<h4 class="shop-section-title"><i class="fa-solid fa-box-open text-emerald"></i> Barang yang Dimiliki Vendor</h4>' +
			'<div class="gear-category-tabs" id="gearCategoryTabs"></div>' +
			'<div class="gear-items-grid" id="gearItemsGrid">' +
				'<div class="shop-empty"><i class="fa-solid fa-spinner fa-spin"></i> Memuat daftar barang...</div>' +
			'</div>'
	}

	function renderSummary() {
		var box = el("shopSummary")
		if (!box) return
		var v = SHOP.vendor || {}
		var jenis = SHOP.items.length
		var unit = 0, murah = null
		for (var i = 0; i < SHOP.items.length; i++) {
			unit += intval(SHOP.items[i].stock_total)
			var h = numval(SHOP.items[i].price_per_day)
			if (h > 0 && (murah === null || h < murah)) murah = h
		}
		box.innerHTML =
			'<span><i class="fa-solid fa-layer-group"></i> ' + jenis + ' jenis barang</span>' +
			'<span><i class="fa-solid fa-cubes"></i> ' + unit + ' unit total</span>' +
			'<span>Sewa mulai <strong>' + rp(murah !== null ? murah : (v.minPrice || 15000)) + '</strong>/hari</span>'
	}

	function renderCatalog(filterCat, highlightItemId) {
		SHOP.filterCat = filterCat || null
		var grid = el("gearItemsGrid")
		var tabs = el("gearCategoryTabs")
		if (!grid) return
		renderSummary()

		var cats = [], seen = {}
		for (var i = 0; i < SHOP.items.length; i++) {
			var c = SHOP.items[i].category
			if (c && !seen[c]) { seen[c] = 1; cats.push(c) }
		}
		if (tabs) {
			if (!SHOP.items.length || cats.length < 2) {
				tabs.innerHTML = ""
			} else {
				var th = '<button class="gear-cat-btn ' + (!SHOP.filterCat ? "active" : "") + '" onclick="BIVAK_SHOP.renderCatalog(null)">Semua (' + SHOP.items.length + ')</button>'
				for (var t = 0; t < cats.length; t++) {
					th += '<button class="gear-cat-btn ' + (SHOP.filterCat === cats[t] ? "active" : "") + '" onclick="BIVAK_SHOP.renderCatalog(\'' + esc(cats[t]) + '\')">' + esc(CATS[cats[t]] || cats[t]) + '</button>'
				}
				tabs.innerHTML = th
			}
		}

		if (!SHOP.items.length) {
			grid.innerHTML = '<div class="shop-empty"><i class="fa-solid fa-box-open"></i> Vendor ini belum menambahkan daftar barang.' +
				(ONLINE ? " Silakan hubungi vendor langsung lewat WhatsApp." : " Koneksi server tidak tersedia.") + '</div>'
			return
		}

		var list = SHOP.filterCat
			? SHOP.items.filter(function (it) { return it.category === SHOP.filterCat })
			: SHOP.items
		if (!list.length) {
			grid.innerHTML = '<div class="shop-empty">Belum ada barang di kategori ini.</div>'
			return
		}

		var html = ""
		for (var k = 0; k < list.length; k++) {
			var it = list[k]
			var ready = intval(it.stock_available)
			var total = intval(it.stock_total)
			var cls = ready <= 0 ? "empty" : (ready <= 2 ? "low" : "ready")
			var label = ready <= 0 ? "Kosong" : ("Siap " + ready + " unit")
			var hi = highlightItemId && String(highlightItemId) === String(it.id) ? " is-highlight" : ""
			html += '<div class="gear-item-card' + (ready <= 0 ? " is-empty" : "") + hi + '" id="gear-' + esc(it.id) + '">' +
				'<div class="gear-item-thumb">' +
					'<img src="' + esc(it.photo_url || "assets/gear-fallback.jpg") + '" alt="' + esc(it.name) + '" loading="lazy" onerror="this.onerror=null;this.src=\'assets/gear-fallback.jpg\'">' +
					'<span class="gear-stock-badge ' + cls + '">' + label + '</span>' +
				'</div>' +
				'<div class="gear-item-content">' +
					'<div class="gear-item-title">' + esc(it.name) + '</div>' +
					'<div class="gear-item-cat">' + esc(CATS[it.category] || it.category || "Lainnya") + '</div>' +
					(it.description ? '<div class="gear-item-desc">' + esc(it.description) + '</div>' : "") +
					'<div class="gear-item-facts">' +
						'<div><span>Jumlah</span><b>' + total + ' unit</b></div>' +
						'<div><span>Siap disewa</span><b>' + ready + ' unit</b></div>' +
						'<div><span>Harga sewa</span><b>' + rp(it.price_per_day) + '<small>/hari</small></b></div>' +
					'</div>' +
				'</div>' +
			'</div>'
		}
		grid.innerHTML = html

		if (highlightItemId) {
			var target = el("gear-" + highlightItemId)
			if (target && target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "center" })
		}
	}
	SHOP.renderCatalog = function (cat) { renderCatalog(cat || null) }

	/* =====================================================================
	   5. Dashboard vendor: kelola daftar barang & stok
	   ===================================================================== */
	window.openVendorManagePanel = function () {
		SHOP.token = null
		try { SHOP.token = sessionStorage.getItem("bivak_shop_token") || null } catch (ignore) {}
		var login = el("vendorManageLogin")
		var dash = el("vendorManageDashboard")
		var status = el("vendorManageStatus")
		if (status) status.style.display = "none"
		setVal("inputManageVendorId", "")
		setVal("inputManagePin", "")
		if (login) login.style.display = "block"
		if (dash) dash.style.display = "none"
		if (typeof window.openModal === "function") openModal("modalVendorManage")
		if (SHOP.token) loadManageItems(true)
	}

	function manageStatus(kind, msg) {
		var s = el("vendorManageStatus")
		if (!s) return
		s.style.display = "block"
		s.className = "shop-order-status is-" + kind
		s.innerHTML = msg
	}

	window.loginVendorManage = function () {
		var name = getVal("inputManageVendorId")
		var pin = getVal("inputManagePin")
		if (!name || !pin) return manageStatus("error", "Mohon isi nama toko dan PIN.")
		if (!ONLINE) return manageStatus("error", "Belum terhubung ke server.")
		manageStatus("info", '<i class="fa-solid fa-spinner fa-spin"></i> Memverifikasi PIN...')

		sb.rpc("vendor_shop_login", { p_name: name, p_pin: pin }).then(function (res) {
			if (res.error) {
				return manageStatus("error", serverErr(res.error,
					"Login toko belum aktif. Jalankan <b>db/OLSHOP-01-VENDOR-SECURITY.sql</b> di Supabase SQL Editor."))
			}
			var d = res.data || {}
			if (!d.success) return manageStatus("error", esc(d.message || "PIN toko salah."))
			SHOP.token = d.token
			SHOP.shop = d.vendor || {}
			try { sessionStorage.setItem("bivak_shop_token", SHOP.token) } catch (ignore) {}
			manageStatus("success", "Berhasil masuk.")
			loadManageItems()
		})
	}

	SHOP.logout = function () {
		if (ONLINE && SHOP.token) sb.rpc("vendor_shop_logout", { p_token: SHOP.token })
		SHOP.token = null
		SHOP.shop = null
		SHOP.manageItems = []
		try { sessionStorage.removeItem("bivak_shop_token") } catch (ignore) {}
		if (typeof window.closeModal === "function") closeModal("modalVendorManage")
		toast("info", "Keluar Toko", "Sesi kelola barang diakhiri.")
	}

	function ensureManageChrome() {
		var dash = el("vendorManageDashboard")
		if (!dash) return
		if (!el("shopManageNote")) {
			var note = document.createElement("div")
			note.id = "shopManageNote"
			note.innerHTML = noteHtml(true) +
				'<div class="shop-manage-tabs"><button class="gear-cat-btn shop-logout-btn" onclick="BIVAK_SHOP.logout()"><i class="fa-solid fa-right-from-bracket"></i> Keluar</button></div>'
			dash.insertBefore(note, dash.firstChild)
		}
	}

	function showDashboard() {
		var login = el("vendorManageLogin")
		var dash = el("vendorManageDashboard")
		if (login) login.style.display = "none"
		if (dash) dash.style.display = "block"
		ensureManageChrome()
		var t = el("manageDashboardTitle")
		if (t) t.textContent = "Barang: " + ((SHOP.shop && SHOP.shop.name) || "Toko Saya")
	}

	function loadManageItems(silent) {
		if (!ONLINE || !SHOP.token) return
		var list = el("vendorManageItemsList")
		if (list && !silent) list.innerHTML = '<div class="shop-empty"><i class="fa-solid fa-spinner fa-spin"></i> Memuat barang...</div>'
		sb.rpc("vendor_shop_items", { p_token: SHOP.token }).then(function (res) {
			if (res.error || !res.data || res.data.success === false) {
				SHOP.token = null
				try { sessionStorage.removeItem("bivak_shop_token") } catch (ignore) {}
				if (!silent) {
					manageStatus("error", res.error
						? serverErr(res.error, "Jalankan db/OLSHOP-02-VENDOR-ITEMS.sql di Supabase SQL Editor.")
						: esc((res.data && res.data.message) || "Sesi berakhir, masuk ulang."))
				}
				return
			}
			SHOP.shop = res.data.vendor || SHOP.shop
			SHOP.manageItems = res.data.items || []
			showDashboard()
			renderManageItems()
		})
	}
	SHOP.loadManageItems = loadManageItems

	function renderManageItems() {
		var list = el("vendorManageItemsList")
		if (!list) return
		if (!SHOP.manageItems.length) {
			list.innerHTML = '<div class="shop-empty">Belum ada barang. Klik "Tambah Barang" untuk mendaftarkan alat yang Anda sewakan.</div>'
			return
		}
		var html = ""
		for (var i = 0; i < SHOP.manageItems.length; i++) {
			var it = SHOP.manageItems[i]
			var ready = intval(it.stock_available)
			var total = intval(it.stock_total)
			html += '<div class="stock-manage-row">' +
				'<div class="stock-manage-main">' +
					'<div class="stock-manage-name">' + esc(it.name) +
						(it.status === "archived" ? ' <span class="shop-order-badge st-cancelled">Diarsipkan</span>' : "") + '</div>' +
					'<div class="stock-manage-meta">' + esc(CATS[it.category] || it.category) + ' &middot; ' + rp(it.price_per_day) + '/hari &middot; total ' + total + ' unit</div>' +
				'</div>' +
				'<div class="stock-manage-actions">' +
					'<div class="gear-qty-stepper" title="Unit yang siap disewa hari ini">' +
						'<button class="gear-qty-btn" onclick="BIVAK_SHOP.setStock(\'' + esc(it.id) + '\',-1)">&minus;</button>' +
						'<span class="gear-qty-val" id="mstock-' + esc(it.id) + '">' + ready + '</span>' +
						'<button class="gear-qty-btn" onclick="BIVAK_SHOP.setStock(\'' + esc(it.id) + '\',1)">+</button>' +
					'</div>' +
					'<button class="btn btn-outline btn-sm" title="Ubah barang" onclick="BIVAK_SHOP.editItem(\'' + esc(it.id) + '\')"><i class="fa-solid fa-pen"></i></button>' +
					'<button class="btn btn-outline btn-sm shop-danger" title="Hapus barang" onclick="BIVAK_SHOP.deleteItem(\'' + esc(it.id) + '\')"><i class="fa-solid fa-trash"></i></button>' +
				'</div>' +
			'</div>'
		}
		list.innerHTML = html
	}

	SHOP.setStock = function (itemId, delta) {
		var it = manageItemById(itemId)
		if (!it || !ONLINE || !SHOP.token) return
		var next = intval(it.stock_available) + delta
		if (next < 0) next = 0
		if (next > intval(it.stock_total)) {
			return toast("info", "Melebihi jumlah unit", 'Tambah jumlah unit lewat tombol "Ubah" bila memang beli barang baru.')
		}
		sb.rpc("vendor_shop_set_stock", { p_token: SHOP.token, p_item_id: itemId, p_stock: next }).then(function (res) {
			if (res.error || !res.data || !res.data.success) {
				return toast("error", "Stok gagal disimpan", (res.error && res.error.message) || (res.data && res.data.message) || "Coba lagi.")
			}
			it.stock_available = next
			var cell = el("mstock-" + itemId)
			if (cell) cell.textContent = next
			preloadCatalog()
		})
	}

	function manageItemById(id) {
		for (var i = 0; i < SHOP.manageItems.length; i++) {
			if (String(SHOP.manageItems[i].id) === String(id)) return SHOP.manageItems[i]
		}
		return null
	}

	function resetGearForm() {
		setVal("inputGearName", "")
		setVal("inputGearPrice", "")
		setVal("inputGearStock", "")
		setVal("inputGearDesc", "")
		if (el("inputGearCategory")) el("inputGearCategory").value = "tenda"
		if (el("inputGearPhoto")) el("inputGearPhoto").value = ""
	}

	window.showAddGearForm = function () {
		SHOP.editingId = null
		var form = el("addGearForm")
		if (!form) return
		resetGearForm()
		form.style.display = "block"
		var h = form.querySelector("h5")
		if (h) h.innerHTML = '<i class="fa-solid fa-box-open text-emerald"></i> Tambah Barang Baru'
		if (form.scrollIntoView) form.scrollIntoView({ behavior: "smooth", block: "nearest" })
	}

	SHOP.editItem = function (itemId) {
		var it = manageItemById(itemId)
		if (!it) return
		SHOP.editingId = it.id
		var form = el("addGearForm")
		if (!form) return
		form.style.display = "block"
		var h = form.querySelector("h5")
		if (h) h.innerHTML = '<i class="fa-solid fa-pen text-emerald"></i> Ubah Barang'
		setVal("inputGearName", it.name)
		setVal("inputGearPrice", it.price_per_day)
		setVal("inputGearStock", it.stock_total)
		setVal("inputGearDesc", it.description)
		if (el("inputGearCategory")) el("inputGearCategory").value = it.category || "tenda"
		if (el("inputGearPhoto")) el("inputGearPhoto").value = ""
		if (form.scrollIntoView) form.scrollIntoView({ behavior: "smooth", block: "nearest" })
	}

	function uploadItemPhoto(file, cb) {
		if (!file || !sb || !sb.storage) return cb(null)
		// Batasi sama seperti upload pengajuan vendor: maks 5 MB, gambar saja.
		if (file.size > 5 * 1024 * 1024) {
			toast("info", "Foto terlalu besar", "Maksimal 5 MB. Barang tetap disimpan tanpa foto.")
			return cb(null)
		}
		if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type || "")) {
			toast("info", "Format foto tidak didukung", "Pakai JPG, PNG, WEBP, atau GIF. Barang tetap disimpan tanpa foto.")
			return cb(null)
		}
		var vendorId = (SHOP.shop && SHOP.shop.id) || "umum"
		var clean = String(file.name || "foto.jpg").toLowerCase().replace(/[^a-z0-9.]+/g, "-").slice(-40)
		var path = "items/" + vendorId + "/" + Date.now() + "-" + clean
		sb.storage.from("vendor-images").upload(path, file, { cacheControl: "3600", upsert: true })
			.then(function (res) {
				if (res.error) {
					toast("info", "Foto gagal diunggah", "Barang tetap disimpan tanpa foto.")
					return cb(null)
				}
				var pub = sb.storage.from("vendor-images").getPublicUrl(path)
				cb((pub && pub.data && pub.data.publicUrl) || null)
			})
			.catch(function () { cb(null) })
	}

	// Dipakai tombol "Simpan Barang" pada index.html
	window.addNewGearItem = function () {
		var name = getVal("inputGearName")
		var cat = el("inputGearCategory") ? el("inputGearCategory").value : "tenda"
		var price = intval(getVal("inputGearPrice"))
		var stock = intval(getVal("inputGearStock"))
		var desc = getVal("inputGearDesc")
		var fileInput = el("inputGearPhoto")
		var file = fileInput && fileInput.files ? fileInput.files[0] : null

		if (!name || name.length < 3) return toast("error", "Nama barang kurang jelas", "Minimal 3 karakter.")
		if (price <= 0) return toast("error", "Harga belum benar", "Isi harga sewa per hari.")
		if (stock <= 0) return toast("error", "Jumlah belum benar", "Isi jumlah unit yang dimiliki.")
		if (!ONLINE || !SHOP.token) return toast("error", "Sesi berakhir", "Masuk ulang ke dashboard toko.")

		var payload = {
			id: SHOP.editingId || null,
			name: name,
			category: cat,
			price_per_day: price,
			stock_total: stock,
			description: desc || null
		}

		uploadItemPhoto(file, function (photoUrl) {
			if (photoUrl) payload.photo_url = photoUrl
			sb.rpc("vendor_shop_item_save", { p_token: SHOP.token, p_item: payload }).then(function (res) {
				if (res.error) {
					return toast("error", "Gagal menyimpan barang", serverErr(res.error,
						"Jalankan db/OLSHOP-02-VENDOR-ITEMS.sql di Supabase."))
				}
				var d = res.data || {}
				if (!d.success) return toast("error", "Barang tidak tersimpan", d.message || "Coba lagi.")
				toast("success", SHOP.editingId ? "Barang Diperbarui" : "Barang Ditambahkan", name + " kini tampil di katalog toko Anda.")
				SHOP.editingId = null
				resetGearForm()
				if (el("addGearForm")) el("addGearForm").style.display = "none"
				loadManageItems(true)
				preloadCatalog()
			})
		})
	}
	SHOP.saveItem = window.addNewGearItem

	SHOP.deleteItem = function (itemId) {
		if (!confirm("Hapus barang ini dari katalog toko?")) return
		if (!ONLINE || !SHOP.token) return
		sb.rpc("vendor_shop_item_delete", { p_token: SHOP.token, p_item_id: itemId }).then(function (res) {
			if (res.error || !res.data || !res.data.success) {
				return toast("error", "Gagal menghapus", (res.error && res.error.message) || (res.data && res.data.message) || "Coba lagi.")
			}
			toast("success", "Barang Dihapus", "Katalog toko diperbarui.")
			loadManageItems(true)
			preloadCatalog()
		})
	}

	/* =====================================================================
	   6. Kompatibilitas pemanggil lama (tanpa fitur keranjang/pesanan)
	   ===================================================================== */
	function noop() {}
	if (window.BIVAK) {
		BIVAK.renderGearCatalog = function (cat) { renderCatalog(cat || null) }
		BIVAK.loadVendorItems = function (cb) { loadVendorItems(function () { if (typeof cb === "function") cb(SHOP.items) }) }
		BIVAK.generateDemoItems = function () { return [] } // tidak ada stok fiktif
		BIVAK.updateCart = noop
		BIVAK.clearCart = noop
		BIVAK.updateCartUI = noop
		BIVAK.updateRentalDays = noop
		BIVAK.cart = {}
		BIVAK.platformNote = SHOP.noteText
	}
	window.quickAddItem = function (itemId, event) {
		if (event && event.stopPropagation) event.stopPropagation()
		var card = event && event.currentTarget && event.currentTarget.closest ? event.currentTarget.closest(".vendor-card") : null
		var v = card ? findVendor(card.getAttribute("data-vendor-id")) : SHOP.vendor
		if (v) window.openVendorDetail(v.id, itemId)
	}

	/* =====================================================================
	   7. Inisialisasi
	   ===================================================================== */
	function injectSectionNote() {
		var host = el("vendorGridContainer")
		if (!host || el("shopSectionNote")) return
		var holder = document.createElement("div")
		holder.innerHTML = noteHtml(false)
		var node = holder.firstChild
		node.id = "shopSectionNote"
		host.parentNode.insertBefore(node, host)
	}

	function init() {
		injectSectionNote()
		preloadCatalog()
	}

	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init)
	else init()
})()
