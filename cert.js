/* ==========================================================================
   BIVAK — Sertifikat Adopsi Pohon RCS.CBS
   --------------------------------------------------------------------------
   Satu-satunya sumber gambar sertifikat. Digambar di ruang desain
   2000x1414 (rasio A4 landscape) lalu diskalakan ke ukuran canvas apa pun,
   jadi preview kecil di HP dan file unduhan resolusi tinggi selalu identik.

   Dipakai lewat:
     BivakCert.render(canvas, data, cb)      -> menggambar (emblem async)
     BivakCert.download(data, filename, cb)  -> PNG 2400x1697
   ========================================================================== */
(function () {
	"use strict"

	var DW = 2000
	var DH = 1414
	var EMBLEM_SRC = "assets/cert-emblem.jpg"

	var GOLD_LIGHT = "#f6e3a1"
	var GOLD = "#d9b754"
	var GOLD_DEEP = "#8f6f22"
	var SERIF = "Georgia, 'Times New Roman', serif"

	var emblem = null
	var emblemState = "idle" // idle | loading | ready | failed
	var waiting = []

	function loadEmblem(cb) {
		if (emblemState === "ready" || emblemState === "failed") {
			if (cb) cb()
			return
		}
		if (cb) waiting.push(cb)
		if (emblemState === "loading") return
		emblemState = "loading"
		emblem = new Image()
		emblem.onload = function () {
			emblemState = "ready"
			flush()
		}
		emblem.onerror = function () {
			emblemState = "failed"
			emblem = null
			flush()
		}
		emblem.src = EMBLEM_SRC
	}

	function flush() {
		var q = waiting
		waiting = []
		for (var i = 0; i < q.length; i++) {
			try {
				q[i]()
			} catch (e) {
				/* callback konsumen tidak boleh menghentikan yang lain */
			}
		}
	}

	/* ---------- helper gambar ---------- */

	function roundRect(ctx, x, y, w, h, r) {
		ctx.beginPath()
		ctx.moveTo(x + r, y)
		ctx.arcTo(x + w, y, x + w, y + h, r)
		ctx.arcTo(x + w, y + h, x, y + h, r)
		ctx.arcTo(x, y + h, x, y, r)
		ctx.arcTo(x, y, x + w, y, r)
		ctx.closePath()
	}

	// Teks dengan jarak antar huruf (canvas letterSpacing belum universal)
	function spacedText(ctx, text, cx, y, spacing) {
		var chars = String(text).split("")
		var total = 0
		var i
		for (i = 0; i < chars.length; i++) {
			total += ctx.measureText(chars[i]).width + spacing
		}
		total -= spacing
		var x = cx - total / 2
		var prev = ctx.textAlign
		ctx.textAlign = "left"
		for (i = 0; i < chars.length; i++) {
			ctx.fillText(chars[i], x, y)
			x += ctx.measureText(chars[i]).width + spacing
		}
		ctx.textAlign = prev
		return total
	}

	// Perkecil font sampai teks pasti masuk ke dalam frame.
	// Ini yang mencegah nama panjang menembus bingkai emas.
	function fitFont(ctx, text, maxW, startPx, weight) {
		var px = startPx
		for (;;) {
			ctx.font = weight + " " + px + "px " + SERIF
			if (ctx.measureText(text).width <= maxW || px <= startPx * 0.42) break
			px -= 2
		}
		return px
	}

	function goldFill(ctx, cx, halfW, y) {
		var g = ctx.createLinearGradient(cx - halfW, y - 60, cx + halfW, y + 20)
		g.addColorStop(0, GOLD_DEEP)
		g.addColorStop(0.2, GOLD_LIGHT)
		g.addColorStop(0.5, "#fffbe8")
		g.addColorStop(0.8, GOLD_LIGHT)
		g.addColorStop(1, GOLD_DEEP)
		return g
	}

	/* ---------- lapisan latar ---------- */

	function paintBackground(ctx) {
		var g = ctx.createLinearGradient(0, 0, DW, DH)
		g.addColorStop(0, "#08211a")
		g.addColorStop(0.45, "#0f3c2b")
		g.addColorStop(1, "#06150f")
		ctx.fillStyle = g
		ctx.fillRect(0, 0, DW, DH)

		// Vignette supaya bagian tengah terasa "diterangi"
		var v = ctx.createRadialGradient(DW / 2, DH * 0.42, DH * 0.15, DW / 2, DH * 0.5, DH * 0.95)
		v.addColorStop(0, "rgba(90,160,120,0.16)")
		v.addColorStop(1, "rgba(0,0,0,0.55)")
		ctx.fillStyle = v
		ctx.fillRect(0, 0, DW, DH)

		// Guilloche halus: garis diagonal + dua pita sinus emas tipis
		ctx.save()
		ctx.globalAlpha = 0.05
		ctx.strokeStyle = GOLD_LIGHT
		ctx.lineWidth = 1
		for (var d = -DH; d < DW; d += 26) {
			ctx.beginPath()
			ctx.moveTo(d, 0)
			ctx.lineTo(d + DH, DH)
			ctx.stroke()
		}
		ctx.globalAlpha = 0.1
		ctx.lineWidth = 2
		for (var band = 0; band < 2; band++) {
			var baseY = band === 0 ? DH * 0.2 : DH * 0.82
			for (var k = 0; k < 3; k++) {
				ctx.beginPath()
				for (var x = 120; x <= DW - 120; x += 8) {
					var y = baseY + Math.sin((x / DW) * Math.PI * 6 + k * 1.1) * (26 + k * 8)
					if (x === 120) ctx.moveTo(x, y)
					else ctx.lineTo(x, y)
				}
				ctx.stroke()
			}
		}
		ctx.restore()
	}

	function paintFrame(ctx) {
		// Bingkai emas ganda
		ctx.save()
		var og = ctx.createLinearGradient(0, 0, DW, DH)
		og.addColorStop(0, GOLD_DEEP)
		og.addColorStop(0.3, GOLD_LIGHT)
		og.addColorStop(0.55, GOLD)
		og.addColorStop(0.8, GOLD_LIGHT)
		og.addColorStop(1, GOLD_DEEP)
		ctx.strokeStyle = og
		ctx.lineWidth = 10
		roundRect(ctx, 46, 46, DW - 92, DH - 92, 18)
		ctx.stroke()

		ctx.strokeStyle = "rgba(217,183,84,0.45)"
		ctx.lineWidth = 2
		roundRect(ctx, 72, 72, DW - 144, DH - 144, 12)
		ctx.stroke()

		ctx.strokeStyle = "rgba(217,183,84,0.22)"
		ctx.lineWidth = 1
		roundRect(ctx, 86, 86, DW - 172, DH - 172, 10)
		ctx.stroke()
		ctx.restore()

		// Ornamen sudut
		var corners = [
			[120, 120, 1, 1],
			[DW - 120, 120, -1, 1],
			[120, DH - 120, 1, -1],
			[DW - 120, DH - 120, -1, -1],
		]
		for (var i = 0; i < corners.length; i++) {
			var c = corners[i]
			ctx.save()
			ctx.translate(c[0], c[1])
			ctx.scale(c[2], c[3])
			ctx.strokeStyle = GOLD_LIGHT
			ctx.globalAlpha = 0.75
			ctx.lineWidth = 3
			ctx.beginPath()
			ctx.moveTo(0, 74)
			ctx.lineTo(0, 16)
			ctx.quadraticCurveTo(0, 0, 16, 0)
			ctx.lineTo(74, 0)
			ctx.stroke()
			ctx.beginPath()
			ctx.moveTo(22, 52)
			ctx.lineTo(52, 22)
			ctx.stroke()
			ctx.globalAlpha = 1
			ctx.fillStyle = GOLD_LIGHT
			ctx.beginPath()
			ctx.moveTo(34, 34)
			ctx.lineTo(43, 25)
			ctx.lineTo(52, 34)
			ctx.lineTo(43, 43)
			ctx.closePath()
			ctx.fill()
			ctx.restore()
		}
	}

	// Pohon watermark besar di tengah, sangat tipis
	function paintWatermark(ctx) {
		ctx.save()
		ctx.globalAlpha = 0.045
		ctx.translate(DW / 2, DH * 0.62)
		ctx.fillStyle = "#bfe8cf"
		var h = 520
		ctx.fillRect(-h * 0.035, h * 0.16, h * 0.07, h * 0.2)
		for (var i = 0; i < 4; i++) {
			var ty = h * 0.18 - i * h * 0.15
			var tw = h * (0.62 - i * 0.12)
			ctx.beginPath()
			ctx.moveTo(0, ty - h * 0.3)
			ctx.lineTo(-tw / 2, ty)
			ctx.lineTo(tw / 2, ty)
			ctx.closePath()
			ctx.fill()
		}
		ctx.restore()
	}

	function paintEmblem(ctx, cx, cy, R) {
		// Cincin luar
		ctx.save()
		ctx.beginPath()
		ctx.arc(cx, cy, R + 20, 0, Math.PI * 2)
		ctx.strokeStyle = "rgba(217,183,84,0.35)"
		ctx.lineWidth = 2
		ctx.stroke()

		// Bayangan lembut
		ctx.beginPath()
		ctx.arc(cx, cy, R + 6, 0, Math.PI * 2)
		ctx.fillStyle = "rgba(0,0,0,0.45)"
		ctx.fill()

		// Isi medali: gambar aset kalau ada, kalau gagal pakai monogram
		ctx.save()
		ctx.beginPath()
		ctx.arc(cx, cy, R, 0, Math.PI * 2)
		ctx.clip()
		if (emblemState === "ready" && emblem) {
			var iw = emblem.naturalWidth || emblem.width
			var ih = emblem.naturalHeight || emblem.height
			var side = Math.min(iw, ih) // crop tengah, jaga rasio
			ctx.drawImage(emblem, (iw - side) / 2, (ih - side) / 2, side, side, cx - R, cy - R, R * 2, R * 2)
		} else {
			ctx.fillStyle = "#0e2c23"
			ctx.fillRect(cx - R, cy - R, R * 2, R * 2)
			ctx.fillStyle = GOLD_LIGHT
			ctx.font = "bold " + Math.round(R * 0.8) + "px " + SERIF
			ctx.textAlign = "center"
			ctx.textBaseline = "middle"
			ctx.fillText("RCS", cx, cy)
			ctx.textBaseline = "alphabetic"
		}
		ctx.restore()

		// Cincin emas utama
		var rg = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R)
		rg.addColorStop(0, GOLD_DEEP)
		rg.addColorStop(0.35, GOLD_LIGHT)
		rg.addColorStop(0.65, GOLD)
		rg.addColorStop(1, GOLD_DEEP)
		ctx.beginPath()
		ctx.arc(cx, cy, R, 0, Math.PI * 2)
		ctx.strokeStyle = rg
		ctx.lineWidth = 9
		ctx.stroke()
		ctx.restore()
	}

	function paintDivider(ctx, cx, y, halfW) {
		ctx.save()
		ctx.strokeStyle = "rgba(217,183,84,0.7)"
		ctx.lineWidth = 2
		ctx.beginPath()
		ctx.moveTo(cx - halfW, y)
		ctx.lineTo(cx - 26, y)
		ctx.moveTo(cx + 26, y)
		ctx.lineTo(cx + halfW, y)
		ctx.stroke()
		ctx.fillStyle = GOLD_LIGHT
		ctx.beginPath()
		ctx.moveTo(cx, y - 11)
		ctx.lineTo(cx + 12, y)
		ctx.lineTo(cx, y + 11)
		ctx.lineTo(cx - 12, y)
		ctx.closePath()
		ctx.fill()
		ctx.restore()
	}

	function paintSeal(ctx, cx, cy, R) {
		ctx.save()

		// Pita di belakang segel
		ctx.fillStyle = "#0d4a33"
		ctx.beginPath()
		ctx.moveTo(cx - R * 0.5, cy + R * 0.5)
		ctx.lineTo(cx - R * 0.95, cy + R * 2.05)
		ctx.lineTo(cx - R * 0.28, cy + R * 1.62)
		ctx.closePath()
		ctx.fill()
		ctx.beginPath()
		ctx.moveTo(cx + R * 0.5, cy + R * 0.5)
		ctx.lineTo(cx + R * 0.95, cy + R * 2.05)
		ctx.lineTo(cx + R * 0.28, cy + R * 1.62)
		ctx.closePath()
		ctx.fill()

		// Piringan bergerigi
		var pts = 26
		ctx.beginPath()
		for (var i = 0; i <= pts * 2; i++) {
			var a = (Math.PI * i) / pts - Math.PI / 2
			var rr = i % 2 === 0 ? R : R * 0.9
			var x = cx + Math.cos(a) * rr
			var y = cy + Math.sin(a) * rr
			if (i === 0) ctx.moveTo(x, y)
			else ctx.lineTo(x, y)
		}
		ctx.closePath()
		var sg = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.08, cx, cy, R)
		sg.addColorStop(0, "#fff6d2")
		sg.addColorStop(0.45, GOLD_LIGHT)
		sg.addColorStop(0.78, GOLD)
		sg.addColorStop(1, GOLD_DEEP)
		ctx.fillStyle = sg
		ctx.fill()

		ctx.beginPath()
		ctx.arc(cx, cy, R * 0.78, 0, Math.PI * 2)
		ctx.strokeStyle = "rgba(70,50,10,0.5)"
		ctx.lineWidth = 2.5
		ctx.stroke()

		// Pohon di dalam segel
		ctx.fillStyle = "#12402c"
		ctx.fillRect(cx - R * 0.05, cy + R * 0.12, R * 0.1, R * 0.3)
		for (var t = 0; t < 3; t++) {
			var ty = cy + R * 0.16 - t * R * 0.2
			var tw = R * (0.66 - t * 0.14)
			ctx.beginPath()
			ctx.moveTo(cx, ty - R * 0.36)
			ctx.lineTo(cx - tw / 2, ty)
			ctx.lineTo(cx + tw / 2, ty)
			ctx.closePath()
			ctx.fill()
		}

		// Tulisan melingkar di dalam segel
		ctx.fillStyle = "#3d2c08"
		ctx.font = "bold " + Math.round(R * 0.17) + "px " + SERIF
		ctx.textAlign = "center"
		spacedText(ctx, "RCS.CBS", cx, cy - R * 0.42, 2)
		ctx.font = Math.round(R * 0.13) + "px " + SERIF
		spacedText(ctx, "KONSERVASI", cx, cy + R * 0.62, 2)
		ctx.restore()
	}

	/* ---------- gambar utama ---------- */

	function draw(canvas, data) {
		if (!canvas || !canvas.getContext) return false
		var ctx = canvas.getContext("2d")
		if (!ctx) return false

		var W = canvas.width || DW
		var H = canvas.height || DH

		ctx.save()
		ctx.clearRect(0, 0, W, H)
		ctx.scale(W / DW, H / DH) // semua koordinat di bawah pakai ruang desain

		var cx = DW / 2
		var d = data || {}
		var name = String(d.name || "Nama Penerima").trim() || "Nama Penerima"
		var qty = d.qty || 1
		var loc = d.loc || "Kawasan Gunung Bawakaraeng"
		var no = d.no || "RC-ADP-2026-00001"
		var date = d.date || new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })

		paintBackground(ctx)
		paintWatermark(ctx)
		paintFrame(ctx)

		ctx.textAlign = "center"

		// Medali
		paintEmblem(ctx, cx, 246, 92)

		// Kop organisasi
		ctx.fillStyle = "rgba(233,245,236,0.78)"
		ctx.font = "22px " + SERIF
		spacedText(ctx, "ORGANISASI PENCINTA ALAM", cx, 392, 7)

		ctx.fillStyle = GOLD_LIGHT
		ctx.font = "bold 34px " + SERIF
		spacedText(ctx, "RCS.CBS", cx, 438, 6)

		// Judul
		var titlePx = fitFont(ctx, "SERTIFIKAT ADOPSI POHON", DW - 560, 78, "bold")
		ctx.font = "bold " + titlePx + "px " + SERIF
		ctx.fillStyle = goldFill(ctx, cx, 640, 524)
		spacedText(ctx, "SERTIFIKAT ADOPSI POHON", cx, 524, 4)

		paintDivider(ctx, cx, 572, 300)

		// Kalimat pembuka
		ctx.fillStyle = "rgba(206,228,212,0.9)"
		ctx.font = "italic 30px " + SERIF
		ctx.fillText("dengan penuh penghargaan diberikan kepada", cx, 638)

		// Nama penerima — auto-fit supaya tidak pernah menembus bingkai
		var namePx = fitFont(ctx, name, DW - 620, 92, "italic bold")
		ctx.font = "italic bold " + namePx + "px " + SERIF
		var nameW = ctx.measureText(name).width
		ctx.save()
		ctx.shadowColor = "rgba(0,0,0,0.55)"
		ctx.shadowBlur = 14
		ctx.shadowOffsetY = 4
		ctx.fillStyle = "#ffffff"
		ctx.fillText(name, cx, 744)
		ctx.restore()

		// Garis hias di bawah nama
		var ul = Math.min(nameW / 2 + 60, DW / 2 - 190)
		ctx.strokeStyle = "rgba(217,183,84,0.85)"
		ctx.lineWidth = 2
		ctx.beginPath()
		ctx.moveTo(cx - ul, 782)
		ctx.lineTo(cx + ul, 782)
		ctx.stroke()
		ctx.fillStyle = GOLD_LIGHT
		ctx.beginPath()
		ctx.arc(cx - ul - 10, 782, 4, 0, Math.PI * 2)
		ctx.arc(cx + ul + 10, 782, 4, 0, Math.PI * 2)
		ctx.fill()

		// Isi
		ctx.fillStyle = "rgba(190,216,196,0.92)"
		ctx.font = "27px " + SERIF
		ctx.fillText("atas dedikasinya mengadopsi " + qty + " bibit pohon", cx, 848)
		ctx.fillText("untuk pemulihan ekosistem " + loc + ",", cx, 888)
		ctx.fillText("sebagai warisan hijau bagi generasi mendatang.", cx, 928)

		// Segel lilin emas
		paintSeal(ctx, cx, 1042, 76)

		// Blok tanda tangan — kiri & kanan pakai baseline yang sama
		var lineY = 1178
		var blocks = [
			{ x: DW * 0.26, role: "Ketua Umum", org: "RCS.CBS" },
			{ x: DW * 0.74, role: "Koordinator Konservasi", org: "Bidang Ekosistem" },
		]
		for (var b = 0; b < blocks.length; b++) {
			var blk = blocks[b]
			ctx.strokeStyle = "rgba(217,183,84,0.7)"
			ctx.lineWidth = 2
			ctx.beginPath()
			ctx.moveTo(blk.x - 165, lineY)
			ctx.lineTo(blk.x + 165, lineY)
			ctx.stroke()

			ctx.fillStyle = GOLD_LIGHT
			ctx.font = "bold 26px " + SERIF
			ctx.fillText(blk.role, blk.x, lineY + 44)
			ctx.fillStyle = "rgba(188,212,201,0.85)"
			ctx.font = "21px " + SERIF
			ctx.fillText(blk.org, blk.x, lineY + 78)
		}

		// Kaki dokumen
		ctx.strokeStyle = "rgba(217,183,84,0.3)"
		ctx.lineWidth = 1
		ctx.beginPath()
		ctx.moveTo(300, 1306)
		ctx.lineTo(DW - 300, 1306)
		ctx.stroke()

		ctx.fillStyle = "rgba(220,236,229,0.72)"
		ctx.font = "20px " + SERIF
		spacedText(ctx, "No. " + no + "   \u2022   " + date + "   \u2022   " + loc, cx, 1348, 1)

		ctx.restore()
		return true
	}

	/* ---------- API publik ---------- */

	// Gambar sekarang (biar tidak ada canvas kosong), lalu gambar ulang
	// begitu emblem selesai dimuat.
	function render(canvas, data, cb) {
		if (!canvas) return
		draw(canvas, data)
		if (emblemState === "ready" || emblemState === "failed") {
			if (cb) cb()
			return
		}
		loadEmblem(function () {
			draw(canvas, data)
			if (cb) cb()
		})
	}

	function download(data, filename, cb) {
		loadEmblem(function () {
			var cv = document.createElement("canvas")
			cv.width = 2400
			cv.height = 1697
			draw(cv, data)
			// Saat halaman dibuka lewat file://, emblem membuat canvas "tainted"
			// sehingga toBlob melempar SecurityError. Di hosting http(s) ini tidak
			// terjadi, tapi kegagalannya harus tetap dilaporkan ke pengguna.
			try {
				cv.toBlob(function (blob) {
					if (!blob) {
						if (cb) cb(new Error("Gagal membuat file sertifikat"))
						return
					}
					var url = URL.createObjectURL(blob)
					var a = document.createElement("a")
					a.href = url
					a.download = filename || "Sertifikat-Adopsi.png"
					document.body.appendChild(a)
					a.click()
					setTimeout(function () {
						if (a.parentNode) a.parentNode.removeChild(a)
						URL.revokeObjectURL(url)
					}, 1500)
					if (cb) cb(null)
				}, "image/png")
			} catch (err) {
				if (cb) cb(new Error("Unduhan diblokir browser. Buka situs lewat http(s), bukan file://"))
			}
		})
	}

	function toDataUrl(data) {
		var cv = document.createElement("canvas")
		cv.width = 2000
		cv.height = 1414
		draw(cv, data)
		return cv.toDataURL("image/png")
	}

	window.BivakCert = {
		render: render,
		download: download,
		toDataUrl: toDataUrl,
		preload: loadEmblem,
	}
})()

/* Ketuk sertifikat untuk melihat versi besar yang bisa digeser.
   Di layar HP teks sertifikat terlalu kecil untuk dibaca. */
;(function () {
	"use strict"

	function close() {
		var box = document.querySelector(".cert-lightbox")
		if (box && box.parentNode) box.parentNode.removeChild(box)
		document.body.classList.remove("no-scroll")
	}

	document.addEventListener("click", function (e) {
		var cv = e.target.closest ? e.target.closest("canvas.cert-zoom") : null
		if (!cv) return
		close()
		var box = document.createElement("div")
		box.className = "cert-lightbox"
		var img = document.createElement("img")
		try {
			img.src = cv.toDataURL("image/png")
		} catch (err) {
			return
		}
		img.alt = "Sertifikat adopsi pohon ukuran penuh"
		box.appendChild(img)
		box.addEventListener("click", close)
		document.body.appendChild(box)
		document.body.classList.add("no-scroll")
	})

	document.addEventListener("keydown", function (e) {
		if (e.key === "Escape") close()
	})
})()
