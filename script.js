(function () {
  const viewport = document.getElementById('waveTrack');
  const stageCanvas = document.getElementById('aspectStageCanvas');
  const world = document.getElementById('scrollySticky');
  const heroStartSeed = document.getElementById('heroStartSeed');
  const svg = document.getElementById('waveSvg');
  const basePath = document.getElementById('goldWavePath');
  const tipTrail = document.getElementById('goldTipTrail');
  const shineLayersGroup = document.getElementById('shinyTipGroup');
  const siteFooter = document.getElementById('siteFooter');
  const navStepBadge = document.getElementById('navStepBadge');
  const navButtons = Array.from(document.querySelectorAll('.nav-step-btn'));
  const jumpButtons = Array.from(document.querySelectorAll('[data-jump-step]'));
  const siteNavbar = document.getElementById('siteNavbar');
  const secondScrollPhotoRight = document.getElementById('secondScrollPhotoRight');
  const secondScrollPhotoLeft = document.getElementById('secondScrollPhotoLeft');
  const boardDirectorsScene = document.getElementById('boardDirectorsScene');
  const boardPerimeterSvg = document.getElementById('boardPerimeterSvg');
  const boardFinalSlogan = document.getElementById('boardFinalSlogan');
  const footerBackTopBtn = document.getElementById('footerBackTopBtn');
  const boardCircleEls = Array.from(document.querySelectorAll('[data-board-circle]'));
  const boardCircleLines = [];
  const boardCirclesMeta = boardCircleEls.map(function (el, idx) {
    return {
      index: idx,
      el: el,
      wall1: el.querySelector('.wall-layer-1'),
      wall2: el.querySelector('.wall-layer-2'),
      wall3: el.querySelector('.wall-layer-3'),
      fill: el.querySelector('.arch-spectrum-fill')
    };
  });
  const cameraPortalCanvas = document.getElementById('cameraPortalCanvas');
  const portalCtx = cameraPortalCanvas ? cameraPortalCanvas.getContext('2d') : null;
  const shapeInteriorView = document.getElementById('shapeInteriorView');
  const interiorCrest = document.getElementById('interiorCrest');
  const interiorMainTitle = document.getElementById('interiorMainTitle');
  const interiorScrollArea = document.getElementById('interiorScrollArea');
  const interiorExitBtn = document.getElementById('interiorExitBtn');

  const photoLightboxModal = document.getElementById('photoLightboxModal');
  const lightboxBackdrop = document.getElementById('lightboxBackdrop');
  const lightboxBackBtn = document.getElementById('lightboxBackBtn');
  const lightboxFullImg = document.getElementById('lightboxFullImg');
  const lightboxTitle = document.getElementById('lightboxTitle');
  const lightboxDesc = document.getElementById('lightboxDesc');
  const lightboxImgFrame = document.getElementById('lightboxImgFrame');
  const lightboxGoldSvg = document.getElementById('lightboxGoldSvg');
  const lightboxGoldRect = document.getElementById('lightboxGoldRect');

  let interiorOpen = false;
  let lightboxOpen = false;
  let cameraDiveAnim = null;
  let activeInteriorStage = -1;
  let pointerStartPos = { x: 0, y: 0, moved: false };

  const STAGE_COUNT = 4;
  const SHINE_SEGMENTS_COUNT = 4;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const PAD = 3.5; // فاصله‌ی خط طلایی تا لبه‌ی شکل/عکس

  let wavePoints = [];
  let waveCumLengths = [0];
  let waveTotalLen = 0;

  const stages = [];

  for (let k = 0; k < STAGE_COUNT; k++) {
    const sceneEl = document.querySelector(`[data-stage-scene="${k}"]`);
    const svgEl = document.querySelector(`[data-stage-svg="${k}"]`);
    const baseEl = document.querySelector(`[data-stage-base="${k}"]`);
    const shineGroupEl = document.querySelector(`[data-stage-shine="${k}"]`);
    const tipEl = document.querySelector(`[data-stage-tip="${k}"]`);
    const moldEl = document.querySelector(`[data-stage-mold="${k}"]`);
    const archEl = document.querySelector(`[data-stage-arch="${k}"]`);
    const headerEl = document.querySelector(`[data-outside-header="${k}"]`);
    const textA = document.querySelector(`[data-stage-text-a="${k}"]`);
    const textB = document.querySelector(`[data-stage-text-b="${k}"]`);

    const wall1 = archEl ? archEl.querySelector('.wall-layer-1') : null;
    const wall2 = archEl ? archEl.querySelector('.wall-layer-2') : null;
    const wall3 = archEl ? archEl.querySelector('.wall-layer-3') : null;
    const cavity = archEl ? archEl.querySelector('.arch-inner-cavity') : null;
    const fill = archEl ? archEl.querySelector('.arch-spectrum-fill') : null;
    const slots = moldEl ? Array.from(moldEl.querySelectorAll('.fibo-slot')) : [];
    const reels = moldEl ? Array.from(moldEl.querySelectorAll('.fibo-insta-reel')) : [];

    let variant = 'arch';
    if (archEl) {
      if (archEl.classList.contains('shape-variant-octagon')) variant = 'octagon';
      else if (archEl.classList.contains('shape-variant-teardrop')) variant = 'teardrop';
      else if (archEl.classList.contains('shape-variant-star')) variant = 'star';
    }

    stages.push({
      index: k,
      variant: variant,
      sceneEl: sceneEl,
      svgEl: svgEl,
      moldEl: moldEl,
      archEl: archEl,
      headerEl: headerEl,
      textA: textA,
      textB: textB,
      wall1: wall1,
      wall2: wall2,
      wall3: wall3,
      cavity: cavity,
      fill: fill,
      slots: slots,
      reels: reels,
      // خط طلایی دور شکل (اسکرول اول) و سه خط جداگانه‌ی دور عکس‌ها (اسکرول دوم)
      shapeLine: makeGoldLine(baseEl, shineGroupEl, tipEl),
      photoLines: [],
      photoWins: [],
      metrics: null,
      archLoopEndLen: 0
    });
  }

  const MAX_STEP = 10;
  let currentPos = 0;
  let targetStep = 0;
  let animDirection = 0;
  let rafId = null;
  let settleLockUntil = 0;
  let navQuickJump = null;
  let tween = null;
  let velocity = 0;
  let lastRenderedPos = null;

  const STEP_DURATION_MS = 1400;

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0 || 1), 0, 1);
    return t * t * (3 - 2 * t);
  }

  /* نوشتن استایل فقط وقتی مقدار واقعاً عوض شده (جلوگیری از بازرسم بیهوده در هر فریم) */
  function setS(el, prop, val) {
    if (!el) return;
    const c = el.__c || (el.__c = {});
    if (c[prop] === val) return;
    c[prop] = val;
    el.style[prop] = val;
  }

  let canvasSize = { w: 1280, h: 800 };
  function refreshCanvasSize() {
    const rect = stageCanvas ? stageCanvas.getBoundingClientRect() : null;
    canvasSize = {
      w: (rect && rect.width) || window.innerWidth || 1280,
      h: (rect && rect.height) || window.innerHeight || 800
    };
  }
  function getCanvasSize() {
    return canvasSize;
  }

  /* ====================================================================
     هندسه‌ی شکل‌ها (منحنی‌های روان) — مشترک بین clip-path و خط طلایی
     ==================================================================== */
/* ---------- هندسه شکل‌ها: خروجی همه‌ی تابع‌ها نقاط ساعتگرد (در مختصات صفحه، y رو به پایین) است ---------- */
var Geom = (function () {
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function signedArea(pts) {
    var a = 0;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], q = pts[(i + 1) % pts.length];
      a += p.x * q.y - q.x * p.y;
    }
    return a / 2; // در دستگاه مختصات y-پایین، مقدار مثبت یعنی ساعتگرد
  }

  function ensureClockwise(pts) {
    return signedArea(pts) < 0 ? pts.slice().reverse() : pts;
  }

  /* گرد کردن گوشه‌های یک چندضلعی با کمان دایره‌ای مماس (برای گوشه‌های محدب و مقعر) */
  function filletPolygon(verts, radii, arcStep) {
    var n = verts.length, out = [];
    var step = arcStep || (Math.PI / 60);
    for (var i = 0; i < n; i++) {
      var V = verts[i], P = verts[(i - 1 + n) % n], N = verts[(i + 1) % n];
      var r = typeof radii === 'function' ? radii(i) : (Array.isArray(radii) ? radii[i] : radii);
      var v1x = P.x - V.x, v1y = P.y - V.y, v2x = N.x - V.x, v2y = N.y - V.y;
      var l1 = Math.hypot(v1x, v1y), l2 = Math.hypot(v2x, v2y);
      v1x /= l1; v1y /= l1; v2x /= l2; v2y /= l2;
      var cosT = clamp(v1x * v2x + v1y * v2y, -1, 1);
      var theta = Math.acos(cosT);
      if (!r || theta > Math.PI - 1e-3 || theta < 1e-3) { out.push({ x: V.x, y: V.y }); continue; }
      var t = r / Math.tan(theta / 2);
      var tMax = 0.5 * Math.min(l1, l2);
      if (t > tMax) { t = tMax; r = t * Math.tan(theta / 2); }
      var T1 = { x: V.x + v1x * t, y: V.y + v1y * t };
      var T2 = { x: V.x + v2x * t, y: V.y + v2y * t };
      var bx = v1x + v2x, by = v1y + v2y, bl = Math.hypot(bx, by);
      bx /= bl; by /= bl;
      var dC = r / Math.sin(theta / 2);
      var C = { x: V.x + bx * dC, y: V.y + by * dC };
      var a1 = Math.atan2(T1.y - C.y, T1.x - C.x), a2 = Math.atan2(T2.y - C.y, T2.x - C.x);
      var d = a2 - a1;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      var cnt = Math.max(2, Math.ceil(Math.abs(d) / step));
      for (var k = 0; k <= cnt; k++) {
        var a = a1 + d * (k / cnt);
        out.push({ x: C.x + r * Math.cos(a), y: C.y + r * Math.sin(a) });
      }
    }
    return out;
  }

  /* هموارسازی چندضلعی بسته با زیرتقسیم Chaikin (منحنی B-اسپلاین مرتبه‌ی دو) */
  function chaikinClosed(pts, iterations) {
    var cur = pts;
    for (var it = 0; it < iterations; it++) {
      var nxt = [];
      for (var i = 0; i < cur.length; i++) {
        var p = cur[i], q = cur[(i + 1) % cur.length];
        nxt.push({ x: 0.75 * p.x + 0.25 * q.x, y: 0.75 * p.y + 0.25 * q.y });
        nxt.push({ x: 0.25 * p.x + 0.75 * q.x, y: 0.25 * p.y + 0.75 * q.y });
      }
      cur = nxt;
    }
    return cur;
  }

  /* نقاط با فاصله‌ی تقریباً ثابت (بسته) */
  function resampleClosed(pts, spacing) {
    var n = pts.length, cum = [0];
    for (var i = 0; i < n; i++) {
      var p = pts[i], q = pts[(i + 1) % n];
      cum.push(cum[i] + Math.hypot(q.x - p.x, q.y - p.y));
    }
    var total = cum[n];
    var count = Math.max(24, Math.round(total / spacing));
    var out = [], seg = 0;
    for (var k = 0; k < count; k++) {
      var target = (k / count) * total;
      while (seg < n - 1 && cum[seg + 1] < target) seg++;
      var p0 = pts[seg], p1 = pts[(seg + 1) % n];
      var span = cum[seg + 1] - cum[seg] || 1;
      var t = (target - cum[seg]) / span;
      out.push({ x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t });
    }
    return out;
  }

  /* حذف نقاط اضافه (Douglas–Peucker) برای clip-path */
  function simplifyClosed(pts, tol) {
    if (pts.length < 8) return pts;
    // دو نقطه‌ی دور از هم را لنگر می‌گیریم
    var iMax = 0, best = -1;
    for (var i = 1; i < pts.length; i++) {
      var d = Math.hypot(pts[i].x - pts[0].x, pts[i].y - pts[0].y);
      if (d > best) { best = d; iMax = i; }
    }
    function rdp(arr) {
      if (arr.length < 3) return arr;
      var a = arr[0], b = arr[arr.length - 1], idx = -1, md = 0;
      var dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      for (var j = 1; j < arr.length - 1; j++) {
        var dist = Math.abs(dy * arr[j].x - dx * arr[j].y + b.x * a.y - b.y * a.x) / len;
        if (dist > md) { md = dist; idx = j; }
      }
      if (md > tol) {
        var left = rdp(arr.slice(0, idx + 1)), right = rdp(arr.slice(idx));
        return left.slice(0, -1).concat(right);
      }
      return [a, b];
    }
    var first = pts.slice(0, iMax + 1), second = pts.slice(iMax).concat([pts[0]]);
    var r1 = rdp(first), r2 = rdp(second);
    return r1.slice(0, -1).concat(r2.slice(0, -1));
  }

  /* قوس هر چهار گوشه با شعاع‌های متفاوت بالا/پایین (همان قانون مقیاس‌دهی CSS برای border-radius) */
  function roundedRectOutline(w, h, rTop, rBottom, step) {
    var s = step || (Math.PI / 60);
    var pts = [];
    function arc(cx, cy, r, a0, a1) {
      var cnt = Math.max(2, Math.ceil(Math.abs(a1 - a0) / s));
      for (var k = 0; k <= cnt; k++) {
        var a = a0 + (a1 - a0) * (k / cnt);
        pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
      }
    }
    pts.push({ x: w / 2, y: 0 });
    arc(w - rTop, rTop, rTop, -Math.PI / 2, 0);
    arc(w - rBottom, h - rBottom, rBottom, 0, Math.PI / 2);
    arc(rBottom, h - rBottom, rBottom, Math.PI / 2, Math.PI);
    arc(rTop, rTop, rTop, Math.PI, 1.5 * Math.PI);
    // حذف نقاط تکراری پشت‌سرهم
    var clean = [];
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], q = clean[clean.length - 1];
      if (!q || Math.hypot(p.x - q.x, p.y - q.y) > 0.01) clean.push(p);
    }
    if (clean.length > 1 && Math.hypot(clean[0].x - clean[clean.length - 1].x, clean[0].y - clean[clean.length - 1].y) < 0.01) clean.pop();
    return clean;
  }

  function archRadii(w, h) {
    // دقیقاً همان قانون CSS برای border-radius: 999px 999px 24px 24px
    var f = Math.min(1, w / (999 + 999), w / (24 + 24), h / (999 + 24), h / (999 + 24));
    return { top: 999 * f, bottom: 24 * f };
  }

  /* شکل‌ها در جعبه‌ی w×h؛ خروجی از «تاج» (وسط بالا) شروع می‌شود */
  function shapeOutline(variant, w, h) {
    var m = Math.min(w, h), pts;
    if (variant === 'arch') {
      var rr = archRadii(w, h);
      pts = roundedRectOutline(w, h, rr.top, rr.bottom);
    } else if (variant === 'octagon') {
      var o = [
        { x: 0.5 * w, y: 0 }, { x: 0.82 * w, y: 0 }, { x: w, y: 0.18 * h }, { x: w, y: 0.82 * h },
        { x: 0.82 * w, y: h }, { x: 0.18 * w, y: h }, { x: 0, y: 0.82 * h }, { x: 0, y: 0.18 * h }, { x: 0.18 * w, y: 0 }
      ];
      pts = filletPolygon(o, function (i) { return i === 0 ? 0 : 0.1 * m; });
    } else if (variant === 'star') {
      var s = [
        { x: 0.5 * w, y: 0 }, { x: 0.73 * w, y: 0.27 * h }, { x: w, y: 0.5 * h }, { x: 0.73 * w, y: 0.73 * h },
        { x: 0.5 * w, y: h }, { x: 0.27 * w, y: 0.73 * h }, { x: 0, y: 0.5 * h }, { x: 0.27 * w, y: 0.27 * h }
      ];
      pts = filletPolygon(s, function (i) { return i % 2 === 0 ? 0.05 * m : 0.55 * m; });
    } else { // teardrop
      var T = [
        [0.500, 0.000], [0.565, 0.058], [0.632, 0.120], [0.700, 0.186], [0.766, 0.255], [0.828, 0.328],
        [0.882, 0.402], [0.926, 0.478], [0.956, 0.554], [0.970, 0.630], [0.966, 0.704], [0.944, 0.775],
        [0.905, 0.840], [0.850, 0.896], [0.780, 0.942], [0.696, 0.975], [0.602, 0.994], [0.500, 1.000],
        [0.398, 0.994], [0.304, 0.975], [0.220, 0.942], [0.150, 0.896], [0.095, 0.840], [0.056, 0.775],
        [0.034, 0.704], [0.030, 0.630], [0.044, 0.554], [0.074, 0.478], [0.118, 0.402], [0.172, 0.328],
        [0.234, 0.255], [0.300, 0.186], [0.368, 0.120], [0.435, 0.058]
      ];
      var wShape = Math.min(0.84 * h, 0.97 * w);
      var ctrl = T.map(function (q) {
        return { x: w / 2 + ((q[0] - 0.5) / 0.47) * (wShape / 2), y: q[1] * h };
      });
      pts = chaikinClosed(ctrl, 3);
    }
    pts = ensureClockwise(pts);
    // شروع از بالاترین نقطه‌ی نزدیک به وسط (تاج)
    var best = 0, bd = Infinity;
    for (var i = 0; i < pts.length; i++) {
      var d = (pts[i].y) * 4 + Math.abs(pts[i].x - w / 2);
      if (d < bd) { bd = d; best = i; }
    }
    return pts.slice(best).concat(pts.slice(0, best));
  }

  /* انتقال هر نقطه به اندازه‌ی d در جهت عمود بیرونی (چندضلعی ساعتگرد) */
  function offsetClosed(pts, d) {
    var n = pts.length, out = [];
    for (var i = 0; i < n; i++) {
      var a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
      var tx = b.x - a.x, ty = b.y - a.y, tl = Math.hypot(tx, ty) || 1;
      out.push({ x: pts[i].x + (ty / tl) * d, y: pts[i].y - (tx / tl) * d });
    }
    return out;
  }

  return {
    shapeOutline: shapeOutline, offsetClosed: offsetClosed, resampleClosed: resampleClosed,
    simplifyClosed: simplifyClosed, roundedRectOutline: roundedRectOutline, archRadii: archRadii,
    signedArea: signedArea
  };
})();

  /* ====================================================================
     خط طلایی: یک شیء برای هر خط (مسیر کامل یک‌بار ساخته می‌شود و طول نمایش با dasharray تنظیم می‌شود)
     ==================================================================== */
  function makeGoldLine(baseEl, shineGroupEl, tipEl) {
    return {
      baseEl: baseEl,
      shineGroupEl: shineGroupEl,
      tipEl: tipEl,
      shineEls: [],
      pts: [],
      cum: [0],
      total: 0,
      lastKey: null
    };
  }

  function createShineSegmentsForGroup(groupEl, targetArray) {
    if (!groupEl) return;
    groupEl.innerHTML = '';
    targetArray.length = 0;

    const colors = ['#E2C354', '#F0DA82', '#FAF0B8', '#FFFDF4'];

    for (let i = 0; i < SHINE_SEGMENTS_COUNT; i++) {
      const p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('class', 'shine-segment');
      const ratio = (i + 1) / SHINE_SEGMENTS_COUNT;
      p.setAttribute('stroke', colors[i] || '#FFFDF4');
      p.setAttribute('stroke-width', (3.4 + ratio * 1.2).toFixed(2));
      p.setAttribute('stroke-opacity', (0.28 + ratio * 0.7).toFixed(2));
      p.style.visibility = 'hidden';
      groupEl.appendChild(p);
      targetArray.push(p);
    }
  }

  function initShineLayers() {
    createShineSegmentsForGroup(shineLayersGroup, heroLine.shineEls);
    stages.forEach(function (st) {
      createShineSegmentsForGroup(st.shapeLine.shineGroupEl, st.shapeLine.shineEls);
      // سه خط جداگانه برای عکس‌ها (ابتدا نامرئی‌اند)
      st.photoLines.forEach(function (l) {
        if (l.baseEl && l.baseEl.parentNode) l.baseEl.parentNode.removeChild(l.baseEl);
        if (l.shineGroupEl && l.shineGroupEl.parentNode) l.shineGroupEl.parentNode.removeChild(l.shineGroupEl);
        if (l.tipEl && l.tipEl.parentNode) l.tipEl.parentNode.removeChild(l.tipEl);
      });
      st.photoLines = [];
      if (!st.svgEl) return;
      for (let i = 0; i < 3; i++) {
        const base = document.createElementNS(SVG_NS, 'path');
        base.setAttribute('class', 'gold-wave-base');
        base.setAttribute('d', '');
        base.style.visibility = 'hidden';
        const g = document.createElementNS(SVG_NS, 'g');
        g.setAttribute('class', 'shine-fade-layers');
        const tip = document.createElementNS(SVG_NS, 'path');
        tip.setAttribute('class', 'gold-tip-trail');
        tip.setAttribute('d', '');
        st.svgEl.appendChild(base);
        st.svgEl.appendChild(g);
        st.svgEl.appendChild(tip);
        const line = makeGoldLine(base, g, tip);
        createShineSegmentsForGroup(g, line.shineEls);
        st.photoLines.push(line);
      }
    });

    boardCircleLines.length = 0;
    if (boardPerimeterSvg) {
      boardPerimeterSvg.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const base = document.createElementNS(SVG_NS, 'path');
        base.setAttribute('class', 'gold-wave-base');
        base.setAttribute('d', '');
        base.style.visibility = 'hidden';
        const g = document.createElementNS(SVG_NS, 'g');
        g.setAttribute('class', 'shine-fade-layers');
        const tip = document.createElementNS(SVG_NS, 'path');
        tip.setAttribute('class', 'gold-tip-trail');
        tip.setAttribute('d', '');
        boardPerimeterSvg.appendChild(base);
        boardPerimeterSvg.appendChild(g);
        boardPerimeterSvg.appendChild(tip);
        const line = makeGoldLine(base, g, tip);
        createShineSegmentsForGroup(g, line.shineEls);
        boardCircleLines.push(line);
      }
    }
  }

  function createPointCollector(pointsArr, cumLengthsArr) {
    let runningLen = 0;
    pointsArr.length = 0;
    cumLengthsArr.length = 0;
    cumLengthsArr.push(0);

    return {
      appendPoint: function (pt) {
        if (pointsArr.length > 0) {
          const prev = pointsArr[pointsArr.length - 1];
          const dist = Math.hypot(pt.x - prev.x, pt.y - prev.y);
          if (dist < 0.05) return runningLen;
          runningLen += dist;
          cumLengthsArr.push(runningLen);
        }
        pointsArr.push(pt);
        return runningLen;
      },
      addSubSegment: function (steps, fn) {
        for (let i = 0; i <= steps; i++) {
          this.appendPoint(fn(i / steps));
        }
        return runningLen;
      },
      addLine: function (p1, p2, steps) {
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const count = steps || Math.max(8, Math.ceil(dist / 3.5));
        for (let i = 0; i <= count; i++) {
          const t = i / count;
          this.appendPoint({
            x: p1.x + (p2.x - p1.x) * t,
            y: p1.y + (p2.y - p1.y) * t
          });
        }
        return runningLen;
      },
      addCubicBezier: function (p0, p1, p2, p3, steps) {
        const count = steps || 34;
        for (let i = 0; i <= count; i++) {
          const t = i / count;
          const mt = 1 - t;
          const x =
            mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x;
          const y =
            mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y;
          this.appendPoint({ x: x, y: y });
        }
        return runningLen;
      },
      getLength: function () {
        return runningLen;
      }
    };
  }

  const heroLine = makeGoldLine(basePath, shineLayersGroup, tipTrail);
  heroLine.pts = wavePoints;
  heroLine.cum = waveCumLengths;

  function buildSubPathFromArray(pts, startIdx, endIdx, exactTipPoint) {
    const clampedStart = clamp(startIdx, 0, pts.length - 1);
    const clampedEnd = clamp(endIdx, clampedStart, pts.length - 1);
    let d = `M ${pts[clampedStart].x.toFixed(2)} ${pts[clampedStart].y.toFixed(2)}`;
    for (let i = clampedStart + 1; i <= clampedEnd; i++) {
      d += ` L ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)}`;
    }
    if (exactTipPoint) {
      d += ` L ${exactTipPoint.x.toFixed(2)} ${exactTipPoint.y.toFixed(2)}`;
    }
    return d;
  }

  /* ثبت یک‌باره‌ی مسیر کامل روی پایه و لایه‌های درخشش (بدون بازسازی رشته در حین اسکرول) */
  function commitLine(line) {
    line.total = line.cum[line.cum.length - 1] || 0;
    line.lastKey = null;
    if (!line.baseEl) return;
    const fullD = line.pts.length > 1 ? buildSubPathFromArray(line.pts, 0, line.pts.length - 1, null) : '';
    line.baseEl.setAttribute('d', fullD);
    if (line.tipEl) {
      line.tipEl.setAttribute('d', fullD);
      line.tipEl.style.visibility = 'hidden';
    }
    for (let s = 0; s < line.shineEls.length; s++) {
      line.shineEls[s].setAttribute('d', fullD);
      line.shineEls[s].style.visibility = 'hidden';
    }
  }

  function hideLine(line) {
    if (line.baseEl) line.baseEl.style.visibility = 'hidden';
    if (line.tipEl) line.tipEl.style.visibility = 'hidden';
    for (let s = 0; s < line.shineEls.length; s++) {
      line.shineEls[s].style.visibility = 'hidden';
    }
  }

  /* رندر فوق‌سریع خط طلایی فقط با تغییر dasharray و dashoffset (صفر تخصیص رشته در هر فریم) */
  function renderGold(line, targetLen) {
    if (!line.pts.length || !line.baseEl) return;

    const clampedLen = clamp(targetLen, 0, line.total);
    const key = clampedLen <= 0.5 ? -1 : Math.round(clampedLen * 5);
    if (key === line.lastKey) return;
    line.lastKey = key;

    if (clampedLen <= 0.5) {
      hideLine(line);
      return;
    }

    const gap = (line.total + 400).toFixed(1);
    line.baseEl.style.visibility = 'visible';
    if (clampedLen >= line.total - 0.5) {
      line.baseEl.removeAttribute('stroke-dasharray');
    } else {
      line.baseEl.setAttribute('stroke-dasharray', `${clampedLen.toFixed(1)} ${gap}`);
    }

    const shineSpan = Math.min(155, clampedLen);
    const shineStart = clampedLen - shineSpan;
    const shineEls = line.shineEls;
    const nShine = shineEls.length;
    const sliceLen = shineSpan / (nShine || 1);

    for (let s = 0; s < nShine; s++) {
      const el = shineEls[s];
      const segStart = shineStart + s * sliceLen;
      const segLen = sliceLen + 1.5;
      el.style.visibility = 'visible';
      el.setAttribute('stroke-dasharray', `${segLen.toFixed(1)} ${gap}`);
      el.setAttribute('stroke-dashoffset', `${(-segStart).toFixed(1)}`);
    }

    if (line.tipEl) {
      const tipSpan = Math.min(18, clampedLen);
      const tipStart = clampedLen - tipSpan;
      line.tipEl.style.visibility = 'visible';
      line.tipEl.setAttribute('stroke-dasharray', `${tipSpan.toFixed(1)} ${gap}`);
      line.tipEl.setAttribute('stroke-dashoffset', `${(-tipStart).toFixed(1)}`);
    }
  }


  /**
   * ۱. ساخت هندسه خط طلایی برای اسکرول دوم (در بخش ابتدایی زیر هیرو)
   */
  function buildHeroWaveGeometry() {
    if (!svg) return;

    const size = getCanvasSize();
    const winW = size.w;
    const winH = size.h;
    const totalWorldH = winH * 4.6;
    const centerX = winW / 2;

    svg.setAttribute('viewBox', `0 0 ${winW} ${totalWorldH}`);

    const amplitude = Math.min(36, winW * 0.065);
    const circleRadius = Math.min(21, winW * 0.04);
    const yStart = winH * 0.91;
    const yEnd = winH * 1.81;
    const segH = yEnd - yStart;
    const hStep = segH / 10;

    const collector = createPointCollector(wavePoints, waveCumLengths);

    collector.addSubSegment(60, function (t) {
      const theta = t * (Math.PI / 2);
      return {
        x: centerX + amplitude * Math.sin(theta),
        y: yStart + hStep * 1.5 * t
      };
    });

    collector.addSubSegment(100, function (t) {
      const phi = t * Math.PI * 2;
      return {
        x: centerX + (amplitude - circleRadius) + circleRadius * Math.cos(phi),
        y: yStart + hStep * 1.5 + circleRadius * Math.sin(phi)
      };
    });

    collector.addSubSegment(160, function (t) {
      const theta = Math.PI / 2 + t * (3 * Math.PI);
      return {
        x: centerX + amplitude * Math.sin(theta),
        y: yStart + hStep * 1.5 + hStep * 6.5 * t
      };
    });

    collector.addSubSegment(100, function (t) {
      const phi = t * Math.PI * 2;
      return {
        x: centerX - (amplitude - circleRadius) - circleRadius * Math.cos(phi),
        y: yStart + hStep * 8.0 + circleRadius * Math.sin(phi)
      };
    });

    collector.addSubSegment(70, function (t) {
      const theta = (7 * Math.PI) / 2 + t * ((3 * Math.PI) / 2);
      return {
        x: centerX + amplitude * Math.sin(theta),
        y: yStart + hStep * 8.0 + hStep * 2.0 * t
      };
    });

    waveTotalLen = collector.getLength();
    commitLine(heroLine);
  }


  /* ====================================================================
     اندازه‌گیری دقیق (با خنثی‌کردن موقت ترنسفورم‌ها)، شکل‌ها، جای‌گذاری متن و خط‌های طلایی هر بخش
     ==================================================================== */
  function withNeutral(st, fn) {
    const els = [st.sceneEl, st.moldEl, st.cavity, st.textA, st.textB].concat(st.slots);
    const saved = els.map(function (e) {
      return e ? e.style.transform : null;
    });
    els.forEach(function (e) {
      if (e) e.style.transform = 'none';
    });
    let res;
    try {
      res = fn();
    } finally {
      els.forEach(function (e, i) {
        if (e) e.style.transform = saved[i];
      });
    }
    return res;
  }

  function boxRelativeToCanvas(el) {
    const c = stageCanvas.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height };
  }

  function measureStage(st) {
    if (!st.archEl || !st.moldEl || st.slots.length < 3) return;
    st.metrics = withNeutral(st, function () {
      const a = boxRelativeToCanvas(st.archEl);
      const photos = st.slots.map(function (s) {
        const b = boxRelativeToCanvas(s);
        b.r = parseFloat(window.getComputedStyle(s).borderTopLeftRadius) || 18;
        return b;
      });
      return {
        arch: a,
        photos: photos,
        outline: Geom.shapeOutline(st.variant, a.w, a.h)
      };
    });
  }

  /* clip-path روان برای شکل‌های چندضلعی (لایه‌های سه‌بعدی داخلی آن را از والد به ارث می‌برند) */
  function applyShapeClip(st) {
    if (!st.metrics || st.variant === 'arch') return;
    const M = st.metrics;
    const dense = Geom.resampleClosed(M.outline, 1.2);
    const pts = Geom.simplifyClosed(dense, 0.1);
    const poly = pts
      .map(function (p) {
        return `${((p.x / M.arch.w) * 100).toFixed(3)}% ${((p.y / M.arch.h) * 100).toFixed(3)}%`;
      })
      .join(', ');
    st.archEl.style.clipPath = `polygon(${poly})`;
    st.archEl.style.webkitClipPath = `polygon(${poly})`;
  }

  /* نیم‌عرض شکل در هر ردیف پیکسل (حول محور وسط) */
  function buildHalfWidthFn(poly, Wc, Hc) {
    const rows = Math.ceil(Hc) + 1;
    const cx = Wc / 2;
    const table = new Float32Array(rows);
    for (let r = 0; r < rows; r++) {
      const y = r + 0.5;
      let xl = Infinity;
      let xr = -Infinity;
      for (let i = 0; i < poly.length; i++) {
        const p = poly[i];
        const q = poly[(i + 1) % poly.length];
        if ((p.y <= y && q.y > y) || (q.y <= y && p.y > y)) {
          const x = p.x + ((y - p.y) * (q.x - p.x)) / (q.y - p.y);
          if (x < xl) xl = x;
          if (x > xr) xr = x;
        }
      }
      table[r] = xl === Infinity ? 0 : Math.max(0, Math.min(cx - xl, xr - cx));
    }
    return function (y) {
      const r = Math.floor(y);
      return r < 0 || r >= rows ? 0 : table[r];
    };
  }

  function collectLineRects(root) {
    const rects = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const range = document.createRange();
    let n;
    while ((n = walker.nextNode())) {
      if (!n.nodeValue || !n.nodeValue.trim()) continue;
      range.selectNodeContents(n);
      const list = range.getClientRects();
      for (let i = 0; i < list.length; i++) rects.push(list[i]);
    }
    return rects;
  }

  const FIT_MIN = 0.48;
  const SAFE = 3;

  /*
    اگر متن داخل شکل بریده شود (گوشه‌ها) یا از ارتفاع بیرون بزند، بزرگ‌ترین مستطیل امن داخل شکل پیدا می‌شود،
    پدینگ حفره بر همان اساس تنظیم می‌شود و اندازه‌ی فونت (با ضریب --fit) تا جایی که لازم است کم می‌شود.
    اگر همه چیز از اول درست باشد، هیچ تغییری اعمال نمی‌شود (ظاهر اصلی حفظ می‌شود).
  */
  function fitStageText(st) {
    const cav = st.cavity;
    if (!cav || !st.metrics) return;
    const crest = cav.querySelector('.semicircle-dome-crest');
    const items = [st.textA, st.textB].filter(Boolean);

    withNeutral(st, function () {
      cav.style.padding = '';
      items.forEach(function (it) {
        it.style.setProperty('--fit', '1');
      });

      const cr = cav.getBoundingClientRect();
      const Wc = cr.width;
      const Hc = cr.height;
      const cx = Wc / 2;
      const M = st.metrics;

      let poly;
      if (st.variant === 'arch') {
        poly = Geom.shapeOutline('arch', Wc, Hc);
      } else {
        poly = M.outline.map(function (p) {
          return { x: (p.x / M.arch.w) * Wc, y: (p.y / M.arch.h) * Hc };
        });
      }
      const hwFn = buildHalfWidthFn(poly, Wc, Hc);

      function isOverflowing() {
        return items.some(function (it) {
          return it.scrollHeight - it.clientHeight > 1;
        });
      }

      function isClipped() {
        const all = [];
        if (crest) {
          const r = crest.getBoundingClientRect();
          all.push({ l: r.left, r: r.right, t: r.top, b: r.bottom, inset: 0 });
        }
        items.forEach(function (it) {
          collectLineRects(it).forEach(function (r) {
            all.push({ l: r.left, r: r.right, t: r.top, b: r.bottom, inset: 3 });
          });
        });
        return all.some(function (r) {
          const l = r.l - cr.left;
          const rt = r.r - cr.left;
          const t = r.t - cr.top + r.inset;
          const b = r.b - cr.top - r.inset;
          const need = Math.max(Math.abs(l - cx), Math.abs(rt - cx)) - 1;
          return hwFn(t + 0.5) < need || hwFn((t + b) / 2) < need || hwFn(b - 0.5) < need;
        });
      }

      if (!isOverflowing() && !isClipped()) return;

      const crestH = crest ? crest.offsetHeight : 0;
      const crestW = crest ? crest.offsetWidth : 0;
      const gap = crest ? parseFloat(window.getComputedStyle(crest).marginBottom) || 6 : 0;
      const EDGE = 6;

      function crestFits(yTop) {
        if (!crest) return true;
        const y0 = yTop - gap - crestH;
        if (y0 < EDGE) return false;
        for (let y = y0; y <= yTop - gap; y += 2) {
          if (hwFn(y) < crestW / 2 + SAFE) return false;
        }
        return true;
      }

      function solve(hwLimit) {
        let best = null;
        const hwStart = Math.min(hwLimit, cx - EDGE);
        for (let k = 0; k <= 30; k++) {
          const hw = hwStart * (1 - k * 0.02);
          if (hw < 40) break;
          let bestRun = null;
          let runStart = -1;
          for (let y = EDGE; y <= Hc - EDGE; y++) {
            const ok = hwFn(y) >= hw + SAFE;
            if (ok && runStart < 0) runStart = y;
            if ((!ok || y === Math.floor(Hc - EDGE)) && runStart >= 0) {
              const runEnd = ok ? y : y - 1;
              if (!bestRun || runEnd - runStart > bestRun.e - bestRun.s) bestRun = { s: runStart, e: runEnd };
              runStart = -1;
            }
          }
          if (!bestRun) continue;
          let y1 = bestRun.s;
          const y2 = bestRun.e;
          while (y1 < y2 - 40 && !crestFits(y1)) y1++;
          if (!crestFits(y1)) continue;
          const area = 2 * hw * (y2 - y1);
          if (!best || area > best.area) best = { hw: hw, y1: y1, y2: y2, area: area };
        }
        return best;
      }

      function applyRect(b) {
        const top = b.y1 - gap - crestH;
        cav.style.padding = `${top.toFixed(1)}px ${(Wc - cx - b.hw).toFixed(1)}px ${(Hc - b.y2).toFixed(1)}px ${(cx - b.hw).toFixed(1)}px`;
      }

      function fitFonts() {
        items.forEach(function (it) {
          function fits(s) {
            it.style.setProperty('--fit', s.toFixed(3));
            return it.scrollHeight - it.clientHeight <= 1;
          }
          if (fits(1)) return;
          if (!fits(FIT_MIN)) {
            it.style.setProperty('--fit', FIT_MIN.toFixed(3));
            return;
          }
          let lo = FIT_MIN;
          let hi = 1;
          for (let i = 0; i < 9; i++) {
            const mid = (lo + hi) / 2;
            if (fits(mid)) lo = mid;
            else hi = mid;
          }
          it.style.setProperty('--fit', lo.toFixed(3));
        });
      }

      let limit = cx - EDGE;
      for (let attempt = 0; attempt < 8; attempt++) {
        const best = solve(limit);
        if (!best) break;
        applyRect(best);
        fitFonts();
        if (!isClipped()) break;
        limit = best.hw * 0.96;
      }
    });
  }

  function roundedRectLoop(box, pad) {
    const w = box.w + pad * 2;
    const h = box.h + pad * 2;
    const rr = Math.min(box.r + pad, w / 2, h / 2);
    const local = Geom.resampleClosed(Geom.roundedRectOutline(w, h, rr, rr), 3.4);
    return local.map(function (p) {
      return { x: p.x + box.x - pad, y: p.y + box.y - pad };
    });
  }

  /*
    خط طلایی هر بخش:
    - اسکرول اول: ورود از بالای صفحه و یک دور کامل دقیقاً دور محیط (آفست‌شده‌ی) شکل
    - اسکرول دوم: برای هر عکس یک خط طلایی جدا (ابتدا نامرئی) که دور محیط همان عکس می‌پیچد؛ عکس‌ها به هم و به شکل وصل نمی‌شوند.
      خط آخرین عکس، مثل قبل، به نقطه‌ی شروع بخش بعدی می‌رسد.
  */
  function buildStagePerimeterGeometry(st) {
    if (!st.svgEl || !st.metrics || !stageCanvas) return;

    const size = getCanvasSize();
    const winW = size.w;
    const winH = size.h;
    st.svgEl.setAttribute('viewBox', `0 0 ${winW} ${winH}`);

    const M = st.metrics;

    // الف) خط دور شکل
    const shapeLocal = Geom.resampleClosed(Geom.offsetClosed(Geom.resampleClosed(M.outline, 1.5), PAD), 3.4);
    const shapeLoop = shapeLocal.map(function (p) {
      return { x: p.x + M.arch.x, y: p.y + M.arch.y };
    });
    const crown = shapeLoop[0];

    const sl = st.shapeLine;
    const col = createPointCollector(sl.pts, sl.cum);
    col.addLine({ x: crown.x, y: 0 }, crown, 18);
    for (let i = 0; i < shapeLoop.length; i++) col.appendPoint(shapeLoop[i]);
    col.appendPoint(crown);
    st.archLoopEndLen = col.getLength();
    commitLine(sl);

    // ب) حلقه‌ی هر عکس
    const photoLoops = M.photos.map(function (b) {
      return roundedRectLoop(b, PAD);
    });

    const nextStartX = st.index < STAGE_COUNT - 1 ? crown.x : winW / 2;
    const maxBottom = Math.max.apply(null, M.photos.map(function (b) { return b.y + b.h; }));
    const nextStartTopY = Math.max(winH * 0.865, maxBottom + PAD + 24);

    // عکسی که به نقطه‌ی شروع بخش بعد نزدیک‌تر است آخر کشیده می‌شود
    let lastIdx = 0;
    let lastExitIdx = 0;
    let bestD = Infinity;
    photoLoops.forEach(function (lp, i) {
      lp.forEach(function (pt, j) {
        const d = Math.hypot(pt.x - nextStartX, pt.y - nextStartTopY);
        if (d < bestD) {
          bestD = d;
          lastIdx = i;
          lastExitIdx = j;
        }
      });
    });
    const order = [0, 1, 2].filter(function (i) { return i !== lastIdx; }).concat([lastIdx]);

    let totalAll = 0;
    const lens = [];
    order.forEach(function (pIdx, rank) {
      const line = st.photoLines[rank];
      if (!line) return;
      const lp = photoLoops[pIdx];
      const c = createPointCollector(line.pts, line.cum);
      for (let i = 0; i < lp.length; i++) c.appendPoint(lp[i]);
      c.appendPoint(lp[0]);

      if (pIdx === lastIdx) {
        const n = lp.length;
        const fwd = lastExitIdx;
        const bwd = n - lastExitIdx;
        if (fwd <= bwd) {
          for (let s = 1; s <= fwd; s++) c.appendPoint(lp[s % n]);
        } else {
          for (let s = 1; s <= bwd; s++) c.appendPoint(lp[(n - s) % n]);
        }
        const exitPt = lp[lastExitIdx];
        c.addCubicBezier(
          exitPt,
          { x: exitPt.x, y: exitPt.y + (nextStartTopY - exitPt.y) * 0.5 },
          { x: nextStartX, y: exitPt.y + (nextStartTopY - exitPt.y) * 0.45 },
          { x: nextStartX, y: nextStartTopY - 10 },
          26
        );
        c.addLine({ x: nextStartX, y: nextStartTopY - 10 }, { x: nextStartX, y: nextStartTopY }, 8);
      }
      commitLine(line);
      lens.push(line.total);
      totalAll += line.total;
    });

    // پنجره‌ی زمانی کشیدن هر خط در اسکرول دوم (با کمی هم‌پوشانی)
    st.photoWins = [];
    let acc = 0;
    const OV = 0.05;
    order.forEach(function (pIdx, rank) {
      const line = st.photoLines[rank];
      if (!line) return;
      const s0 = acc / (totalAll || 1);
      acc += lens[rank];
      const e0 = acc / (totalAll || 1);
      st.photoWins.push({
        line: line,
        s: rank === 0 ? 0 : clamp(s0 - OV, 0, 1),
        e: rank === order.length - 1 ? 1 : clamp(e0 + OV, 0, 1)
      });
    });
  }

  let geometryReady = false;

  function buildBoardPerimeterGeometry() {
    if (!boardDirectorsScene || !boardPerimeterSvg || boardCircleEls.length < 3 || !stageCanvas) return;
    const size = getCanvasSize();
    const winW = size.w;
    const winH = size.h;
    boardPerimeterSvg.setAttribute('viewBox', `0 0 ${winW} ${winH}`);

    const savedVis = boardDirectorsScene.style.visibility;
    const savedTr = boardDirectorsScene.style.transform;
    const savedCircleTrs = boardCircleEls.map(function (el) { return el.style.transform; });

    boardDirectorsScene.style.visibility = 'visible';
    boardDirectorsScene.style.transform = 'none';
    boardCircleEls.forEach(function (el) { el.style.transform = 'none'; });

    try {
      boardCircleEls.forEach(function (el, idx) {
        const line = boardCircleLines[idx];
        if (!line) return;
        const box = boxRelativeToCanvas(el);
        const cx = box.x + box.w / 2;
        const cy = box.y + box.h / 2;
        const r = Math.min(box.w, box.h) / 2 + PAD;
        const col = createPointCollector(line.pts, line.cum);
        const steps = 180;
        for (let s = 0; s <= steps; s++) {
          const ang = -Math.PI / 2 + (s / steps) * (Math.PI * 2);
          col.appendPoint({
            x: cx + r * Math.cos(ang),
            y: cy + r * Math.sin(ang)
          });
        }
        commitLine(line);
      });
    } finally {
      boardDirectorsScene.style.visibility = savedVis;
      boardDirectorsScene.style.transform = savedTr;
      boardCircleEls.forEach(function (el, idx) { el.style.transform = savedCircleTrs[idx]; });
    }
  }

  function resizePortalCanvas() {
    if (!cameraPortalCanvas) return;
    const size = getCanvasSize();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    cameraPortalCanvas.width = Math.round(size.w * dpr);
    cameraPortalCanvas.height = Math.round(size.h * dpr);
    cameraPortalCanvas.__dpr = dpr;
  }

  function buildAllGeometries() {
    refreshCanvasSize();
    resizePortalCanvas();
    buildHeroWaveGeometry();
    stages.forEach(function (st) {
      measureStage(st);
      applyShapeClip(st);
      fitStageText(st);
      buildStagePerimeterGeometry(st);
      // پیش‌محاسبه ۷۲ نقطه نرمال‌شده شکل برای رندر فوق‌سریع در Canvas هنگام کلیک روی شکل
      if (st.metrics && st.metrics.outline) {
        const aw = st.metrics.arch.w || 1;
        const ah = st.metrics.arch.h || 1;
        st.normOutline = st.metrics.outline.map(function (pt) {
          return { x: pt.x / aw - 0.5, y: pt.y / ah - 0.5 };
        });
      }
    });
    buildBoardPerimeterGeometry();
    geometryReady = true;
  }

  // طیف رنگی یکپارچه تمامی شکل‌ها بین #185A59 و #0E939D مطابق درخواست کاربر
  const STAGE_SPECTRUMS = [
    [
      { r: 24, g: 90,  b: 89,  textR: 239, textG: 233, textB: 223 }, // #185A59
      { r: 21, g: 109, b: 112, textR: 239, textG: 233, textB: 223 }, // طیف میانی ۱ (#156D70)
      { r: 17, g: 128, b: 135, textR: 239, textG: 233, textB: 223 }, // طیف میانی ۲ (#118087)
      { r: 14, g: 147, b: 157, textR: 239, textG: 233, textB: 223 }  // #0E939D
    ],
    [
      { r: 24, g: 90,  b: 89,  textR: 239, textG: 233, textB: 223 }, // #185A59
      { r: 20, g: 112, b: 115, textR: 239, textG: 233, textB: 223 },
      { r: 16, g: 131, b: 138, textR: 239, textG: 233, textB: 223 },
      { r: 14, g: 147, b: 157, textR: 239, textG: 233, textB: 223 }  // #0E939D
    ],
    [
      { r: 24, g: 90,  b: 89,  textR: 239, textG: 233, textB: 223 }, // #185A59
      { r: 21, g: 109, b: 112, textR: 239, textG: 233, textB: 223 },
      { r: 17, g: 128, b: 135, textR: 239, textG: 233, textB: 223 },
      { r: 14, g: 147, b: 157, textR: 239, textG: 233, textB: 223 }  // #0E939D
    ],
    [
      { r: 24, g: 90,  b: 89,  textR: 239, textG: 233, textB: 223 }, // #185A59
      { r: 20, g: 112, b: 115, textR: 239, textG: 233, textB: 223 },
      { r: 16, g: 131, b: 138, textR: 239, textG: 233, textB: 223 },
      { r: 14, g: 147, b: 157, textR: 239, textG: 233, textB: 223 }  // #0E939D
    ]
  ];

  function interpolateSpectrumStop(stopA, stopB, t) {
    const p = smoothstep(0, 1, t);
    const r = Math.round(stopA.r + (stopB.r - stopA.r) * p);
    const g = Math.round(stopA.g + (stopB.g - stopA.g) * p);
    const b = Math.round(stopA.b + (stopB.b - stopA.b) * p);

    const tr = Math.round(stopA.textR + (stopB.textR - stopA.textR) * p);
    const tg = Math.round(stopA.textG + (stopB.textG - stopA.textG) * p);
    const tb = Math.round(stopA.textB + (stopB.textB - stopA.textB) * p);

    return {
      bg: `rgb(${r}, ${g}, ${b})`,
      text: `rgb(${tr}, ${tg}, ${tb})`
    };
  }

  /**
   * رندر یک بخش (Stage k) با مارجین امن در پایین صفحه و بدون هیچ پرش یا چشمک سفید
   */
  function renderSingleStage(st, pos, winH) {
    const k = st.index;
    const stepA = 2 + 2 * k; // 2, 4, 6, 8
    const stepB = 3 + 2 * k; // 3, 5, 7, 9
    const palette = STAGE_SPECTRUMS[k] || STAGE_SPECTRUMS[0];

    const earliestVisiblePos = k === 0 ? 1.12 : stepA - 1.82;
    const latestVisiblePos = stepB + 0.96;

    if (pos < earliestVisiblePos || pos > latestVisiblePos) {
      setS(st.sceneEl, 'visibility', 'hidden');
      setS(st.sceneEl, 'opacity', '0');
      setS(st.sceneEl, 'transform', `translate3d(0, ${(winH + 120).toFixed(1)}px, 0)`);
      renderGold(st.shapeLine, 0);
      st.photoLines.forEach(function (l) {
        renderGold(l, 0);
      });
      return;
    }

    setS(st.sceneEl, 'visibility', 'visible');

    const peekY = winH * 0.785;
    const activeLiftY = -winH * 0.035;
    const exitUpY = -winH * 1.08;

    let sceneY = 0;
    let sceneOpacity = 1;

    if (k === 0) {
      if (pos <= stepA) {
        sceneY = 0;
      } else if (pos <= stepB) {
        const pLift = smoothstep(stepA + 0.15, stepB - 0.1, pos);
        sceneY = pLift * activeLiftY;
      } else {
        const pExit = smoothstep(stepB, stepB + 0.78, pos);
        sceneY = activeLiftY + (exitUpY - activeLiftY) * pExit;
        sceneOpacity = 1 - smoothstep(stepB + 0.45, stepB + 0.82, pos);
      }
    } else {
      if (pos < stepA - 1.0) {
        const pPeek = smoothstep(stepA - 1.78, stepA - 1.08, pos);
        sceneY = winH + 60 + (peekY - (winH + 60)) * pPeek;
      } else if (pos <= stepA) {
        const pPromote = smoothstep(stepA - 1.0, stepA - 0.18, pos);
        sceneY = peekY * (1 - pPromote);
      } else if (pos <= stepB) {
        const pLift = smoothstep(stepA + 0.15, stepB - 0.1, pos);
        sceneY = pLift * activeLiftY;
      } else {
        const pExit = smoothstep(stepB, stepB + 0.78, pos);
        sceneY = activeLiftY + (exitUpY - activeLiftY) * pExit;
        sceneOpacity = 1 - smoothstep(stepB + 0.45, stepB + 0.82, pos);
      }
    }

    setS(st.sceneEl, 'opacity', sceneOpacity.toFixed(3));
    setS(st.sceneEl, 'transform', `translate3d(0, ${sceneY.toFixed(1)}px, 0)`);

    let entryP = 0;
    if (k === 0) {
      entryP = smoothstep(1.18, 1.66, pos);
    } else {
      const peekPresence = smoothstep(stepA - 1.75, stepA - 1.12, pos) * 0.44;
      const fullPresence = smoothstep(stepA - 0.90, stepA - 0.20, pos) * 0.56;
      entryP = clamp(peekPresence + fullPresence, 0, 1);
    }

    const moldP = smoothstep(0.0, 0.38, entryP);
    const stretchX = 0.94 + 0.06 * moldP;
    const stretchY = 0.88 + 0.12 * moldP;
    setS(st.moldEl, 'opacity', moldP.toFixed(3));
    setS(st.moldEl, 'transform', `scale(${stretchX.toFixed(3)}, ${stretchY.toFixed(3)})`);

    if (st.headerEl) {
      const headerAlpha = k === 0 ? moldP : smoothstep(stepA - 0.72, stepA - 0.22, pos);
      setS(st.headerEl, 'opacity', headerAlpha.toFixed(3));
    }

    const inwardP = smoothstep(0.18, 0.72, entryP);
    if (st.wall1 && st.wall2 && st.wall3) {
      setS(st.wall1, 'opacity', clamp(inwardP * 1.4, 0, 1).toFixed(3));
      setS(st.wall2, 'opacity', clamp((inwardP - 0.12) * 1.4, 0, 1).toFixed(3));
      setS(st.wall3, 'opacity', clamp((inwardP - 0.24) * 1.4, 0, 1).toFixed(3));
    }

    const innerP = smoothstep(0.35, 0.92, entryP);
    if (st.cavity) {
      setS(st.cavity, 'opacity', innerP.toFixed(3));
      const cScale = 0.96 + 0.04 * innerP;
      setS(st.cavity, 'transform', `scale(${cScale.toFixed(3)})`);
    }

    const photosEntryP = k === 0 ? entryP : smoothstep(stepA - 0.78, stepA - 0.18, pos);
    st.slots.forEach(function (slot, idx) {
      const stagger = idx * 0.07;
      const cardP = smoothstep(0.15 + stagger, 0.85 + stagger * 0.15, photosEntryP);
      const slideY = (1 - cardP) * 14;
      setS(slot, 'opacity', cardP.toFixed(3));
      setS(slot, 'transform', `translate3d(0, ${slideY.toFixed(1)}px, 0)`);
    });

    const step2Local = clamp(pos - stepA, 0, 1);
    let spectrumColor;
    if (pos <= stepA) {
      spectrumColor = interpolateSpectrumStop(palette[0], palette[0], 0);
    } else if (step2Local <= 0.333) {
      spectrumColor = interpolateSpectrumStop(palette[0], palette[1], step2Local / 0.333);
    } else if (step2Local <= 0.666) {
      spectrumColor = interpolateSpectrumStop(palette[1], palette[2], (step2Local - 0.333) / 0.333);
    } else {
      spectrumColor = interpolateSpectrumStop(palette[2], palette[3], (step2Local - 0.666) / 0.334);
    }

    st.currentBgColor = spectrumColor.bg;
    setS(st.fill, 'backgroundColor', spectrumColor.bg);

    const textSwapP = smoothstep(0.10, 0.46, step2Local);
    if (st.textA) {
      setS(st.textA, 'color', spectrumColor.text);
      setS(st.textA, 'opacity', (1 - textSwapP).toFixed(3));
      setS(st.textA, 'transform', `translate3d(0, ${(-textSwapP * 10).toFixed(1)}px, 0)`);
      setS(st.textA, 'pointerEvents', textSwapP < 0.5 ? 'auto' : 'none');
    }
    if (st.textB) {
      setS(st.textB, 'color', spectrumColor.text);
      setS(st.textB, 'opacity', textSwapP.toFixed(3));
      setS(st.textB, 'transform', `translate3d(0, ${((1 - textSwapP) * 10).toFixed(1)}px, 0)`);
      setS(st.textB, 'pointerEvents', textSwapP >= 0.5 ? 'auto' : 'none');
    }

    st.reels.forEach(function (reel, idx) {
      const stagger = idx * 0.08;
      const reelP = smoothstep(0.10 + stagger, 0.74 + stagger, step2Local);
      setS(reel, 'transform', `translate3d(0, ${(-reelP * 50).toFixed(2)}%, 0)`);
    });

    // اسکرول اول: یک دور کامل دور شکل
    let shapeLen;
    if (pos <= stepA) {
      shapeLen = smoothstep(stepA - 0.46, stepA - 0.02, pos) * st.archLoopEndLen;
    } else {
      shapeLen = st.archLoopEndLen;
    }
    renderGold(st.shapeLine, shapeLen);

    // اسکرول دوم: خط‌های جدید و جداگانه‌ی دور عکس‌ها
    const photosDrawP = pos <= stepA ? 0 : smoothstep(stepA + 0.04, stepB - 0.05, pos);
    st.photoWins.forEach(function (w) {
      const p = clamp((photosDrawP - w.s) / (w.e - w.s || 1), 0, 1);
      renderGold(w.line, p * w.line.total);
    });
  }

  let lastNavStep = null;
  let lastNavGroup = null;
  function updateNavbarState(pos) {
    const roundedStep = Math.round(pos);
    if (navStepBadge && roundedStep !== lastNavStep) {
      lastNavStep = roundedStep;
      const numStr = String(roundedStep + 1).padStart(2, '0');
      navStepBadge.textContent = `STEP ${numStr} / 11`;
    }

    let activeGroup = 'hero';
    if (pos >= 9.5) {
      activeGroup = 'footer';
    } else if (pos >= 7.5) {
      activeGroup = 'stage3';
    } else if (pos >= 5.5) {
      activeGroup = 'stage2';
    } else if (pos >= 3.5) {
      activeGroup = 'stage1';
    } else if (pos >= 1.5) {
      activeGroup = 'stage0';
    }

    if (activeGroup === lastNavGroup) return;
    lastNavGroup = activeGroup;
    navButtons.forEach(function (btn) {
      if (btn.getAttribute('data-nav-group') === activeGroup) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function clearStageStyleCache() {
    stages.forEach(function (st) {
      [st.sceneEl, st.moldEl, st.archEl, st.headerEl, st.wall1, st.wall2, st.wall3, st.cavity, st.fill, st.textA, st.textB].forEach(function (el) {
        if (el && el.__c) el.__c = {};
      });
      if (st.slots) {
        st.slots.forEach(function (s) { if (s && s.__c) s.__c = {}; });
      }
    });
  }

  function renderSceneAt(pos, force) {
    if (force) clearStageStyleCache();
    if (!force && pos === lastRenderedPos) return;
    lastRenderedPos = pos;

    const size = getCanvasSize();
    const winH = size.h;

    updateNavbarState(pos);

    let cameraY = 0;
    let waveLen = 0;

    if (pos <= 1.0) {
      const camP = smoothstep(0.0, 0.38, pos);
      cameraY = camP * (winH * 0.86);

      const lineP = smoothstep(0.22, 1.0, pos);
      waveLen = lineP * waveTotalLen;
    } else {
      const exitT = clamp(pos - 1.0, 0, 1);
      const camShiftP = smoothstep(0.0, 0.28, exitT);
      cameraY = winH * (0.86 + camShiftP * 0.95);
      waveLen = waveTotalLen;
    }

    if (world) {
      setS(world, 'transform', `translate3d(0, ${(-cameraY).toFixed(1)}px, 0)`);
    }

    if (heroStartSeed) {
      const seedFade = clamp(1 - pos * 3.5, 0, 1);
      setS(heroStartSeed, 'opacity', seedFade.toFixed(3));
    }

    let sidePhotosP = 0;
    if (pos <= 1.0) {
      sidePhotosP = smoothstep(0.18, 0.88, pos);
    } else {
      sidePhotosP = 1 - smoothstep(1.02, 1.48, pos);
    }
    if (secondScrollPhotoRight) {
      const slideY = (1 - sidePhotosP) * 18;
      setS(secondScrollPhotoRight, 'opacity', sidePhotosP.toFixed(3));
      setS(secondScrollPhotoRight, 'transform', `translate3d(0, ${slideY.toFixed(1)}px, 0)`);
    }
    if (secondScrollPhotoLeft) {
      const slideY = (1 - sidePhotosP) * 18;
      setS(secondScrollPhotoLeft, 'opacity', sidePhotosP.toFixed(3));
      setS(secondScrollPhotoLeft, 'transform', `translate3d(0, ${slideY.toFixed(1)}px, 0)`);
    }

    renderGold(heroLine, waveLen);

    stages.forEach(function (st) {
      renderSingleStage(st, pos, winH);
    });

    if (boardDirectorsScene) {
      if (pos < 8.15) {
        setS(boardDirectorsScene, 'visibility', 'hidden');
        setS(boardDirectorsScene, 'opacity', '0');
        setS(boardDirectorsScene, 'transform', `translate3d(0, ${(winH + 100).toFixed(1)}px, 0)`);
        boardCircleLines.forEach(function (l) { renderGold(l, 0); });
      } else {
        setS(boardDirectorsScene, 'visibility', 'visible');
        const peekY = winH * 0.79;
        let boardY = 0;
        let entryP = 0;
        if (pos <= 9.0) {
          const pPeek = smoothstep(8.22, 8.90, pos);
          boardY = winH + 50 + (peekY - (winH + 50)) * pPeek;
          entryP = pPeek * 0.42;
        } else {
          const pFull = smoothstep(9.0, 9.76, pos);
          boardY = peekY * (1 - pFull);
          entryP = 0.42 + pFull * 0.58;
        }
        setS(boardDirectorsScene, 'opacity', '1');
        setS(boardDirectorsScene, 'transform', `translate3d(0, ${boardY.toFixed(1)}px, 0)`);

        boardCirclesMeta.forEach(function (cm, idx) {
          const stagger = idx * 0.07;
          const cP = smoothstep(0.1 + stagger, 0.85 + stagger * 0.1, entryP);
          setS(cm.el, 'opacity', cP.toFixed(3));
          setS(cm.el, 'transform', `scale3d(${(0.9 + 0.1 * cP).toFixed(3)}, ${(0.9 + 0.1 * cP).toFixed(3)}, 1)`);
        });

        const drawCirclesP = pos <= 9.0 ? 0 : smoothstep(9.16, 9.95, pos);
        boardCircleLines.forEach(function (line, idx) {
          const s = idx * 0.1;
          const e = 0.78 + idx * 0.11;
          const p = clamp((drawCirclesP - s) / (e - s || 1), 0, 1);
          renderGold(line, p * line.total);
        });

        if (boardFinalSlogan) {
          const sloganP = pos <= 9.0 ? 0 : smoothstep(9.30, 9.95, pos);
          setS(boardFinalSlogan, 'opacity', sloganP.toFixed(3));
          setS(boardFinalSlogan, 'transform', `translate3d(0, ${((1 - sloganP) * 14).toFixed(1)}px, 0)`);
        }
      }
    }

    if (siteFooter) {
      if (pos <= 9.05) {
        setS(siteFooter, 'pointerEvents', 'none');
        setS(siteFooter, 'transform', 'translate3d(0, 105%, 0)');
      } else {
        setS(siteFooter, 'pointerEvents', 'auto');
        const pFooterFull = smoothstep(9.10, 9.90, pos);
        const fullPercent = 105 * (1 - pFooterFull);
        setS(siteFooter, 'transform', `translate3d(0, ${fullPercent.toFixed(1)}%, 0)`);
      }
    }
  }

  /* ====================================================================
     موتور اسکرول چسبان: هر حرکت = یک گام کامل، اما با انیمیشن نرم (شتاب و ترمز) و
     بدون پرش؛ تغییر جهت و گام بعدی با حفظ سرعت انجام می‌شود.
     ==================================================================== */
  function startTween(to) {
    const now = performance.now();
    const dist = Math.abs(to - currentPos);
    tween = {
      from: currentPos,
      to: to,
      v0: velocity,
      t0: now,
      dur: clamp(STEP_DURATION_MS * dist, 520, STEP_DURATION_MS * 1.1)
    };
    animDirection = to > currentPos ? 1 : -1;
    startLoopIfNeeded();
  }

  function finishTween(now) {
    currentPos = tween.to;
    targetStep = tween.to;
    tween = null;
    velocity = 0;
    animDirection = 0;
    settleLockUntil = now + 60;
    renderSceneAt(currentPos);
    rafId = null;
  }

  function tickAnimation(now) {
    if (navQuickJump) {
      const elapsed = now - navQuickJump.startTime;
      const t = clamp(elapsed / navQuickJump.duration, 0, 1);

      if (t < 0.45) {
        const pOut = smoothstep(0, 0.45, t);
        if (stageCanvas) {
          stageCanvas.style.transform = `translate3d(0, ${(-pOut * 42).toFixed(1)}px, 0)`;
        }
      } else {
        if (!navQuickJump.switched) {
          navQuickJump.switched = true;
          currentPos = navQuickJump.target;
          targetStep = navQuickJump.target;
          tween = null;
          velocity = 0;
          renderSceneAt(currentPos);
        }
        const pIn = smoothstep(0.45, 1.0, t);
        if (stageCanvas) {
          const slideUpY = (1 - pIn) * 42;
          stageCanvas.style.transform = `translate3d(0, ${slideUpY.toFixed(1)}px, 0)`;
        }
      }

      if (t >= 1.0) {
        if (stageCanvas) {
          stageCanvas.style.transform = 'translate3d(0, 0, 0)';
        }
        currentPos = navQuickJump.target;
        targetStep = navQuickJump.target;
        navQuickJump = null;
        tween = null;
        velocity = 0;
        animDirection = 0;
        rafId = null;
        settleLockUntil = now + 120;
        renderSceneAt(currentPos);
        return;
      }

      rafId = requestAnimationFrame(tickAnimation);
      return;
    }

    if (!tween) {
      rafId = null;
      return;
    }

    const s = clamp((now - tween.t0) / tween.dur, 0, 1);
    if (s >= 1) {
      finishTween(now);
      return;
    }

    // درونیابی هرمیت: شروع با سرعت فعلی، توقف نرم در مقصد
    const s2 = s * s;
    const s3 = s2 * s;
    const d = tween.dur;
    const pos =
      (2 * s3 - 3 * s2 + 1) * tween.from +
      (s3 - 2 * s2 + s) * d * tween.v0 +
      (-2 * s3 + 3 * s2) * tween.to;
    velocity =
      ((6 * s2 - 6 * s) * tween.from +
        (3 * s2 - 4 * s + 1) * d * tween.v0 +
        (-6 * s2 + 6 * s) * tween.to) /
      d;

    currentPos = clamp(pos, 0, MAX_STEP);
    animDirection = tween.to >= currentPos ? (tween.to > tween.from ? 1 : -1) : -1;
    renderSceneAt(currentPos);
    rafId = requestAnimationFrame(tickAnimation);
  }

  function startLoopIfNeeded() {
    if (!rafId) {
      rafId = requestAnimationFrame(tickAnimation);
    }
  }

  function jumpToStepFastUpward(stepNumber) {
    if (interiorOpen) closeShapeInterior();
    if (lightboxOpen) closePhotoLightbox();
    const clampedTarget = clamp(stepNumber, 0, MAX_STEP);
    if (Math.abs(clampedTarget - currentPos) < 0.05 && !navQuickJump) return;

    navQuickJump = {
      target: clampedTarget,
      startTime: performance.now(),
      duration: 380,
      switched: false
    };
    startLoopIfNeeded();
  }

  function handleScrollCommand(dir) {
    if (interiorOpen || lightboxOpen || cameraDiveAnim || navQuickJump) return;
    const now = performance.now();

    if (!tween) {
      if (now < settleLockUntil) return;
      const to = clamp(targetStep + dir, 0, MAX_STEP);
      if (to === targetStep) return;
      targetStep = to;
      startTween(to);
      return;
    }

    if (dir === animDirection) {
      // حرکت تازه در همان جهت: وقتی گام فعلی کم‌وبیش تمام شده، گام بعدی بدون توقف زنجیره می‌شود
      if (Math.abs(tween.to - currentPos) <= 0.85) {
        const to = clamp(tween.to + dir, 0, MAX_STEP);
        if (to !== tween.to) {
          targetStep = to;
          startTween(to);
        }
      }
      return;
    }

    // تغییر جهت در میانه‌ی حرکت: برگشت نرم به نزدیک‌ترین گام
    const to = dir > 0 ? Math.ceil(currentPos - 1e-6) : Math.floor(currentPos + 1e-6);
    targetStep = clamp(to, 0, MAX_STEP);
    startTween(targetStep);
  }

  /* ====================================================================
     موتور سخت‌افزاری ۶۰ فریم بر ثانیه (2D Canvas) برای انیمیشن ورود و خروج معکوس دوربین
     به داخل شکل‌ها (بهینه برای تمام دیوایس‌های ضعیف و موبایل بدون افت فریم)
     ==================================================================== */
  const FULL_STAGE_TEXTS = [
    {
      crest: 'MODESHAHR ACADEMY',
      title: 'بازتعریف خلاقیت در دنیای مد، با قدرت فناوری‌های دیجیتال',
      leadLabel: 'DIGITAL FASHION DESIGN ACADEMY',
      leadHeading: 'تلفیق دانش تخصصی مد، قلم دیجیتال و هوش مصنوعی',
      paragraphs: [
        'طراحی لباس همواره عرصه‌ای برای تجلی خلاقیت، هنر و هویت فردی بوده است؛ اما با تحول فناوری، ابزارها و شیوه‌های خلق آثار در صنعت مد نیز وارد مرحله‌ای تازه شده‌اند. امروزه طراحی دیجیتال و هوش مصنوعی، افق‌های جدیدی را پیش روی طراحان قرار داده‌اند. از ترسیم نخستین ایده‌ها با قلم دیجیتال و خلق اسکیس‌های حرفه‌ای گرفته تا توسعه کلکسیون‌های اختصاصی و تصویرسازی واقع‌گرایانه لباس، ابزارهای دیجیتال امکان تبدیل سریع‌تر و دقیق‌تر ایده‌های ذهنی به آثار بصری را فراهم می‌کنند.',
        'در Modeshahr، طراحی لباس را فراتر از یادگیری تکنیک‌های سنتی می‌دانیم. هدف ما پرورش نسلی از طراحان است که ضمن تسلط بر اصول بنیادین طراحی لباس، بتوانند از فناوری به‌عنوان ابزاری برای توسعه خلاقیت، ارتقای کیفیت آثار و حضور مؤثر در صنعت مد دیجیتال استفاده کنند.'
      ],
      cards: [
        {
          badge: 'OUR MISSION',
          title: 'مأموریت ما',
          text: 'توسعه مهارت‌های نسل جدید طراحان لباس از طریق آموزش اصول تخصصی طراحی مد، ترسیم و تصویرسازی دیجیتال با قلم نوری و استفاده از فناوری‌های هوش مصنوعی؛ با هدف تبدیل ایده‌های خلاقانه به طرح‌هایی حرفه‌ای، دقیق و قابل ارائه در صنعت مد امروز.'
        },
        {
          badge: 'OUR VISION',
          title: 'چشم‌انداز ما',
          text: 'ایجاد بستری پیشرو برای آموزش و توسعه طراحی لباس دیجیتال، با تمرکز بر پیوند میان هنر، فناوری و نوآوری؛ بستری که در آن طراحان بتوانند استعدادهای خود را گسترش دهند، سبک شخصی خود را شکل دهند و با استانداردهای حرفه‌ای صنعت مد جهانی همگام شوند.'
        }
      ]
    },
    {
      crest: 'DIGITAL ADVANTAGE',
      title: 'چرا طراحی لباس دیجیتال؟',
      leadLabel: 'THE POWER OF DIGITAL FASHION',
      leadHeading: 'رویکردی نوین برای توسعه فرآیند طراحی و گسترش امکانات خلاقانه',
      paragraphs: [
        'طراحی دیجیتال صرفاً جایگزینی برای کاغذ و مداد نیست؛ بلکه رویکردی نوین برای توسعه فرآیند طراحی، افزایش دقت و گسترش امکانات خلاقانه است.'
      ],
      cards: [
        {
          badge: '01 • CREATIVE FREEDOM',
          title: '۱. آزادی در خلق و توسعه ایده‌ها',
          text: 'با استفاده از قلم دیجیتال، طراح می‌تواند ایده‌های ذهنی خود را با آزادی بیشتری ترسیم، اصلاح و توسعه دهد. امکان تغییر خطوط، رنگ‌ها، تناسبات و جزئیات در هر مرحله، فرآیند طراحی را منعطف‌تر و پویاتر می‌کند.'
        },
        {
          badge: '02 • PRECISION DESIGN',
          title: '۲. دقت و کنترل در جزئیات طراحی',
          text: 'ابزارهای دیجیتال امکان کنترل دقیق خطوط، بافت‌ها، سایه‌پردازی و جزئیات لباس را فراهم می‌کنند. این قابلیت به طراح کمک می‌کند تا طرح‌هایی منسجم‌تر و با کیفیت بصری بالاتر خلق کند.'
        },
        {
          badge: '03 • COLLECTION SPEED',
          title: '۳. توسعه سریع‌تر کلکسیون‌های طراحی',
          text: 'با استفاده از ابزارهای دیجیتال، می‌توان ایده‌های اولیه را در قالب اتودهای متعدد توسعه داد، ترکیب‌های رنگی مختلف را بررسی کرد و مجموعه‌ای هماهنگ از طرح‌ها را با سرعت بیشتری به مرحله ارائه رساند.'
        },
        {
          badge: '04 • STANDARD PORTFOLIO',
          title: '۴. ارائه حرفه‌ای و استاندارد',
          text: 'طراحی دیجیتال امکان آماده‌سازی اسکیس‌ها، شیت‌های فنی، مودبردها و پورتفولیوهای حرفه‌ای را فراهم می‌کند؛ خروجی‌هایی که برای ارائه به دانشگاه‌ها، برندها و فعالان صنعت مد اهمیت زیادی دارند.'
        }
      ]
    },
    {
      crest: 'STYLUS MASTERY',
      title: 'قلم دیجیتال؛ امتداد خلاقیت طراح',
      leadLabel: 'DIGITAL PEN & CREATIVE DESIGN',
      leadHeading: 'پلی میان مهارت‌های دستی و امکانات نامحدود دیجیتال',
      paragraphs: [
        'قلم دیجیتال پلی میان مهارت‌های طراحی دستی و امکانات نامحدود دنیای دیجیتال است. این ابزار به طراح اجازه می‌دهد تا با حفظ آزادی حرکت دست و کنترل هنری خود، از امکانات پیشرفته نرم‌افزارهای طراحی بهره‌مند شود. حساسیت به فشار قلم، تنوع براش‌ها، قابلیت لایه‌بندی و کنترل دقیق خطوط، تجربه‌ای نزدیک به طراحی سنتی را در محیطی دیجیتال فراهم می‌کنند.',
        'در آموزش‌های Modeshahr، استفاده از قلم دیجیتال تنها به ترسیم خطوط محدود نمی‌شود؛ بلکه هنرجو با کاربرد آن در مراحل مختلف طراحی لباس آشنا می‌شود. از طراحی آناتومی و فیگور مد گرفته تا ترسیم سیلوئت، رنگ‌آمیزی، پارچه‌سازی، بافت‌پردازی و اجرای جزئیات لباس، قلم دیجیتال به ابزاری کلیدی برای تبدیل تفکر هنری به خروجی حرفه‌ای تبدیل می‌شود.'
      ],
      bulletsTitle: 'مهارت‌هایی که با قلم دیجیتال توسعه می‌یابند:',
      bullets: [
        'طراحی فیگور و آناتومی در تصویرسازی مد',
        'ترسیم اسکیس و جزئیات تخصصی لباس',
        'رنگ‌شناسی و ساخت پالت‌های رنگی',
        'ایجاد بافت و متریال پارچه',
        'سایه‌پردازی و نورپردازی دیجیتال',
        'اصلاح، توسعه و آماده‌سازی طرح‌های نهایی'
      ]
    },
    {
      crest: 'AI & HUMAN SYNERGY',
      title: 'هوش مصنوعی؛ افق تازه‌ای در طراحی مد',
      leadLabel: 'AI IN FASHION DESIGN',
      leadHeading: 'گسترش ظرفیت خلاقانه و پردازش سریع ایده‌ها',
      paragraphs: [
        'هوش مصنوعی در حال تغییر شیوه ایده‌پردازی، تصویرسازی و توسعه مجموعه‌های طراحی در صنعت مد است. این فناوری با فراهم کردن امکان پردازش سریع ایده‌ها و تولید پیشنهادهای بصری متنوع، ابزار قدرتمندی برای گسترش ظرفیت خلاقانه طراحان محسوب می‌شود.',
        'هوش مصنوعی می‌تواند ایده‌ای را توسعه دهد، قلم دیجیتال می‌تواند خطوط را دقیق‌تر ترسیم کند و نرم‌افزارهای پیشرفته می‌توانند فرآیند طراحی را ساده‌تر سازند؛ اما این طراح است که با شناخت فرم، رنگ، تناسبات و زیبایی‌شناسی، به اثر هویت می‌بخشد.'
      ],
      cards: [
        {
          badge: 'CREATIVE PHILOSOPHY',
          title: 'تعادل میان مهارت انسانی و توانایی فناوری',
          text: 'فلسفه ما بر ایجاد تعادل میان مهارت انسانی و توانایی فناوری استوار است؛ جایی که ابزارهای دیجیتال در خدمت تفکر خلاق قرار می‌گیرند و مسیر خلق آثار منحصربه‌فرد را هموار می‌کنند.'
        },
        {
          badge: 'FUTURE OF FASHION',
          title: 'آینده دنیای مد در Modeshahr',
          text: 'Modeshahr؛ جایی برای پرورش نگاه خلاق، تسلط بر فناوری و ساخت آینده‌ای تازه در دنیای مد.'
        }
      ]
    }
  ];

  function populateShapeInterior(stageIdx) {
    const info = FULL_STAGE_TEXTS[stageIdx] || FULL_STAGE_TEXTS[0];
    const st = stages[stageIdx];
    const bgColor = (st && st.currentBgColor) || '#185A59';

    if (shapeInteriorView) {
      shapeInteriorView.style.setProperty('--shape-interior-bg', bgColor);
    }
    if (interiorCrest) interiorCrest.textContent = info.crest;
    if (interiorMainTitle) interiorMainTitle.textContent = info.title;

    if (!interiorScrollArea) return;
    const preRenderedPanels = Array.from(interiorScrollArea.querySelectorAll('[data-interior-panel]'));
    if (preRenderedPanels.length > 0) {
      preRenderedPanels.forEach(function (panel) {
        const pIdx = parseInt(panel.getAttribute('data-interior-panel'), 10);
        const isMatch = pIdx === stageIdx;
        panel.hidden = !isMatch;
        panel.style.display = isMatch ? 'flex' : 'none';
      });
    } else {
      let html = `<article class="interior-lead-card">`;
      html += `<span class="interior-lead-label">${info.leadLabel}</span>`;
      html += `<h3 class="interior-lead-heading">${info.leadHeading}</h3>`;
      info.paragraphs.forEach(function (p) {
        html += `<p class="interior-paragraph">${p}</p>`;
      });
      html += `</article>`;

      if (info.cards && info.cards.length) {
        html += `<div class="interior-cards-grid">`;
        info.cards.forEach(function (c) {
          html += `<div class="interior-sub-card">`;
          html += `<span class="interior-sub-badge">${c.badge}</span>`;
          html += `<h4 class="interior-sub-title">${c.title}</h4>`;
          html += `<p class="interior-paragraph">${c.text}</p>`;
          html += `</div>`;
        });
        html += `</div>`;
      }

      if (info.bullets && info.bullets.length) {
        html += `<article class="interior-lead-card">`;
        html += `<h4 class="interior-sub-title">${info.bulletsTitle}</h4>`;
        html += `<ul class="interior-Bullet-grid">`;
        info.bullets.forEach(function (b) {
          html += `<li><span>${b}</span></li>`;
        });
        html += `</ul>`;
        html += `</article>`;
      }
      interiorScrollArea.innerHTML = html;
    }

    interiorScrollArea.scrollTop = 0;
    cachedInteriorParts = getInteriorParts();
  }

  function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  function traceNormPolygon(ctx, normPts, cx, cy, w, h) {
    if (!normPts || !normPts.length) return;
    ctx.beginPath();
    for (let i = 0; i < normPts.length; i++) {
      const px = cx + normPts[i].x * w;
      const py = cy + normPts[i].y * h;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function traceHollowRing(ctx, normPts, cxOut, cyOut, wOut, hOut, cxIn, cyIn, wIn, hIn) {
    if (!normPts || !normPts.length) return;
    ctx.beginPath();
    for (let i = 0; i < normPts.length; i++) {
      const px = cxOut + normPts[i].x * wOut;
      const py = cyOut + normPts[i].y * hOut;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    for (let i = 0; i < normPts.length; i++) {
      const px = cxIn + normPts[i].x * wIn;
      const py = cyIn + normPts[i].y * hIn;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  let cachedInteriorParts = null;
  function getInteriorParts() {
    if (!shapeInteriorView) return null;
    const activeIdx = activeInteriorStage >= 0 ? activeInteriorStage : 0;
    const scopeEl = shapeInteriorView.querySelector(`[data-interior-panel="${activeIdx}"]`) || shapeInteriorView;
    return {
      wall1: shapeInteriorView.querySelector('.interior-wall-1'),
      wall2: shapeInteriorView.querySelector('.interior-wall-2'),
      wall3: shapeInteriorView.querySelector('.interior-wall-3'),
      topBar: shapeInteriorView.querySelector('.interior-top-bar'),
      crest: shapeInteriorView.querySelector('.interior-crest-badge'),
      title: shapeInteriorView.querySelector('.interior-main-title'),
      lead: scopeEl.querySelector('.interior-lead-card'),
      subs: Array.from(scopeEl.querySelectorAll('.interior-sub-card, .interior-faq-card')),
      cta: scopeEl.querySelector('.interior-cta-row')
    };
  }

  /*
    انیمیشن سه‌بعدی یکپارچه، تمیز و وفادار به هندسه اصلی شکل (۶۰ فریم بر ثانیه ثابت):
    - بدون هیچ‌گونه دستکاری روی استایل رنگ و متن شکل اصلی در صفحه (رفع کامل باگ ناپدید شدن متن و رنگ شکل پس از بستن)
    - بدون قطعات اضافی یا چندضلعی شدن؛ استفاده از منحنی کامل و نرم خود شکل (st.normOutline با بیش از ۲۰۰ نقطه نرم)
    - گسترش طبیعی دیواره‌های سه‌بعدی پخ‌خورده شکل (مشابه wall-layer-1/2/3 و خط طلایی دور آن) به سمت دوربین و باز شدن نمای داخلی از درون حفره شکل
  */
  function applyCameraDiveProgress(st, rect, p) {
    if (!st) return;
    if (activeInteriorStage !== st.index) {
      activeInteriorStage = st.index;
      populateShapeInterior(st.index);
    }

    const size = getCanvasSize();
    const winW = size.w;
    const winH = size.h;
    const cx0 = rect.left + rect.width / 2;
    const cy0 = rect.top + rect.height / 2;
    const moveEase = smoothstep(0.0, 0.74, p);
    const cx = cx0 + (winW / 2 - cx0) * moveEase;
    const cy = cy0 + (winH / 2 - cy0) * moveEase;

    // ۱. حرکت نرم دوربین روی صحنه به سمت مرکز شکل کلیک‌شده (بدون تغییر opacity یا رنگ خود شکل!)
    if (stageCanvas) {
      if (p > 0.002 && p < 0.85) {
        const pushP = smoothstep(0.0, 0.62, p);
        const camScale = 1 + 0.42 * pushP;
        const tx = (winW / 2 - cx0) * pushP * 0.44;
        const ty = (winH / 2 - cy0) * pushP * 0.44;
        stageCanvas.style.transformOrigin = `${cx0.toFixed(1)}px ${cy0.toFixed(1)}px`;
        stageCanvas.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale3d(${camScale.toFixed(3)}, ${camScale.toFixed(3)}, 1)`;
      } else {
        stageCanvas.style.transform = '';
        stageCanvas.style.transformOrigin = '';
      }
    }

    // ۲. ظهور نرم نمای داخلی (#shapeInteriorView) از درون حفره شکل با همان رنگ پس‌زمینه شکل
    if (shapeInteriorView) {
      const viewP = smoothstep(0.04, 0.60, p);
      if (p > 0.004) {
        shapeInteriorView.classList.add('is-visible');
        shapeInteriorView.setAttribute('aria-hidden', 'false');
        shapeInteriorView.style.opacity = smoothstep(0.01, 0.14, p).toFixed(3);
        const startS = Math.min(0.96, Math.max(rect.width / winW, rect.height / winH, 0.65) * 1.04);
        const vScale = startS + (1 - startS) * smoothstep(0.02, 0.42, p);
        const offsetX = (cx - winW / 2) * (1 - smoothstep(0.02, 0.45, p));
        const offsetY = (cy - winH / 2) * (1 - smoothstep(0.02, 0.45, p));
        shapeInteriorView.style.transform = `translate3d(${offsetX.toFixed(1)}px, ${offsetY.toFixed(1)}px, 0) scale3d(${vScale.toFixed(3)}, ${vScale.toFixed(3)}, 1)`;

        const parts = cachedInteriorParts || (cachedInteriorParts = getInteriorParts());
        if (parts) {
          const w1P = smoothstep(0.18, 0.72, p);
          const w2P = smoothstep(0.24, 0.78, p);
          const w3P = smoothstep(0.30, 0.84, p);
          if (parts.wall1) parts.wall1.style.transform = `scale3d(${(1.18 - 0.18 * w1P).toFixed(3)}, ${(1.18 - 0.18 * w1P).toFixed(3)}, 1)`;
          if (parts.wall2) parts.wall2.style.transform = `scale3d(${(1.12 - 0.12 * w2P).toFixed(3)}, ${(1.12 - 0.12 * w2P).toFixed(3)}, 1)`;
          if (parts.wall3) parts.wall3.style.transform = `scale3d(${(1.06 - 0.06 * w3P).toFixed(3)}, ${(1.06 - 0.06 * w3P).toFixed(3)}, 1)`;

          const animatePiece = function (el, startP, endP, dy) {
            if (!el) return;
            const pp = smoothstep(startP, endP, p);
            el.style.opacity = pp.toFixed(3);
            el.style.transform = `translate3d(0, ${((1 - pp) * dy).toFixed(1)}px, 0) scale3d(${(0.92 + 0.08 * pp).toFixed(3)}, ${(0.92 + 0.08 * pp).toFixed(3)}, 1)`;
          };

          animatePiece(parts.topBar, 0.24, 0.68, -18);
          animatePiece(parts.crest, 0.28, 0.72, 18);
          animatePiece(parts.title, 0.32, 0.76, 22);
          animatePiece(parts.lead, 0.36, 0.82, 28);
          for (let k = 0; k < parts.subs.length; k++) {
            animatePiece(parts.subs[k], 0.42 + k * 0.05, Math.min(0.96, 0.86 + k * 0.04), 32);
          }
          animatePiece(parts.cta, 0.52, 0.94, 26);
        }
      } else {
        shapeInteriorView.classList.remove('is-visible');
        shapeInteriorView.setAttribute('aria-hidden', 'true');
        shapeInteriorView.style.opacity = '0';
        shapeInteriorView.style.transform = 'scale3d(0.62, 0.62, 1)';
      }
    }

    // ۳. رندر یکپارچه و تمیز دیواره‌های پخ‌خورده خود شکل (بدون هیچ قطعه اضافه یا خط شعاعی)
    if (cameraPortalCanvas && portalCtx) {
      if (p > 0.004 && p < 0.996) {
        cameraPortalCanvas.classList.add('is-active');
        const dpr = cameraPortalCanvas.__dpr || 1;
        portalCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        portalCtx.clearRect(0, 0, winW, winH);

        const normPts = (st.normOutline && st.normOutline.length >= 4)
          ? st.normOutline
          : [{ x: -0.5, y: -0.5 }, { x: 0.5, y: -0.5 }, { x: 0.5, y: 0.5 }, { x: -0.5, y: 0.5 }];
        const bgCol = st.currentBgColor || '#185A59';
        const maxScale = Math.max(winW / Math.max(rect.width, 140), winH / Math.max(rect.height, 140)) * 2.85;
        const portalAlpha = 1 - smoothstep(0.84, 0.99, p);

        portalCtx.save();
        portalCtx.globalAlpha = portalAlpha;

        // گرادیان‌های نوری ۱۳۵ درجه دقیقاً هم‌رنگ دیواره‌های سه‌بعدی شکل‌ها در CSS (.wall-layer-1/2/3)
        const gradSpan = Math.max(rect.width, rect.height) * (1 + p * 2.2);
        const wallGrad1 = portalCtx.createLinearGradient(cx - gradSpan, cy - gradSpan, cx + gradSpan, cy + gradSpan);
        wallGrad1.addColorStop(0, '#F7F3EA');
        wallGrad1.addColorStop(0.5, '#E2DDD0');
        wallGrad1.addColorStop(1, '#A49D8E');

        const wallGrad2 = portalCtx.createLinearGradient(cx - gradSpan, cy - gradSpan, cx + gradSpan, cy + gradSpan);
        wallGrad2.addColorStop(0, '#EAE4D7');
        wallGrad2.addColorStop(0.5, '#CEC7B8');
        wallGrad2.addColorStop(1, '#878072');

        const wallGrad3 = portalCtx.createLinearGradient(cx - gradSpan, cy - gradSpan, cx + gradSpan, cy + gradSpan);
        wallGrad3.addColorStop(0, '#DAD3C4');
        wallGrad3.addColorStop(0.5, '#B8B1A2');
        wallGrad3.addColorStop(1, '#6C665A');

        const innerShadowGrad = portalCtx.createLinearGradient(cx - gradSpan, cy - gradSpan, cx + gradSpan, cy + gradSpan);
        innerShadowGrad.addColorStop(0, '#185A59');
        innerShadowGrad.addColorStop(0.52, '#13767B');
        innerShadowGrad.addColorStop(1, '#0E939D');

        // ۵ لایه دیواره پخ‌خورده یکپارچه و تمیز از خود شکل (سه دیواره سنگی، قاب طلایی و سایه عمق داخلی)
        const bevelLayers = [
          { ratio: 1.12, delay: 0.00, fill: wallGrad1, stroke: '#D4AF37', lw: 3.6 },
          { ratio: 1.06, delay: 0.03, fill: wallGrad2, stroke: 'rgba(18, 46, 44, 0.28)', lw: 1.6 },
          { ratio: 1.00, delay: 0.06, fill: wallGrad3, stroke: 'rgba(18, 46, 44, 0.38)', lw: 1.8 },
          { ratio: 0.94, delay: 0.09, fill: innerShadowGrad, stroke: '#F6E59B', lw: 2.6 },
          { ratio: 0.87, delay: 0.12, fill: innerShadowGrad, stroke: 'rgba(212, 175, 55, 0.65)', lw: 1.8 }
        ];

        const ringGeom = [];
        for (let r = 0; r < bevelLayers.length; r++) {
          const bl = bevelLayers[r];
          const localP = clamp((p - bl.delay * 0.45) / (1 - bl.delay * 0.45), 0, 1);
          const sc = 1 + (maxScale - 1) * Math.pow(localP, 1.68);
          ringGeom.push({
            sc,
            cx,
            cy,
            w: rect.width * sc * bl.ratio,
            h: rect.height * sc * bl.ratio,
            bl
          });
        }

        // هاله تیره نرم در بیرون از شکل در حال بزرگ شدن
        const outerG = ringGeom[0];
        portalCtx.beginPath();
        portalCtx.rect(0, 0, winW, winH);
        for (let i = 0; i < normPts.length; i++) {
          const px = outerG.cx + normPts[i].x * outerG.w;
          const py = outerG.cy + normPts[i].y * outerG.h;
          if (i === 0) portalCtx.moveTo(px, py);
          else portalCtx.lineTo(px, py);
        }
        portalCtx.closePath();
        portalCtx.fillStyle = `rgba(10, 24, 23, ${(smoothstep(0.0, 0.16, p) * 0.96).toFixed(3)})`;
        portalCtx.fill('evenodd');

        // رسم دیواره‌های پخ‌خورده یکپارچه خود شکل به صورت حلقه‌های توخالی تمیز
        for (let r = 0; r < ringGeom.length - 1; r++) {
          const gOut = ringGeom[r];
          const gIn = ringGeom[r + 1];
          traceHollowRing(portalCtx, normPts, gOut.cx, gOut.cy, gOut.w, gOut.h, gIn.cx, gIn.cy, gIn.w, gIn.h);
          portalCtx.fillStyle = gOut.bl.fill;
          portalCtx.fill('evenodd');

          traceNormPolygon(portalCtx, normPts, gOut.cx, gOut.cy, gOut.w, gOut.h);
          portalCtx.lineWidth = gOut.bl.lw;
          portalCtx.strokeStyle = gOut.bl.stroke;
          portalCtx.stroke();
        }

        // خط طلایی درخشان دور دهانه داخلی شکل
        const innerMost = ringGeom[ringGeom.length - 1];
        traceNormPolygon(portalCtx, normPts, innerMost.cx, innerMost.cy, innerMost.w, innerMost.h);
        portalCtx.lineWidth = 2.4;
        portalCtx.strokeStyle = '#D4AF37';
        portalCtx.stroke();

        portalCtx.restore();
      } else {
        cameraPortalCanvas.classList.remove('is-active');
      }
    }
  }

  let currentCameraP = 0;
  let lastSavedShapeRect = null;

  function stepCameraDive(now) {
    if (!cameraDiveAnim) return;
    const elapsed = now - cameraDiveAnim.t0;
    const rawT = clamp(elapsed / cameraDiveAnim.duration, 0, 1);
    const easedT = easeInOutCubic(rawT);
    const p = cameraDiveAnim.fromP + (cameraDiveAnim.toP - cameraDiveAnim.fromP) * easedT;
    currentCameraP = p;

    applyCameraDiveProgress(cameraDiveAnim.stage, cameraDiveAnim.rect, p);

    if (rawT < 1) {
      requestAnimationFrame(stepCameraDive);
    } else {
      if (cameraDiveAnim.toP <= 0.001) {
        interiorOpen = false;
        currentCameraP = 0;
        if (cameraPortalCanvas) cameraPortalCanvas.classList.remove('is-active');
        renderSceneAt(currentPos, true);
      } else {
        currentCameraP = 1;
      }
      cameraDiveAnim = null;
    }
  }

  function openShapeInterior(stageIdx) {
    if (interiorOpen || lightboxOpen) return;
    const st = stages[stageIdx];
    if (!st || !st.archEl) return;

    activeInteriorStage = stageIdx;
    interiorOpen = true;
    populateShapeInterior(stageIdx);

    const rect = st.archEl.getBoundingClientRect();
    lastSavedShapeRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    const alreadyRunning = !!cameraDiveAnim;
    cameraDiveAnim = {
      stage: st,
      rect: lastSavedShapeRect,
      fromP: currentCameraP,
      toP: 1,
      t0: performance.now(),
      duration: 820
    };
    if (!alreadyRunning) requestAnimationFrame(stepCameraDive);
  }

  function closeShapeInterior() {
    if (!interiorOpen) return;
    const st = stages[activeInteriorStage];
    if (!st || !st.archEl) {
      interiorOpen = false;
      return;
    }
    if (!lastSavedShapeRect) {
      const r = st.archEl.getBoundingClientRect();
      lastSavedShapeRect = { left: r.left, top: r.top, width: r.width, height: r.height };
    }
    const alreadyRunning = !!cameraDiveAnim;
    cameraDiveAnim = {
      stage: st,
      rect: lastSavedShapeRect,
      fromP: currentCameraP > 0.05 ? currentCameraP : 1,
      toP: 0,
      t0: performance.now(),
      duration: 820
    };
    if (!alreadyRunning) requestAnimationFrame(stepCameraDive);
  }

  /* ====================================================================
     لایت‌باکس بزرگ‌نمایی عکس‌ها با خط طلایی دور عکس، توضیحات زیر آن و دکمه برگشت
     ==================================================================== */
  let lightboxGoldAnimId = null;

  function animateLightboxGoldBorder() {
    if (!lightboxGoldRect || !lightboxImgFrame || !lightboxGoldSvg) return;
    const rect = lightboxImgFrame.getBoundingClientRect();
    const w = Math.max(120, rect.width);
    const h = Math.max(120, rect.height);
    const pad = 4;
    const rw = w + pad * 2;
    const rh = h + pad * 2;
    lightboxGoldSvg.setAttribute('viewBox', `0 0 ${rw} ${rh}`);
    lightboxGoldRect.setAttribute('x', '2');
    lightboxGoldRect.setAttribute('y', '2');
    lightboxGoldRect.setAttribute('width', (rw - 4).toFixed(1));
    lightboxGoldRect.setAttribute('height', (rh - 4).toFixed(1));

    const perim = 2 * (rw + rh);
    const t0 = performance.now();
    const dur = 720;

    function tickGold(now) {
      const p = smoothstep(0, 1, (now - t0) / dur);
      const cur = p * perim;
      lightboxGoldRect.setAttribute('stroke-dasharray', `${cur.toFixed(1)} ${(perim + 200).toFixed(1)}`);
      if (p < 1 && lightboxOpen) {
        lightboxGoldAnimId = requestAnimationFrame(tickGold);
      }
    }
    if (lightboxGoldAnimId) cancelAnimationFrame(lightboxGoldAnimId);
    lightboxGoldAnimId = requestAnimationFrame(tickGold);
  }

  function openPhotoLightbox(slotEl) {
    if (interiorOpen || lightboxOpen || !slotEl || !photoLightboxModal) return;
    const layers = Array.from(slotEl.querySelectorAll('.fibo-photo-layer.has-custom-artwork'));
    if (!layers.length) return;

    let activeLayer = layers[0];
    if (layers.length > 1) {
      const sceneEl = slotEl.closest('[data-stage-scene]');
      if (sceneEl) {
        const stIdx = parseInt(sceneEl.getAttribute('data-stage-scene'), 10) || 0;
        const stepA = 2 + 2 * stIdx;
        if (currentPos >= stepA + 0.5) {
          activeLayer = layers[1];
        }
      }
    }

    const imgEl = activeLayer.querySelector('img');
    const titleTxt = activeLayer.getAttribute('data-photo-title') || '';
    const captionTxt = activeLayer.getAttribute('data-photo-caption') || '';

    if (lightboxFullImg && imgEl) {
      lightboxFullImg.src = imgEl.src;
      lightboxFullImg.alt = titleTxt;
    }
    if (lightboxTitle) lightboxTitle.textContent = titleTxt;
    if (lightboxDesc) lightboxDesc.textContent = captionTxt;

    lightboxOpen = true;
    photoLightboxModal.classList.add('is-open');
    photoLightboxModal.setAttribute('aria-hidden', 'false');
    setTimeout(animateLightboxGoldBorder, 40);
  }

  function closePhotoLightbox() {
    if (!lightboxOpen || !photoLightboxModal) return;
    lightboxOpen = false;
    if (lightboxGoldAnimId) {
      cancelAnimationFrame(lightboxGoldAnimId);
      lightboxGoldAnimId = null;
    }
    photoLightboxModal.classList.remove('is-open');
    photoLightboxModal.setAttribute('aria-hidden', 'true');
  }

  // تشخیص لمس/کلیک واقعی از کشیدن انگشت برای اسکرول (آزادسازی کامل فضای انگشت برای اسکرول)
  window.addEventListener('pointerdown', function (e) {
    pointerStartPos.x = e.clientX;
    pointerStartPos.y = e.clientY;
    pointerStartPos.moved = false;
  }, { passive: true });

  window.addEventListener('pointermove', function (e) {
    if (Math.hypot(e.clientX - pointerStartPos.x, e.clientY - pointerStartPos.y) > 10) {
      pointerStartPos.moved = true;
    }
  }, { passive: true });

  stages.forEach(function (st) {
    if (!st.archEl) return;
    st.archEl.addEventListener('click', function (e) {
      if (pointerStartPos.moved) return;
      e.stopPropagation();
      openShapeInterior(st.index);
    });
    st.archEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openShapeInterior(st.index);
      }
    });
  });

  Array.from(document.querySelectorAll('[data-open-stage]')).forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      if (pointerStartPos.moved) return;
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-open-stage'), 10);
      if (!isNaN(idx)) openShapeInterior(idx);
    });
  });

  Array.from(document.querySelectorAll('.clickable-photo-slot')).forEach(function (slot) {
    slot.addEventListener('click', function (e) {
      if (pointerStartPos.moved) return;
      e.stopPropagation();
      openPhotoLightbox(slot);
    });
    slot.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openPhotoLightbox(slot);
      }
    });
  });

  if (interiorExitBtn) {
    interiorExitBtn.addEventListener('click', closeShapeInterior);
  }
  if (lightboxBackBtn) {
    lightboxBackBtn.addEventListener('click', closePhotoLightbox);
  }
  if (lightboxBackdrop) {
    lightboxBackdrop.addEventListener('click', closePhotoLightbox);
  }
  if (footerBackTopBtn) {
    footerBackTopBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      jumpToStepFastUpward(0);
    });
  }

  jumpButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const target = parseInt(btn.getAttribute('data-jump-step'), 10);
      if (!isNaN(target)) {
        jumpToStepFastUpward(target);
      }
    });
  });

  function scrollableTextAncestor(target) {
    return target && target.closest ? target.closest('.interior-scroll-area') : null;
  }

  // ----- چرخ موس / تاچ‌پد: هر حرکت پیوسته (حتی با اینرسی) فقط یک گام -----
  const WHEEL_QUIET_MS = 120;
  let wheelAccumulator = 0;
  let lastWheelTime = 0;
  let lastWheelDir = 0;
  let wheelGestureUsed = false;

  window.addEventListener(
    'wheel',
    function (e) {
      if (interiorOpen || lightboxOpen || cameraDiveAnim) return;
      const now = performance.now();
      const gap = now - lastWheelTime;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? getCanvasSize().h : 1;
      const dy = e.deltaY * unit;
      const dir = dy > 0 ? 1 : dy < 0 ? -1 : 0;

      const scrollableText = scrollableTextAncestor(e.target);
      if (scrollableText && scrollableText.scrollHeight > scrollableText.clientHeight + 4) {
        const atTop = scrollableText.scrollTop <= 1;
        const atBottom =
          scrollableText.scrollTop + scrollableText.clientHeight >= scrollableText.scrollHeight - 2;
        if ((dy > 0 && !atBottom) || (dy < 0 && !atTop)) {
          lastWheelTime = now;
          wheelGestureUsed = true;
          return;
        }
      }

      e.preventDefault();
      lastWheelTime = now;

      if (gap > WHEEL_QUIET_MS || (dir !== 0 && lastWheelDir !== 0 && dir !== lastWheelDir && Math.abs(dy) >= 12)) {
        wheelGestureUsed = false;
        wheelAccumulator = 0;
      }
      if (dir !== 0) lastWheelDir = dir;
      if (wheelGestureUsed) return;

      wheelAccumulator += dy;
      if (Math.abs(wheelAccumulator) >= 24) {
        const d = wheelAccumulator > 0 ? 1 : -1;
        wheelAccumulator = 0;
        wheelGestureUsed = true;
        handleScrollCommand(d);
      }
    },
    { passive: false }
  );

  // ----- لمس: هر کشیدن انگشت فقط یک گام؛ نوار بالا آزاد می‌ماند تا خودش اسکرول افقی کند -----
  let touchStartY = null;
  let touchGestureUsed = false;
  let touchIgnore = false;

  window.addEventListener(
    'touchstart',
    function (e) {
      if (interiorOpen || lightboxOpen || cameraDiveAnim) { touchIgnore = true; return; }
      touchIgnore = !!(siteNavbar && e.target && siteNavbar.contains(e.target));
      if (touchIgnore) return;
      if (e.touches && e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
        touchGestureUsed = false;
      }
    },
    { passive: true }
  );

  window.addEventListener(
    'touchmove',
    function (e) {
      if (touchIgnore) return;
      if (touchStartY === null || !e.touches || e.touches.length === 0) return;

      const scrollableText = scrollableTextAncestor(e.target);
      const dy = touchStartY - e.touches[0].clientY;
      if (scrollableText && scrollableText.scrollHeight > scrollableText.clientHeight + 4) {
        const atTop = scrollableText.scrollTop <= 1;
        const atBottom =
          scrollableText.scrollTop + scrollableText.clientHeight >= scrollableText.scrollHeight - 2;
        if ((dy > 0 && !atBottom) || (dy < 0 && !atTop)) {
          touchGestureUsed = true;
          return;
        }
      }

      e.preventDefault();
      if (touchGestureUsed) return;
      if (Math.abs(dy) >= 26) {
        touchGestureUsed = true;
        handleScrollCommand(dy > 0 ? 1 : -1);
      }
    },
    { passive: false }
  );

  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (lightboxOpen) { e.preventDefault(); closePhotoLightbox(); return; }
      if (interiorOpen) { e.preventDefault(); closeShapeInterior(); return; }
    }
    if (interiorOpen || lightboxOpen || cameraDiveAnim) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      if (!e.repeat) handleScrollCommand(1);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      if (!e.repeat) handleScrollCommand(-1);
    }
  });

  let resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      buildAllGeometries();
      renderSceneAt(currentPos, true);
    }, 120);
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  function init() {
    initShineLayers();
    buildAllGeometries();
    renderSceneAt(0, true);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        stages.forEach(fitStageText);
        renderSceneAt(currentPos, true);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  
  
  
  
  
  
  
  
  
  
  window.__modeshahrTest = {
    setPos: function (p) {
      targetPos = p;
      currentPos = p;
      renderSceneAt(p, true);
    },
    renderSceneAt: renderSceneAt,
    applyCameraDiveProgress: applyCameraDiveProgress,
    resizePortalCanvas: resizePortalCanvas,
    openShapeInterior: openShapeInterior,
    closeShapeInterior: closeShapeInterior,
    isInteriorOpen: function () { return interiorOpen || !!cameraDiveAnim; },
    stages: stages
  };
})();
