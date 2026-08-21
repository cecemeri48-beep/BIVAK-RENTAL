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

	var origUpdateBadges = window.updateBadgesAndStats || window.updateBadges
	if (typeof origUpdateBadges === "function") {
		window.updateBadgesAndStats = function () {
			origUpdateBadges()
			syncCoinBadge()
			syncDonasiBadge()
		}
	} else {
		window.updateBadgesAndStats = function () {
			syncCoinBadge()
			syncDonasiBadge()
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
			console.log('[CERT] drawAdopsiCert called', { cv: !!cv, width: cv?.width, height: cv?.height, data });
			if (!cv) { console.error('[CERT] Canvas element not found!'); return }
			var ctx = cv.getContext('2d')
			if (!ctx) { console.error('[CERT] Canvas 2D context not available!'); return }
			var W = cv.width
			var H = cv.height
			console.log('[CERT] Canvas size:', W, 'x', H)
			ctx.clearRect(0, 0, W, H)
			ctx.textAlign = 'center'
			ctx.textBaseline = 'alphabetic'

			// Test basic drawing
			console.log('[CERT] Testing basic fillRect...')
			ctx.fillStyle = '#000000'
			ctx.fillRect(0, 0, 10, 10)
			console.log('[CERT] Basic fillRect test done')

			var bg = ctx.createLinearGradient(0, 0, W, H)
			bg.addColorStop(0, '#0c2a22')
			bg.addColorStop(0.5, '#123c31')
			bg.addColorStop(1, '#09201a')
			ctx.fillStyle = bg
			ctx.fillRect(0, 0, W, H)
			console.log('[CERT] Background gradient drawn')

		var gl = ctx.createRadialGradient(W / 2, H * 0.30, 60, W / 2, H * 0.30, W * 0.62)
		gl.addColorStop(0, 'rgba(215,175,55,.22)')
		gl.addColorStop(1, 'rgba(215,175,55,0)')
		ctx.fillStyle = gl
		ctx.fillRect(0, 0, W, H)

		ctx.save()
		ctx.globalAlpha = .05
		ctx.strokeStyle = '#f7e08a'
		ctx.lineWidth = 2
		for (var r = 44; r < W * 0.72; r += 26) {
			ctx.beginPath()
			ctx.arc(W / 2, H * 0.45, r, 0, Math.PI * 2)
			ctx.stroke()
		}
		ctx.restore()

		ctx.save()
		ctx.globalAlpha = .10
		ctx.fillStyle = '#f7e08a'
		ctx.beginPath()
		ctx.moveTo(0, H)
		ctx.lineTo(0, H * 0.80)
		ctx.lineTo(W * 0.22, H * 0.66)
		ctx.lineTo(W * 0.4, H * 0.77)
		ctx.lineTo(W * 0.58, H * 0.58)
		ctx.lineTo(W * 0.78, H * 0.72)
		ctx.lineTo(W, H * 0.62)
		ctx.lineTo(W, H)
		ctx.closePath()
		ctx.fill()
		ctx.restore()

		function gold() {
			var g = ctx.createLinearGradient(0, 0, W, 0)
			g.addColorStop(0, '#8a6d1f')
			g.addColorStop(0.25, '#f7e08a')
			g.addColorStop(0.5, '#d4af37')
			g.addColorStop(0.75, '#f9e79a')
			g.addColorStop(1, '#8a6d1f')
			return g
		}

		var m = 54
		console.log('[CERT] Drawing outer border...')
		ctx.strokeStyle = gold()
		ctx.lineWidth = 9
		_rr(ctx, m, m, W - 2 * m, H - 2 * m, 26)
		ctx.stroke()
		console.log('[CERT] Outer border drawn')

		var m2 = 76
		console.log('[CERT] Drawing inner border...')
		ctx.lineWidth = 2.5
		ctx.strokeStyle = 'rgba(247,224,138,.7)'
		_rr(ctx, m2, m2, W - 2 * m2, H - 2 * m2, 18)
		ctx.stroke()
		console.log('[CERT] Inner border drawn')

		ctx.fillStyle = gold()
		console.log('[CERT] Drawing diamond corners...')
		[[m, m], [W - m, m], [m, H - m], [W - m, H - m]].forEach(function(pt) {
			ctx.save()
			ctx.translate(pt[0], pt[1])
			ctx.rotate(Math.PI / 4)
			ctx.fillRect(-11, -11, 22, 22)
			ctx.restore()
		})
		console.log('[CERT] Diamond corners drawn')

		var cx = W / 2
		var ly = 196
		var lr = 90
		console.log('[CERT] Drawing logo circle at', cx, ly, 'radius', lr)
		ctx.beginPath()
		ctx.arc(cx, ly, lr + 15, 0, Math.PI * 2)
		ctx.fillStyle = '#0e2c23'
		ctx.fill()
		ctx.lineWidth = 5
		ctx.strokeStyle = gold()
		ctx.stroke()

		if (_certLogoOK && _certLogo) {
			console.log('[CERT] Drawing logo image...')
			ctx.save()
			ctx.beginPath()
			ctx.arc(cx, ly, lr, 0, Math.PI * 2)
			ctx.clip()
			ctx.drawImage(_certLogo, cx - lr, ly - lr, lr * 2, lr * 2)
			ctx.restore()
		} else {
			console.log('[CERT] Logo not loaded, drawing fallback text "RC"')
			ctx.fillStyle = '#f7e08a'
			ctx.font = '700 66px Georgia,serif'
			ctx.textBaseline = 'middle'
			ctx.fillText('RC', cx, ly)
			ctx.textBaseline = 'alphabetic'
		}
		console.log('[CERT] Logo circle drawn')

		try { ctx.letterSpacing = '5px' } catch (e) {}
		ctx.fillStyle = 'rgba(247,224,138,.92)'
		ctx.font = '700 25px Georgia,serif'
		console.log('[CERT] Drawing "ORGANISASI PENCINTA ALAM" at', cx, ly + lr + 62)
		ctx.fillText('ORGANISASI PENCINTA ALAM', cx, ly + lr + 62)
		ctx.fillStyle = '#f7e08a'
		ctx.font = '800 30px Georgia,serif'
		console.log('[CERT] Drawing "RCS.CBS" at', cx, ly + lr + 102)
		ctx.fillText('RCS.CBS', cx, ly + lr + 102)
		ctx.fillStyle = gold()
		ctx.font = '900 92px Georgia,serif'
		try { ctx.letterSpacing = '7px' } catch (e) {}
		console.log('[CERT] Drawing "SERTIFIKAT ADOPSI POHON" at', cx, ly + lr + 206)
		ctx.fillText('SERTIFIKAT ADOPSI POHON', cx, ly + lr + 206)
		try { ctx.letterSpacing = '0px' } catch (e) {}
		console.log('[CERT] Header text drawn')

		var dy = ly + lr + 252
		ctx.strokeStyle = 'rgba(247,224,138,.6)'
		ctx.lineWidth = 2
		ctx.beginPath()
		ctx.moveTo(cx - 340, dy)
		ctx.lineTo(cx - 40, dy)
		ctx.moveTo(cx + 40, dy)
		ctx.lineTo(cx + 340, dy)
		ctx.stroke()
		ctx.fillStyle = gold()
		ctx.save()
		ctx.translate(cx, dy)
		ctx.rotate(Math.PI / 4)
		ctx.fillRect(-9, -9, 18, 18)
		ctx.restore()

		ctx.fillStyle = '#dfeee7'
		ctx.font = 'italic 30px Georgia,serif'
		ctx.fillText('dengan penuh penghargaan diberikan kepada', cx, dy + 66)
		console.log('[CERT] Text "dengan penuh penghargaan" drawn at', cx, dy + 66)

		ctx.fillStyle = '#ffffff'
		ctx.font = 'italic 800 80px Georgia,serif'
		var nm = data.name
		ctx.fillText(nm, cx, dy + 162)
		console.log('[CERT] Name text drawn:', nm, 'at', cx, dy + 162)

		var nw = Math.min(ctx.measureText(nm).width + 140, W - 260)
		ctx.strokeStyle = gold()
		ctx.lineWidth = 3
		ctx.beginPath()
		ctx.moveTo(cx - nw / 2, dy + 196)
		ctx.lineTo(cx + nw / 2, dy + 196)
		ctx.stroke()

		ctx.fillStyle = '#cfe3da'
		ctx.font = '30px Georgia,serif'
		var body = 'atas dedikasi dan partisipasinya dalam mengadopsi ' + data.qty + ' bibit pohon guna pemulihan serta pelestarian ekosistem Gunung Bawakaraeng. Kontribusi ini menjadi warisan hijau yang bernilai bagi generasi mendatang.'
		_wrap(ctx, body, cx, dy + 258, W - 480, 44)

		var by = H - 196
		ctx.strokeStyle = 'rgba(247,224,138,.7)'
		ctx.lineWidth = 2
		var lx = W * 0.24
		var rx = W * 0.76
		ctx.beginPath()
		ctx.moveTo(lx - 150, by)
		ctx.lineTo(lx + 150, by)
		ctx.moveTo(rx - 150, by)
		ctx.lineTo(rx + 150, by)
		ctx.stroke()
		ctx.fillStyle = '#f7e08a'
		ctx.font = '800 27px Georgia,serif'
		ctx.fillText('Ketua Umum', lx, by + 42)
		ctx.fillText('Koordinator Konservasi', rx, by + 42)
		ctx.fillStyle = '#bcd4c9'
		ctx.font = '22px Georgia,serif'
		ctx.fillText('RCS.CBS', lx, by + 74)
		ctx.fillText('Bidang Ekosistem', rx, by + 74)
		_seal(ctx, cx, by + 2, 84)
		console.log('[CERT] Seal drawn')
		ctx.fillStyle = 'rgba(223,238,231,.82)'
		ctx.font = '22px Georgia,serif'
		var footerText = 'No. ' + data.no + '    ·    Tanggal: ' + data.date + '    ·    Lokasi: ' + data.loc
		console.log('[CERT] Drawing footer text:', footerText)
		ctx.fillText(footerText, cx, H - 92)
		console.log('[CERT] Footer drawn')
		console.log('[CERT] Certificate drawing complete - all elements rendered')
		} catch (err) {
			console.error('[CERT] Error during drawing:', err)
			console.error('[CERT] Error stack:', err.stack)
		}
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
		var tbody = document.getElementById("tableAdopsiBody")
		if (!tbody) return
		if (!_adoptionRows || _adoptionRows.length === 0) {
			tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted)">Belum ada pengajuan adopsi.</td></tr>'
			return
		}
		tbody.innerHTML = _adoptionRows.map(function(r, i) {
			var isVerified = r.status === 'terverifikasi'
			var isRejected = r.status === 'ditolak'
			var statusBadge = isVerified ? '<span style="color:#10b981;font-weight:700">✓ Terverifikasi</span>' :
			                  isRejected ? '<span style="color:#f43f5e;font-weight:700">✗ Ditolak</span>' :
			                  '<span style="color:#f59e0b;font-weight:700">○ Menunggu</span>'
			var codeDisplay = r.adoption_code ? '<span style="color:#10b981;font-weight:700">' + r.adoption_code + '</span>' : '-'
			var actions = isVerified ?
				'<button class="btn btn-outline" onclick="deleteAdopsi(' + i + ')" style="padding:0.3rem 0.5rem;font-size:0.75rem;border-color:#f43f5e;color:#f43f5e"><i class="fa-solid fa-trash"></i></button>' :
				'<button class="btn btn-primary" onclick="approveAdopsi(' + i + ')" style="padding:0.3rem 0.5rem;font-size:0.75rem"><i class="fa-solid fa-check"></i> Verifikasi</button> ' +
				'<button class="btn btn-outline" onclick="rejectAdopsi(' + i + ')" style="padding:0.3rem 0.5rem;font-size:0.75rem;border-color:#f43f5e;color:#f43f5e"><i class="fa-solid fa-xmark"></i></button>'
			return '<tr>' +
				'<td>' + BIVAK.escape(r.customer_name || '-') + '</td>' +
				'<td>' + BIVAK.escape(r.package_name || '-') + '</td>' +
				'<td>' + (r.quantity || '-') + ' bibit</td>' +
				'<td>Rp ' + (Number(r.amount || 0).toLocaleString('id-ID')) + '</td>' +
				'<td>' + BIVAK.escape(r.whatsapp || '-') + '</td>' +
				'<td>' + statusBadge + '</td>' +
				'<td>' + codeDisplay + '</td>' +
				'<td>' + actions + '</td>' +
			'</tr>'
		}).join('')
	}

	window.approveAdopsi = async function(i) {
		var r = _adoptionRows[i]
		if (!r) return
		var code = 'POH-' + Math.random().toString(36).substring(2, 7).toUpperCase()
		try {
			var res = await sbd.from("adoption_requests").update({
				status: 'terverifikasi',
				adoption_code: code,
				verified_at: new Date().toISOString()
			}).eq("id", r.id)
			if (res.error) throw res.error
			toast("success", "Kode Diterbitkan!", 'Kode adopsi: ' + code)
			await loadAdopsiData()
			renderAdopsiAdmin()
			updateAdopsiBadge()
		} catch (err) {
			dbErr(err, "Gagal memverifikasi")
		}
	}

	window.rejectAdopsi = async function(i) {
		var r = _adoptionRows[i]
		if (!r) return
		if (!confirm('Tolak pengajuan adopsi ini?')) return
		try {
			var res = await sbd.from("adoption_requests").update({
				status: 'ditolak'
			}).eq("id", r.id)
			if (res.error) throw res.error
			toast("info", "Ditolak", "Pengajuan adopsi telah ditolak.")
			await loadAdopsiData()
			renderAdopsiAdmin()
			updateAdopsiBadge()
		} catch (err) {
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
			_adoptionRows = []
			return
		}
		try {
			var res = await sbd.from("adoption_requests").select("*").order("created_at", { ascending: false }).limit(100)
			_adoptionRows = (res.data || [])
		} catch (e) {
			console.warn("[BIVAK] Adopsi load error:", e.message)
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
})()
