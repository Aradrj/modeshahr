/* ==========================================================================
   MODESHAHR — Arcane 24fps Cinematic Runway Engine (v4)
   - True 24fps Optical-Flow + Cloth-Physics Animated Sprite Sheets (4 Models)
   - Golden Kintsugi-Veined Arcane Matte-Black Female Mannequins
   - 2D Fibonacci Golden-Ratio (φ) Spiraling Roots on Back Wall in Step 1
   - Zero-Jump C² Camera Across Mobile / Tablet / Desktop (Fixed Up Vector)
   - Rich Architectural Obsidian Hall (#101415) & Living Cinema Lighting
   - Hardware Mobile Gyroscope (with iOS Permission Pill) + Desktop Hover 3D
   ========================================================================== */
(function () {
  'use strict';

  const canvas = document.getElementById('runwayCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  const siteNavbar = document.getElementById('siteNavbar');
  const navStepBadge = document.getElementById('navStepBadge');
  const navButtons = Array.from(document.querySelectorAll('.nav-step-btn[data-jump-step]'));
  const stepDots = Array.from(document.querySelectorAll('.step-dot[data-jump-step]'));
  const jumpButtons = Array.from(document.querySelectorAll('[data-jump-step]'));
  const stageIntroOverlay = document.getElementById('stageIntroOverlay');
  const stageScrollCue = document.getElementById('stageScrollCue');
  const garmentBlurWidget = document.getElementById('garmentBlurWidget');
  const garmentBlurTrigger = document.getElementById('garmentBlurTrigger');
  const garmentPanelCode = document.getElementById('garmentPanelCode');
  const garmentPanelClose = document.getElementById('garmentPanelClose');
  const garmentDetailItems = Array.from(document.querySelectorAll('[data-look-detail]'));
  const gyroEnableBtn = document.getElementById('gyroEnableBtn');
  const siteFooter = document.getElementById('siteFooter');
  const footerBackTopBtn = document.getElementById('footerBackTopBtn');

  // --------------------------------------------------------------------------
  // 1. Model Catalog (4 Arcane 24fps Animated Models)
  //    - walk24:   6x4 grid (24 frames @ 24fps) optical-flow catwalk + cloth billow
  //    - topose12: 4x3 grid (12 frames @ 24fps) seamless walk -> signature pose morph
  //    - poseImg:  high-res 480x720 signature pose with golden kintsugi face veins
  //    - back12:   4x3 grid (12 frames @ 24fps) animated 180° back-exit walk
  // --------------------------------------------------------------------------
  const MODELS = [
    {
      index: 0,
      code: 'LOOK 01 / 04',
      walkSheetSrc: 'assets/runway/model_1_walk24.webp',
      toPoseSheetSrc: 'assets/runway/model_1_topose12.webp',
      poseHiSrc: 'assets/runway/model_1_pose.webp',
      backSheetSrc: 'assets/runway/model_1_back12.webp',
      walkSheet: null, toPoseSheet: null, poseHi: null, backSheet: null,
      poseShiftX: 0.014, poseTilt: -0.010
    },
    {
      index: 1,
      code: 'LOOK 02 / 04',
      walkSheetSrc: 'assets/runway/model_2_walk24.webp',
      toPoseSheetSrc: 'assets/runway/model_2_topose12.webp',
      poseHiSrc: 'assets/runway/model_2_pose.webp',
      backSheetSrc: 'assets/runway/model_2_back12.webp',
      walkSheet: null, toPoseSheet: null, poseHi: null, backSheet: null,
      poseShiftX: -0.018, poseTilt: 0.012
    },
    {
      index: 2,
      code: 'LOOK 03 / 04',
      walkSheetSrc: 'assets/runway/model_3_walk24.webp',
      toPoseSheetSrc: 'assets/runway/model_3_topose12.webp',
      poseHiSrc: 'assets/runway/model_3_pose.webp',
      backSheetSrc: 'assets/runway/model_3_back12.webp',
      walkSheet: null, toPoseSheet: null, poseHi: null, backSheet: null,
      poseShiftX: 0.016, poseTilt: -0.008
    },
    {
      index: 3,
      code: 'LOOK 04 / 04',
      walkSheetSrc: 'assets/runway/model_4_walk24.webp',
      toPoseSheetSrc: 'assets/runway/model_4_topose12.webp',
      poseHiSrc: 'assets/runway/model_4_pose.webp',
      backSheetSrc: 'assets/runway/model_4_back12.webp',
      walkSheet: null, toPoseSheet: null, poseHi: null, backSheet: null,
      poseShiftX: -0.016, poseTilt: 0.010
    }
  ];

  // --------------------------------------------------------------------------
  // 2. Architectural & Choreography Constants
  // --------------------------------------------------------------------------
  const MAX_STEP = 6;
  const WHEEL_QUIET_MS = 160;
  const WHEEL_THRESHOLD = 28;
  const TOUCH_THRESHOLD = 30;
  const SETTLE_LOCK_MS = 280;
  const REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const BG_COLOR = '#101415';
  const RUNWAY_HALF_W = 1.72;
  const RUNWAY_LEN = 11.4;
  const RUNWAY_H = 0.46;
  const HALL_HALF_W = 6.9;
  const HALL_H = 6.4;
  const MODEL_HEIGHT = 1.78;
  const ARCH_Z = 0.0;
  const ARCH_DEPTH = 2.6;
  const READY_Z = 1.45;
  const POSE_Z = 9.3;
  const EXIT_Z = 0.35;
  const EXIT_LANE_X = -0.82;
  const ENTER_LANE_X = 0.56;

  const STEP_DURATIONS = {
    '0->1': 1850, '1->0': 1350,
    '1->2': 2450, '2->1': 1400,
    '2->3': 2700, '3->2': 1600,
    '3->4': 2700, '4->3': 1600,
    '4->5': 2700, '5->4': 1600,
    '5->6': 1900, '6->5': 1400
  };

  // Subtle atmospheric dust motes inside the cinema spotlight beam
  const DUST_MOTES = [];
  for (let i = 0; i < 24; i++) {
    const s1 = Math.sin(i * 12.9898) * 43758.5453;
    const s2 = Math.sin(i * 78.233) * 19283.123;
    const r1 = s1 - Math.floor(s1);
    const r2 = s2 - Math.floor(s2);
    DUST_MOTES.push({
      xNorm: (r1 - 0.5) * 0.55,
      yNorm: r2,
      speed: 0.012 + (i % 5) * 0.005,
      size: 1.0 + (i % 3) * 0.65,
      phase: r1 * Math.PI * 2
    });
  }

  // --------------------------------------------------------------------------
  // 3. 2D Fibonacci Golden-Ratio (φ = 1.618) Spiraling Golden Roots on Back Wall
  //    Fills the left, right, and upper back wall richly during Step 0 -> 1 (زاویه تماشا)
  // --------------------------------------------------------------------------
  function buildFibonacciGoldenRoots() {
    // Concentric golden arch / semicircle contours strictly parallel to the 3D outer arch
    // (outer arch: hw=2.38, sh=2.32, ar=2.12). Guaranteed zero overlap and clean uniform spacing.
    const arcs = [];
    const baseHW = 2.38;
    const baseSH = 2.32;
    const baseAR = 2.12;
    const ringCount = 8;
    const spacing = 0.46;
    const steps = 64;
    const maxX = HALL_HALF_W - 0.14;
    const maxY = HALL_H - 0.14;

    for (let k = 1; k <= ringCount; k++) {
      const offset = k * spacing;
      const hw = baseHW + offset;
      const ar = baseAR + offset;
      const leftPts = [];
      const rightPts = [];

      // Left vertical pillar segment from floor up to arch springline
      if (hw <= maxX) {
        const vSteps = 10;
        for (let i = 0; i <= vSteps; i++) {
          leftPts.push([-hw, (i / vSteps) * baseSH]);
        }
      }
      // Left quarter-arch from springline (PI) up toward crown (PI/2)
      for (let i = 1; i <= steps / 2; i++) {
        const a = Math.PI - (i / (steps / 2)) * (Math.PI * 0.5);
        const x = Math.cos(a) * hw;
        const y = baseSH + Math.sin(a) * ar;
        if (Math.abs(x) <= maxX && y <= maxY) {
          leftPts.push([x, y]);
        }
      }

      // Right vertical pillar segment from floor up to arch springline
      if (hw <= maxX) {
        const vSteps = 10;
        for (let i = 0; i <= vSteps; i++) {
          rightPts.push([hw, (i / vSteps) * baseSH]);
        }
      }
      // Right quarter-arch from springline (0) up toward crown (PI/2)
      for (let i = 1; i <= steps / 2; i++) {
        const a = (i / (steps / 2)) * (Math.PI * 0.5);
        const x = Math.cos(a) * hw;
        const y = baseSH + Math.sin(a) * ar;
        if (Math.abs(x) <= maxX && y <= maxY) {
          rightPts.push([x, y]);
        }
      }

      const t0 = (k - 1) * 0.08;
      const t1 = Math.min(1.0, t0 + 0.52);
      const lw = Math.max(1.25, 2.35 - (k - 1) * 0.14);
      const alpha = Math.max(0.34, 0.88 - (k - 1) * 0.07);

      if (leftPts.length >= 2) {
        arcs.push({ pts: leftPts, t0: t0, t1: t1, lineWidth: lw, alpha: alpha });
      }
      if (rightPts.length >= 2) {
        arcs.push({ pts: rightPts, t0: t0, t1: t1, lineWidth: lw, alpha: alpha });
      }
    }

    return arcs;
  }

  const FIBONACCI_ROOTS = buildFibonacciGoldenRoots();

  // --------------------------------------------------------------------------
  // 4. Runtime State (Timeline + Hardware Gyroscope / Desktop Mouse Hover)
  // --------------------------------------------------------------------------
  let viewW = 1280, viewH = 800, dpr = 1;
  let currentPos = 0;
  let targetStep = 0;
  let anim = null;
  let rafId = null;
  let lastFrameTime = 0;
  let idleClock = 0;
  let infoExpanded = false;

  const orbit = {
    targetX: 0,
    targetY: 0,
    currX: 0,
    currY: 0,
    gyroAvailable: false,
    gyroGranted: false,
    needsIOSPermission: false
  };

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smoothstep(e0, e1, x) {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function smootherstep(t) {
    const x = clamp(t, 0, 1);
    return x * x * x * (x * (x * 6 - 15) + 10);
  }

  function getSpotlightFocus(pos) {
    if (pos < 1.56 || pos > 5.42) return 0;
    let best = 0;
    for (let s = 2; s <= 5; s++) {
      const w = 1 - smoothstep(0.0, 0.42, Math.abs(pos - s));
      if (w > best) best = w;
    }
    return best;
  }

  // --------------------------------------------------------------------------
  // 5. ZERO-JUMP 3D Perspective Camera (Fixed Continuous worldUp = [0, 1, 0]!)
  // --------------------------------------------------------------------------
  function buildCamera(pos, target, fovDeg, aspect) {
    let fx = target.x - pos.x;
    let fy = target.y - pos.y;
    let fz = target.z - pos.z;
    const fLen = Math.hypot(fx, fy, fz) || 1;
    fx /= fLen; fy /= fLen; fz /= fLen;

    // ALWAYS fixed worldUp = (0, 1, 0) -> NEVER flips or jumps on mobile portrait!
    const upX = 0, upY = 1, upZ = 0;

    let rx = fy * upZ - fz * upY;
    let ry = fz * upX - fx * upZ;
    let rz = fx * upY - fy * upX;
    const rLen = Math.hypot(rx, ry, rz) || 1;
    rx /= rLen; ry /= rLen; rz /= rLen;

    const ux = ry * fz - rz * fy;
    const uy = rz * fx - rx * fz;
    const uz = rx * fy - ry * fx;

    const adaptiveFov = aspect < 0.78 ? fovDeg + (0.78 - aspect) * 22 : fovDeg;
    const focal = (viewH * 0.5) / Math.tan((adaptiveFov * Math.PI) / 360);

    return {
      pos: pos,
      target: target,
      f: { x: fx, y: fy, z: fz },
      r: { x: rx, y: ry, z: rz },
      u: { x: ux, y: uy, z: uz },
      focal: focal,
      cx: viewW * 0.5,
      cy: viewH * 0.52
    };
  }

  function project(cam, x, y, z) {
    const dx = x - cam.pos.x;
    const dy = y - cam.pos.y;
    const dz = z - cam.pos.z;
    const cz = dx * cam.f.x + dy * cam.f.y + dz * cam.f.z;
    if (cz <= 0.12) return null;
    const cx = dx * cam.r.x + dy * cam.r.y + dz * cam.r.z;
    const cy = dx * cam.u.x + dy * cam.u.y + dz * cam.u.z;
    const scale = cam.focal / cz;
    return { x: cam.cx + cx * scale, y: cam.cy - cy * scale, z: cz, scale: scale };
  }

  function drawPoly3D(cam, pts, fillStyle, strokeStyle, lineWidth) {
    const projected = [];
    for (let i = 0; i < pts.length; i++) {
      const p = project(cam, pts[i][0], pts[i][1], pts[i][2]);
      if (!p) return false;
      projected.push(p);
    }
    ctx.beginPath();
    ctx.moveTo(projected[0].x, projected[0].y);
    for (let i = 1; i < projected.length; i++) ctx.lineTo(projected[i].x, projected[i].y);
    ctx.closePath();
    if (fillStyle) { ctx.fillStyle = fillStyle; ctx.fill(); }
    if (strokeStyle) { ctx.strokeStyle = strokeStyle; ctx.lineWidth = lineWidth || 1; ctx.stroke(); }
    return true;
  }

  function drawLine3D(cam, a, b, strokeStyle, lineWidth) {
    const p1 = project(cam, a[0], a[1], a[2]);
    const p2 = project(cam, b[0], b[1], b[2]);
    if (!p1 || !p2) return;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth || 1;
    ctx.stroke();
  }

  function evaluateCamera(pos) {
    const aspect = viewW / Math.max(1, viewH);
    const portraitPull = aspect < 0.78 ? (0.78 - aspect) * 1.45 : 0;

    // Safe overhead angle: |fy| stays <= 0.92 across ALL desktop/tablet/mobile ratios -> ZERO JUMP!
    const overheadPos = { x: 0, y: 11.8 + portraitPull * 1.2, z: 10.6 + portraitPull * 0.6 };
    const overheadLook = { x: 0, y: 0.0, z: 5.2 };

    const audiencePos = { x: 2.15, y: 1.40, z: 14.35 + portraitPull };
    const audienceLook = { x: 0, y: 1.00, z: 4.9 };

    // Low Front-Row Seated Knee-Up Close-Up
    const poseCamZ = 11.42 + portraitPull * 0.72;
    const poseCamY = 0.72;
    const poseLookY = 1.19;
    const poseFov = 35;

    let camPos, camLook, fov = 40;

    if (pos <= 1) {
      const t = smootherstep(pos);
      const s = Math.sin(t * Math.PI);
      const smoothArc = s * s; // strictly 0 derivative at t=0 and t=1 -> zero velocity jump!
      camPos = {
        x: lerp(overheadPos.x, audiencePos.x, t) + smoothArc * 3.6,
        y: lerp(overheadPos.y, audiencePos.y, t),
        z: lerp(overheadPos.z, audiencePos.z, t) + smoothArc * 1.25
      };
      camLook = {
        x: lerp(overheadLook.x, audienceLook.x, t),
        y: lerp(overheadLook.y, audienceLook.y, t),
        z: lerp(overheadLook.z, audienceLook.z, t)
      };
      fov = lerp(44, 40, t);
    } else if (pos <= 2) {
      const t = smootherstep(pos - 1);
      const zoomT = smootherstep(clamp((pos - 1.32) / 0.68, 0, 1));
      camPos = {
        x: lerp(audiencePos.x, 0.38, t),
        y: lerp(audiencePos.y, poseCamY, zoomT),
        z: lerp(audiencePos.z, poseCamZ, zoomT)
      };
      camLook = {
        x: 0,
        y: lerp(audienceLook.y, poseLookY, zoomT),
        z: lerp(audienceLook.z, POSE_Z, t)
      };
      fov = lerp(40, poseFov, zoomT);
    } else if (pos <= 5) {
      const seg = Math.floor(pos);
      const local = pos - seg;
      const xAnchors = [0.38, -0.38, 0.34, -0.34];
      const idxA = clamp(seg - 2, 0, 3);
      const idxB = clamp(idxA + 1, 0, 3);
      const pull = smootherstep(smoothstep(0.0, 0.36, local) * (1 - smoothstep(0.62, 1.0, local)));
      const midX = (idxA % 2 === 0) ? -1.42 : 1.42;
      const baseX = lerp(xAnchors[idxA], xAnchors[idxB], smootherstep(local));
      camPos = {
        x: lerp(baseX, midX, pull * 0.55),
        y: lerp(poseCamY, 1.38, pull),
        z: lerp(poseCamZ, 14.35 + portraitPull, pull)
      };
      camLook = {
        x: 0,
        y: lerp(poseLookY, 0.98, pull),
        z: lerp(POSE_Z, 5.6, pull)
      };
      fov = lerp(poseFov, 40, pull);
    } else {
      const t = smootherstep(pos - 5);
      camPos = {
        x: lerp(-0.34, 0.0, t),
        y: lerp(poseCamY, 2.35, t),
        z: lerp(poseCamZ, 15.6 + portraitPull, t)
      };
      camLook = {
        x: 0,
        y: lerp(poseLookY, 1.28, t),
        z: lerp(POSE_Z, 4.4, t)
      };
      fov = lerp(poseFov, 42, t);
    }

    // Hardware Mobile Gyroscope / Desktop Mouse Hover 3D Camera Orbit on Pose!
    const focus = getSpotlightFocus(pos);
    if (focus > 0.01) {
      const az = orbit.currX * 0.44 * focus;
      const el = orbit.currY * 0.18 * focus;
      const dx = camPos.x - camLook.x;
      const dy = camPos.y - camLook.y;
      const dz = camPos.z - camLook.z;
      const horizR = Math.hypot(dx, dz);
      const newAz = Math.atan2(dx, dz) + az;
      camPos.x = camLook.x + Math.sin(newAz) * horizR;
      camPos.z = camLook.z + Math.cos(newAz) * horizR;
      camPos.y = clamp(camLook.y + dy + el * horizR * 0.55, 0.42, 2.05);
    }

    return buildCamera(camPos, camLook, fov, aspect);
  }

  // --------------------------------------------------------------------------
  // 6. 24fps Model Animation State Evaluator (Walk24 -> ToPose12 -> PoseHi -> Back12)
  // --------------------------------------------------------------------------
  function evaluateModelState(modelIdx, pos) {
    const poseStep = modelIdx + 2;
    const exitEndStep = poseStep + 1;

    if (modelIdx === 0 && pos < 0.45) return null;
    if (modelIdx > 0 && pos < poseStep - 1 + 0.02) return null;
    if (pos > exitEndStep - 0.01) return null;

    const model = MODELS[modelIdx];
    let x = 0, z = READY_Z, alpha = 1, turnAngle = 0;
    let mode = 'walk';  // 'walk' | 'topose' | 'pose' | 'back'
    let frameIdx = 0;
    let leanAngle = 0;
    let bobY = 0;

    if (modelIdx === 0 && pos <= 1.0) {
      const t = smoothstep(0.45, 1.0, pos);
      z = lerp(0.15, READY_Z, smootherstep(t));
      alpha = smoothstep(0.45, 0.78, pos);
      mode = 'walk';
      frameIdx = Math.floor((t * 24) % 24);
    } else if (pos <= poseStep) {
      const rawT = clamp(pos - (poseStep - 1), 0, 1);
      const moveT = smootherstep(clamp(rawT / 0.80, 0, 1));
      const startZ = modelIdx === 0 ? READY_Z : EXIT_Z;
      z = lerp(startZ, POSE_Z, moveT);

      if (modelIdx > 0) {
        const laneCurve = Math.sin(clamp(rawT / 0.80, 0, 1) * Math.PI);
        const merge = smoothstep(0.52, 0.80, rawT);
        x = lerp(ENTER_LANE_X * (0.42 + 0.58 * laneCurve), 0, merge);
        alpha = smoothstep(0.02, 0.14, rawT);
      }

      if (rawT < 0.72) {
        // Play full 24fps catwalk walk sprite sheet synced to stride distance!
        mode = 'walk';
        const cycles = (rawT / 0.72) * 3.0; // 3 full stride cycles = 72 crisp 24fps frames
        frameIdx = Math.floor(cycles * 24) % 24;
        const ph = cycles * Math.PI * 2;
        x += Math.sin(ph) * 0.016;
        leanAngle = Math.sin(ph) * 0.010;
      } else if (rawT < 0.96) {
        // Play 12-frame 24fps seamless Optical-Flow Walk -> Signature Pose morph!
        mode = 'topose';
        const u = clamp((rawT - 0.72) / 0.24, 0, 1);
        frameIdx = clamp(Math.floor(u * 12), 0, 11);
        x += model.poseShiftX * u;
        leanAngle = model.poseTilt * u;
      } else {
        // Crisp high-res held Signature Pose with subtle breathing
        mode = 'pose';
        x += model.poseShiftX;
        leanAngle = model.poseTilt + Math.sin(idleClock * 1.1) * 0.003;
        bobY = Math.sin(idleClock * 1.65) * 0.004;
      }
    } else {
      // Exit: smooth 180° pivot then 24fps animated back-exit walk cycle!
      const rawT = clamp(pos - poseStep, 0, 1);
      const pivotT = smootherstep(clamp((rawT - 0.03) / 0.24, 0, 1));
      turnAngle = pivotT * Math.PI;

      const exitRaw = clamp((rawT - 0.18) / 0.82, 0, 1);
      z = lerp(POSE_Z, EXIT_Z, smootherstep(exitRaw));
      const laneOut = smoothstep(0.10, 0.34, rawT) * (1 - smoothstep(0.84, 1.0, rawT) * 0.55);
      x = EXIT_LANE_X * laneOut + model.poseShiftX * (1 - pivotT);
      alpha = 1 - smoothstep(0.87, 0.995, rawT);

      if (turnAngle <= Math.PI * 0.5) {
        mode = 'pose';
      } else {
        mode = 'back';
        frameIdx = Math.floor((exitRaw * 3.0 * 12) % 12);
      }
    }

    return {
      model: model,
      x: x, y: bobY, z: z,
      alpha: clamp(alpha, 0, 1),
      turnAngle: turnAngle,
      mode: mode,
      frameIdx: frameIdx,
      leanAngle: leanAngle
    };
  }

  // --------------------------------------------------------------------------
  // 7. Rich Architectural Stage (#101415), Deep 3D Arch, Fibonacci Roots & Living Lighting
  // --------------------------------------------------------------------------
  function archProfilePoints(halfW, straightH, archR, steps) {
    const pts = [[-halfW, 0], [-halfW, straightH]];
    for (let i = 1; i < steps; i++) {
      const a = Math.PI - (i / steps) * Math.PI;
      pts.push([Math.cos(a) * halfW, straightH + Math.sin(a) * archR]);
    }
    pts.push([halfW, straightH], [halfW, 0]);
    return pts;
  }

  function renderDeep3DArch(cam, bgVis) {
    const layers = [
      { hw: 2.38, sh: 2.32, ar: 2.12, zFront: 0.00, zBack: -0.60, face: '#1E2528', reveal: '#161C1E', stroke: 'rgba(212, 175, 55, 0.36)' },
      { hw: 2.14, sh: 2.24, ar: 1.90, zFront: -0.60, zBack: -1.24, face: '#192023', reveal: '#13181A', stroke: 'rgba(212, 175, 55, 0.28)' },
      { hw: 1.90, sh: 2.14, ar: 1.68, zFront: -1.24, zBack: -1.94, face: '#151D1F', reveal: '#0E1517', stroke: 'rgba(24, 118, 116, 0.55)' },
      { hw: 1.66, sh: 2.04, ar: 1.46, zFront: -1.94, zBack: -ARCH_DEPTH, face: '#134645', reveal: '#0B2E2E', stroke: 'rgba(246, 229, 155, 0.65)' }
    ];
    const steps = 22;

    const deepInner = archProfilePoints(1.66, 2.04, 1.46, steps);
    drawPoly3D(cam, deepInner.map(function (p) { return [p[0], p[1], -ARCH_DEPTH]; }), '#0C2B2B');

    // Living breathing emerald + warm gold sanctuary backlight inside deep 3D arch
    const breath = 0.92 + 0.08 * Math.sin(idleClock * 1.4);
    const archCenter = project(cam, 0, 1.85, -ARCH_DEPTH + 0.1);
    const archEdge = project(cam, 1.66, 1.85, -ARCH_DEPTH + 0.1);
    if (archCenter && archEdge) {
      const rPx = Math.max(24, Math.abs(archEdge.x - archCenter.x) * 1.65);
      const glow = ctx.createRadialGradient(archCenter.x, archCenter.y, rPx * 0.06, archCenter.x, archCenter.y, rPx);
      glow.addColorStop(0, 'rgba(36, 152, 148, ' + (0.55 * bgVis * breath).toFixed(3) + ')');
      glow.addColorStop(0.45, 'rgba(24, 90, 89, ' + (0.34 * bgVis * breath).toFixed(3) + ')');
      glow.addColorStop(0.8, 'rgba(212, 175, 55, ' + (0.09 * bgVis).toFixed(3) + ')');
      glow.addColorStop(1, 'rgba(16, 20, 21, 0)');
      ctx.save();
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(archCenter.x, archCenter.y, rPx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (let i = layers.length - 1; i >= 0; i--) {
      const L = layers[i];
      const prof = archProfilePoints(L.hw, L.sh, L.ar, steps);
      drawPoly3D(cam, [
        [-L.hw, 0, L.zBack], [L.hw, 0, L.zBack], [L.hw, 0, L.zFront], [-L.hw, 0, L.zFront]
      ], '#161C1E');
      for (let k = 0; k < prof.length - 1; k++) {
        const a = prof[k], b = prof[k + 1];
        const midY = (a[1] + b[1]) * 0.5;
        drawPoly3D(cam, [
          [a[0], a[1], L.zFront], [b[0], b[1], L.zFront], [b[0], b[1], L.zBack], [a[0], a[1], L.zBack]
        ], midY > L.sh ? L.face : L.reveal, 'rgba(255, 255, 255, 0.03)', 0.6);
      }
      if (i > 0) {
        const outer = layers[i - 1];
        const outerProf = archProfilePoints(outer.hw, outer.sh, outer.ar, steps);
        for (let k = 0; k < prof.length - 1; k++) {
          drawPoly3D(cam, [
            [outerProf[k][0], outerProf[k][1], L.zFront], [outerProf[k + 1][0], outerProf[k + 1][1], L.zFront],
            [prof[k + 1][0], prof[k + 1][1], L.zFront], [prof[k][0], prof[k][1], L.zFront]
          ], outer.face);
        }
      }
      ctx.save();
      ctx.beginPath();
      let started = false;
      for (let k = 0; k < prof.length; k++) {
        const p = project(cam, prof[k][0], prof[k][1], L.zFront);
        if (!p) continue;
        if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = L.stroke;
      ctx.lineWidth = i === 3 ? 1.8 : 1.1;
      ctx.stroke();
      ctx.restore();
    }
  }

  function renderFibonacciRoots(cam, growth, bgVis) {
    if (growth <= 0.005 || bgVis <= 0.02) return;

    ctx.save();
    ctx.strokeStyle = '#D4AF37';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let b = 0; b < FIBONACCI_ROOTS.length; b++) {
      const br = FIBONACCI_ROOTS[b];
      ctx.globalAlpha = (br.alpha || 0.85) * bgVis;
      const localG = clamp((growth - br.t0) / Math.max(0.01, br.t1 - br.t0), 0, 1);
      if (localG <= 0.005) continue;

      const totalSegs = br.pts.length - 1;
      const exactIdx = localG * totalSegs;
      const fullSegs = Math.floor(exactIdx);
      const frac = exactIdx - fullSegs;

      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= fullSegs; i++) {
        const p = project(cam, br.pts[i][0], br.pts[i][1], ARCH_Z + 0.02);
        if (!p) continue;
        if (!started) {
          ctx.moveTo(p.x, p.y);
          started = true;
        } else {
          ctx.lineTo(p.x, p.y);
        }
      }
      if (fullSegs < totalSegs && frac > 0.001) {
        const pA = br.pts[fullSegs], pB = br.pts[fullSegs + 1];
        const pTip = project(cam, pA[0] + (pB[0] - pA[0]) * frac, pA[1] + (pB[1] - pA[1]) * frac, ARCH_Z + 0.02);
        if (pTip) {
          if (!started) {
            ctx.moveTo(pTip.x, pTip.y);
            started = true;
          } else {
            ctx.lineTo(pTip.x, pTip.y);
          }
        }
      }

      if (started) {
        ctx.lineWidth = br.lineWidth;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function renderHallAndLivingLighting(cam, pos, focus) {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, viewW, viewH);

    const bgVis = 1 - focus * 0.95;

    if (bgVis > 0.03) {
      ctx.save();
      ctx.globalAlpha = bgVis;

      // 1. Lower honed-obsidian hall floor with subtle travertine grid
      drawPoly3D(cam, [
        [-HALL_HALF_W, -RUNWAY_H, ARCH_Z], [HALL_HALF_W, -RUNWAY_H, ARCH_Z],
        [HALL_HALF_W, -RUNWAY_H, 18.0], [-HALL_HALF_W, -RUNWAY_H, 18.0]
      ], '#0B0F10');
      for (let z = 1.8; z <= 14.4; z += 1.8) {
        drawLine3D(cam, [-HALL_HALF_W, -RUNWAY_H, z], [HALL_HALF_W, -RUNWAY_H, z], 'rgba(212, 175, 55, 0.045)', 1);
      }

      // 2. Vaulted dark ceiling with recessed overhead light bays (rendered only when camera is inside hall)
      if (cam.pos.y < HALL_H - 0.2) {
        drawPoly3D(cam, [
          [-HALL_HALF_W, HALL_H, ARCH_Z], [HALL_HALF_W, HALL_H, ARCH_Z],
          [HALL_HALF_W, HALL_H, 18.0], [-HALL_HALF_W, HALL_H, 18.0]
        ], '#0E1315');
        for (let z = 2.2; z <= 10.2; z += 2.6) {
          drawPoly3D(cam, [
            [-1.35, HALL_H - 0.02, z - 0.14], [1.35, HALL_H - 0.02, z - 0.14],
            [1.35, HALL_H - 0.02, z + 0.14], [-1.35, HALL_H - 0.02, z + 0.14]
          ], 'rgba(246, 236, 210, 0.22)');
        }
      }

      // 3. Side architectural walls with fluted pilasters & golden-trimmed recessed niches
      for (let side = -1; side <= 1; side += 2) {
        const wx = side * HALL_HALF_W;
        drawPoly3D(cam, [
          [wx, -RUNWAY_H, ARCH_Z], [wx, HALL_H, ARCH_Z],
          [wx, HALL_H, 18.0], [wx, -RUNWAY_H, 18.0]
        ], side < 0 ? '#111618' : '#141B1D');

        // Cornice & baseboard trim lines
        drawLine3D(cam, [wx, 5.2, ARCH_Z], [wx, 5.2, 16.5], 'rgba(212, 175, 55, 0.18)', 1.2);
        drawLine3D(cam, [wx, -RUNWAY_H + 0.04, ARCH_Z], [wx, -RUNWAY_H + 0.04, 16.5], 'rgba(212, 175, 55, 0.14)', 1.2);

        for (let i = 0; i < 5; i++) {
          const zCenter = 2.1 + i * 2.35;
          const halfZ = 0.72;
          const outer = [[wx, 0.05, zCenter - halfZ], [wx, 3.1, zCenter - halfZ]];
          const inner = [[wx, 0.14, zCenter - halfZ * 0.8], [wx, 3.0, zCenter - halfZ * 0.8]];
          for (let k = 1; k < 10; k++) {
            const a = Math.PI - (k / 10) * Math.PI;
            outer.push([wx, 3.1 + Math.sin(a) * 0.78, zCenter + Math.cos(a) * halfZ]);
            inner.push([wx, 3.0 + Math.sin(a) * 0.62, zCenter + Math.cos(a) * halfZ * 0.8]);
          }
          outer.push([wx, 3.1, zCenter + halfZ], [wx, 0.05, zCenter + halfZ]);
          inner.push([wx, 3.0, zCenter + halfZ * 0.8], [wx, 0.14, zCenter + halfZ * 0.8]);

          drawPoly3D(cam, outer, '#182022', 'rgba(212, 175, 55, 0.16)', 1);
          drawPoly3D(cam, inner, '#0D1214');

          // Vertical architectural pilaster rib between niches
          const pz = zCenter + 1.18;
          drawLine3D(cam, [wx, -RUNWAY_H, pz], [wx, 5.2, pz], 'rgba(239, 233, 223, 0.06)', 1.5);
        }
      }

      // 4. Back Wall around Deep 3D Recessed Arch
      drawPoly3D(cam, [[-HALL_HALF_W, -RUNWAY_H, ARCH_Z], [-2.38, -RUNWAY_H, ARCH_Z], [-2.38, HALL_H, ARCH_Z], [-HALL_HALF_W, HALL_H, ARCH_Z]], '#12181A');
      drawPoly3D(cam, [[2.38, -RUNWAY_H, ARCH_Z], [HALL_HALF_W, -RUNWAY_H, ARCH_Z], [HALL_HALF_W, HALL_H, ARCH_Z], [2.38, HALL_H, ARCH_Z]], '#12181A');
      drawPoly3D(cam, [[-2.38, 2.32, ARCH_Z], [2.38, 2.32, ARCH_Z], [2.38, HALL_H, ARCH_Z], [-2.38, HALL_H, ARCH_Z]], '#12181A');

      renderDeep3DArch(cam, bgVis);

      // 2D Fibonacci Golden Spiral Roots growing richly in Step 0 -> Step 1 (زاویه تماشا!)
      const rootGrowth = smoothstep(0.16, 0.96, pos);
      renderFibonacciRoots(cam, rootGrowth, bgVis);

      // 6. Raised Honed-Obsidian Catwalk Stage with Recessed Gold Cove Lighting
      drawPoly3D(cam, [[-RUNWAY_HALF_W, -RUNWAY_H, ARCH_Z], [-RUNWAY_HALF_W, 0, ARCH_Z], [-RUNWAY_HALF_W, 0, RUNWAY_LEN], [-RUNWAY_HALF_W, -RUNWAY_H, RUNWAY_LEN]], '#161D20');
      drawPoly3D(cam, [[RUNWAY_HALF_W, -RUNWAY_H, ARCH_Z], [RUNWAY_HALF_W, 0, ARCH_Z], [RUNWAY_HALF_W, 0, RUNWAY_LEN], [RUNWAY_HALF_W, -RUNWAY_H, RUNWAY_LEN]], '#1B2326');
      drawPoly3D(cam, [[-RUNWAY_HALF_W, -RUNWAY_H, RUNWAY_LEN], [RUNWAY_HALF_W, -RUNWAY_H, RUNWAY_LEN], [RUNWAY_HALF_W, 0, RUNWAY_LEN], [-RUNWAY_HALF_W, 0, RUNWAY_LEN]], '#13191B');

      // Warm golden under-lip LED cove running beneath catwalk edges
      drawLine3D(cam, [-RUNWAY_HALF_W, -RUNWAY_H + 0.03, ARCH_Z + 0.1], [-RUNWAY_HALF_W, -RUNWAY_H + 0.03, RUNWAY_LEN], 'rgba(212, 175, 55, 0.42)', 2.0);
      drawLine3D(cam, [RUNWAY_HALF_W, -RUNWAY_H + 0.03, ARCH_Z + 0.1], [RUNWAY_HALF_W, -RUNWAY_H + 0.03, RUNWAY_LEN], 'rgba(212, 175, 55, 0.42)', 2.0);

      const rBack = project(cam, 0, 0, ARCH_Z);
      const rFront = project(cam, 0, 0, RUNWAY_LEN);
      let runwayGrad = '#1C2427';
      if (rBack && rFront) {
        const g = ctx.createLinearGradient(rBack.x, rBack.y, rFront.x, rFront.y);
        g.addColorStop(0, '#142627'); // subtle emerald reflection near arch!
        g.addColorStop(0.28, '#1B2427');
        g.addColorStop(0.75, '#273134');
        g.addColorStop(1, '#1B2325');
        runwayGrad = g;
      }
      drawPoly3D(cam, [
        [-RUNWAY_HALF_W, 0, ARCH_Z], [RUNWAY_HALF_W, 0, ARCH_Z],
        [RUNWAY_HALF_W, 0, RUNWAY_LEN], [-RUNWAY_HALF_W, 0, RUNWAY_LEN]
      ], runwayGrad, 'rgba(212, 175, 55, 0.28)', 1);

      // Subtle architectural stone slab seams & center walkway inlay
      for (let z = 1.9; z < RUNWAY_LEN; z += 1.9) {
        drawLine3D(cam, [-RUNWAY_HALF_W + 0.12, 0.002, z], [RUNWAY_HALF_W - 0.12, 0.002, z], 'rgba(239, 233, 223, 0.055)', 1);
      }
      drawLine3D(cam, [0, 0.003, ARCH_Z + 0.3], [0, 0.003, POSE_Z - 0.4], 'rgba(212, 175, 55, 0.14)', 1);

      // Signature golden framing strips on catwalk surface
      const ge = RUNWAY_HALF_W - 0.12;
      drawLine3D(cam, [-ge, 0.004, ARCH_Z + 0.05], [-ge, 0.004, RUNWAY_LEN - 0.12], 'rgba(212, 175, 55, 0.80)', 1.6);
      drawLine3D(cam, [ge, 0.004, ARCH_Z + 0.05], [ge, 0.004, RUNWAY_LEN - 0.12], 'rgba(212, 175, 55, 0.80)', 1.6);
      drawLine3D(cam, [-ge, 0.004, RUNWAY_LEN - 0.12], [ge, 0.004, RUNWAY_LEN - 0.12], 'rgba(212, 175, 55, 0.80)', 1.6);

      // Seamless ultra-soft longitudinal architectural sheen along catwalk (zero harsh circular rings!)
      if (rBack && rFront) {
        const pulse = 0.92 + 0.08 * Math.sin(idleClock * 1.3);
        const sheen = ctx.createLinearGradient(rBack.x, rBack.y, rFront.x, rFront.y);
        sheen.addColorStop(0.0, 'rgba(32, 132, 128, ' + (0.09 * pulse).toFixed(3) + ')');
        sheen.addColorStop(0.35, 'rgba(242, 232, 206, ' + (0.05 * pulse).toFixed(3) + ')');
        sheen.addColorStop(0.78, 'rgba(246, 236, 210, ' + (0.085 * pulse).toFixed(3) + ')');
        sheen.addColorStop(1.0, 'rgba(16, 20, 21, 0)');
        drawPoly3D(cam, [
          [-RUNWAY_HALF_W + 0.14, 0.005, ARCH_Z + 0.06], [RUNWAY_HALF_W - 0.14, 0.005, ARCH_Z + 0.06],
          [RUNWAY_HALF_W - 0.14, 0.005, RUNWAY_LEN - 0.14], [-RUNWAY_HALF_W + 0.14, 0.005, RUNWAY_LEN - 0.14]
        ], sheen);
      }

      ctx.restore();
    }

    // 7. Living Cinema Key Spotlight & Atmospheric Dust Motes when Focused on a Posing Model
    if (focus > 0.01) {
      const topP = project(cam, 0.12 + orbit.currX * 0.32, 2.85, POSE_Z);
      const midP = project(cam, 0, 1.16, POSE_Z);
      if (topP && midP) {
        ctx.save();
        const shimmer = 0.94 + 0.06 * Math.sin(idleClock * 1.8);
        const sx = topP.x;
        const mx = midP.x + orbit.currX * 22;
        const my = midP.y + orbit.currY * 12;

        const layers = [
          { wBot: 0.44, a0: 0.11, a1: 0.04 },
          { wBot: 0.31, a0: 0.15, a1: 0.06 },
          { wBot: 0.19, a0: 0.19, a1: 0.085 }
        ];
        for (let i = 0; i < layers.length; i++) {
          const L = layers[i];
          const rx = Math.max(120, viewW * L.wBot);
          const ry = Math.max(260, viewH * 0.88);
          ctx.save();
          ctx.translate(lerp(sx, mx, 0.55), viewH * 0.36);
          ctx.rotate((mx - sx) / Math.max(400, viewH) * -0.45);
          ctx.scale(1, ry / rx);
          const g = ctx.createRadialGradient(0, -rx * 0.25, rx * 0.05, 0, 0, rx);
          g.addColorStop(0, 'rgba(250, 240, 214, ' + (L.a0 * focus * shimmer).toFixed(3) + ')');
          g.addColorStop(0.55, 'rgba(232, 218, 190, ' + (L.a1 * focus * shimmer).toFixed(3) + ')');
          g.addColorStop(1, 'rgba(16, 20, 21, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, rx, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Warm key + subtle emerald rim halo framing the Arcane silhouette
        const haloR = Math.max(195, Math.min(viewW, viewH) * 0.46);
        const halo = ctx.createRadialGradient(mx, my - haloR * 0.1, haloR * 0.05, mx, my, haloR);
        halo.addColorStop(0, 'rgba(252, 240, 210, ' + (0.26 * focus * shimmer).toFixed(3) + ')');
        halo.addColorStop(0.45, 'rgba(24, 98, 96, ' + (0.13 * focus).toFixed(3) + ')');
        halo.addColorStop(1, 'rgba(16, 20, 21, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(mx, my, haloR, 0, Math.PI * 2);
        ctx.fill();

        // Ultra-subtle floating warm dust motes strictly inside the spotlight shaft
        if (!REDUCED_MOTION) {
          for (let i = 0; i < DUST_MOTES.length; i++) {
            const dm = DUST_MOTES[i];
            const yPos = ((dm.yNorm - idleClock * dm.speed) % 1 + 1) % 1;
            const xPos = mx + (dm.xNorm + Math.sin(idleClock * 0.7 + dm.phase) * 0.04) * viewW * 0.42;
            const py = yPos * viewH;
            const alpha = Math.sin(yPos * Math.PI) * 0.28 * focus;
            if (alpha > 0.02) {
              ctx.fillStyle = 'rgba(246, 232, 188, ' + alpha.toFixed(3) + ')';
              ctx.beginPath();
              ctx.arc(xPos, py, dm.size, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        ctx.restore();
      }
    }
  }

  // --------------------------------------------------------------------------
  // 8. 24fps Sprite-Sheet & High-Res Pose Renderer
  // --------------------------------------------------------------------------
  function drawSpriteCell(sheet, cols, rows, idx, footX, footY, drawW, drawH, leanAngle, alpha) {
    if (!sheet || !sheet.complete || sheet.naturalWidth === 0 || alpha <= 0.005) return;
    const cellW = sheet.naturalWidth / cols;
    const cellH = sheet.naturalHeight / rows;
    const col = idx % cols;
    const row = Math.floor(idx / cols);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(footX, footY);
    ctx.rotate(leanAngle);
    ctx.drawImage(sheet, col * cellW, row * cellH, cellW, cellH, -drawW * 0.5, -drawH, drawW, drawH);
    ctx.restore();
  }

  function renderModel(cam, st, focus) {
    if (!st || st.alpha <= 0.01) return;

    const footP = project(cam, st.x, st.y, st.z);
    const groundP = project(cam, st.x, 0, st.z);
    const headP = project(cam, st.x, st.y + MODEL_HEIGHT, st.z);
    if (!footP || !groundP || !headP) return;

    const drawH = Math.abs(footP.y - headP.y);
    if (drawH < 8 || drawH > viewH * 3.2) return;

    const imgAspect = 2 / 3;
    const cosTurn = Math.abs(Math.cos(st.turnAngle));
    const pivotW = 0.28 + 0.72 * Math.pow(cosTurn, 0.72);
    const gyroScaleW = 1 - Math.abs(orbit.currX) * 0.04 * focus;
    const drawW = drawH * imgAspect * pivotW * gyroScaleW;

    // Grounded contact shadow on honed obsidian catwalk
    if (groundP.y < viewH + 40) {
      const sw = drawH * 0.21 * (0.85 + 0.15 * pivotW);
      const sh = sw * 0.24;
      const sg = ctx.createRadialGradient(groundP.x, groundP.y, sw * 0.08, groundP.x, groundP.y, sw);
      sg.addColorStop(0, 'rgba(0, 0, 0, ' + (0.68 * st.alpha).toFixed(3) + ')');
      sg.addColorStop(0.55, 'rgba(0, 0, 0, ' + (0.30 * st.alpha).toFixed(3) + ')');
      sg.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.save();
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.ellipse(groundP.x, groundP.y, sw, sh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Glossy dark-stone runway floor reflection beneath feet
      const reflAlpha = st.alpha * 0.14 * (1 - focus * 0.72);
      if (reflAlpha > 0.01) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(groundP.x - drawW * 0.65, groundP.y, drawW * 1.3, drawH * 0.24);
        ctx.clip();
        ctx.translate(groundP.x, groundP.y);
        ctx.scale(1, -0.34);
        if (st.mode === 'walk') drawSpriteCell(st.model.walkSheet, 6, 4, st.frameIdx, 0, 0, drawW, drawH, 0, reflAlpha);
        else if (st.mode === 'topose') drawSpriteCell(st.model.toPoseSheet, 4, 3, st.frameIdx, 0, 0, drawW, drawH, 0, reflAlpha);
        else if (st.mode === 'back') drawSpriteCell(st.model.backSheet, 4, 3, st.frameIdx, 0, 0, drawW, drawH, 0, reflAlpha);
        else drawSpriteCell(st.model.poseHi, 1, 1, 0, 0, 0, drawW, drawH, 0, reflAlpha);
        ctx.restore();
      }
    }

    const totalLean = st.leanAngle + orbit.currX * 0.02 * focus;
    if (st.mode === 'walk') {
      drawSpriteCell(st.model.walkSheet, 6, 4, st.frameIdx, footP.x, footP.y, drawW, drawH, totalLean, st.alpha);
    } else if (st.mode === 'topose') {
      drawSpriteCell(st.model.toPoseSheet, 4, 3, st.frameIdx, footP.x, footP.y, drawW, drawH, totalLean, st.alpha);
    } else if (st.mode === 'back') {
      drawSpriteCell(st.model.backSheet, 4, 3, st.frameIdx, footP.x, footP.y, drawW, drawH, totalLean, st.alpha);
    } else {
      drawSpriteCell(st.model.poseHi, 1, 1, 0, footP.x, footP.y, drawW, drawH, totalLean, st.alpha);
    }
  }

  function renderScene() {
    const focus = getSpotlightFocus(currentPos);
    const cam = evaluateCamera(currentPos);
    renderHallAndLivingLighting(cam, currentPos, focus);

    const activeModels = [];
    for (let i = 0; i < MODELS.length; i++) {
      const st = evaluateModelState(i, currentPos);
      if (st) {
        const p = project(cam, st.x, st.y, st.z);
        if (p) { st._camZ = p.z; activeModels.push(st); }
      }
    }
    activeModels.sort(function (a, b) { return b._camZ - a._camZ; });
    for (let i = 0; i < activeModels.length; i++) {
      renderModel(cam, activeModels[i], focus);
    }
  }

  // --------------------------------------------------------------------------
  // 9. UI Sync, Frosted-Glass Drawer & Hardware Gyroscope
  // --------------------------------------------------------------------------
  function setInfoExpanded(open) {
    infoExpanded = !!open;
    if (garmentBlurWidget) garmentBlurWidget.classList.toggle('is-expanded', infoExpanded);
    if (garmentBlurTrigger) garmentBlurTrigger.setAttribute('aria-expanded', infoExpanded ? 'true' : 'false');
  }

  function updateGyroBtnVisibility(step) {
    if (!gyroEnableBtn) return;
    const onModel = step >= 2 && step <= 5;
    gyroEnableBtn.classList.toggle('is-visible', onModel && orbit.needsIOSPermission && !orbit.gyroGranted);
  }

  function syncUI(step) {
    const clampedStep = clamp(Math.round(step), 0, MAX_STEP);
    if (navStepBadge) navStepBadge.textContent = 'STEP 0' + (clampedStep + 1) + ' / 0' + (MAX_STEP + 1);

    navButtons.forEach(function (btn) {
      const isActive = parseInt(btn.getAttribute('data-jump-step'), 10) === clampedStep;
      btn.classList.toggle('active', isActive);
      if (isActive && btn.scrollIntoView) {
        try { btn.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' }); } catch (e) {}
      }
    });
    stepDots.forEach(function (dot) {
      dot.classList.toggle('active', parseInt(dot.getAttribute('data-jump-step'), 10) === clampedStep);
    });

    if (stageIntroOverlay) stageIntroOverlay.classList.toggle('is-hidden', clampedStep !== 0);
    setInfoExpanded(false);
    updateGyroBtnVisibility(clampedStep);

    if (garmentBlurWidget) {
      const modelIdx = clampedStep - 2;
      if (modelIdx >= 0 && modelIdx < MODELS.length) {
        if (garmentPanelCode) garmentPanelCode.textContent = MODELS[modelIdx].code;
        garmentDetailItems.forEach(function (el) {
          el.classList.toggle('is-active', parseInt(el.getAttribute('data-look-detail'), 10) === modelIdx);
        });
        garmentBlurWidget.classList.add('is-visible');
        garmentBlurWidget.setAttribute('aria-hidden', 'false');
      } else {
        garmentBlurWidget.classList.remove('is-visible');
        garmentBlurWidget.setAttribute('aria-hidden', 'true');
      }
    }

    if (siteFooter) {
      const isFooter = clampedStep === MAX_STEP;
      siteFooter.classList.toggle('is-open', isFooter);
      siteFooter.setAttribute('aria-hidden', isFooter ? 'false' : 'true');
    }
  }

  function goToStep(nextStep) {
    const dest = clamp(nextStep, 0, MAX_STEP);
    if (dest === targetStep && !anim) return;
    const fromPos = currentPos;
    targetStep = dest;
    syncUI(dest);
    const key = Math.round(fromPos) + '->' + dest;
    const baseDur = STEP_DURATIONS[key] || Math.min(2750, 950 + Math.abs(dest - fromPos) * 520);
    anim = {
      from: fromPos, to: dest,
      startTime: performance.now(),
      duration: REDUCED_MOTION ? Math.min(480, baseDur * 0.35) : baseDur
    };
    ensureLoopRunning();
  }

  let settleLockUntil = 0;
  let lastIdleRender = 0;

  function handleScrollCommand(dir) {
    if (dir === 0) return;
    const stepDir = dir > 0 ? 1 : -1;
    const now = performance.now();

    if (anim) {
      const animDir = anim.to >= anim.from ? 1 : -1;
      // Strict single-step guard: never skip 2-3 slides from momentum or accidental double-scroll
      if (stepDir === animDir) return;
      // Deliberate reverse mid-transition returns smoothly to the origin step
      const backStep = clamp(Math.round(anim.from), 0, MAX_STEP);
      if (backStep !== targetStep) goToStep(backStep);
      return;
    }

    if (now < settleLockUntil) return;
    const next = clamp(targetStep + stepDir, 0, MAX_STEP);
    if (next === targetStep) return;
    ensureModelLoaded(next - 2);
    ensureModelLoaded(next - 1);
    goToStep(next);
  }

  function tick(now) {
    if (document.hidden) { rafId = null; return; }
    const dt = lastFrameTime ? Math.min(0.05, (now - lastFrameTime) / 1000) : 0.016;
    lastFrameTime = now;
    idleClock += dt;

    const spring = 1 - Math.exp(-dt * 8.0);
    orbit.currX += (orbit.targetX - orbit.currX) * spring;
    orbit.currY += (orbit.targetY - orbit.currY) * spring;

    let needsNext = false;
    if (anim) {
      const t = clamp((now - anim.startTime) / anim.duration, 0, 1);
      currentPos = lerp(anim.from, anim.to, t);
      if (t >= 1) {
        currentPos = anim.to;
        anim = null;
        settleLockUntil = now + SETTLE_LOCK_MS;
        wheelUsed = true;
        wheelAcc = 0;
      } else {
        needsNext = true;
      }
    }

    const orbitMoving = Math.abs(orbit.targetX - orbit.currX) > 0.002 || Math.abs(orbit.targetY - orbit.currY) > 0.002;
    const isDynamic = !!anim || orbitMoving;

    if (isDynamic) {
      renderScene();
      lastIdleRender = now;
      needsNext = true;
    } else if (!REDUCED_MOTION) {
      // Zero-quality-loss optimization: throttle subtle idle ambient breathing to ~24fps when scene is static
      if (now - lastIdleRender >= 42) {
        renderScene();
        lastIdleRender = now;
      }
      needsNext = true;
    }

    rafId = needsNext ? requestAnimationFrame(tick) : null;
  }

  function ensureLoopRunning() {
    if (rafId === null) {
      lastFrameTime = performance.now();
      rafId = requestAnimationFrame(tick);
    }
  }

  // Hardware Mobile Gyroscope + Desktop Mouse Hover + Touch Fallback
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    orbit.targetX = clamp((e.clientX / Math.max(1, viewW)) * 2 - 1, -1, 1);
    orbit.targetY = clamp(((e.clientY - 54) / Math.max(1, viewH)) * 2 - 1, -1, 1);
    if (getSpotlightFocus(currentPos) > 0.05) ensureLoopRunning();
  }, { passive: true });

  window.addEventListener('pointerleave', function () {
    orbit.targetX = 0; orbit.targetY = 0; ensureLoopRunning();
  }, { passive: true });

  function onDeviceOrientation(e) {
    if (e.gamma === null || e.beta === null) return;
    orbit.gyroAvailable = true;
    orbit.gyroGranted = true;
    updateGyroBtnVisibility(targetStep);
    orbit.targetX = clamp(e.gamma / 28, -1, 1);
    orbit.targetY = clamp((e.beta - 50) / 28, -1, 1);
    if (getSpotlightFocus(currentPos) > 0.05) ensureLoopRunning();
  }

  function initGyroscope() {
    if (typeof window.DeviceOrientationEvent === 'undefined') return;
    if (typeof window.DeviceOrientationEvent.requestPermission === 'function') {
      orbit.needsIOSPermission = true;
      if (gyroEnableBtn) {
        gyroEnableBtn.addEventListener('click', function () {
          window.DeviceOrientationEvent.requestPermission()
            .then(function (st) {
              if (st === 'granted') {
                orbit.gyroGranted = true;
                updateGyroBtnVisibility(targetStep);
                window.addEventListener('deviceorientation', onDeviceOrientation, { passive: true });
              }
            }).catch(function () {});
        });
      }
    } else {
      window.addEventListener('deviceorientation', onDeviceOrientation, { passive: true });
    }
  }

  // Sticky Scroll Inputs
  let wheelAcc = 0, lastWheelTime = 0, lastWheelDir = 0, wheelUsed = false;
  function isInsideScrollableOverlay(target, dy) {
    const sc = target && target.closest ? target.closest('.site-footer.is-open, .garment-blur-widget.is-expanded .garment-blur-panel') : null;
    if (!sc || sc.scrollHeight <= sc.clientHeight + 4) return false;
    return (dy > 0 && sc.scrollTop + sc.clientHeight < sc.scrollHeight - 2) || (dy < 0 && sc.scrollTop > 1);
  }

  window.addEventListener('wheel', function (e) {
    const now = performance.now();
    const gap = now - lastWheelTime;
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? viewH : 1;
    const dy = e.deltaY * unit;
    const dir = dy > 0 ? 1 : dy < 0 ? -1 : 0;
    if (isInsideScrollableOverlay(e.target, dy)) { lastWheelTime = now; wheelUsed = true; return; }
    e.preventDefault();
    lastWheelTime = now;
    if (gap > WHEEL_QUIET_MS || (dir !== 0 && lastWheelDir !== 0 && dir !== lastWheelDir && Math.abs(dy) >= 12)) {
      wheelUsed = false; wheelAcc = 0;
    }
    if (dir !== 0) lastWheelDir = dir;
    if (wheelUsed) return;
    wheelAcc += dy;
    if (Math.abs(wheelAcc) >= WHEEL_THRESHOLD) {
      const d = wheelAcc > 0 ? 1 : -1;
      wheelAcc = 0; wheelUsed = true; handleScrollCommand(d);
    }
  }, { passive: false });

  let touchStartY = null, touchStartX = null, touchUsed = false, touchIgnore = false;
  window.addEventListener('touchstart', function (e) {
    touchIgnore = !!(
      (siteNavbar && e.target && siteNavbar.contains(e.target)) ||
      (garmentBlurWidget && e.target && garmentBlurWidget.contains(e.target)) ||
      (gyroEnableBtn && e.target && gyroEnableBtn.contains(e.target))
    );
    if (touchIgnore) return;
    if (e.touches && e.touches.length > 0) {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      touchUsed = false;
    }
  }, { passive: true });

  window.addEventListener('touchmove', function (e) {
    if (touchIgnore || touchStartY === null || !e.touches || e.touches.length === 0) return;
    const dy = touchStartY - e.touches[0].clientY;
    const dx = e.touches[0].clientX - touchStartX;
    if (isInsideScrollableOverlay(e.target, dy)) { touchUsed = true; return; }
    if (!orbit.gyroAvailable && getSpotlightFocus(currentPos) > 0.4 && Math.abs(dx) > Math.abs(dy) * 1.3 && Math.abs(dx) > 10) {
      e.preventDefault();
      orbit.targetX = clamp(dx / (viewW * 0.42), -1, 1);
      ensureLoopRunning();
      return;
    }
    e.preventDefault();
    if (touchUsed) return;
    if (Math.abs(dy) >= TOUCH_THRESHOLD) { touchUsed = true; handleScrollCommand(dy > 0 ? 1 : -1); }
  }, { passive: false });

  window.addEventListener('touchend', function () {
    if (!orbit.gyroAvailable) { orbit.targetX = 0; orbit.targetY = 0; ensureLoopRunning(); }
  }, { passive: true });

  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && infoExpanded) { e.preventDefault(); setInfoExpanded(false); return; }
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); if (!e.repeat) handleScrollCommand(1); }
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); if (!e.repeat) handleScrollCommand(-1); }
    else if (e.key === 'Home') { e.preventDefault(); goToStep(0); }
    else if (e.key === 'End') { e.preventDefault(); goToStep(MAX_STEP); }
  });

  if (garmentBlurTrigger) garmentBlurTrigger.addEventListener('click', function () { setInfoExpanded(!infoExpanded); });
  if (garmentPanelClose) garmentPanelClose.addEventListener('click', function () { setInfoExpanded(false); });
  function jumpToStepDirect(nextStep) {
    const dest = clamp(nextStep, 0, MAX_STEP);
    ensureModelLoaded(dest - 2);
    ensureModelLoaded(dest - 1);
    anim = null;
    settleLockUntil = 0;
    currentPos = dest;
    targetStep = dest;
    syncUI(dest);
    renderScene();
    ensureLoopRunning();
  }

  jumpButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const s = parseInt(btn.getAttribute('data-jump-step'), 10);
      if (!isNaN(s)) jumpToStepDirect(s);
    });
  });
  if (stageScrollCue) {
    stageScrollCue.addEventListener('click', function () { goToStep(1); });
    stageScrollCue.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToStep(1); } });
  }
  if (footerBackTopBtn) footerBackTopBtn.addEventListener('click', function (e) { e.preventDefault(); jumpToStepDirect(0); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) ensureLoopRunning(); });

  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    viewW = Math.max(320, Math.round(rect.width));
    viewH = Math.max(320, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    renderScene();
  }
  let resizeTimer = null;
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(resizeCanvas, 80); });
  window.addEventListener('orientationchange', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(resizeCanvas, 80); });

  function ensureModelLoaded(idx) {
    if (idx < 0 || idx >= MODELS.length) return;
    const m = MODELS[idx];
    if (m._loadingStarted) return;
    m._loadingStarted = true;
    const imgs = [
      ['poseHi', m.poseHiSrc],
      ['walkSheet', m.walkSheetSrc],
      ['toPoseSheet', m.toPoseSheetSrc],
      ['backSheet', m.backSheetSrc]
    ];
    imgs.forEach(function (pair) {
      const im = new Image();
      im.decoding = 'async';
      if (idx === 0) im.fetchPriority = 'high';
      im.onload = renderScene;
      im.src = pair[1];
      m[pair[0]] = im;
    });
  }

  function preloadModels() {
    // Priority-load Look 1 immediately for instant first paint, then progressively load Looks 2-4
    ensureModelLoaded(0);
    const schedule = window.requestIdleCallback || function (cb) { return setTimeout(cb, 120); };
    schedule(function () { ensureModelLoaded(1); });
    setTimeout(function () { ensureModelLoaded(2); }, 240);
    setTimeout(function () { ensureModelLoaded(3); }, 420);
  }

  function init() {
    preloadModels();
    initGyroscope();
    resizeCanvas();
    syncUI(0);
    renderScene();
    ensureLoopRunning();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.__runwayTest = {
    setPos: function (p) {
      anim = null;
      currentPos = clamp(p, 0, MAX_STEP);
      targetStep = Math.round(currentPos);
      syncUI(targetStep);
      renderScene();
    },
    setOrbit: function (x, y) {
      orbit.targetX = orbit.currX = clamp(x, -1, 1);
      orbit.targetY = orbit.currY = clamp(y, -1, 1);
      renderScene();
    },
    sampleCameraCurve: function (fromP, toP, samples) {
      const out = [];
      for (let i = 0; i <= samples; i++) {
        const p = fromP + (toP - fromP) * (i / samples);
        const c = evaluateCamera(p);
        out.push({ p: p, eye: [c.pos.x, c.pos.y, c.pos.z] });
      }
      return out;
    },
    getState: function () {
      const loaded = MODELS.reduce(function (acc, m) {
        return acc
          + (m.walkSheet && m.walkSheet.complete && m.walkSheet.naturalWidth > 0 ? 1 : 0)
          + (m.toPoseSheet && m.toPoseSheet.complete && m.toPoseSheet.naturalWidth > 0 ? 1 : 0)
          + (m.poseHi && m.poseHi.complete && m.poseHi.naturalWidth > 0 ? 1 : 0)
          + (m.backSheet && m.backSheet.complete && m.backSheet.naturalWidth > 0 ? 1 : 0);
      }, 0);
      return {
        currentPos: currentPos,
        targetStep: targetStep,
        loadedAssets: loaded,
        infoExpanded: infoExpanded,
        spotlightFocus: getSpotlightFocus(currentPos),
        isAnimating: !!anim
      };
    },
    triggerScroll: function (dir) { handleScrollCommand(dir); }
  };
})();
