/* ==========================================================================
   BIVAK v4 - Lapisan Data Supabase
   --------------------------------------------------------------------------
   LELANG DIHAPUS — DIGANTI DENGAN SISTEM DONASI PINTU ANGIN
   File ini TIDAK mengubah app.js sama sekali.
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
	   1. Cek konfigurasi
	   ---------------------------------------------------------------------- */
	var cfg = window.BIVAK_SUPABASE || {}
	var configured = !!(cfg.url && cfg.anonKey)

	if (!configured) {
		console.info("[BIVAK] Mode demo aktif. Isi supabase-config.js untuk menyambung ke database.")
		return
	}

	if (!window.supabase || typeof window.supabase.createClient !== "function") {
		console.error("[BIVAK] Library supabase-js belum termuat.")
		toast("error", "Gagal memuat database", "Library Supabase tidak termuat.")
		return
	}

	var sb = window.supabase.createClient(cfg.url, cfg.anonKey)
	window.bivakDb = sb

	/* ----------------------------------------------------------------------
	   NAMING ALIAS — agar panggil "renderDonation" tetap ke renderDonationList
	   yang didefinisikan di app.js.
	   ---------------------------------------------------------------------- */
	if (typeof renderDonation === 'function') {
		// sudah ada alias, abaikan
	} else if (typeof renderDonationList === 'function') {
		window.renderDonation = function() { if (typeof window.renderDonationList === "function") window.renderDonationList(); }
	}

	/* ----------------------------------------------------------------------
	   OVERRIDE renderDonationList untuk pakai data Supabase
	   ---------------------------------------------------------------------- */
	window.renderDonationList = function() {
		var approved = [];
		try {
			if (_dnRows) approved = _dnRows.filter(function(d) { return d.astatus === 'disetujui'; });
		} catch(e) {}
		if (!approved.length) {
			try {
				var local = (typeof _lsGet === 'function') ? _lsGet('bivak_donations', []) : [];
				approved = local.filter(function(d) { return d && d.astatus === 'disetujui'; });
			} catch(e) {}
		}
		if (!approved.length) {
			approved = [
				{nama: 'Andi Mappanyukki', amt: 10000000},
				{nama: 'Komunitas Pencinta Alam Makassar', amt: 7500000},
				{nama: 'Nurul Fadhilah', amt: 5000000},
				{nama: 'Baso Dg. Nassa', amt: 5000000},
				{nama: 'Rina Kartika', amt: 3500000}
			];
		}
		var sorted = approved.slice().sort(function(a,b) { return (b.amt||0) - (a.amt||0); });
		var total = sorted.reduce(function(s,d) { return s + (d.amt||0); }, 0);
		var pct = Math.min(100, Math.round(total / 75000000 * 100));
		var col = document.getElementById('dnCollected');
		var bar = document.getElementById('dnBar');
		var pc = document.getElementById('dnPct');
		var box = document.getElementById('dnDonors');
		if (col) col.textContent = 'Rp ' + total.toLocaleString('id-ID');
		if (bar) bar.style.width = pct + '%';
		if (pc) pc.textContent = pct + '%';
		if (box) {
			var medals = ['🥇','🥈','🥉'];
			box.innerHTML = sorted.slice(0, 15).map(function(d,i) {
				var nm = BIVAK.escape(d.nama || 'Donatur');
				var top = i < 3;
				var rank = top ? medals[i] : '<span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:rgba(140,150,170,.18);color:#8c96aa;font-size:12px;font-weight:800">' + (i+1) + '</span>';
				var bg = top ? 'rgba(16,185,129,.08)' : 'rgba(140,150,170,.05)';
				var bd = top ? '1px solid rgba(16,185,129,.25)' : '1px solid rgba(140,150,170,.14)';
				return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;margin-bottom:6px;background:' + bg + ';border:' + bd + '"><div style="width:28px;text-align:center;flex-shrink:0">' + rank + '</div><div style="flex:1;min-width:0;font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + nm + '</div><div style="font-size:13px;font-weight:800;color:#10b981;white-space:nowrap">Rp ' + (d.amt||0).toLocaleString('id-ID') + '</div></div>';
			}).join('');
		}
	};

	/* ----------------------------------------------------------------------
	   2. ID surrogate
	   ---------------------------------------------------------------------- */
	var seq = 1
	function nextId() { return seq++ }

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

	/* ----------------------------------------------------------------------
	   3. PUBLIC DATA (vendors & pending) — declared here so Supabase can populate them
	   ---------------------------------------------------------------------- */
	var vendorsData = []
	var pendingVendorsData = []

	function findVendor(id) {
		var all = (vendorsData || []).concat(pendingVendorsData || [])
		for (var i = 0; i < all.length; i++) {
			if (all[i].id === id) return all[i]
		}
		return null
	}

	/* ----------------------------------------------------------------------
	   3. Status admin
	   ---------------------------------------------------------------------- */
	var isAdmin = false

	async function refreshAdminFlag() {
		var sess = await sb.auth.getSession()
		if (!sess.data.session) { isAdmin = false; return false }
		var res = await sb.rpc("is_app_admin")
		isAdmin = res.data === true
		return isAdmin
	}

	/* ----------------------------------------------------------------------
	   4. Memuat data dari database
	   ---------------------------------------------------------------------- */
	async function loadPublicData(options) {
		options = options || {}
		seq = 1

		var results = await Promise.all([
			sb.from("vendors").select("*").eq("status","approved").order("created_at",{ascending:false}),
			isAdmin
				? sb.from("vendors").select("*").eq("status","pending").order("created_at",{ascending:true})
				: Promise.resolve({ data: [], error: null }),
			isAdmin
				? sb.from("donasi").select("*").order("created_at",{ascending:false}).limit(50)
				: Promise.resolve({ data: [], error: null }),
		])

		var vRes = results[0]
		var pRes = results[1]
		var dRes = results[2]

		if (vRes.error) {
			// Table 'vendors' mungkin belum dibuat di database ini
			// Lanjutkan dengan data kosong, jangan hentikan load donasi
			console.warn("[BIVAK] Tabel vendors tidak tersedia:", vRes.error.message)
			pendingVendorsData = []
		} else {
			vendorsData = (vRes.data || []).map(mapVendor)
			pendingVendorsData = (pRes && pRes.data ? pRes.data : []).map(mapVendor)
		}

		// Load donasi rows for admin panel
		_dnRows = (dRes && dRes.data ? dRes.data : [])
		_dnCloud = true

		try { renderVendors(vendorsData); } catch(e) { console.warn("[BIVAK] renderVendors error:", e.message); }
		try { updateBadges(); } catch(e) { console.warn("[BIVAK] updateBadges error:", e.message); }

		// Render donation leaderboard
		if (typeof renderDonation === 'function') renderDonation()

		if (options.alsoAdminTables && document.getElementById("tablePendingVendorsBody")) {
			renderAdminTables()
		}
	}

	var _dnRows = []
	var _dnCloud = false

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
	   6. Vendor Submit (Supabase version)
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
	   7. Donasi Submit (Supabase version)
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

		busy(form, true, "Mengirim...")
		try {
			var res = await sb.from("donasi").insert({
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

	var origUpdateBadgesAndStats = window.updateBadgesAndStats || window.updateBadges
	if (typeof origUpdateBadgesAndStats === "function") {
		window.updateBadgesAndStats = function () {
			origUpdateBadgesAndStats()
			syncCoinBadge()
		}
	}

	/* ----------------------------------------------------------------------
	   9. Login admin
	   ---------------------------------------------------------------------- */
	function buildLoginModal() {
		if (document.getElementById("modalAdminLogin")) return
		var wrap = document.createElement("div")
		wrap.className = "modal-overlay"
		wrap.id = "modalAdminLogin"
		wrap.innerHTML = [
			'<div class="modal-container" style="max-width:420px;">',
			'<div class="modal-header">',
			'<div><h3 style="color:#fff;font-size:1.15rem;">Masuk sebagai Admin</h3>',
			'<p style="color:var(--text-muted);font-size:.83rem;margin-top:.2rem;">Panel approval vendor & donasi BIVAK</p></div>',
			'<button class="modal-close" type="button" onclick="closeModal(\'modalAdminLogin\')">&times;</button>',
			'</div><div class="modal-body">',
			'<form id="formAdminLogin">',
			'<div class="input-group"><label>Email Admin</label>',
			'<input class="form-control" type="email" id="inputAdminEmail" autocomplete="username" required placeholder="admin@bivak.id"></div>',
			'<div class="input-group"><label>Password</label>',
			'<input class="form-control" type="password" id="inputAdminPassword" autocomplete="current-password" required placeholder="••••••••"></div>',
			'<button class="btn btn-primary" type="submit" style="width:100%;margin-top:.5rem;">Masuk</button>',
			'</form></div></div>',
		].join("")
		document.body.appendChild(wrap)

		document.getElementById("formAdminLogin").addEventListener("submit", async function (e) {
			e.preventDefault()
			var form = e.currentTarget
			busy(form, true, "Memeriksa...")
			try {
				var res = await sb.auth.signInWithPassword({
					email: val("inputAdminEmail"),
					password: document.getElementById("inputAdminPassword").value,
				})
				if (res.error) throw res.error
				var ok = await refreshAdminFlag()
				if (!ok) {
					await sb.auth.signOut()
					toast("error", "Bukan Admin", "Login berhasil, tetapi akun belum terdaftar di tabel admins.")
					return
				}
				form.reset()
				closeModal("modalAdminLogin")
				await loadPublicData()
				renderAdminTables()
				decorateAdminPanel()
				openModal("modalAdmin")
				toast("success", "Selamat Datang", "Panel admin siap digunakan.")
			} catch (err) {
				dbErr(err, "Gagal masuk")
			} finally {
				busy(form, false)
			}
		})
	}

	function buildChangePasswordModal() {
		if (document.getElementById("modalChangePassword")) return
		var wrap = document.createElement("div")
		wrap.className = "modal-overlay"
		wrap.id = "modalChangePassword"
		wrap.innerHTML = [
			'<div class="modal-container" style="max-width:420px;">',
			'<div class="modal-header">',
			'<div><h3 style="color:#fff;font-size:1.15rem;">Ganti Password Admin</h3>',
			'<p style="color:var(--text-muted);font-size:.83rem;margin-top:.2rem;">Berlaku untuk akun yang sedang login</p></div>',
			'<button class="modal-close" type="button" onclick="closeModal(\'modalChangePassword\')">&times;</button>',
			'</div><div class="modal-body">',
			'<form id="formChangePassword">',
			'<div class="input-group"><label>Password Baru</label>',
			'<input class="form-control" type="password" id="inputNewPassword" autocomplete="new-password" required minlength="6" placeholder="Minimal 6 karakter"></div>',
			'<div class="input-group"><label>Ulangi Password Baru</label>',
			'<input class="form-control" type="password" id="inputNewPasswordConfirm" autocomplete="new-password" required minlength="6" placeholder="Ketik ulang"></div>',
			'<button class="btn btn-primary" type="submit" style="width:100%;margin-top:.5rem;">Simpan Password</button>',
			'</form></div></div>',
		].join("")
		document.body.appendChild(wrap)

		document.getElementById("formChangePassword").addEventListener("submit", async function (e) {
			e.preventDefault()
			var form = e.currentTarget
			var p1 = document.getElementById("inputNewPassword").value
			var p2 = document.getElementById("inputNewPasswordConfirm").value
			if (p1.length < 6) { toast("error","Password terlalu pendek","Gunakan minimal 6 karakter."); return }
			if (p1 !== p2) { toast("error","Password tidak sama","Kolom konfirmasi harus sama persis."); return }
			busy(form, true, "Menyimpan...")
			try {
				var res = await sb.auth.updateUser({ password: p1 })
				if (res.error) throw res.error
				form.reset()
				closeModal("modalChangePassword")
				toast("success","Password Diganti","Gunakan password baru saat login berikutnya.")
			} catch (err) {
				dbErr(err, "Gagal mengganti password")
			} finally {
				busy(form, false)
			}
		})
	}

	function decorateAdminPanel() {
		var header = document.querySelector("#modalAdmin .modal-header")
		if (!header || document.getElementById("btnAdminLogout")) return
		buildChangePasswordModal()
		var btnPw = document.createElement("button")
		btnPw.id = "btnChangePassword"
		btnPw.type = "button"
		btnPw.className = "btn btn-outline"
		btnPw.style.cssText = "padding:.35rem .7rem;font-size:.78rem;margin-left:auto;margin-right:.4rem;"
		btnPw.textContent = "Ganti Password"
		btnPw.addEventListener("click", function () { openModal("modalChangePassword") })
		var btn = document.createElement("button")
		btn.id = "btnAdminLogout"
		btn.type = "button"
		btn.className = "btn btn-outline"
		btn.style.cssText = "padding:.35rem .7rem;font-size:.78rem;margin-right:.6rem;"
		btn.textContent = "Keluar"
		btn.addEventListener("click", async function () {
			await sb.auth.signOut()
			isAdmin = false
			closeModal("modalAdmin")
			await loadPublicData()
			toast("info", "Keluar", "Sesi admin diakhiri.")
		})
		var closeBtn = header.querySelector(".modal-close")
		header.insertBefore(btn, closeBtn)
		header.insertBefore(btnPw, btn)
	}

	window.openAdminPanel = async function () {
		buildLoginModal()
		var ok = await refreshAdminFlag()
		if (!ok) { openModal("modalAdminLogin"); return }
		await loadPublicData()
		renderAdminTables()
		decorateAdminPanel()
		openModal("modalAdmin")
	}

	/* ----------------------------------------------------------------------
	   10. Aksi admin
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
	   11. Donasi Admin Actions
	   ---------------------------------------------------------------------- */
	window.donasiApprove = async function (i, st) {
		var r = _dnRows[i]
		if (!r) return
		try {
			var res = await sb.from("donasi").update({ astatus: st }).eq("id", r.id)
			if (res.error) throw res.error
			toast("success", "Berhasil", st === 'disetujui' ? 'Donasi disetujui. Nama akan tampil di leaderboard.' : 'Donasi ditolak.')
			await loadPublicData({ alsoAdminTables: true })
			if (typeof renderDonation === 'function') renderDonation()
		} catch (err) {
			dbErr(err, "Aksi donasi gagal")
		}
	}

	/* ----------------------------------------------------------------------
	   12. Boot
	   ---------------------------------------------------------------------- */
	async function boot() {
		try {
			await refreshAdminFlag()
			await loadPublicData()
			console.info("[BIVAK] Terhubung ke Supabase.")
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
