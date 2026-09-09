/* =====================================================================
   BIVAK RENTAL - PIN toko di Panel Admin
   ---------------------------------------------------------------------
   Tujuan: admin tidak perlu lagi membuka Supabase SQL Editor.
   - Vendor disetujui  -> PIN toko langsung tampil di layar admin.
   - Tombol PIN di tabel vendor aktif -> lihat status / buat PIN baru.
   - Tersedia tombol kirim PIN ke WhatsApp vendor.

   Butuh: db/OLSHOP-01-VENDOR-SECURITY.sql, 02, dan 04 sudah dijalankan.
   PIN tetap tersimpan sebagai hash; plaintext hanya dikirim sekali ke
   layar admin saat dibuat.
   ===================================================================== */
(function () {
	"use strict"

	var sb = window.bivakDb
	var ONLINE = !!(sb && sb.rpc)
	var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
	var statusMap = {}
	var lastPin = { pin: "", vendor: null }

	function el(id) {
		return document.getElementById(id)
	}

	function esc(s) {
		if (window.BIVAK && BIVAK.escape) return BIVAK.escape(s == null ? "" : String(s))
		return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
			return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
		})
	}

	function toast(type, title, msg) {
		if (window.bivakToast) return window.bivakToast(type, title, msg)
		if (window.BIVAK && BIVAK.notify) return BIVAK.notify(type, title, msg)
	}

	function vendorPool() {
		var a = (window.BIVAK && BIVAK.vendors) || []
		var b = (window.BIVAK && BIVAK.pendingVendors) || []
		return a.concat(b)
	}

	function findVendor(id) {
		var list = vendorPool()
		var key = String(id)
		for (var i = 0; i < list.length; i++) {
			if (String(list[i].id) === key || String(list[i].dbId || "") === key) return list[i]
		}
		return null
	}

	function findVendorByName(name) {
		var list = vendorPool()
		var key = String(name || "").trim().toLowerCase()
		for (var i = 0; i < list.length; i++) {
			if (String(list[i].name || "").trim().toLowerCase() === key) return list[i]
		}
		return null
	}

	function normPhone(p) {
		var d = String(p || "").replace(/[^0-9]/g, "")
		if (!d) return ""
		if (d.indexOf("0") === 0) d = "62" + d.slice(1)
		if (d.indexOf("62") !== 0) d = "62" + d
		return d
	}

	/* ------------------------------------------------------------------ Modal */
	function ensureModal() {
		if (el("modalVendorPin")) return el("vendorPinBody")

		var wrap = document.createElement("div")
		wrap.className = "modal-overlay"
		wrap.id = "modalVendorPin"
		wrap.innerHTML =
			'<div class="modal-container">' +
				'<div class="modal-header">' +
					'<h3 class="modal-title"><i class="fa-solid fa-key text-emerald"></i> PIN Toko Vendor</h3>' +
					'<button class="modal-close" type="button" onclick="closeModal(\'modalVendorPin\')"><i class="fa-solid fa-xmark"></i></button>' +
				"</div>" +
				'<div class="modal-body" id="vendorPinBody"></div>' +
			"</div>"
		document.body.appendChild(wrap)
		return el("vendorPinBody")
	}

	function openPinModal(html) {
		var body = ensureModal()
		if (!body) return
		body.innerHTML = html
		if (window.openModal) window.openModal("modalVendorPin")
		else el("modalVendorPin").classList.add("active")
	}

	function pinCardHtml(vendor, pin, isNew, note) {
		var name = esc(vendor && vendor.name)
		var dbId = esc((vendor && vendor.dbId) || "")
		var phone = normPhone(vendor && vendor.phone)
		var waMsg =
			"Halo " +
			((vendor && vendor.name) || "") +
			"! Toko Anda sudah tayang di BIVAK RENTAL.\n\n" +
			"Untuk mengatur daftar barang yang Anda sewakan:\n" +
			"1. Buka web BIVAK RENTAL\n" +
			"2. Klik ikon toko (hijau) di bagian bawah halaman\n" +
			"3. Nama Toko: " +
			((vendor && vendor.name) || "") +
			"\n4. PIN Toko: " +
			(pin || "(hubungi admin)") +
			"\n\nDi sana Anda bisa menambah barang, mengubah harga sewa, dan mengatur jumlah unit yang siap disewa. " +
			"Catatan: BIVAK RENTAL hanya mempertemukan penyewa dan vendor \u2014 penyewa akan menghubungi Anda langsung, " +
			"dan seluruh transaksi diurus langsung antara Anda dan penyewa. Jangan bagikan PIN ini ke orang lain."

		var html =
			'<div class="pin-vendor-name"><span>Toko</span><strong>' + name + "</strong></div>"

		if (pin) {
			html +=
				'<div class="pin-reveal">' +
					'<div class="pin-reveal-label">' + (isNew ? "PIN baru" : "PIN") + " \u2014 tampil sekali</div>" +
					'<div class="pin-reveal-value" id="vendorPinValue">' + esc(pin) + "</div>" +
					'<div class="pin-reveal-actions">' +
						'<button type="button" class="btn btn-outline" onclick="adminCopyPin()"><i class="fa-solid fa-copy"></i> Salin PIN</button>' +
						(phone
							? '<a class="btn btn-whatsapp" target="_blank" rel="noopener" href="https://wa.me/' + phone + "?text=" + encodeURIComponent(waMsg) + '"><i class="fa-brands fa-whatsapp"></i> Kirim ke Vendor</a>'
							: "") +
					"</div>" +
				"</div>" +
				'<p class="pin-note"><i class="fa-solid fa-triangle-exclamation"></i> Catat atau kirim sekarang. PIN disimpan terenkripsi, jadi tidak bisa dilihat lagi nanti \u2014 kalau hilang, buat PIN baru.</p>'
		} else {
			html +=
				'<div class="pin-reveal is-hidden">' +
					'<div class="pin-reveal-label">PIN sudah pernah dibuat</div>' +
					'<div class="pin-reveal-value">\u2022\u2022\u2022\u2022\u2022\u2022</div>' +
				"</div>" +
				'<p class="pin-note">' + esc(note || "PIN tersimpan terenkripsi dan tidak bisa ditampilkan lagi. Kalau vendor lupa PIN-nya, buat PIN baru \u2014 PIN lama otomatis tidak berlaku.") + "</p>"
		}

		html +=
			'<div class="pin-footer-actions">' +
				'<button type="button" class="btn btn-outline" onclick="adminVendorSetPin(\'' + dbId + '\')"><i class="fa-solid fa-pen"></i> Tetapkan PIN Sendiri</button>' +
				'<button type="button" class="btn btn-outline" onclick="adminVendorPinUnlock(\'' + dbId + '\')"><i class="fa-solid fa-lock-open"></i> Buka Kunci</button>' +
				'<button type="button" class="btn btn-primary" onclick="adminVendorPin(\'' + dbId + '\', true)"><i class="fa-solid fa-rotate"></i> Buat PIN Baru</button>' +
			"</div>"

		return html
	}

	window.adminCopyPin = function () {
		var v = el("vendorPinValue")
		var text = v ? v.textContent.trim() : lastPin.pin
		if (!text) return
		function done() {
			toast("success", "PIN Disalin", "PIN toko sudah ada di papan klip.")
		}
		if (navigator.clipboard && navigator.clipboard.writeText) {
			navigator.clipboard.writeText(text).then(done, function () {
				toast("info", "Salin Manual", "PIN toko: " + text)
			})
			return
		}
		toast("info", "Salin Manual", "PIN toko: " + text)
	}

	/* ------------------------------------------------------------------- RPC */
	function rpc(name, args) {
		if (!ONLINE) {
			toast("error", "Belum Terhubung", "Koneksi ke server belum siap. Muat ulang halaman.")
			return Promise.resolve(null)
		}
		return sb.rpc(name, args || {}).then(function (res) {
			if (res.error) {
				var m = res.error.message || ""
				var code = res.error.code || ""
				// PENTING: error pgcrypto juga berbunyi "does not exist". Kalau tidak
				// dipisahkan, web salah bilang SQL-nya belum dijalankan padahal sudah.
				if (/crypt|gen_salt|pgcrypto/i.test(m)) {
					toast(
						"error",
						"Tinggal Satu Langkah",
						"Fungsi PIN sudah terpasang, tapi belum bisa membaca pgcrypto. Jalankan db/OLSHOP-05-PERBAIKI-CRYPT.sql di Supabase SQL Editor."
					)
				} else if (code === "PGRST202" || /not find the function|schema cache/i.test(m)) {
					toast("error", "Fitur Belum Dipasang", "Jalankan db/OLSHOP-04-ADMIN-PIN.sql di Supabase SQL Editor sekali saja.")
				} else if (/khusus admin|permission denied|not authorized/i.test(m)) {
					toast("error", "Khusus Admin", "Email yang dipakai login belum terdaftar sebagai admin. Jalankan db/ADD-ADMIN-EMAIL.sql.")
				} else {
					toast("error", "Gagal", (m || "Permintaan ditolak server.") + (code ? " (" + code + ")" : ""))
				}
				if (window.console && console.warn) console.warn("[BIVAK PIN] " + name + " gagal:", res.error)
				return null
			}
			return res.data
		})
	}

	function resolveDbId(id) {
		if (UUID_RE.test(String(id || ""))) return String(id)
		var v = findVendor(id)
		return v && v.dbId ? String(v.dbId) : ""
	}

	function vendorInfo(dbId, fallbackName) {
		var v = findVendor(dbId)
		if (v) return v
		return { name: fallbackName || "Vendor", dbId: dbId, phone: "" }
	}

	// Tampilkan / buat PIN. force = true -> selalu buat PIN baru.
	window.adminVendorPin = function (id, force) {
		var dbId = resolveDbId(id)
		if (!dbId) {
			toast("error", "Vendor Belum Tersinkron", "Muat ulang panel admin lalu coba lagi.")
			return
		}
		var info = vendorInfo(dbId)

		if (force && !confirm('Buat PIN baru untuk "' + (info.name || "toko ini") + '"?\n\nPIN lama langsung tidak berlaku dan sesi vendor yang terbuka akan keluar.')) return

		var fn = force ? "admin_vendor_issue_pin" : "admin_vendor_pin_ensure"

		return rpc(fn, { p_vendor_id: dbId }).then(function (data) {
			if (!data) return
			if (data.success === false) {
				toast("error", "Tidak Diizinkan", data.message || "Hanya admin yang bisa mengatur PIN toko.")
				return
			}
			var vend = data.vendor || info
			if (!vend.phone && info.phone) vend.phone = info.phone
			if (!vend.name && info.name) vend.name = info.name
			vend.dbId = dbId
			lastPin = { pin: data.pin || "", vendor: vend }
			statusMap[dbId] = { has_pin: true }
			openPinModal(pinCardHtml(vend, data.pin, data.is_new, data.message))
			decorateRows()
		})
	}

	window.adminVendorSetPin = function (id) {
		var dbId = resolveDbId(id)
		if (!dbId) return
		var info = vendorInfo(dbId)
		var pin = prompt('PIN 6 angka untuk "' + (info.name || "toko ini") + '":', "")
		if (pin === null) return
		pin = String(pin).replace(/[^0-9]/g, "")
		if (pin.length !== 6) {
			toast("error", "PIN Tidak Valid", "PIN harus tepat 6 angka.")
			return
		}
		return rpc("admin_vendor_set_pin", { p_vendor_id: dbId, p_pin: pin }).then(function (data) {
			if (!data) return
			if (data.success === false) {
				toast("error", "Gagal", data.message || "PIN tidak tersimpan.")
				return
			}
			statusMap[dbId] = { has_pin: true }
			info.dbId = dbId
			lastPin = { pin: pin, vendor: info }
			openPinModal(pinCardHtml(info, pin, true))
			toast("success", "PIN Tersimpan", "PIN toko " + (info.name || "") + " diperbarui.")
			decorateRows()
		})
	}

	window.adminVendorPinUnlock = function (id) {
		var dbId = resolveDbId(id)
		if (!dbId) return
		return rpc("admin_vendor_pin_unlock", { p_vendor_id: dbId }).then(function (data) {
			if (!data) return
			if (data.success === false) {
				toast("error", "Gagal", data.message || "Tidak bisa membuka kunci.")
				return
			}
			toast("success", "Kunci Dibuka", data.message || "Vendor bisa mencoba PIN lagi.")
		})
	}

	/* --------------------------------------------- Penanda PIN di tabel admin */
	function rowsWithVendors() {
		var body = el("tableActiveVendorsBody")
		if (!body) return []
		var rows = body.querySelectorAll("tr")
		var list = (window.BIVAK && BIVAK.vendors) || []
		var out = []
		for (var i = 0; i < rows.length; i++) {
			var cellName = rows[i].querySelector("td strong")
			if (!cellName) continue
			var v = findVendorByName(cellName.textContent) || list[i]
			if (v && v.dbId) out.push({ row: rows[i], vendor: v })
		}
		return out
	}

	function decorateRows() {
		var pairs = rowsWithVendors()
		for (var i = 0; i < pairs.length; i++) {
			var row = pairs[i].row
			var v = pairs[i].vendor
			var cell = row.cells[row.cells.length - 1]
			if (!cell) continue

			var btn = cell.querySelector(".btn-vendor-pin")
			if (!btn) {
				cell.insertAdjacentHTML(
					"afterbegin",
					'<button type="button" class="btn btn-outline btn-vendor-pin" onclick="adminVendorPin(\'' + esc(v.dbId) + '\')" title="Lihat status / buat PIN toko"><i class="fa-solid fa-key"></i> PIN</button> ',
				)
				btn = cell.querySelector(".btn-vendor-pin")
			}

			var st = statusMap[String(v.dbId)]
			if (!btn) continue
			if (st && st.has_pin === false) {
				btn.classList.add("pin-missing")
				btn.title = "Toko ini belum punya PIN \u2014 klik untuk membuatkan"
			} else {
				btn.classList.remove("pin-missing")
				btn.title = st && st.locked_until ? "PIN terkunci sementara \u2014 klik untuk buka kunci / buat PIN baru" : "Lihat status / buat PIN baru"
			}
		}
	}

	function refreshStatus() {
		if (!ONLINE) return
		sb.rpc("admin_vendor_pin_status", {}).then(function (res) {
			if (res.error || !res.data || res.data.success === false) return
			var list = res.data.vendors || []
			statusMap = {}
			for (var i = 0; i < list.length; i++) {
				statusMap[String(list[i].vendor_id)] = list[i]
			}
			decorateRows()
		})
	}

	/* --------------------------------- Sisipkan ke alur approve & render tabel */
	function wrap() {
		var origApprove = window.approveVendor
		if (typeof origApprove === "function" && !origApprove.__pinWrapped) {
			var wrapped = function (id) {
				var pending = (window.BIVAK && BIVAK.pendingVendors) || []
				var v = pending.find(function(x) { return String(x.id) === String(id) || String(x.dbId || "") === String(id); }) || findVendor(id)
				var dbId = v && v.dbId ? String(v.dbId) : resolveDbId(id)
				var name = v && v.name
				var out = origApprove.apply(this, arguments)

				function afterApprove() {
					if (!dbId) return
					// beri PIN kalau toko ini belum punya, lalu tampilkan ke admin
					rpc("admin_vendor_pin_ensure", { p_vendor_id: dbId }).then(function (data) {
						if (!data || data.success === false) return
						var vend = data.vendor || vendorInfo(dbId, name)
						vend.dbId = dbId
						if (!vend.name) vend.name = name
						statusMap[dbId] = { has_pin: true }
						if (data.pin) {
							lastPin = { pin: data.pin, vendor: vend }
							openPinModal(pinCardHtml(vend, data.pin, true))
							toast("success", "PIN Toko Dibuat", "Kirim PIN ini ke " + (vend.name || "vendor") + " lewat tombol WhatsApp.")
						}
						decorateRows()
					})
				}

				if (out && typeof out.then === "function") {
					return out.then(function (r) {
						afterApprove()
						return r
					})
				}
				setTimeout(afterApprove, 700)
				return out
			}
			wrapped.__pinWrapped = true
			window.approveVendor = wrapped
		}

		var origRender = window.renderAdminTables
		if (typeof origRender === "function" && !origRender.__pinWrapped) {
			var wrappedRender = function () {
				var out = origRender.apply(this, arguments)
				setTimeout(decorateRows, 0)
				return out
			}
			wrappedRender.__pinWrapped = true
			window.renderAdminTables = wrappedRender
		}

		var origOpen = window.openAdminPanel
		if (typeof origOpen === "function" && !origOpen.__pinWrapped) {
			var wrappedOpen = function () {
				var out = origOpen.apply(this, arguments)
				setTimeout(function () {
					refreshStatus()
					decorateRows()
				}, 900)
				return out
			}
			wrappedOpen.__pinWrapped = true
			window.openAdminPanel = wrappedOpen
		}
	}

	function init() {
		wrap()
		// panel admin dirender ulang beberapa kali setelah login; pasang ulang pembungkus
		setTimeout(wrap, 1200)
		setTimeout(wrap, 3000)
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init)
	} else {
		init()
	}
})()
