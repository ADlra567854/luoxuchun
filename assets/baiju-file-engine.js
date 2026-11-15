/* 白驹 · 文件引擎 v1.0.0
 * 导入 → 解析 → 分析，零依赖、纯浏览器本地运行，文件不上传服务器。
 *
 * 支持格式：
 *   文本 txt/md/csv/tsv/json/html/log/代码（自动识别 UTF-8 与 GB18030）
 *   Office docx / xlsx / pptx（本地解 ZIP + XML，不需要任何库）
 *   PDF 文本层（FlateDecode + Tj/TJ 抽取；扫描件请走图片识字）
 *   图片 png/jpg/webp/bmp/gif/tif（交给站内 OCR）
 *
 * 统一产物：{ name, size, ext, kind, text, meta, note, ok, raw }
 * 任何一个文件解析失败都不会拖垮整批，失败原因写进 note。
 */
;(function (global) {
  'use strict'

  var TEXT_EXT = /^(txt|md|markdown|csv|tsv|json|html|htm|log|js|mjs|cjs|py|css|xml|yml|yaml|ini|srt|vtt|tex|sql|java|c|h|cpp|cc|go|rs|sh|bat|ps1|php|rb|swift|kt|ts|tsx|jsx|vue|svg|conf|properties)$/
  var IMAGE_EXT = /^(png|jpe?g|webp|bmp|gif|tiff?|ico|avif)$/
  var OFFICE_EXT = /^(docx|xlsx|pptx)$/

  var ACCEPT = '.txt,.md,.markdown,.csv,.tsv,.json,.html,.htm,.log,.js,.mjs,.cjs,.py,.css,.xml,.yml,.yaml,.ini,.srt,.vtt,.tex,.sql,.java,.c,.h,.cpp,.go,.rs,.sh,.bat,.ts,.tsx,.jsx,.vue,.svg,' +
    '.docx,.xlsx,.pptx,.pdf,.png,.jpg,.jpeg,.webp,.bmp,.gif,.tif,.tiff'

  function extOf(n) { return (String(n).split('.').pop() || '').toLowerCase() }
  function mix(a, b) { for (var k in b) if (Object.prototype.hasOwnProperty.call(b, k)) a[k] = b[k]; return a }
  function decodeEnt(s) {
    var map = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
    return String(s).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, function (m, k) {
      var lk = k.toLowerCase()
      if (map[lk]) return map[lk]
      if (k.charAt(0) === '#') {
        var v = k.charAt(1).toLowerCase() === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10)
        if (!isNaN(v) && v < 0x10000) return String.fromCharCode(v)
      }
      return m
    })
  }
  function stripTags(x) {
    return decodeEnt(String(x)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+/g, ' ')).trim()
  }
  function stats(text) {
    var lines = String(text).split(/\r?\n/)
    return { lines: lines.length, chars: text.length, nonEmpty: lines.filter(function (l) { return l.trim() }).length }
  }

  /* ---------- 智能文本读取：UTF-8 失败时回落 GB18030 ---------- */
  function readTextSmart(file) {
    return file.arrayBuffer().then(function (buf) {
      var u8 = new Uint8Array(buf)
      if (u8[0] === 0xEF && u8[1] === 0xBB && u8[2] === 0xBF) {
        return new TextDecoder('utf-8').decode(u8.subarray(3))
      }
      var s = new TextDecoder('utf-8').decode(u8)
      var bad = (s.match(/\uFFFD/g) || []).length
      if (bad > 0) {
        try {
          var g = new TextDecoder('gb18030').decode(u8)
          if ((g.match(/\uFFFD/g) || []).length < bad) return g
        } catch (e) {}
      }
      return s
    })
  }

  /* ---------- ZIP / OOXML ---------- */
  function unzip(buf) {
    var dv = new DataView(buf), n = buf.byteLength, eocd = -1, i
    for (i = n - 22; i >= Math.max(0, n - 65558); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break }
    }
    if (eocd < 0) throw new Error('不是有效的 Office 文件（ZIP 结构缺失，可能是旧版 .doc/.xls）')
    var count = dv.getUint16(eocd + 10, true)
    var off = dv.getUint32(eocd + 16, true)
    var out = {}, dec = new TextDecoder()
    for (var k = 0; k < count; k++) {
      if (off + 46 > n || dv.getUint32(off, true) !== 0x02014b50) break
      var method = dv.getUint16(off + 10, true)
      var csize = dv.getUint32(off + 20, true)
      var nlen = dv.getUint16(off + 28, true)
      var elen = dv.getUint16(off + 30, true)
      var clen = dv.getUint16(off + 32, true)
      var lho = dv.getUint32(off + 42, true)
      var name = dec.decode(new Uint8Array(buf, off + 46, nlen))
      if (lho + 30 <= n) {
        var lnlen = dv.getUint16(lho + 26, true)
        var lelen = dv.getUint16(lho + 28, true)
        var start = lho + 30 + lnlen + lelen
        if (start + csize <= n) out[name] = { method: method, bytes: new Uint8Array(buf, start, csize) }
      }
      off += 46 + nlen + elen + clen
    }
    return out
  }

  function inflate(bytes, raw) {
    if (!global.DecompressionStream) throw new Error('浏览器不支持解压，请用 Chrome / Edge 打开')
    var ds = new DecompressionStream(raw ? 'deflate-raw' : 'deflate')
    var stream = new Blob([bytes]).stream().pipeThrough(ds)
    return new Response(stream).text()
  }

  function entry(z, name) {
    var e = z[name]
    if (!e) return Promise.resolve('')
    if (e.method === 0) return Promise.resolve(new TextDecoder().decode(e.bytes))
    if (e.method === 8) return inflate(e.bytes, true)
    return Promise.reject(new Error('不支持的压缩方式 (' + e.method + ')'))
  }

  function parseDocx(z) {
    return entry(z, 'word/document.xml').then(function (x) {
      if (!x) throw new Error('Word 文件里没找到正文')
      var t = x.replace(/<w:tab[^>]*\/>/g, '\t')
        .replace(/<w:br[^>]*\/>/g, '\n')
        .replace(/<\/w:p>/g, '\n')
        .replace(/<[^>]+>/g, '')
      t = decodeEnt(t).replace(/\n{3,}/g, '\n\n').trim()
      return { text: t, meta: { paragraphs: (x.match(/<\/w:p>/g) || []).length } }
    })
  }

  function colIdx(ref) {
    var m = /^([A-Z]+)/.exec(ref || '')
    if (!m) return 0
    var s = m[1], v = 0
    for (var i = 0; i < s.length; i++) v = v * 26 + (s.charCodeAt(i) - 64)
    return v - 1
  }

  function parseXlsx(z) {
    var shared = []
    var p = z['xl/sharedStrings.xml'] ? entry(z, 'xl/sharedStrings.xml').then(function (sx) {
      var re = /<si>([\s\S]*?)<\/si>/g, m
      while ((m = re.exec(sx))) shared.push(decodeEnt(m[1].replace(/<[^>]+>/g, '')))
    }) : Promise.resolve()
    return p.then(function () {
      var keys = Object.keys(z).filter(function (k) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(k) })
        .sort(function (a, b) {
          return (parseInt(/sheet(\d+)/.exec(a)[1], 10) || 0) - (parseInt(/sheet(\d+)/.exec(b)[1], 10) || 0)
        })
      var chain = Promise.resolve(), out = [], totalRows = 0
      keys.forEach(function (key, i) {
        chain = chain.then(function () { return entry(z, key) }).then(function (sx) {
          out.push('【工作表 ' + (i + 1) + '】')
          var rowRe = /<row[^>]*>([\s\S]*?)<\/row>/g, rm
          while ((rm = rowRe.exec(sx))) {
            var cells = [], cellRe = /<c\b([^>]*)>([\s\S]*?)<\/c>/g, cm
            while ((cm = cellRe.exec(rm[1]))) {
              var attrs = cm[1], body = cm[2]
              var refM = /r="([A-Z]+\d+)"/.exec(attrs)
              var ci = refM ? colIdx(refM[1]) : cells.length
              var vM = /<v>([\s\S]*?)<\/v>/.exec(body)
              var val = vM ? decodeEnt(vM[1]) : ''
              if (/t="s"/.test(attrs)) val = shared[parseInt(val, 10)] || val
              else if (/t="inlineStr"/.test(attrs)) val = decodeEnt(body.replace(/<[^>]+>/g, ''))
              cells[ci] = val
            }
            for (var q = 0; q < cells.length; q++) if (cells[q] == null) cells[q] = ''
            if (cells.join('').trim()) { out.push(cells.join('\t')); totalRows++ }
          }
        })
      })
      return chain.then(function () { return { text: out.join('\n'), meta: { sheets: keys.length, rows: totalRows } } })
    })
  }

  function parsePptx(z) {
    var keys = Object.keys(z).filter(function (k) { return /^ppt\/slides\/slide\d+\.xml$/.test(k) })
      .sort(function (a, b) {
        return (parseInt(/slide(\d+)/.exec(a)[1], 10) || 0) - (parseInt(/slide(\d+)/.exec(b)[1], 10) || 0)
      })
    var chain = Promise.resolve(), out = []
    keys.forEach(function (key, i) {
      chain = chain.then(function () { return entry(z, key) }).then(function (x) {
        var texts = [], re = /<a:t>([\s\S]*?)<\/a:t>/g, m
        while ((m = re.exec(x))) texts.push(decodeEnt(m[1]))
        out.push('【第 ' + (i + 1) + ' 页】\n' + texts.join('\n'))
      })
    })
    return chain.then(function () { return { text: out.join('\n\n'), meta: { slides: keys.length } } })
  }

  /* ---------- PDF 文本层（不依赖 pdf.js） ---------- */
  function parsePdf(file) {
    return file.arrayBuffer().then(function (buf) {
      var u8 = new Uint8Array(buf), s = '', CH = 0x8000
      for (var i = 0; i < u8.length; i += CH) {
        s += String.fromCharCode.apply(null, u8.subarray(i, i + CH))
      }
      var jobs = [], re = /stream\r?\n([\s\S]*?)\r?\nendstream/g, m
      while ((m = re.exec(s))) {
        var head = s.slice(Math.max(0, m.index - 300), m.index)
        var bin = new Uint8Array(m[1].length)
        for (var j = 0; j < m[1].length; j++) bin[j] = m[1].charCodeAt(j) & 0xff
        jobs.push({ flate: /FlateDecode/.test(head), bin: bin, raw: m[1] })
      }
      return jobs.reduce(function (chain, job) {
        return chain.then(function (acc) {
          var p = job.flate ? inflate(job.bin, false).catch(function () { return '' }) : Promise.resolve(job.raw)
          return p.then(function (c) { return acc + '\n' + c })
        })
      }, Promise.resolve(''))
    }).then(function (content) {
      var out = [], r1 = /\(((?:\\.|[^\\)])*)\)\s*Tj/g, x
      while ((x = r1.exec(content))) out.push(x[1])
      var r2 = /\[([\s\S]*?)\]\s*TJ/g, y
      while ((y = r2.exec(content))) {
        var parts = y[1].match(/\(((?:\\.|[^\\)])*)\)/g) || []
        out.push(parts.map(function (p) { return p.slice(1, -1) }).join(''))
      }
      var text = out.map(function (t) {
        return t.replace(/\\([nrt()\\])/g, function (_, c) {
          return c === 'n' ? '\n' : c === 'r' ? '\r' : c === 't' ? '\t' : c
        })
      }).join('\n').replace(/\n{3,}/g, '\n\n').trim()
      return { text: text, meta: { fragments: out.length }, scanned: !text }
    })
  }

  /* ---------- 统一入口 ---------- */
  function parse(file) {
    var name = file && file.name || '未命名'
    var size = file && file.size || 0
    var e = extOf(name)
    var r = { name: name, size: size, ext: e, kind: '', text: '', meta: {}, note: '', ok: false, raw: file }

    if (!file) { r.note = '没有拿到文件'; return Promise.resolve(r) }
    if (IMAGE_EXT.test(e)) {
      r.kind = 'image'; r.note = '图片已加入，可点「识字」用站内 OCR 提取文字'
      return Promise.resolve(r)
    }
    if (OFFICE_EXT.test(e)) {
      return file.arrayBuffer().then(function (buf) {
        var z = unzip(buf)
        return e === 'docx' ? parseDocx(z) : e === 'xlsx' ? parseXlsx(z) : parsePptx(z)
      }).then(function (o) {
        r.kind = e; r.text = o.text; r.meta = mix(o.meta, stats(o.text)); r.ok = !!o.text
        if (!o.text) r.note = '结构读到了，但没取到文字（空文档或纯图片内容）'
        return r
      }).catch(function (err) { r.note = '解析失败：' + (err && err.message || err); return r })
    }
    if (e === 'pdf') {
      return parsePdf(file).then(function (o) {
        r.kind = 'pdf'; r.text = o.text; r.meta = o.meta; r.ok = !!o.text
        r.note = o.scanned
          ? '没提取到文本层：扫描件或中文 CID 编码。请把页面截图后用「图片识字」。'
          : '已提取 PDF 文本层；若为扫描件请改用图片识字。'
        return r
      }).catch(function (err) { r.note = 'PDF 解析失败：' + (err && err.message || err); return r })
    }
    if (!TEXT_EXT.test(e)) {
      r.note = '暂不支持 .' + e + '，可先另存为 .txt / .docx / .xlsx 再添加'
      return Promise.resolve(r)
    }
    return readTextSmart(file).then(function (txt) {
      if (/^(html|htm|svg)$/.test(e)) txt = stripTags(txt)
      else if (/^(csv|tsv)$/.test(e)) {
        var sep = e === 'csv' ? ',' : '\t'
        var lines = txt.split(/\r?\n/).filter(function (l) { return l.trim() })
        r.meta = { rows: lines.length, cols: lines.length ? lines[0].split(sep).length : 0 }
      } else if (e === 'json') {
        try {
          var obj = JSON.parse(txt)
          r.meta = { topType: Array.isArray(obj) ? 'array' : typeof obj, keys: Object.keys(obj).slice(0, 20) }
          txt = JSON.stringify(obj, null, 2)
        } catch (_) { r.meta = { jsonValid: false } }
      }
      r.kind = 'text'; r.text = txt.slice(0, 200000); r.meta = mix(r.meta, stats(r.text)); r.ok = true
      return r
    }).catch(function (err) { r.note = '读取失败：' + (err && err.message || err); return r })
  }

  function summarize(list) {
    return (list || []).map(function (a) {
      var bits = ['`' + a.name + '`', a.kind || a.ext, Math.round(a.size / 1024) + 'KB']
      var m = a.meta || {}
      if (m.lines) bits.push(m.lines + ' 行 / ' + m.chars + ' 字')
      if (m.sheets) bits.push(m.sheets + ' 表 / ' + m.rows + ' 行')
      if (m.slides) bits.push(m.slides + ' 页')
      if (m.cols) bits.push(m.cols + ' 列')
      if (!a.text) bits.push('（' + (a.note || '无文本') + '）')
      return '- ' + bits.join(' · ')
    }).join('\n')
  }

  global.BaijuFiles = {
    version: '1.0.0',
    accept: ACCEPT,
    support: ['txt', 'md', 'csv', 'tsv', 'json', 'html', 'log', '代码', 'docx', 'xlsx', 'pptx', 'pdf(文本层)', '图片(OCR)'],
    parse: parse,
    summarize: summarize
  }
})(typeof window !== 'undefined' ? window : this)
