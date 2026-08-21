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
	var sb = window.supabase.createClient(mainCfg.url, mainCfg.anonKey, {
		auth: { storageKey: "bivak-main-auth" }
	})
	window.bivakDb = sb

	// Database donasi (pintu angin)
	var sbd = donasiCfg.url && donasiCfg.anonKey
		? window.supabase.createClient(donasiCfg.url, donasiCfg.anonKey, {
				auth: { storageKey: "bivak-donasi-auth" }
			})
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
		try {
			// Use limit(1) instead of single() for better compatibility
			var res = await sb.from("admins").select("id").eq("email", email).limit(1)
			console.log("[BIVAK] Admin check result:", res)
			var data = res.data || []
			if (res.error) {
				console.warn("[BIVAK] Admin query error:", res.error.message)
				return false
			}
			return data.length > 0
		} catch (err) {
			console.warn("[BIVAK] Admin check exception:", err.message)
			return false
		}
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
		// Only use local assets — external Unsplash URLs cause ERR_UNKNOWN_URL_SCHEME
		var img = row.image_url || "assets/gear-tent.png"
		if (img && img.indexOf("unsplash") !== -1) {
			img = "assets/gear-tent.png"
		}
		return {
			id: nextId(), dbId: row.id, name: row.name, city: row.city,
			address: row.address, phone: row.phone,
			rating: row.rating != null ? Number(row.rating) : 4.8,
			reviews: row.reviews_count != null ? row.reviews_count : 1,
			minPrice: Number(row.min_price) || 15000,
			gears: Array.isArray(row.gears) ? row.gears : [],
			image: img,
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

		// Adopsi Pohon dari database Pintu Angin
		if (sbd) {
			try {
				var aRes = await sbd.from("adoption_requests").select("*").order("created_at", { ascending: false }).limit(100)
				_adoptionRows = (aRes.data || [])
			} catch(e) {
				console.warn("[BIVAK] Adopsi load error:", e.message)
				_adoptionRows = []
			}
		} else {
			_adoptionRows = []
		}

		try { renderVendors(vendorsData); } catch(e) { console.warn("[BIVAK] renderVendors error:", e.message); }
		try { updateBadges(); } catch(e) { console.warn("[BIVAK] updateBadges error:", e.message); }
		if (typeof renderDonation === 'function') renderDonation()
		updateAdopsiBadge()

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

	function syncDonasiBadge() {
		var badge = document.getElementById("donasiBadge")
		if (!badge) return
		var newCount = (_dnRows || []).filter(function(d) { return d.astatus === 'baru' }).length
		badge.innerText = newCount
		badge.style.display = newCount > 0 ? "inline-flex" : "none"
	}

	function syncAdopsiBadge() {
		var badge = document.getElementById("adopsiBadge")
		if (!badge) return
		var pending = (_adoptionRows || []).filter(function(r) { return r.status === 'menunggu_bukti' }).length
		badge.innerText = pending
		badge.style.display = pending > 0 ? "inline-flex" : "none"
	}

	var origUpdateBadges = window.updateBadgesAndStats || window.updateBadges
	if (typeof origUpdateBadges === "function") {
		window.updateBadgesAndStats = function () {
			origUpdateBadges()
			syncCoinBadge()
			syncDonasiBadge()
			syncAdopsiBadge()
		}
	} else {
		window.updateBadgesAndStats = function () {
			syncCoinBadge()
			syncDonasiBadge()
			syncAdopsiBadge()
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
			await loadAdopsiData()
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
	   14. Render admin tables — menggunakan data cloud
	   ---------------------------------------------------------------------- */
	window.renderAdminTables = function() {
		// Pending vendors
		var pendingBody = document.getElementById("tablePendingVendorsBody")
		if (pendingBody) {
			if (!pendingVendorsData || pendingVendorsData.length === 0) {
				pendingBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Tidak ada antrean.</td></tr>'
			} else {
				pendingBody.innerHTML = pendingVendorsData.map(function(pv, i) {
					return '<tr>' +
						'<td><strong>' + BIVAK.escape(pv.name) + '</strong><br><small style="color:var(--text-muted)">' + BIVAK.escape(pv.city) + '</small></td>' +
						'<td>' + BIVAK.escape(pv.phone) + '</td>' +
						'<td><small>' + (pv.gears || []).slice(0,3).join(', ') + '</small></td>' +
						'<td>' + BIVAK.rupiah(pv.minPrice) + '</td>' +
						'<td>' +
							'<button class="btn btn-primary" onclick="approveVendor(' + pv.id + ')" style="padding:0.35rem 0.7rem;font-size:0.78rem"><i class="fa-solid fa-check"></i></button> ' +
							'<button class="btn btn-outline" onclick="rejectVendor(' + pv.id + ')" style="padding:0.35rem 0.7rem;font-size:0.78rem;border-color:var(--accent-rose);color:var(--accent-rose)"><i class="fa-solid fa-xmark"></i></button>' +
						'</td>' +
					'</tr>'
				}).join('')
			}
		}

		// Active vendors
		var activeBody = document.getElementById("tableActiveVendorsBody")
		if (activeBody) {
			activeBody.innerHTML = vendorsData.map(function(av, i) {
				return '<tr>' +
					'<td><strong>' + BIVAK.escape(av.name) + '</strong></td>' +
					'<td>' + BIVAK.escape(av.city) + '</td>' +
					'<td><i class="fa-solid fa-star" style="color:var(--accent-amber)"></i> ' + (av.rating || 4.8) + '</td>' +
					'<td><span class="status-tag status-approved">Tayang</span></td>' +
					'<td><button class="btn btn-outline" onclick="removeActiveVendor(' + av.id + ')" style="padding:0.3rem 0.6rem;font-size:0.75rem">Hapus</button></td>' +
				'</tr>'
			}).join('')
		}

		// Donasi — dari cloud, bukan localStorage!
		var donasiBody = document.getElementById("tableDonasiBody")
		if (donasiBody) {
			// Gabung semua donasi (baru + disetujui + ditolak)
			var allDonasi = _dnRows || []
			if (allDonasi.length === 0) {
				donasiBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Belum ada donasi.</td></tr>'
			} else {
				donasiBody.innerHTML = allDonasi.map(function(r, i) {
					var nm = BIVAK.escape(r.nama || 'Donatur')
					var amt = 'Rp ' + (Number(r.amt || 0)).toLocaleString('id-ID')
					var when = r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID') : '-'
					var st = r.astatus || 'baru'
					var stBadge = st === 'disetujui' ? '<span style="color:#10b981;font-weight:700">✓ Diterima</span>' :
					              st === 'ditolak' ? '<span style="color:#f43f5e;font-weight:700">✗ Ditolak</span>' :
					              '<span style="color:#f59e0b;font-weight:700">○ Baru</span>'
					return '<tr>' +
						'<td>' + nm + '</td>' +
						'<td>' + amt + '</td>' +
						'<td>' + when + '</td>' +
						'<td>' + stBadge + '</td>' +
						'<td>' +
							'<button class="btn btn-primary" onclick="donasiApprove(' + i + ',\'disetujui\')" style="padding:0.3rem 0.5rem;font-size:0.75rem"><i class="fa-solid fa-check"></i></button> ' +
							'<button class="btn btn-outline" onclick="donasiApprove(' + i + ',\'ditolak\')" style="padding:0.3rem 0.5rem;font-size:0.75rem"><i class="fa-solid fa-xmark"></i></button>' +
						'</td>' +
					'</tr>'
				}).join('')
			}
		}

		// Update badge tab donasi
		var donasiBadge = document.getElementById("donasiTabBadge")
		if (donasiBadge) {
			var newDonasi = (_dnRows || []).filter(function(d) { return d.astatus === 'baru' }).length
			donasiBadge.textContent = newDonasi
		}

		// Update badge tab adopsi
		var adopsiBadge = document.getElementById("adopsiTabBadge")
		if (adopsiBadge) {
			var newAdopsi = (_adoptionRows || []).filter(function(r) { return r.status === 'menunggu_bukti' }).length
			adopsiBadge.textContent = newAdopsi
		}
	}

	/* ----------------------------------------------------------------------
	   15. Adopsi Pohon — Cloned from Bawakaraeng Hub
	   ---------------------------------------------------------------------- */
	var _adoptionRows = []
	var _selectedPackage = null

	window.selectAdopsiPackage = function(pkgId, amount, packageName) {
		_selectedPackage = { id: pkgId, amount: amount, name: packageName }
		// Highlight selected
		document.querySelectorAll('.adopsi-card').forEach(function(card) {
			card.style.borderColor = 'transparent'
			card.style.transform = 'none'
		})
		var selected = document.getElementById('pkg-' + pkgId)
		if (selected) {
			selected.style.borderColor = '#10b981'
			selected.style.transform = 'scale(1.02)'
		}
		// Show form
		document.getElementById('adopsiFormCard').style.display = 'block'
		document.getElementById('adopsiPaymentInfo').style.display = 'none'
		document.getElementById('adopsiSelectedPkg').textContent = packageName
		document.getElementById('adopsiSelectedAmt').textContent = 'Rp ' + amount.toLocaleString('id-ID')
		// Scroll to form
		selected.scrollIntoView({ behavior: 'smooth', block: 'center' })
	}

	window.cancelAdopsi = function() {
		_selectedPackage = null
		document.getElementById('adopsiFormCard').style.display = 'none'
		document.getElementById('adopsiPaymentInfo').style.display = 'none'
		document.querySelectorAll('.adopsi-card').forEach(function(card) {
			card.style.borderColor = 'transparent'
			card.style.transform = 'none'
		})
	}

	window.submitAdopsi = async function() {
		var nama = document.getElementById('adopsiNama').value.trim()
		var wa = document.getElementById('adopsiWA').value.trim()
		if (!nama || !wa || !_selectedPackage) {
			toast("error", "Lengkapi Data", "Isi nama dan nomor WhatsApp dengan benar.")
			return
		}
		// Format WhatsApp to international format
		if (wa.startsWith('0')) wa = '62' + wa.substring(1)
		if (!wa.startsWith('62')) wa = '62' + wa

		try {
			var res = await sbd.from("adoption_requests").insert({
				customer_name: nama,
				whatsapp: wa,
				package_name: _selectedPackage.name,
				amount: _selectedPackage.amount,
				quantity: _selectedPackage.id === 'bibit' ? 1 : _selectedPackage.id === 'pohon' ? 1 : 10,
				status: 'menunggu_bukti'
			})
			if (res.error) throw res.error
			toast("success", "Pengajuan Tersimpan!", "Silakan lakukan pembayaran. Admin akan memverifikasi dan menerbitkan kode adopsi.")
			// Show payment info
			document.getElementById('adopsiFormCard').style.display = 'none'
			document.getElementById('adopsiPaymentInfo').style.display = 'block'
		} catch (err) {
			dbErr(err, "Gagal menyimpan pengajuan")
		}
	}

	window.confirmAdopsiPayment = function() {
		var wa = document.getElementById('adopsiWA').value.trim()
		if (wa.startsWith('0')) wa = '62' + wa.substring(1)
		var msg = 'Halo Admin RCS.CBS, saya sudah membayar adopsi pohon.\n\nNama sertifikat: ' + document.getElementById('adopsiNama').value + '\nNomor WhatsApp: +' + wa + '\nPaket: ' + _selectedPackage.name + '\nTotal: Rp ' + _selectedPackage.amount.toLocaleString('id-ID') + '\n\nSaya lampirkan bukti pembayaran. Mohon verifikasi dan kirimkan kode adopsi untuk unduh sertifikat.'
		window.open('https://wa.me/' + wa + '?text=' + encodeURIComponent(msg), '_blank')
	}

	window.checkAdopsiCode = function() {
		var code = document.getElementById('certAdopsiCode').value.trim().toUpperCase()
		var msg = document.getElementById('certCodeMsg')
		if (!code) {
			msg.textContent = ''
			return
		}
		if (!code.startsWith('POH-') || code.length < 8) {
			msg.textContent = 'Format salah. Harap gunakan format: POH-XXXXX'
			msg.style.color = '#f43f5e'
			return
		}
		msg.textContent = 'Memeriksa kode...'
		msg.style.color = 'var(--text-muted)'
		// Check in cloud data
		var found = (_adoptionRows || []).find(function(r) {
			return r.adoption_code === code && r.status === 'terverifikasi'
		})
		if (found) {
			msg.textContent = '✓ Kode valid! Silakan isi nama penerima.'
			msg.style.color = '#10b981'
			window._validAdopsiCode = found
			updateCertPreview(found)
		} else {
			msg.textContent = 'Kode tidak ditemukan atau belum diverifikasi.'
			msg.style.color = '#f59e0b'
			window._validAdopsiCode = null
			updateCertPreview()
		}
	}

	window.updateCertPreview = function(adopsiData) {
		var name = document.getElementById('certAdopsiName').value.trim()
		var preview = document.getElementById('certPreview')
		var btn = document.getElementById('btnDownloadCert')
		if (window._validAdopsiCode && name) {
			preview.style.display = 'block'
			btn.disabled = false
			var cv = document.getElementById('certCanvas')
			if (cv) {
				var data = {
					name: name,
					qty: adopsiData ? adopsiData.quantity : 1,
					loc: 'Kawasan Gunung Bawakaraeng',
					no: adopsiData ? adopsiData.adoption_code : 'RC-ADP-2026-00001',
					date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
				}
				drawAdopsiCert(cv, data)
			}
		} else {
			preview.style.display = 'none'
			btn.disabled = true
		}
	}

	window.downloadAdopsiCert = function() {
		if (!window._validAdopsiCode) {
			toast("error", "Kode Tidak Valid", "Masukkan kode adopsi yang sudah diverifikasi.")
			return
		}
		var name = document.getElementById('certAdopsiName').value.trim()
		if (!name) {
			toast("error", "Lengkapi Nama", "Isi nama penerima sertifikat dulu ya.")
			return
		}
		var qty = window._validAdopsiCode.quantity
		var code = window._validAdopsiCode.adoption_code

		// Create high-res canvas for download
		var hiCv = document.createElement('canvas')
		hiCv.width = 2000
		hiCv.height = 1414
		var data = {
			name: name,
			qty: qty,
			loc: 'Kawasan Gunung Bawakaraeng',
			no: code,
			date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
		}
		// Draw on high-res canvas
		drawAdopsiCert(hiCv, data)

		// Download as PNG
		hiCv.toBlob(function(b) {
			var u = URL.createObjectURL(b)
			var a = document.createElement('a')
			a.href = u
			a.download = 'Sertifikat-Adopsi-' + name.replace(/[^\w\- ]+/g, '').replace(/ +/g, '-') + '.png'
			document.body.appendChild(a)
			a.click()
			setTimeout(function() {
				document.body.removeChild(a)
				URL.revokeObjectURL(u)
			}, 1500)
			toast("success", "Sertifikat Berhasil!", 'File PNG resolusi tinggi berhasil diunduh.')
		}, 'image/png')
	}

	/* ----------------------------------------------------------------------
	   Certificate Drawing Functions (Cloned from Pintu Angin)
	   ---------------------------------------------------------------------- */
	var _certLogo = null, _certLogoOK = false, _certNo = '', _certNoName = '', _lastCertData = null

	function _loadCertLogo(cb) {
		if (_certLogoOK) { if (cb) cb(); return }
		if (!_certLogo) {
			_certLogo = new Image()
			_certLogo.onload = function() { _certLogoOK = true; if (cb) cb() }
			_certLogo.onerror = function() { _certLogoOK = false; if (cb) cb() }
			_certLogo.src = 'assets/logo.png'
		} else if (cb) {
			_certLogo.addEventListener('load', cb)
		}
	}

	function _certGenNo(name) {
		var d = new Date()
		var seed = 2166136261
		var str = (name || 'x') + '|' + d.toDateString()
		for (var i = 0; i < str.length; i++) {
			seed ^= str.charCodeAt(i)
			seed = (seed * 16777619) >>> 0
		}
		var n = (seed % 90000) + 10000
		return 'RC-ADP-' + d.getFullYear() + '-' + n
	}

	function _rr(ctx, x, y, w, h, r) {
		ctx.beginPath()
		ctx.moveTo(x + r, y)
		ctx.arcTo(x + w, y, x + w, y + h, r)
		ctx.arcTo(x + w, y + h, x, y + h, r)
		ctx.arcTo(x, y + h, x, y, r)
		ctx.arcTo(x, y, x + w, y, r)
		ctx.closePath()
	}

	function _wrap(ctx, text, cx, y, maxW, lh) {
		var words = text.split(' ')
		var line = ''
		var yy = y
		for (var i = 0; i < words.length; i++) {
			var t = line ? line + ' ' + words[i] : words[i]
			if (ctx.measureText(t).width > maxW && line) {
				ctx.fillText(line, cx, yy)
				line = words[i]
				yy += lh
			} else {
				line = t
			}
		}
		if (line) ctx.fillText(line, cx, yy)
		return yy
	}

	function _pine(ctx, cx, by, h, col) {
		ctx.save()
		ctx.fillStyle = '#5a3d1e'
		ctx.fillRect(cx - h * 0.05, by - h * 0.02, h * 0.10, h * 0.20)
		ctx.fillStyle = col
		var w = h * 0.82
		for (var i = 0; i < 3; i++) {
			var ty = by - i * h * 0.28
			var tw = w * (1 - i * 0.22)
			ctx.beginPath()
			ctx.moveTo(cx, ty - h * 0.44)
			ctx.lineTo(cx - tw / 2, ty)
			ctx.lineTo(cx + tw / 2, ty)
			ctx.closePath()
			ctx.fill()
		}
		ctx.restore()
	}

	function _seal(ctx, cx, cy, R) {
		var pts = 22
		ctx.beginPath()
		for (var i = 0; i <= pts * 2; i++) {
			var a = Math.PI * i / pts
			var rr = (i % 2 === 0) ? R : R * 0.86
			var x = cx + Math.cos(a) * rr
			var y = cy + Math.sin(a) * rr
			if (i === 0) ctx.moveTo(x, y)
			else ctx.lineTo(x, y)
		}
		ctx.closePath()
		var sg = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, 4, cx, cy, R)
		sg.addColorStop(0, '#fbeaa0')
		sg.addColorStop(0.55, '#d4af37')
		sg.addColorStop(1, '#8a6d1f')
		ctx.fillStyle = sg
		ctx.fill()
		ctx.beginPath()
		ctx.arc(cx, cy, R * 0.72, 0, Math.PI * 2)
		ctx.strokeStyle = 'rgba(60,42,10,.5)'
		ctx.lineWidth = 3
		ctx.stroke()
		_pine(ctx, cx, cy + R * 0.34, R * 0.62, '#15402e')
	}

	function drawAdopsiCertToCanvas(cv, data) {
		// Create offscreen canvas for high-res drawing
		var offCanvas = document.createElement('canvas')
		offCanvas.width = 2000
		offCanvas.height = 1414
		drawAdopsiCert(offCanvas, data)

		// Draw scaled to preview canvas
		var ctx = cv.getContext('2d')
		ctx.clearRect(0, 0, cv.width, cv.height)
		ctx.drawImage(offCanvas, 0, 0, cv.width, cv.height)
	}

	function drawAdopsiCert(cv, data) {
		try {
			var ctx = cv.getContext('2d')
			if (!ctx) {
				console.error('[CERT] No 2D context')
				return
			}
			var W = cv.width || 2000
			var H = cv.height || 1414
			console.log('[CERT] Canvas:', W, 'x', H)

			// Clear canvas
			ctx.clearRect(0, 0, W, H)

			// === BACKGROUND ===
			var bg = ctx.createLinearGradient(0, 0, W, H)
			bg.addColorStop(0, '#0a1f17')
			bg.addColorStop(0.5, '#112e1c')
			bg.addColorStop(1, '#081a12')
			ctx.fillStyle = bg
			ctx.fillRect(0, 0, W, H)

			// === BORDER ===
			ctx.strokeStyle = '#d4af37'
			ctx.lineWidth = 15
			ctx.strokeRect(50, 50, W - 100, H - 100)
			ctx.strokeStyle = 'rgba(212,175,55,0.5)'
			ctx.lineWidth = 3
			ctx.strokeRect(75, 75, W - 150, H - 150)

			// === CENTER POINTS ===
			var cx = W / 2
			var cy = H / 2

			// === LOGO ===
			var logoY = 250
			ctx.beginPath()
			ctx.arc(cx, logoY, 85, 0, Math.PI * 2)
			ctx.fillStyle = '#0e2c23'
			ctx.fill()
			ctx.strokeStyle = '#d4af37'
			ctx.lineWidth = 4
			ctx.stroke()
			ctx.fillStyle = '#f7e08a'
			ctx.font = 'bold 64px Georgia, serif'
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			ctx.fillText('RC', cx, logoY)

			// === TITLE ===
			ctx.textBaseline = 'alphabetic'
			ctx.fillStyle = '#f7e08a'
			ctx.font = '26px Georgia, serif'
			ctx.fillText('ORGANISASI PENCINTA ALAM', cx, logoY + 110)

			ctx.fillStyle = '#d4af37'
			ctx.font = 'bold 36px Georgia, serif'
			ctx.fillText('RCS.CBS', cx, logoY + 150)

			ctx.fillStyle = '#d4af37'
			ctx.font = 'bold 80px Georgia, serif'
			ctx.fillText('SERTIFIKAT ADOPSI POHON', cx, logoY + 240)

			// === INTRO ===
			var introY = logoY + 300
			ctx.fillStyle = '#c8dcc8'
			ctx.font = 'italic 32px Georgia, serif'
			ctx.fillText('dengan penuh penghargaan diberikan kepada', cx, introY)

			// === NAME ===
			var nameY = introY + 80
			ctx.fillStyle = '#ffffff'
			ctx.font = 'italic bold 84px Georgia, serif'
			var nameText = data && data.name ? data.name : 'Nama Penerima'
			ctx.fillText(nameText, cx, nameY)

			// Name underline
			var nameW = ctx.measureText(nameText).width
			ctx.strokeStyle = '#d4af37'
			ctx.lineWidth = 3
			ctx.beginPath()
			ctx.moveTo(cx - nameW/2 - 50, nameY + 35)
			ctx.lineTo(cx + nameW/2 + 50, nameY + 35)
			ctx.stroke()

			// === BODY ===
			var bodyY = nameY + 120
			ctx.fillStyle = '#b8d4b8'
			ctx.font = '30px Georgia, serif'
			var qty = data && data.qty ? data.qty : 1
			var loc = data && data.loc ? data.loc : 'Gunung Bawakaraeng'
			ctx.fillText('atas dedikasi dalam mengadopsi ' + qty + ' bibit pohon', cx, bodyY)
			ctx.fillText('guna pelestarian ekosistem ' + loc, cx, bodyY + 45)
			ctx.fillText('Kontribusi ini warisan hijau bagi generasi mendatang.', cx, bodyY + 90)

			// === SIGNATURES ===
			var sigY = H - 250
			ctx.strokeStyle = 'rgba(212,175,55,0.7)'
			ctx.lineWidth = 2
			// Left
			ctx.beginPath()
			ctx.moveTo(W * 0.24 - 130, sigY)
			ctx.lineTo(W * 0.24 + 130, sigY)
			ctx.stroke()
			ctx.fillStyle = '#f7e08a'
			ctx.font = 'bold 28px Georgia, serif'
			ctx.fillText('Ketua Umum', W * 0.24, sigY + 50)
			ctx.fillStyle = '#bcd4c9'
			ctx.font = '22px Georgia, serif'
			ctx.fillText('RCS.CBS', W * 0.24, sigY + 80)

			// Right
			ctx.strokeStyle = 'rgba(212,175,55,0.7)'
			ctx.beginPath()
			ctx.moveTo(W * 0.76 - 150, sigY)
			ctx.lineTo(W * 0.76 + 150, sigY)
			ctx.stroke()
			ctx.fillStyle = '#f7e08a'
			ctx.font = 'bold 28px Georgia, serif'
			ctx.fillText('Koordinator Konservasi', W * 0.76, sigY)
			ctx.fillStyle = '#bcd4c9'
			ctx.font = '22px Georgia, serif'
			ctx.fillText('Bidang Ekosistem', W * 0.76, sigY + 30)

			// === SEAL ===
			var sealY = sigY + 110
			drawGoldSeal(ctx, cx, sealY, 55)

			// === FOOTER INFO ===
			var infoY = H - 85
			ctx.fillStyle = 'rgba(223,238,231,0.8)'
			ctx.font = '22px Georgia, serif'
			var no = data && data.no ? data.no : 'RC-ADP-2026-00001'
			var date = data && data.date ? data.date : new Date().toLocaleDateString('id-ID')
			ctx.fillText('No. ' + no + '   |   Tanggal: ' + date + '   |   ' + loc, cx, infoY)

		} catch (err) {
			console.error('[CERT] Error:', err.message)
			console.error(err.stack)
		}
	}

	function drawGoldSeal(ctx, cx, cy, R, data) {
		if (!ctx || !cx || !cy || !R) return
		var pts = 24
		ctx.beginPath()
		for (var i = 0; i <= pts * 2; i++) {
			var a = Math.PI * i / pts
			var rr = (i % 2 === 0) ? R : R * 0.88
			var x = cx + Math.cos(a) * rr
			var y = cy + Math.sin(a) * rr
			if (i === 0) ctx.moveTo(x, y)
			else ctx.lineTo(x, y)
		}
		ctx.closePath()
		var sg = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, 4, cx, cy, R)
		sg.addColorStop(0, '#fbeaa0')
		sg.addColorStop(0.55, '#d4af37')
		sg.addColorStop(1, '#8a6d1f')
		ctx.fillStyle = sg
		ctx.fill()
		ctx.beginPath()
		ctx.arc(cx, cy, R * 0.75, 0, Math.PI * 2)
		ctx.strokeStyle = 'rgba(60,42,10,.6)'
		ctx.lineWidth = 3
		ctx.stroke()
		// Inner tree
		ctx.fillStyle = '#15402e'
		ctx.beginPath()
		ctx.moveTo(cx, cy - R * 0.5)
		ctx.lineTo(cx - R * 0.35, cy + R * 0.3)
		ctx.lineTo(cx + R * 0.35, cy + R * 0.3)
		ctx.closePath()
		ctx.fill()
		ctx.fillRect(cx - R * 0.06, cy + R * 0.3, R * 0.12, R * 0.25)
		// Text around seal
		ctx.fillStyle = '#f7e08a'
		ctx.font = 'bold 14px Georgia, serif'
		ctx.textAlign = 'center'
		ctx.fillText('RCS.CBS', cx, cy + R * 0.55)
		ctx.font = '11px Georgia, serif'
		ctx.fillStyle = '#e8d5a0'
		ctx.fillText('KONSERVASI', cx, cy + R * 0.7)
	}

	function buildAdopsiCert(name, qty, code) {
		var cv = document.getElementById('certCanvas')
		if (!cv) return

		var loc = 'Kawasan Gunung Bawakaraeng'
		var no = _certGenNo(name)
		var date = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
		_lastCertData = { name: name || 'Sahabat Konservasi', qty: qty || 1, loc: loc, no: no, date: date }

		drawAdopsiCert(cv, _lastCertData)
		_loadCertLogo(function() {
			drawAdopsiCert(cv, _lastCertData)
		})

		// Download as PNG
		cv.toBlob(function(b) {
			var u = URL.createObjectURL(b)
			var a = document.createElement('a')
			a.href = u
			a.download = 'Sertifikat-Adopsi-' + name.replace(/[^\w\- ]+/g, '').replace(/ +/g, '-') + '.png'
			document.body.appendChild(a)
			a.click()
			setTimeout(function() {
				document.body.removeChild(a)
				URL.revokeObjectURL(u)
			}, 1500)
			toast("success", "Sertifikat Berhasil!", 'File PNG resolusi tinggi berhasil diunduh.')
		}, 'image/png')
	}

	/* ----------------------------------------------------------------------
	   16. Admin Panel — Adopsi Tab
	   ---------------------------------------------------------------------- */
	function renderAdopsiAdmin() {
		console.log("[BIVAK] renderAdopsiAdmin called, _adoptionRows:", _adoptionRows)
    var tbody = document.getElementById("tableAdopsiBody")
    console.log("[BIVAK] tableAdopsiBody element:", tbody)
    if (!tbody) {
      console.error("[BIVAK] tableAdopsiBody not found in DOM")
      return
    }
    if (!_adoptionRows || _adoptionRows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted)">Belum ada pengajuan adopsi.</td></tr>'
      return
    }
    var html = _adoptionRows.map(function(r, i) {
			var isVerified = r.status === 'terverifikasi'
			var isRejected = r.status === 'ditolak'
			var statusBadge = isVerified ? '<span style="color:#10b981;font-weight:700">✓ Terverifikasi</span>' :
			                  isRejected ? '<span style="color:#f43f5e;font-weight:700">✗ Ditolak</span>' :
			                  '<span style="color:#f59e0b;font-weight:700">○ Menunggu</span>'
			var codeDisplay = r.adoption_code ? '<span style="color:#10b981;font-weight:700">' + r.adoption_code + '</span>' : '-'
			var actions = isVerified ?
				'<button class="btn btn-outline" onclick="deleteAdopsi(' + i + ')" style="padding:0.3rem 0.5rem;font-size:0.75rem;border-color:#f43f5e;color:#f43f5e;white-space:nowrap"><i class="fa-solid fa-trash"></i> Hapus</button>' :
				'<button class="btn btn-primary" onclick="approveAdopsi(' + i + ')" style="padding:0.3rem 0.5rem;font-size:0.75rem;white-space:nowrap"><i class="fa-solid fa-check"></i> Verifikasi</button> ' +
				'<button class="btn btn-outline" onclick="rejectAdopsi(' + i + ')" style="padding:0.3rem 0.5rem;font-size:0.75rem;border-color:#f43f5e;color:#f43f5e;white-space:nowrap"><i class="fa-solid fa-xmark"></i></button>'
			return '<tr>' +
				'<td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + BIVAK.escape(r.customer_name || '-') + '</td>' +
				'<td style="max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + BIVAK.escape(r.package_name || '-') + '</td>' +
				'<td>' + (r.quantity || '-') + ' bibit</td>' +
				'<td>Rp ' + (Number(r.amount || 0).toLocaleString('id-ID')) + '</td>' +
				'<td style="max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + BIVAK.escape(r.whatsapp || '-') + '</td>' +
				'<td>' + statusBadge + '</td>' +
				'<td>' + codeDisplay + '</td>' +
				'<td style="min-width:180px">' + actions + '</td>' +
			'</tr>'
		}).join('')
		console.log("[BIVAK] Rendering", _adoptionRows.length, "rows, first row has", actions ? "buttons" : "no buttons")
		tbody.innerHTML = html
	}

  window.approveAdopsi = async function(i) {
    var r = _adoptionRows[i]
    console.log("[BIVAK] approveAdopsi called, index:", i, "row:", r)
    if (!r) {
      console.error("[BIVAK] No row found at index", i)
      toast("error", "Error", "Data adopsi tidak ditemukan.")
      return
    }
    var code = 'POH-' + Math.random().toString(36).substring(2, 7).toUpperCase()
    console.log("[BIVAK] Approving adopsi:", r.id, "code:", code)
    try {
      var res = await sbd.from("adoption_requests").update({
        status: 'terverifikasi',
        adoption_code: code,
        verified_at: new Date().toISOString()
      }).eq("id", r.id)
      console.log("[BIVAK] Update result:", res)
      if (res.error) throw res.error
      toast("success", "Kode Diterbitkan!", 'Kode adopsi: ' + code)
      await loadAdopsiData()
      renderAdopsiAdmin()
      updateAdopsiBadge()
    } catch (err) {
      console.error("[BIVAK] Approve error:", err)
      dbErr(err, "Gagal memverifikasi")
    }
  }

  window.rejectAdopsi = async function(i) {
    var r = _adoptionRows[i]
    console.log("[BIVAK] rejectAdopsi called, index:", i, "row:", r)
    if (!r) {
      console.error("[BIVAK] No row found at index", i)
      toast("error", "Error", "Data adopsi tidak ditemukan.")
      return
    }
    if (!confirm('Tolak pengajuan adopsi ini?')) return
    console.log("[BIVAK] Rejecting adopsi:", r.id)
    try {
      var res = await sbd.from("adoption_requests").update({
        status: 'ditolak'
      }).eq("id", r.id)
      console.log("[BIVAK] Reject result:", res)
      if (res.error) throw res.error
      toast("info", "Ditolak", "Pengajuan adopsi telah ditolak.")
      await loadAdopsiData()
      renderAdopsiAdmin()
      updateAdopsiBadge()
    } catch (err) {
      console.error("[BIVAK] Reject error:", err)
      dbErr(err, "Gagal menolak")
    }
  }

	window.deleteAdopsi = async function(i) {
		var r = _adoptionRows[i]
		if (!r) return
		if (!confirm('Hapus pengajuan adopsi ini? Tindakan permanen.')) return
		try {
			var res = await sbd.from("adoption_requests").delete().eq("id", r.id)
			if (res.error) throw res.error
			toast("success", "Dihapus", "Pengajuan adopsi telah dihapus.")
			await loadAdopsiData()
			renderAdopsiAdmin()
			updateAdopsiBadge()
		} catch (err) {
			dbErr(err, "Gagal menghapus")
		}
	}

  async function loadAdopsiData() {
    if (!sbd) {
      console.warn("[BIVAK] sbd (donasi client) not initialized")
      _adoptionRows = []
      return
    }
    try {
      console.log("[BIVAK] Loading adoption data from Pintu Angin DB...")
      var res = await sbd.from("adoption_requests").select("*").order("created_at", { ascending: false }).limit(100)
      console.log("[BIVAK] Adoption data loaded:", res)
      _adoptionRows = (res.data || [])
      console.log("[BIVAK] _adoptionRows count:", _adoptionRows.length)
      if (_adoptionRows.length > 0) {
        console.log("[BIVAK] First row sample:", _adoptionRows[0])
      }
    } catch (e) {
      console.error("[BIVAK] Adopsi load error:", e)
      console.error("[BIVAK] Error details:", JSON.stringify(e))
      _adoptionRows = []
    }
  }

	function updateAdopsiBadge() {
		var badge = document.getElementById("adopsiBadge")
		if (!badge) return
		var pending = (_adoptionRows || []).filter(function(r) { return r.status === 'menunggu_bukti' }).length
		badge.innerText = pending
		badge.style.display = pending > 0 ? "inline-flex" : "none"
	}

		/* ----------------------------------------------------------------------
		   17. Boot
		   ---------------------------------------------------------------------- */
		async function boot() {
			try {
				await loadPublicData()
				await loadAdopsiData()
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

	// Draw example certificate on page load
	function drawExampleCert() {
		console.log('[CERT] drawExampleCert called');
		var exCv = document.getElementById('exampleCertCanvas')
		console.log('[CERT] exampleCertCanvas element:', exCv);
		if (!exCv) { console.error('[CERT] exampleCertCanvas not found in DOM'); return }
		var exData = {
			name: 'Contoh Nama Penerima',
			qty: 1,
			loc: 'Kawasan Gunung Bawakaraeng',
			no: 'RC-ADP-2026-54321',
			date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
		}
		console.log('[CERT] Drawing example cert with data:', exData);
		// Use the same draw function for consistency
		drawAdopsiCert(exCv, exData)
	}

	// Ensure DOM is ready before drawing
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', function() {
			console.log('[CERT] DOMContentLoaded fired');
			drawExampleCert()
		})
	} else {
		console.log('[CERT] DOM already ready, drawing immediately');
		drawExampleCert()
	}

	// Alias agar renderDonation() bisa dipanggil dari index.html
	window.renderDonation = window.renderDonationList
	window.renderAdopsiAdmin = renderAdopsiAdmin
})()
