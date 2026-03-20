/**
 * telemetry-pro.js
 * Canvas particle network, waveform, risk dial, scroll reveals.
 * CSP-safe — no eval, no innerHTML, no inline handlers.
 */

'use strict';

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── SignalNetwork — Canvas 2D particle graph ──────────────────────────

class SignalNetwork {
  #canvas;
  #ctx;
  #nodes = [];
  #particles = [];
  #raf = null;
  #observer;
  #mouse = { x: -9999, y: -9999 };
  #running = false;

  static #LABELS = [
    'KEYSTROKE', 'DWELL', 'VELOCITY', 'PASTE',
    'FOCUS', 'CORRECTIONS', 'AUTOFILL', 'WEBDRIVER',
  ];

  constructor(canvasId) {
    this.#canvas = document.getElementById(canvasId);
    if (!this.#canvas) return;
    this.#ctx = this.#canvas.getContext('2d');
    this.#resize();
    this.#buildNodes();
    this.#buildParticles();

    window.addEventListener('resize', () => {
      this.#resize();
      this.#buildNodes();
      this.#buildParticles();
    }, { passive: true });

    const section = this.#canvas.parentElement;
    section?.addEventListener('mousemove', (e) => {
      const rect = this.#canvas.getBoundingClientRect();
      this.#mouse.x = e.clientX - rect.left;
      this.#mouse.y = e.clientY - rect.top;
    }, { passive: true });
    section?.addEventListener('mouseleave', () => {
      this.#mouse.x = -9999;
      this.#mouse.y = -9999;
    }, { passive: true });

    this.#observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) this.#start();
        else this.#stop();
      }
    }, { threshold: 0.01 });
    this.#observer.observe(this.#canvas);
  }

  #resize() {
    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    const w = this.#canvas.offsetWidth;
    const h = this.#canvas.offsetHeight;
    this.#canvas.width = w * dpr;
    this.#canvas.height = h * dpr;
    this.#ctx.scale(dpr, dpr);
  }

  #buildNodes() {
    const w = this.#canvas.offsetWidth;
    const h = this.#canvas.offsetHeight;

    const center = {
      x: w * 0.62, y: h * 0.5,
      r: 18, label: 'HMAC·SHA256', isCenter: true,
      vx: 0, vy: 0,
    };

    const spread = Math.min(w, h) * 0.3;
    const signal = SignalNetwork.#LABELS.map((label, i) => {
      const angle = (i / SignalNetwork.#LABELS.length) * Math.PI * 2 - Math.PI / 2;
      const ox = center.x + Math.cos(angle) * spread + (Math.random() - 0.5) * 30;
      const oy = center.y + Math.sin(angle) * spread + (Math.random() - 0.5) * 30;
      return {
        x: ox, y: oy,
        originX: ox, originY: oy,
        r: 5, label,
        isCenter: false,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
      };
    });

    this.#nodes = [center, ...signal];
  }

  #buildParticles() {
    this.#particles = [];
    for (let i = 0; i < 36; i++) this.#spawnParticle(Math.random());
  }

  #spawnParticle(initialT = 0) {
    const signal = this.#nodes.filter(n => !n.isCenter);
    const center = this.#nodes.find(n => n.isCenter);
    if (!signal.length || !center) return;
    const src = signal[Math.floor(Math.random() * signal.length)];
    this.#particles.push({
      src,
      x: src.x,
      y: src.y,
      t: initialT,
      speed: 0.003 + Math.random() * 0.004,
    });
  }

  #tick() {
    const w = this.#canvas.offsetWidth;
    const h = this.#canvas.offsetHeight;
    const ctx = this.#ctx;
    const center = this.#nodes.find(n => n.isCenter);
    if (!center) return;

    ctx.clearRect(0, 0, w, h);

    // Float signal nodes
    for (const n of this.#nodes) {
      if (n.isCenter) continue;
      // Spring toward origin
      n.vx += (n.originX - n.x) * 0.0015;
      n.vy += (n.originY - n.y) * 0.0015;
      // Mouse repulsion
      const dx = n.x - this.#mouse.x;
      const dy = n.y - this.#mouse.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 110 && dist > 0) {
        const force = ((110 - dist) / 110) * 0.7;
        n.vx += (dx / dist) * force;
        n.vy += (dy / dist) * force;
      }
      n.vx *= 0.96;
      n.vy *= 0.96;
      n.x += n.vx;
      n.y += n.vy;
    }

    // Edges
    for (const n of this.#nodes) {
      if (n.isCenter) continue;
      const dist = Math.hypot(n.x - center.x, n.y - center.y);
      const alpha = Math.max(0, 1 - dist / 320) * 0.1;
      ctx.beginPath();
      ctx.moveTo(n.x, n.y);
      ctx.lineTo(center.x, center.y);
      ctx.strokeStyle = `rgba(52,211,153,${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Particles
    for (const p of this.#particles) {
      p.t += p.speed;
      p.x = p.src.x + (center.x - p.src.x) * p.t;
      p.y = p.src.y + (center.y - p.src.y) * p.t;

      const alpha =
        p.t < 0.1  ? p.t * 10 :
        p.t > 0.85 ? (1 - p.t) / 0.15 : 1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(52,211,153,${alpha * 0.85})`;
      ctx.fill();

      if (p.t >= 1) {
        const signal = this.#nodes.filter(n => !n.isCenter);
        p.src = signal[Math.floor(Math.random() * signal.length)];
        p.t = 0;
        p.speed = 0.003 + Math.random() * 0.004;
      }
    }

    // Signal nodes
    for (const n of this.#nodes) {
      if (n.isCenter) continue;

      // Soft glow
      const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 18);
      grd.addColorStop(0, 'rgba(52,211,153,0.12)');
      grd.addColorStop(1, 'rgba(52,211,153,0)');
      ctx.beginPath();
      ctx.arc(n.x, n.y, 18, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Circle
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(52,211,153,0.12)';
      ctx.strokeStyle = 'rgba(52,211,153,0.45)';
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.font = '500 8.5px "IBM Plex Mono", monospace';
      ctx.fillStyle = 'rgba(52,211,153,0.55)';
      ctx.textAlign = 'center';
      ctx.fillText(n.label, n.x, n.y - n.r - 5);
    }

    // Center node
    const cg = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, 42);
    cg.addColorStop(0, 'rgba(5,150,105,0.25)');
    cg.addColorStop(1, 'rgba(5,150,105,0)');
    ctx.beginPath();
    ctx.arc(center.x, center.y, 42, 0, Math.PI * 2);
    ctx.fillStyle = cg;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(center.x, center.y, center.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(5,150,105,0.35)';
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    ctx.font = '600 9px "IBM Plex Mono", monospace';
    ctx.fillStyle = '#34d399';
    ctx.textAlign = 'center';
    ctx.fillText(center.label, center.x, center.y + center.r + 14);
  }

  #start() {
    if (this.#running || reducedMotion()) return;
    this.#running = true;
    const loop = () => {
      if (!this.#running) return;
      this.#tick();
      this.#raf = requestAnimationFrame(loop);
    };
    this.#raf = requestAnimationFrame(loop);
  }

  #stop() {
    this.#running = false;
    if (this.#raf !== null) {
      cancelAnimationFrame(this.#raf);
      this.#raf = null;
    }
  }
}

// ── WaveformAnimator ──────────────────────────────────────────────────

class WaveformAnimator {
  #linePath = null;
  #fillPath = null;
  #statusEl = null;
  #timeEl = null;
  #raf = null;
  #running = false;
  #observer = null;
  #data = [];
  #t = 0;
  #botMode = false;
  #botTimer = 0;

  static #W = 800;
  static #H = 100;
  static #PTS = 80;

  constructor() {
    this.#linePath = document.getElementById('tp-wave-line');
    this.#fillPath = document.getElementById('tp-wave-fill');
    this.#statusEl  = document.getElementById('tp-wave-status');
    this.#timeEl    = document.getElementById('tp-wave-time');
    if (!this.#linePath) return;

    for (let i = 0; i < WaveformAnimator.#PTS; i++) {
      this.#data.push(this.#humanSample());
    }

    if (reducedMotion()) {
      this.#render();
      return;
    }

    const svg = document.getElementById('tp-waveform');
    if (!svg) return;

    this.#observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) this.#start();
        else this.#stop();
      }
    }, { threshold: 0.1 });
    this.#observer.observe(svg);
  }

  #humanSample() {
    return 18 + Math.random() * 62 + Math.sin(this.#t * 0.08) * 12;
  }

  #botSample() {
    return 46 + Math.random() * 5;
  }

  #buildLine(data) {
    const W = WaveformAnimator.#W;
    const H = WaveformAnimator.#H;
    const step = W / (data.length - 1);
    let d = `M 0 ${H - data[0]}`;
    for (let i = 1; i < data.length; i++) {
      const x  = i * step;
      const y  = H - data[i];
      const px = (i - 1) * step;
      const py = H - data[i - 1];
      d += ` C ${px + step * 0.5} ${py} ${x - step * 0.5} ${y} ${x} ${y}`;
    }
    return d;
  }

  #render() {
    const line = this.#buildLine(this.#data);
    const fill = `${line} L ${WaveformAnimator.#W} ${WaveformAnimator.#H} L 0 ${WaveformAnimator.#H} Z`;
    this.#linePath?.setAttribute('d', line);
    this.#fillPath?.setAttribute('d', fill);
  }

  #formatTime(ms) {
    const m   = Math.floor(ms / 60000).toString().padStart(2, '0');
    const s   = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
    const fms = (ms % 1000).toString().padStart(3, '0');
    return `${m}:${s}.${fms}`;
  }

  #tick() {
    this.#t++;
    this.#botTimer++;

    if (!this.#botMode && this.#botTimer > 420) {
      this.#botMode = true;
      this.#botTimer = 0;
      if (this.#statusEl) {
        this.#statusEl.textContent = 'bot pattern detected';
        this.#statusEl.style.color = '#f59e0b';
      }
    } else if (this.#botMode && this.#botTimer > 65) {
      this.#botMode = false;
      this.#botTimer = 0;
      if (this.#statusEl) {
        this.#statusEl.textContent = 'human pattern detected';
        this.#statusEl.style.color = '#34d399';
      }
    }

    this.#data.shift();
    this.#data.push(this.#botMode ? this.#botSample() : this.#humanSample());
    this.#render();

    if (this.#timeEl) {
      this.#timeEl.textContent = this.#formatTime(this.#t * 16);
    }
  }

  #start() {
    if (this.#running) return;
    this.#running = true;
    const loop = () => {
      if (!this.#running) return;
      this.#tick();
      this.#raf = requestAnimationFrame(loop);
    };
    this.#raf = requestAnimationFrame(loop);
  }

  #stop() {
    this.#running = false;
    if (this.#raf !== null) {
      cancelAnimationFrame(this.#raf);
      this.#raf = null;
    }
  }
}

// ── RiskDialAnimator ──────────────────────────────────────────────────

class RiskDialAnimator {
  #arc = null;
  #scoreEl = null;
  #verdictEl = null;
  #verdictTextEl = null;
  #bars = [];
  #vals = [];
  #observer = null;
  #timer = null;
  #step = 0;
  #started = false;

  static #CIRC = 603; // 2π × 96 ≈ 603.19

  // rows: [botMarkers, velocityAnomaly, pasteInject, envAnomaly, patternScore]
  // Each value is out of 20; all five must sum to score.
  static #SEQ = [
    { score: 8,  verdict: 'ALLOW',  cls: '',                   rows: [0,  2,  0,  0,  6]  },
    { score: 12, verdict: 'ALLOW',  cls: '',                   rows: [0,  3,  2,  0,  7]  },
    { score: 8,  verdict: 'ALLOW',  cls: '',                   rows: [0,  2,  0,  0,  6]  },
    { score: 74, verdict: 'REVIEW', cls: 'tp-verdict--review', rows: [10, 18, 20, 16, 10] },
    { score: 31, verdict: 'ALLOW',  cls: '',                   rows: [2,  8,  5,  4,  12] },
    { score: 8,  verdict: 'ALLOW',  cls: '',                   rows: [0,  2,  0,  0,  6]  },
  ];

  constructor() {
    this.#arc           = document.getElementById('tp-dial-arc');
    this.#scoreEl       = document.getElementById('tp-dial-score');
    this.#verdictEl     = document.getElementById('tp-verdict');
    this.#verdictTextEl = document.getElementById('tp-verdict-text');
    if (!this.#arc) return;

    const section = this.#arc.closest('section');
    if (!section) return;

    this.#bars = Array.from(section.querySelectorAll('.tp-score-bar'));
    this.#vals = Array.from(section.querySelectorAll('.tp-score-val'));

    this.#observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !this.#started) {
          this.#started = true;
          this.#run();
        }
      }
    }, { threshold: 0.3 });
    this.#observer.observe(section);
  }

  #setScore(score) {
    const offset = RiskDialAnimator.#CIRC * (1 - score / 100);
    this.#arc.style.strokeDashoffset = String(Math.round(offset));

    const color = score < 40 ? '#34d399' : score < 70 ? '#f59e0b' : '#f87171';
    this.#arc.style.stroke = color;
    if (this.#scoreEl) {
      this.#scoreEl.textContent = String(score);
      this.#scoreEl.style.color = score < 40 ? '#f0f6ff' : color;
    }
  }

  #setVerdict(verdict, cls) {
    if (!this.#verdictEl || !this.#verdictTextEl) return;
    this.#verdictEl.className = `tp-verdict${cls ? ' ' + cls : ''}`;
    this.#verdictTextEl.textContent = `VERDICT: ${verdict}`;
  }

  // Each row value is /20; bar fills proportionally.
  #updateRows(rows) {
    rows.forEach((val, i) => {
      const bar = this.#bars[i];
      const valEl = this.#vals[i];
      if (bar) bar.style.width = `${(val / 20) * 100}%`;
      if (valEl) valEl.textContent = `${val} / 20`;
    });
  }

  #run() {
    const seq = RiskDialAnimator.#SEQ;

    if (reducedMotion()) {
      this.#setScore(seq[0].score);
      this.#setVerdict(seq[0].verdict, seq[0].cls);
      this.#updateRows(seq[0].rows);
      return;
    }

    const advance = () => {
      const s = seq[this.#step];
      this.#setScore(s.score);
      this.#setVerdict(s.verdict, s.cls);
      this.#updateRows(s.rows);
      this.#step = (this.#step + 1) % seq.length;
      this.#timer = setTimeout(advance, this.#step === 0 ? 3200 : 1500);
    };

    this.#timer = setTimeout(advance, 500);
  }

  destroy() {
    if (this.#timer !== null) clearTimeout(this.#timer);
    this.#observer?.disconnect();
  }
}

// ── SigAnimator — scrambles signature hex string ─────────────────────

class SigAnimator {
  #el = null;
  #interval = null;
  static #HEX = '0123456789abcdef';

  constructor() {
    this.#el = document.getElementById('tp-sig-text');
    if (!this.#el || reducedMotion()) return;
    this.#interval = setInterval(() => this.#scramble(), 2400);
  }

  #scramble() {
    let s = '';
    for (let i = 0; i < 16; i++) {
      s += SigAnimator.#HEX[Math.floor(Math.random() * 16)];
    }
    if (this.#el) this.#el.textContent = s + '...';
  }

  destroy() {
    if (this.#interval !== null) clearInterval(this.#interval);
  }
}

// ── Scroll reveal ─────────────────────────────────────────────────────

function initScrollReveal() {
  const els = document.querySelectorAll('.tp-reveal, .tp-reveal-left');

  if (reducedMotion()) {
    els.forEach(el => el.classList.add('tp-revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('tp-revealed');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -32px 0px' });

  els.forEach(el => observer.observe(el));
}

// ── Boot ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  new SignalNetwork('tp-canvas');
  new SignalNetwork('tp-cta-canvas');
  new WaveformAnimator();
  new RiskDialAnimator();
  new SigAnimator();
  initScrollReveal();
});
