/* ==========================================================================
   BIVAK v4 - Lapisan Data Supabase (Email-only Admin)
   --------------------------------------------------------------------------
   - Admin login pakai email + password Supabase Auth, lalu cek tabel admins
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
		return
	}

	if (!window.supabase || typeof window.supabase.createClient !== "function") {
		toast("error", "Gagal memuat database", "Library Supabase tidak termuat.")
		return
	}

	var sb = window.bivakDb || window.supabase.createClient(mainCfg.url, mainCfg.anonKey, {
		auth: { storageKey: "bivak-main-auth" }
	})
	window.bivakDb = sb

	var sbd = null
	if (donasiCfg.url && donasiCfg.anonKey) {
		sbd = window.bivakDonasiDb || window.supabase.createClient(donasiCfg.url, donasiCfg.anonKey, {
			auth: { storageKey: "bivak-donasi-auth" }
		})
		window.bivakDonasiDb = sbd
	}

	/* ----------------------------------------------------------------------
	   2. Status admin â€” email + password
	   ---------------------------------------------------------------------- */
	var isAdmin = false

	async function checkAdminUser(user, email) {
		if (!email) return false
		email = email.trim().toLowerCase()
		try {
			var q = sb.from("admins").select("email,user_id").ilike("email", email).limit(1)
			var res = await q
			var data = res.data || []
			if (res.error) {
				return false
			}
			if (!data.length) return false
			if (data[0].user_id && user && user.id) return data[0].user_id === user.id
			return true
		} catch (err) {
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
		var img = row.image_url || ""
		if (!img || img.charAt(0) === "<" || img.indexOf(">") !== -1 || (window.BIVAK && BIVAK.isGenericPhoto && BIVAK.isGenericPhoto(img))) {
			img = (window.BIVAK && BIVAK.photoForVendor) ? BIVAK.photoForVendor(row.name, row.city) : "assets/gear-fallback.jpg"
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

		var vRes = await sb.from("vendors").select("*").eq("status", "approved").order("created_at", { ascending: false })
		if (vRes.error) {
			vendorsData = []
		} else {
			vendorsData = (vRes.data || []).map(mapVendor)
		}

		var pRes = isAdmin
			? await sb.from("vendors").select("*").eq("status", "pending").order("created_at", { ascending: true })
			: { data: [], error: null }
		pendingVendorsData = (pRes.data || []).map(mapVendor)

		if (sbd) {
			var dRes = await sbd.from("donasi").select("*").order("created_at", { ascending: false }).limit(50)
			_dnRows = (dRes.data || [])
			_dnCloud = true
		} else {
			_dnRows = []
			_dnCloud = false
		}

		if (sbd) {
			try {
				var aRes = await sbd.from("adoption_requests").select("*").order("created_at", { ascending: false }).limit(100)
				_adoptionRows = (aRes.data || [])
			} catch(e) {
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
				image_url: BIVAK.photoForVendor(val("inputVendorName"), val("inputVendorCity")),
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
	   7. Donasi Submit â€” ke database LAMA
	   ---------------------------------------------------------------------- */
	window.handleDonasiSubmit = async function (e) {
		e.preventDefault()
		var form = document.getElementById("formDonasi")
		var nama = val("inputDonasiNama")
		var nominal = parseInt(val("inputDonasiNominal"), 10)
			|| (window.BIVAK && BIVAK.tierSelected)
			|| 0
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
			toast("success", "Donasi Terkirim!", "Nama Anda akan muncul di leaderboard setelah diverifikasi admin. Terima kasih! ðŸ’š", 6000)
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
	function syncCoinBadge() {}

	function syncDonasiBadge() {
		var badge = document.getElementById("donasiBadge")
		if (!badge) return
		var newCount = (_dnRows || []).filter(function(d) { return d.astatus === 'baru' }).length
		badge.innerText = newCount
		badge.style.display = isAdmin && newCount > 0 ? "inline-flex" : "none"
	}

	function syncAdopsiBadge() {
		var badge = document.getElementById("adopsiBadge")
		if (!badge) return
		var pending = (_adoptionRows || []).filter(function(r) { return r.status === 'menunggu_bukti' }).length
		badge.innerText = pending
		badge.style.display = isAdmin && pending > 0 ? "inline-flex" : "none"
	}

	var origUpdateBadges = window.updateBadgesAndStats || window.updateBadges
	if (typeof origUpdateBadges === "function") {
		window.updateBadgesAndStats = function () {
			origUpdateBadges()
			syncDonasiBadge()
			syncAdopsiBadge()
		}
	} else {
		window.updateBadgesAndStats = function () {
			syncDonasiBadge()
			syncAdopsiBadge()
		}
	}

	/* ----------------------------------------------------------------------
	   9. Login Admin â€” EMAIL + PASSWORD
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
			'<p style="color:var(--text-muted);font-size:.83rem;margin-top:.2rem;" id="loginModalSubtitle">Login aman pakai Supabase Auth</p></div>',
			'<button class="modal-close" type="button" onclick="closeModal(\'modalAdminLogin\')">&times;</button>',
			'</div><div class="modal-body">',
			'<form id="formAdminLogin">',
			'<div class="input-group"><label>Email Admin</label>',
			'<input class="form-control" type="email" id="inputAdminEmail" autocomplete="username" required placeholder="admin@bivak.id"></div>',
			'<div class="input-group"><label>Password</label>',
			'<input class="form-control" type="password" id="inputAdminPassword" autocomplete="current-password" required placeholder="Password admin"></div>',
			'<button class="btn btn-primary" type="submit" id="btnLoginSubmit" style="width:100%;margin-top:.5rem;">Masuk</button>',
			'</form>',
			'<p style="text-align:center;margin-top:1rem;font-size:.82rem;color:var(--text-muted);">',
			'Masukkan email dan password akun admin Supabase.',
			'</p></div></div>',
		].join("")
		document.body.appendChild(wrap)

		document.getElementById("formAdminLogin").addEventListener("submit", async function (e) {
			e.preventDefault()
			var form = e.currentTarget
			var email = val("inputAdminEmail")
			var password = val("inputAdminPassword")

			if (!email || !password) {
				toast("error", "Data Login Kosong", "Masukkan email dan password admin.")
				return
			}

			busy(form, true, "Masuk...")
			try {
				var login = await sb.auth.signInWithPassword({ email: email, password: password })
				if (login.error) throw login.error

				var user = login.data && login.data.user
				var isAdminRow = await checkAdminUser(user, email)

				if (!isAdminRow) {
					await sb.auth.signOut()
					toast("error", "Bukan Admin", "Akun ini belum terdaftar di tabel admins.")
					form.reset()
					return
				}

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
			syncDonasiBadge()
			syncAdopsiBadge()
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
	   12. Donasi Admin Actions â€” dari database LAMA
	   ---------------------------------------------------------------------- */
/* ----------------------------------------------------------------------
	   11b. Aksi admin: acuan baris stabil + kunci klik-ganda
	   ----------------------------------------------------------------------
	   Tombol setujui/tolak dulu mengirim INDEKS array, mis. donasiApprove(3).
	   Indeks itu bergeser setiap data dimuat ulang -- dan data SELALU dimuat
	   ulang setelah tiap aksi, juga saat ada baris baru masuk. Akibatnya klik
	   bisa mengenai baris lain atau baris yang sudah tidak ada, sehingga
	   terasa "macet" dan baru berhasil setelah dipencet berulang. Sekarang
	   tombol mengirim ID baris, sama seperti tombol vendor yang memang sudah
	   benar sejak awal.
	   ---------------------------------------------------------------------- */

	var _rowBusy = {}

	function rowByRef(rows, ref) {
		rows = rows || []
		for (var k = 0; k < rows.length; k++) {
			if (rows[k] && String(rows[k].id) === String(ref)) return rows[k]
		}
		if (typeof ref === "number" && ref >= 0 && ref < rows.length) return rows[ref]
		return null
	}

	function beginRowAction(key, btn) {
		if (_rowBusy[key]) return null
		_rowBusy[key] = true
		var prev = null
		if (btn && btn.tagName) {
			prev = btn.innerHTML
			btn.disabled = true
			btn.setAttribute("aria-busy", "true")
			btn.style.opacity = "0.55"
			btn.style.cursor = "wait"
			btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'
		}
		return function endRowAction() {
			delete _rowBusy[key]
			if (btn && btn.tagName && btn.parentNode) {
				btn.disabled = false
				btn.removeAttribute("aria-busy")
				btn.style.opacity = ""
				btn.style.cursor = ""
				if (prev !== null) btn.innerHTML = prev
			}
		}
	}

	function affectedCount(res) {
		if (res && res.error) throw res.error
		return (res && res.data && res.data.length) || 0
	}

	function rowGone(reloader) {
		toast("error", "Data Sudah Berubah", "Baris itu tidak ada lagi di daftar. Daftar dimuat ulang, silakan ulangi.")
		return reloader()
	}

	window.donasiApprove = async function (ref, st, btn) {
		if (!sbd) {
			toast("error", "Database Donasi Tidak Tersedia", "")
			return
		}
		var r = rowByRef(_dnRows, ref)
		if (!r) return rowGone(function () { return loadPublicData({ alsoAdminTables: true }) })
		var end = beginRowAction("donasi:" + r.id, btn)
		if (!end) return
		try {
			var res = await sbd.from("donasi").update({ astatus: st }).eq("id", r.id).select("id")
			if (affectedCount(res) === 0) {
				toast("error", "Tidak Tersimpan", "Server menolak perubahan, status tidak berubah. Cek izin RLS tabel donasi.")
				return
			}
			toast("success", "Berhasil", st === 'disetujui' ? 'Donasi disetujui. Nama akan tampil di leaderboard.' : 'Donasi ditolak.')
			await loadPublicData({ alsoAdminTables: true })
			if (typeof renderDonation === 'function') renderDonation()
		} catch (err) {
			dbErr(err, "Aksi donasi gagal")
		} finally {
			end()
		}
	}

	window.donasiDelete = async function (ref, btn) {
		if (!sbd) {
			toast("error", "Database Donasi Tidak Tersedia", "")
			return
		}
		var r = rowByRef(_dnRows, ref)
		if (!r) return rowGone(function () { return loadPublicData({ alsoAdminTables: true }) })
		if (!confirm('Hapus permanen donasi dari "' + (r.nama || 'Donatur') + '" sebesar Rp ' + (Number(r.amt || 0)).toLocaleString('id-ID') + '? Tindakan ini tidak bisa dibatalkan.')) return
		var end = beginRowAction("donasi:" + r.id, btn)
		if (!end) return
		try {
			var res = await sbd.from("donasi").delete().eq("id", r.id).select("id")
			if (affectedCount(res) === 0) {
				toast("error", "Tidak Terhapus", "Server menolak penghapusan. Cek izin RLS tabel donasi (policy DELETE).")
				return
			}
			toast("success", "Donasi Dihapus", "Data donasi berhasil dihapus permanen.")
			await loadPublicData({ alsoAdminTables: true })
			if (typeof renderDonation === 'function') renderDonation()
		} catch (err) {
			dbErr(err, "Hapus donasi gagal")
		} finally {
			end()
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
	   14. Render admin tables â€” menggunakan data cloud
	   ---------------------------------------------------------------------- */
	window.renderAdminTables = function() {
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

		var donasiBody = document.getElementById("tableDonasiBody")
		if (donasiBody) {
			var allDonasi = _dnRows || []
			if (allDonasi.length === 0) {
				donasiBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Belum ada donasi.</td></tr>'
			} else {
				donasiBody.innerHTML = allDonasi.map(function(r, i) {
					var nm = BIVAK.escape(r.nama || 'Donatur')
					var amt = 'Rp ' + (Number(r.amt || 0)).toLocaleString('id-ID')
					var when = r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID') : '-'
					var st = r.astatus || 'baru'
					var stBadge = st === 'disetujui' ? '<span style="color:#10b981;font-weight:700">âœ“ Diterima</span>' :
					              st === 'ditolak' ? '<span style="color:#f43f5e;font-weight:700">âœ— Ditolak</span>' :
					              '<span style="color:#f59e0b;font-weight:700">â—‹ Baru</span>'
					return '<tr>' +
						'<td>' + nm + '</td>' +
						'<td>' + amt + '</td>' +
						'<td>' + when + '</td>' +
						'<td>' + stBadge + '</td>' +
						'<td>' +
							'<button class="btn btn-primary" onclick="donasiApprove(\'' + r.id + '\',\'disetujui\', this)" style="padding:0.3rem 0.5rem;font-size:0.75rem"><i class="fa-solid fa-check"></i></button> ' +
							'<button class="btn btn-outline" onclick="donasiApprove(\'' + r.id + '\',\'ditolak\', this)" style="padding:0.3rem 0.5rem;font-size:0.75rem"><i class="fa-solid fa-xmark"></i></button> ' +
							'<button class="btn btn-outline" onclick="donasiDelete(\'' + r.id + '\', this)" title="Hapus donasi" style="padding:0.3rem 0.5rem;font-size:0.75rem;border-color:var(--accent-rose);color:var(--accent-rose)"><i class="fa-solid fa-trash"></i></button>' +
						'</td>' +
					'</tr>'
				}).join('')
			}
		}

		var donasiBadge = document.getElementById("donasiTabBadge")
		if (donasiBadge) {
			var newDonasi = (_dnRows || []).filter(function(d) { return d.astatus === 'baru' }).length
			donasiBadge.textContent = newDonasi
		}

		var adopsiBadge = document.getElementById("adopsiTabBadge")
		if (adopsiBadge) {
			var newAdopsi = (_adoptionRows || []).filter(function(r) { return r.status === 'menunggu_bukti' }).length
			adopsiBadge.textContent = newAdopsi
		}
	}

	/* ----------------------------------------------------------------------
	   15. Adopsi Pohon â€” Cloned from Bawakaraeng Hub
	   ---------------------------------------------------------------------- */
	var _adoptionRows = []
	var _selectedPackage = null

	window.selectAdopsiPackage = function(pkgId, amount, packageName) {
		_selectedPackage = { id: pkgId, amount: amount, name: packageName }
		document.querySelectorAll('.adopsi-card').forEach(function(card) {
			card.style.borderColor = 'transparent'
			card.style.transform = 'none'
		})
		var selected = document.getElementById('pkg-' + pkgId)
		if (selected) {
			selected.style.borderColor = '#10b981'
			selected.style.transform = 'scale(1.02)'
		}
		document.getElementById('adopsiFormCard').style.display = 'block'
		document.getElementById('adopsiPaymentInfo').style.display = 'none'
		document.getElementById('adopsiSelectedPkg').textContent = packageName
		document.getElementById('adopsiSelectedAmt').textContent = 'Rp ' + amount.toLocaleString('id-ID')
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
		var found = (_adoptionRows || []).find(function(r) {
			return r.adoption_code === code && r.status === 'terverifikasi'
		})
		if (found) {
			msg.textContent = 'âœ“ Kode valid! Silakan isi nama penerima.'
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
		var nameEl = document.getElementById('certAdopsiName')
		var preview = document.getElementById('certPreview')
		var btn = document.getElementById('btnDownloadCert')
		if (!nameEl || !preview || !btn) return
		var name = nameEl.value.trim()
		if (!window._validAdopsiCode || !name) {
			preview.style.display = 'none'
			btn.disabled = true
			return
		}
		preview.style.display = 'block'
		btn.disabled = false
		var cv = document.getElementById('certCanvas')
		if (cv && window.BivakCert) BivakCert.render(cv, _certData(name, adopsiData))
	}

	function _certData(name, row) {
		var valid = window._validAdopsiCode || {}
		row = row || valid
		return {
			name: name,
			qty: row.quantity || valid.quantity || 1,
			loc: 'Kawasan Gunung Bawakaraeng',
			no: row.adoption_code || valid.adoption_code || 'RC-ADP-2026-00001',
			date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
		}
	}

	window.downloadAdopsiCert = function() {
		if (!window._validAdopsiCode) {
			toast("error", "Kode Tidak Valid", "Masukkan kode adopsi yang sudah diverifikasi.")
			return
		}
		var nameEl = document.getElementById('certAdopsiName')
		var name = nameEl ? nameEl.value.trim() : ''
		if (!name) {
			toast("error", "Lengkapi Nama", "Isi nama penerima sertifikat dulu ya.")
			return
		}
		if (!window.BivakCert) {
			toast("error", "Belum Siap", "Modul sertifikat gagal dimuat. Coba muat ulang halaman.")
			return
		}
		var safe = name.replace(/[^\w\- ]+/g, '').replace(/ +/g, '-')
		BivakCert.download(_certData(name, window._validAdopsiCode), 'Sertifikat-Adopsi-' + safe + '.png', function(err) {
			if (err) toast("error", "Gagal Mengunduh", err.message)
			else toast("success", "Sertifikat Berhasil!", "File PNG resolusi tinggi berhasil diunduh.")
		})
	}

	/* ----------------------------------------------------------------------
	   16. Admin Panel â€” Adopsi Tab
	   ---------------------------------------------------------------------- */
	function renderAdopsiAdmin() {
    var tbody = document.getElementById("tableAdopsiBody")
    if (!tbody) {
      return
    }
    if (!_adoptionRows || _adoptionRows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted)">Belum ada pengajuan adopsi.</td></tr>'
      return
    }
    var html = _adoptionRows.map(function(r, i) {
			var isVerified = r.status === 'terverifikasi'
			var isRejected = r.status === 'ditolak'
			var statusBadge = isVerified ? '<span style="color:#10b981;font-weight:700">âœ“ Terverifikasi</span>' :
			                  isRejected ? '<span style="color:#f43f5e;font-weight:700">âœ— Ditolak</span>' :
			                  '<span style="color:#f59e0b;font-weight:700">â—‹ Menunggu</span>'
			var codeDisplay = r.adoption_code ? '<span style="color:#10b981;font-weight:700">' + r.adoption_code + '</span>' : '-'
			var actions
			if (isVerified) {
				actions = '<button class="btn btn-outline" onclick="deleteAdopsi(\'' + r.id + '\', this)" style="padding:0.4rem 0.6rem;font-size:0.8rem;border-color:#f43f5e;color:#f43f5e;white-space:nowrap"><i class="fa-solid fa-trash"></i> Hapus</button>'
			} else if (isRejected) {
				actions = '<button class="btn btn-outline" onclick="deleteAdopsi(\'' + r.id + '\', this)" style="padding:0.4rem 0.6rem;font-size:0.8rem;border-color:#f43f5e;color:#f43f5e;white-space:nowrap"><i class="fa-solid fa-trash"></i> Hapus</button>'
			} else {
				actions = '<button class="btn btn-primary" onclick="approveAdopsi(\'' + r.id + '\', this)" style="padding:0.4rem 0.6rem;font-size:0.8rem;white-space:nowrap"><i class="fa-solid fa-check"></i> Verifikasi</button> ' +
				          '<button class="btn btn-outline" onclick="rejectAdopsi(\'' + r.id + '\', this)" style="padding:0.4rem 0.6rem;font-size:0.8rem;border-color:#f43f5e;color:#f43f5e;white-space:nowrap"><i class="fa-solid fa-xmark"></i> Tolak</button>'
			}
			return '<tr>' +
				'<td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + BIVAK.escape(r.customer_name || '-') + '</td>' +
				'<td style="max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + BIVAK.escape(r.package_name || '-') + '</td>' +
				'<td>' + (r.quantity || '-') + ' bibit</td>' +
				'<td>Rp ' + (Number(r.amount || 0).toLocaleString('id-ID')) + '</td>' +
				'<td style="max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + BIVAK.escape(r.whatsapp || '-') + '</td>' +
				'<td>' + statusBadge + '</td>' +
				'<td>' + codeDisplay + '</td>' +
				'<td style="min-width:200px">' + actions + '</td>' +
			'</tr>'
		}).join('')
		tbody.innerHTML = html
	}

  window.approveAdopsi = async function(ref, btn) {
    if (!sbd) {
      toast("error", "Database Tidak Tersedia", "")
      return
    }
    var r = rowByRef(_adoptionRows, ref)
    if (!r) return rowGone(async function () { await loadAdopsiData(); renderAdopsiAdmin() })
    var end = beginRowAction("adopsi:" + r.id, btn)
    if (!end) return
    var code = 'POH-' + Math.random().toString(36).substring(2, 7).toUpperCase()
    try {
      var res = await sbd.from("adoption_requests").update({
        status: 'terverifikasi',
        adoption_code: code,
        verified_at: new Date().toISOString()
      }).eq("id", r.id).select("id")
      if (affectedCount(res) === 0) {
        toast("error", "Tidak Tersimpan", "Server menolak perubahan. Cek izin RLS tabel adoption_requests.")
        return
      }
      toast("success", "Kode Diterbitkan!", 'Kode adopsi: ' + code)
      await loadAdopsiData()
      renderAdopsiAdmin()
      updateAdopsiBadge()
    } catch (err) {
      dbErr(err, "Gagal memverifikasi")
    } finally {
      end()
    }
  }

  	window.rejectAdopsi = async function(ref, btn) {
		if (!sbd) {
			toast("error", "Database Tidak Tersedia", "")
			return
		}
		var r = rowByRef(_adoptionRows, ref)
		if (!r) return rowGone(async function () { await loadAdopsiData(); renderAdopsiAdmin() })
		if (_rowBusy["adopsi:" + r.id]) return
		if (!confirm('Tolak pengajuan adopsi ini?\n\nPengajuan akan ditandai sebagai DITOLAK.')) return
		var end = beginRowAction("adopsi:" + r.id, btn)
		if (!end) return
		try {
			var res = await sbd.from("adoption_requests").update({
				status: 'ditolak'
			}).eq("id", r.id).select("id")
			if (affectedCount(res) === 0) {
				toast("error", "Tidak Tersimpan", "Server menolak perubahan, status tetap. Cek izin RLS tabel adoption_requests.")
				return
			}
			toast("info", "Ditolak", "Pengajuan adopsi " + r.customer_name + " telah ditolak.")
			await loadAdopsiData()
			renderAdopsiAdmin()
			updateAdopsiBadge()
		} catch (err) {
			dbErr(err, "Gagal menolak")
		} finally {
			end()
		}
	}

	window.deleteAdopsi = async function(ref, btn) {
		if (!sbd) {
			toast("error", "Database Tidak Tersedia", "")
			return
		}
		var r = rowByRef(_adoptionRows, ref)
		if (!r) return rowGone(async function () { await loadAdopsiData(); renderAdopsiAdmin() })
		if (_rowBusy["adopsi:" + r.id]) return
		if (!confirm('Hapus pengajuan adopsi ini? Tindakan permanen.')) return
		var end = beginRowAction("adopsi:" + r.id, btn)
		if (!end) return
		try {
			var res = await sbd.from("adoption_requests").delete().eq("id", r.id).select("id")
			if (affectedCount(res) === 0) {
				toast("error", "Tidak Terhapus", "Server menolak penghapusan. Cek izin RLS tabel adoption_requests.")
				return
			}
			toast("success", "Dihapus", "Pengajuan adopsi telah dihapus.")
			await loadAdopsiData()
			renderAdopsiAdmin()
			updateAdopsiBadge()
		} catch (err) {
			dbErr(err, "Gagal menghapus")
		} finally {
			end()
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
      if (_adoptionRows.length > 0) {
      }
    } catch (e) {
      _adoptionRows = []
    }
  }

	function updateAdopsiBadge() {
		var badge = document.getElementById("adopsiBadge")
		if (!badge) return
		var pending = (_adoptionRows || []).filter(function(r) { return r.status === 'menunggu_bukti' }).length
		badge.innerText = pending
		badge.style.display = isAdmin && pending > 0 ? "inline-flex" : "none"
	}

		/* ----------------------------------------------------------------------
		   17. Boot
		   ---------------------------------------------------------------------- */
		async function boot() {
			try {
				await loadPublicData()
				await loadAdopsiData()
			} catch (err) {
				dbErr(err, "Gagal memuat data dari database")
			}
		}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", boot)
	} else {
		boot()
	}

	function drawExampleCert() {
		var exCv = document.getElementById('exampleCertCanvas')
		if (!exCv || !window.BivakCert) return
		BivakCert.render(exCv, {
			name: 'Contoh Nama Penerima',
			qty: 1,
			loc: 'Kawasan Gunung Bawakaraeng',
			no: 'RC-ADP-2026-54321',
			date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
		})
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', drawExampleCert)
	} else {
		drawExampleCert()
	}

	window.renderDonation = window.renderDonationList
	window.renderAdopsiAdmin = renderAdopsiAdmin
})()
