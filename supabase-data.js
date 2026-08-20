/* ==========================================================================
   BIVAK v4 - Lapisan Data Supabase (Email-only Admin)
   --------------------------------------------------------------------------
   - Admin login TANPA password — cukup email, cek tabel admins
   - Donasi ambil dari database lama (pintu angin)
   - Vendors & settings dari database baru
   ========================================================================== */

;(function () {
	"use strict"

	/* ----------------------------------------------------------------------
	   0. TOAST
	   ---------------------------------------------------------------------- */
	var toastWrap = null

	function ensureToastStyles() {
		if (document.getElementById("bivak-toast-styles")) return
		var css = document.createElement("style")
		css.id = "bivak-toast-styles"
		css.textContent = [
			".bv-toast-wrap{position:fixed;z-index:3000;right:1.25rem;bottom:1.25rem;",
			"display:flex;flex-direction:column;gap:.6rem;max-width:min(380px,calc(100vw - 2.5rem));pointer-events:none}",
			".bv-toast{pointer-events:auto;display:flex;gap:.7rem;align-items:flex-start;",
			"padding:.85rem 1rem;border-radius:var(--radius-md,14px);",
			"background:rgba(16,26,23,.96);border:1px solid var(--border-glass,rgba(255,255,255,.08));",
			"box-shadow:0 18px 40px rgba(0,0,0,.45);color:var(--text-main,#f3f4f6);",
			"font-size:.88rem;line-height:1.45;backdrop-filter:blur(14px);",
			"opacity:0;transform:translateY(14px) scale(.97);",
			"transition:opacity .28s cubic-bezier(.16,1,.3,1),transform .28s cubic-bezier(.16,1,.3,1)}",
			".bv-toast.bv-in{opacity:1;transform:translateY(0) scale(1)}",
			".bv-toast-ic{flex:0 0 auto;width:1.15rem;text-align:center;margin-top:.1rem}",
			".bv-toast-success{border-color:rgba(16,185,129,.4)}",
			".bv-toast-success .bv-toast-ic{color:#10b981}",
			".bv-toast-error{border-color:rgba(244,63,94,.45)}",
			".bv-toast-error .bv-toast-ic{color:#f43f5e}",
			".bv-toast-info .bv-toast-ic{color:#06b6d4}",
			".bv-toast b{color:#fff;display:block;margin-bottom:.15rem}",
			"@media (prefers-reduced-motion: reduce){.bv-toast{transition:none;opacity:1;transform:none}}",
		].join("")
		document.head.appendChild(css)
	}

	function toast(kind, title, message, ms) {
		ensureToastStyles()
		if (!toastWrap) {
			toastWrap = document.createElement("div")
			toastWrap.className = "bv-toast-wrap"
			document.body.appendChild(toastWrap)
		}
		var icons = { success: "\u2713", error: "\u2715", info: "\u2139" }
		var el = document.createElement("div")
		el.className = "bv-toast bv-toast-" + kind
		var ic = document.createElement("span")
		ic.className = "bv-toast-ic"
		ic.textContent = icons[kind] || icons.info
		var body = document.createElement("div")
		var b = document.createElement("b")
		b.textContent = title
		body.appendChild(b)
		if (message) body.appendChild(document.createTextNode(" " + message))
		el.appendChild(ic)
		el.appendChild(body)
		toastWrap.appendChild(el)
		requestAnimationFrame(function () { el.classList.add("bv-in") })
		setTimeout(function () {
			el.classList.remove("bv-in")
			setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el) }, 320)
		}, ms || (kind === "error" ? 6500 : 4800))
	}

	window.bivakToast = toast

	/* ----------------------------------------------------------------------
	   1. Konfigurasi DATABASE
	   ---------------------------------------------------------------------- */
	var mainCfg = window.BIVAK_SUPABASE || {}
	var donasiCfg = window.BIVAK_DONASI_SUPABASE || {}

	if (!mainCfg.url || !mainCfg.anonKey) {
		console.info("[BIVAK] Mode demo — supabase-config.js belum diisi.")
		return
	}

	if (!window.supabase || typeof window.supabase.createClient !== "function") {
		console.error("[BIVAK] Library supabase-js belum termuat.")
		toast("error", "Gagal memuat database", "Library Supabase tidak termuat.")
		return
	}

	// Database utama: vendors, settings, admins
	var sb = window.supabase.createClient(mainCfg.url, mainCfg.anonKey)
	window.bivakDb = sb

	// Database donasi (pintu angin)
	var sbd = donasiCfg.url && donasiCfg.anonKey
		? window.supabase.createClient(donasiCfg.url, donasiCfg.anonKey)
		: null

	/* ----------------------------------------------------------------------
	   2. Status admin — TANPA password
	   ---------------------------------------------------------------------- */
	var isAdmin = false

	// Cek admin berdasarkan email langsung dari tabel admins
	async function checkAdminByEmail(email) {
		if (!email) return false
		email = email.trim().toLowerCase()
		console.log("[BIVAK] Checking admin:", email)
		var res = await sb.from("admins").select("id").eq("email", email).single()
		console.log("[BIVAK] Admin check result:", res)
		if (res.error) {
			console.warn("[BIVAK] Admin query error:", res.error.message)
			return false
		}
		return !!res.data
	}

	async function refreshAdminFlag() {
		isAdmin = false
		return false
	}

	/* ----------------------------------------------------------------------
	   3. ID & mapping
	   ---------------------------------------------------------------------- */
	var seq = 1
	function nextId() { return seq++ }

	var vendorsData = []
	var pendingVendorsData = []

	function mapVendor(row) {
		return {
			id: nextId(), dbId: row.id, name: row.name, city: row.city,
			address: row.address, phone: row.phone,
			rating: row.rating != null ? Number(row.rating) : 4.8,
			reviews: row.reviews_count != null ? row.reviews_count : 1,
			minPrice: Number(row.min_price) || 15000,
			gears: Array.isArray(row.gears) ? row.gears : [],
			image: row.image_url || "assets/gear-tent.png",
			status: row.status, isVerified: !!row.is_verified,
		}
	}

	function findVendor(id) {
		var all = (vendorsData || []).concat(pendingVendorsData || [])
		for (var i = 0; i < all.length; i++) {
			if (all[i].id === id) return all[i]
		}
		return null
	}

	/* ----------------------------------------------------------------------
	   4. Muat data publik
	   ---------------------------------------------------------------------- */
	var _dnRows = []
	var _dnCloud = false

	async function loadPublicData(options) {
		options = options || {}
		seq = 1

		// Load vendors dari database baru
		var vRes = await sb.from("vendors").select("*").eq("status", "approved").order("created_at", { ascending: false })
		console.log("[BIVAK] Vendors query:", vRes)
		if (vRes.error) {
			console.warn("[BIVAK] Tabel vendors:", vRes.error.message)
			console.warn("[BIVAK] Error details:", JSON.stringify(vRes.error))
			vendorsData = []
		} else {
			vendorsData = (vRes.data || []).map(mapVendor)
		}

		// Pending vendors hanya untuk admin
		var pRes = isAdmin
			? await sb.from("vendors").select("*").eq("status", "pending").order("created_at", { ascending: true })
			: { data: [], error: null }
		pendingVendorsData = (pRes.data || []).map(mapVendor)

		// Donasi dari database lama (pintu angin)
		if (sbd) {
			var dRes = await sbd.from("donasi").select("*").order("created_at", { ascending: false }).limit(50)
			_dnRows = (dRes.data || [])
			_dnCloud = true
		} else {
			_dnRows = []
			_dnCloud = false
		}

		try { renderVendors(vendorsData); } catch(e) { console.warn("[BIVAK] renderVendors error:", e.message); }
		try { updateBadges(); } catch(e) { console.warn("[BIVAK] updateBadges error:", e.message); }
		if (typeof renderDonation === 'function') renderDonation()

		if (options.alsoAdminTables && document.getElementById("tablePendingVendorsBody")) {
			renderAdminTables()
		}
	}

	function dbErr(err, fallbackTitle) {
		console.error("[BIVAK]", err)
		var msg = (err && (err.message || err.error_description)) || "Terjadi kesalahan."
		toast("error", fallbackTitle, msg)
	}

	/* ----------------------------------------------------------------------
	   5. Form helpers
	   ---------------------------------------------------------------------- */
	function val(id) {
		var el = document.getElementById(id)
		return el ? el.value.trim() : ""
	}

	function busy(form, on, labelWhenBusy) {
		if (!form) return
		var btn = form.querySelector('button[type="submit"]')
		if (!btn) return
		if (on) {
			btn.dataset.bvLabel = btn.innerHTML
			btn.disabled = true
			btn.style.opacity = "0.65"
			btn.style.cursor = "wait"
			btn.innerHTML = labelWhenBusy || "Menyimpan..."
		} else {
			btn.disabled = false
			btn.style.opacity = ""
			btn.style.cursor = ""
			if (btn.dataset.bvLabel) btn.innerHTML = btn.dataset.bvLabel
		}
	}

	/* ----------------------------------------------------------------------
	   6. Vendor Submit
	   ---------------------------------------------------------------------- */
	window.handleVendorSubmit = async function (e) {
		e.preventDefault()
		var form = document.getElementById("formAddVendor")
		var gears = val("inputVendorGears").split(",").map(function(s){return s.trim()}).filter(Boolean)

		busy(form, true, "Mengirim...")
		try {
			var res = await sb.from("vendors").insert({
				name: val("inputVendorName"),
				city: val("inputVendorCity"),
				phone: val("inputVendorPhone"),
				address: val("inputVendorAddress"),
				gears: gears,
				min_price: parseInt(val("inputVendorMinPrice"), 10) || 15000,
				image_url: "assets/gear-tent.png",
				status: "pending",
				is_verified: false,
			})
			if (res.error) throw res.error

			closeModal("modalVendor")
			if (form) form.reset()
			toast("success", "Pengajuan Terkirim", "Iklan Anda masuk antrean approval Admin BIVAK.", 5000)
			await loadPublicData({ alsoAdminTables: isAdmin })
		} catch (err) {
			dbErr(err, "Pengajuan gagal dikirim")
		} finally {
			busy(form, false)
		}
	}

	/* ----------------------------------------------------------------------
	   7. Donasi Submit — ke database LAMA
	   ---------------------------------------------------------------------- */
	window.handleDonasiSubmit = async function (e) {
		e.preventDefault()
		var form = document.getElementById("formDonasi")
		var nama = val("inputDonasiNama")
		var nominal = parseInt(val("inputDonasiNominal"), 10) || 0
		var email = val("inputDonasiEmail")

		if (!nama || nominal <= 0) {
			toast("error", "Data Belum Lengkap", "Isi nama dan nominal donasi dengan benar.")
			return
		}

		if (!sbd) {
			toast("error", "Database Donasi Tidak Tersedia", "Database pintu angin belum dikonfigurasi.")
			return
		}

		busy(form, true, "Mengirim...")
		try {
			var res = await sbd.from("donasi").insert({
				nama: nama,
				email: email,
				amt: nominal,
				source: "bivak",
				astatus: "baru",
			})
			if (res.error) throw res.error

			closeModal("modalDonasi")
			if (form) form.reset()
			toast("success", "Donasi Terkirim!", "Nama Anda akan muncul di leaderboard setelah diverifikasi admin. Terima kasih! 💚", 6000)
			await loadPublicData({ alsoAdminTables: isAdmin })
			if (typeof renderDonation === 'function') renderDonation()
		} catch (err) {
			dbErr(err, "Donasi gagal dikirim")
		} finally {
			busy(form, false)
		}
	}

	/* ----------------------------------------------------------------------
	   8. Admin badge sync
	   ---------------------------------------------------------------------- */
	function syncCoinBadge() {
		var badge = document.getElementById("coinAdminBadge")
		if (!badge) return
		badge.innerText = (pendingVendorsData || []).length
		badge.style.display = isAdmin && (pendingVendorsData || []).length > 0 ? "inline-flex" : "none"
	}

	var origUpdateBadges = window.updateBadgesAndStats || window.updateBadges
	if (typeof origUpdateBadges === "function") {
		window.updateBadgesAndStats = function () {
			origUpdateBadges()
			syncCoinBadge()
		}
	}

	/* ----------------------------------------------------------------------
	   9. Login Admin — TANPA PASSWORD
	   ---------------------------------------------------------------------- */
	function buildLoginModal() {
		if (document.getElementById("modalAdminLogin")) return
		var wrap = document.createElement("div")
		wrap.className = "modal-overlay"
		wrap.id = "modalAdminLogin"
		wrap.innerHTML = [
			'<div class="modal-container" style="max-width:420px;">',
			'<div class="modal-header">',
			'<div><h3 style="color:#fff;font-size:1.15rem;" id="loginModalTitle">Masuk sebagai Admin</h3>',
			'<p style="color:var(--text-muted);font-size:.83rem;margin-top:.2rem;" id="loginModalSubtitle">Panel approval vendor & donasi BIVAK</p></div>',
			'<button class="modal-close" type="button" onclick="closeModal(\'modalAdminLogin\')">&times;</button>',
			'</div><div class="modal-body">',
			'<form id="formAdminLogin">',
			'<div class="input-group"><label>Email Admin</label>',
			'<input class="form-control" type="email" id="inputAdminEmail" autocomplete="username" required placeholder="admin@bivak.id"></div>',
			'<button class="btn btn-primary" type="submit" id="btnLoginSubmit" style="width:100%;margin-top:.5rem;">Masuk</button>',
			'</form>',
			'<p style="text-align:center;margin-top:1rem;font-size:.82rem;color:var(--text-muted);">',
			'Cukup masukkan email yang terdaftar di tabel admins.',
			'</p></div></div>',
		].join("")
		document.body.appendChild(wrap)

		document.getElementById("formAdminLogin").addEventListener("submit", async function (e) {
			e.preventDefault()
			var form = e.currentTarget
			var email = val("inputAdminEmail")

			if (!email) {
				toast("error", "Email Kosong", "Masukkan email admin Anda.")
				return
			}

			busy(form, true, "Memeriksa...")
			try {
				var isAdminRow = await checkAdminByEmail(email)

				if (!isAdminRow) {
					toast("error", "Bukan Admin", "Email ini belum terdaftar di tabel admins.")
					form.reset()
					return
				}

				// Admin valid — langsung masuk!
				isAdmin = true
				form.reset()
				closeModal("modalAdminLogin")
				await loadPublicData()
				renderAdminTables()
				decorateAdminPanel()
				openModal("modalAdmin")
				toast("success", "Selamat Datang", "Panel admin siap digunakan. Email: " + email)
			} catch (err) {
				dbErr(err, "Gagal masuk")
			} finally {
				busy(form, false)
			}
		})
	}

	/* ----------------------------------------------------------------------
	   10. Admin panel decoration
	   ---------------------------------------------------------------------- */
	function decorateAdminPanel() {
		var header = document.querySelector("#modalAdmin .modal-header")
		if (!header || document.getElementById("btnAdminLogout")) return

		var btn = document.createElement("button")
		btn.id = "btnAdminLogout"
		btn.type = "button"
		btn.className = "btn btn-outline"
		btn.style.cssText = "padding:.35rem .7rem;font-size:.78rem;margin-right:.6rem;"
		btn.textContent = "Keluar"
		btn.addEventListener("click", async function () {
			isAdmin = false
			closeModal("modalAdmin")
			await loadPublicData()
			toast("info", "Keluar", "Sesi admin diakhiri.")
		})

		var closeBtn = header.querySelector(".modal-close")
		header.insertBefore(btn, closeBtn)
	}

	window.openAdminPanel = async function () {
		buildLoginModal()
		if (!isAdmin) {
			openModal("modalAdminLogin")
		} else {
			await loadPublicData()
			renderAdminTables()
			decorateAdminPanel()
			openModal("modalAdmin")
		}
	}

	/* ----------------------------------------------------------------------
	   11. Aksi admin
	   ---------------------------------------------------------------------- */
	async function adminUpdateVendor(id, patch, successTitle, successMsg) {
		var v = findVendor(id)
		if (!v) return
		try {
			var res = await sb.from("vendors").update(patch).eq("id", v.dbId)
			if (res.error) throw res.error
			await loadPublicData({ alsoAdminTables: true })
			toast("success", successTitle, successMsg.replace("%s", v.name))
		} catch (err) {
			dbErr(err, "Aksi admin gagal")
		}
	}

	window.approveVendor = function (id) {
		return adminUpdateVendor(id, { status: "approved", is_verified: true, updated_at: new Date().toISOString() }, "Vendor Disetujui", '"%s" kini tayang publik.')
	}

	window.rejectVendor = function (id) {
		return adminUpdateVendor(id, { status: "rejected", updated_at: new Date().toISOString() }, "Vendor Ditolak", 'Pengajuan "%s" telah ditolak.')
	}

	window.removeActiveVendor = function (id) {
		var v = findVendor(id)
		if (!v) return
		if (!confirm('Turunkan "' + v.name + '" dari katalog publik?')) return
		return adminUpdateVendor(id, { status: "rejected", updated_at: new Date().toISOString() }, "Vendor Diturunkan", '"%s" tidak lagi tampil di katalog.')
	}

	/* ----------------------------------------------------------------------
	   12. Donasi Admin Actions — dari database LAMA
	   ---------------------------------------------------------------------- */
	window.donasiApprove = async function (i, st) {
		var r = _dnRows[i]
		if (!r) return
		if (!sbd) {
			toast("error", "Database Donasi Tidak Tersedia", "")
			return
		}
		try {
			var res = await sbd.from("donasi").update({ astatus: st }).eq("id", r.id)
			if (res.error) throw res.error
			toast("success", "Berhasil", st === 'disetujui' ? 'Donasi disetujui. Nama akan tampil di leaderboard.' : 'Donasi ditolak.')
			await loadPublicData({ alsoAdminTables: true })
			if (typeof renderDonation === 'function') renderDonation()
		} catch (err) {
			dbErr(err, "Aksi donasi gagal")
		}
	}

	/* ----------------------------------------------------------------------
	   13. Render donasi leaderboard
	   ---------------------------------------------------------------------- */
	window.renderDonationList = function() {
		var approved = []
		try {
			if (_dnRows) approved = _dnRows.filter(function(d) { return d.astatus === 'disetujui'; })
		} catch(e) {}
		if (!approved.length) {
			try {
				var local = (typeof _lsGet === 'function') ? _lsGet('bivak_donations', []) : []
				approved = local.filter(function(d) { return d && d.astatus === 'disetujui'; })
			} catch(e) {}
		}
		if (!approved.length) {
			approved = [
				{nama: 'Andi Mappanyukki', amt: 10000000},
				{nama: 'Komunitas Pencinta Alam Makassar', amt: 7500000},
				{nama: 'Nurul Fadhilah', amt: 5000000},
				{nama: 'Baso Dg. Nassa', amt: 5000000},
				{nama: 'Rina Kartika', amt: 3500000}
			]
		}
		var sorted = approved.slice().sort(function(a,b) { return (b.amt||0) - (a.amt||0); })
		var total = sorted.reduce(function(s,d) { return s + (d.amt||0); }, 0)
		var pct = Math.min(100, Math.round(total / 75000000 * 100))
		var col = document.getElementById('dnCollected')
		var bar = document.getElementById('dnBar')
		var pc = document.getElementById('dnPct')
		var box = document.getElementById('dnDonors')
		if (col) col.textContent = 'Rp ' + total.toLocaleString('id-ID')
		if (bar) bar.style.width = pct + '%'
		if (pc) pc.textContent = pct + '%'
		if (box) {
			var medals = ["1","2","3"]
			box.innerHTML = sorted.slice(0, 15).map(function(d,i) {
				var nm = BIVAK.escape(d.nama || 'Donatur')
				var top = i < 3
				var rank = top ? medals[i] : '<span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:rgba(140,150,170,.18);color:#8c96aa;font-size:12px;font-weight:800">' + (i+1) + '</span>'
				var bg = top ? 'rgba(16,185,129,.08)' : 'rgba(140,150,170,.05)'
				var bd = top ? '1px solid rgba(16,185,129,.25)' : '1px solid rgba(140,150,170,.14)'
				return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;margin-bottom:6px;background:' + bg + ';border:' + bd + '"><div style="width:28px;text-align:center;flex-shrink:0">' + rank + '</div><div style="flex:1;min-width:0;font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + nm + '</div><div style="font-size:13px;font-weight:800;color:#10b981;white-space:nowrap">Rp ' + (d.amt||0).toLocaleString('id-ID') + '</div></div>'
			}).join('')
		}
	}

	/* ----------------------------------------------------------------------
	   14. Boot
	   ---------------------------------------------------------------------- */
	async function boot() {
		try {
			await loadPublicData()
			console.info("[BIVAK] Terhubung ke Supabase (email-only admin).")
		} catch (err) {
			dbErr(err, "Gagal memuat data dari database")
		}
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", boot)
	} else {
		boot()
	}
})()
