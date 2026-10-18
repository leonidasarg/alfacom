// Menú: transparente sobre el hero, con fondo al desplazarse
const header = document.querySelector('.site-header');
const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24 || nav.classList.contains('open'));
window.addEventListener('scroll', onScroll, { passive: true });

// Menú mobile
const toggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('nav');
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  nav.classList.toggle('open', !open);
  onScroll();
});
onScroll();
nav.addEventListener('click', (e) => {
  if (e.target.closest('a')) {
    toggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('open');
    onScroll();
  }
});

// Alinea cada anotación del plano con el elemento que señala
const figure = document.querySelector('.blueprint');
const targets = {
  n1: '.store-bar',
  n2: '.p-price',
  n3: '.buy',
  n4: '.p-ship',
};
function placeNotes() {
  if (window.innerWidth <= 600) return;
  const box = figure.getBoundingClientRect();
  let prevBottom = -Infinity;
  for (const [cls, sel] of Object.entries(targets)) {
    const note = figure.querySelector('.' + cls);
    const r = figure.querySelector(sel).getBoundingClientRect();
    const h = note.offsetHeight;
    // centro en el elemento, pero sin pisar la anotación anterior
    const center = Math.max(r.top - box.top + r.height / 2, prevBottom + 8 + h / 2);
    note.style.top = center + 'px';
    prevBottom = center + h / 2;
  }
}
placeNotes();
window.addEventListener('resize', placeNotes);
document.fonts && document.fonts.ready.then(placeNotes);

// Formulario: valida y abre el correo con la consulta armada
const form = document.getElementById('form');
const errorBox = document.getElementById('form-error');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = form.nombre;
  const email = form.email;
  const missing = [];
  [name, email].forEach((f) => f.removeAttribute('aria-invalid'));

  if (!name.value.trim()) { missing.push('tu nombre'); name.setAttribute('aria-invalid', 'true'); }
  if (!email.value.trim() || !email.validity.valid) { missing.push('un email válido'); email.setAttribute('aria-invalid', 'true'); }

  if (missing.length) {
    errorBox.textContent = 'Para enviar la consulta, completá ' + missing.join(' y ') + '.';
    errorBox.hidden = false;
    form.querySelector('[aria-invalid="true"]').focus();
    return;
  }
  errorBox.hidden = true;

  const services = [...form.querySelectorAll('input[name="servicio"]:checked')].map((i) => i.value);
  const body = [
    'Nombre: ' + name.value.trim(),
    'Email: ' + email.value.trim(),
    'Tienda actual: ' + (form.tienda.value.trim() || '-'),
    'Necesito: ' + (services.join(', ') || '-'),
    '',
    form.mensaje.value.trim(),
  ].join('\n');

  window.location.href = 'mailto:hola@alfacom.com?subject=' +
    encodeURIComponent('Consulta desde la web: ' + name.value.trim()) +
    '&body=' + encodeURIComponent(body);

  form.innerHTML =
    '<div class="form-done" role="status"><h3>Consulta lista para enviar</h3>' +
    '<p>Se abrió tu correo con los datos cargados. Envialo y te respondemos en menos de 24 horas hábiles.</p></div>';
});

document.getElementById('year').textContent = new Date().getFullYear();

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------------------------------------------------------
   Campo de triángulos: celdas de 40×30 divididas por su
   diagonal (atan(30/40) = 37°, el ángulo de la flecha del
   isotipo). La luz sigue al cursor y se ve por las uniones.
   --------------------------------------------------------- */
// mezcla dos colores RGB: t = 1 da b, t = 0 da a
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * Math.min(1, t)));

const TONES = {
  dark: {
    radius: 180,
    face: [120, 165, 245], faceAlpha: 0.45,
    edge: [170, 205, 255], edgeAlpha: 1, halo: 0.55, width: 1.6,
    base: 0.05, decay: 0.955,
    tail: [40, 94, 201],
    lit: [205, 225, 255], shade: [14, 36, 92],
    hot: [252, 129, 38],
  },
  light: {
    radius: 150,
    face: [78, 130, 230], faceAlpha: 0.42,
    edge: [40, 94, 201], edgeAlpha: 1, halo: 0.18, width: 1.4,
    base: 0, decay: 0.95,
    tail: [18, 52, 128],
    lit: [150, 190, 250], shade: [18, 52, 128],
    hot: [252, 129, 38],
  },
};

function triField(canvas) {
  const section = canvas.parentElement;
  const tone = TONES[canvas.dataset.tone] || TONES.dark;
  const ctx = canvas.getContext('2d');
  const W = 40, H = 30;
  let tris = [], width = 0, height = 0, dpr = 1;
  const pos = { x: -9999, y: -9999 };
  const target = { x: -9999, y: -9999 };
  let glow = 0, glowTarget = 0, raf = 0, visible = true;

  function build() {
    const r = section.getBoundingClientRect();
    width = r.width; height = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    tris = [];
    for (let y = 0; y < height + H; y += H) {
      for (let x = 0; x < width + W; x += W) {
        // dos triángulos por celda, separados por la diagonal ascendente
        tris.push({ p: [x, y, x + W, y, x, y + H], cx: x + W / 3, cy: y + H / 3, s: Math.random(), heat: 0, up: true });
        tris.push({ p: [x + W, y, x + W, y + H, x, y + H], cx: x + (2 * W) / 3, cy: y + (2 * H) / 3, s: Math.random(), heat: 0, up: false });
      }
    }
    draw();
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const R = tone.radius;
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';

    // trama de base, muy tenue
    if (tone.base) {
      ctx.strokeStyle = `rgba(${tone.edge}, ${tone.base})`;
      ctx.beginPath();
      for (let y = 0; y <= height + H; y += H) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
      for (let x = 0; x <= width + W; x += W) { ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.moveTo(x, height); }
      for (let y = 0; y <= height + H; y += H) {
        for (let x = 0; x <= width; x += W) { ctx.moveTo(x, y + H); ctx.lineTo(x + W, y); }
      }
      ctx.stroke();
    }
    if (glow > 0.01) {
      // halo de luz bajo el cursor
      const g = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, R * 1.1);
      g.addColorStop(0, `rgba(${tone.face}, ${tone.halo * glow})`);
      g.addColorStop(1, `rgba(${tone.face}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(pos.x - R * 1.1, pos.y - R * 1.1, R * 2.2, R * 2.2);
    }
    ctx.lineWidth = tone.width;

    // cada triángulo guarda su "calor": así el recorrido deja una estela.
    // Relieve: luz desde arriba a la izquierda. El triángulo superior de
    // cada celda mira a la luz (cara clara) y el inferior queda en sombra.
    for (const t of tris) {
      const f = t.heat;
      if (f < 0.01) continue;
      const p = t.p;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]); ctx.lineTo(p[2], p[3]); ctx.lineTo(p[4], p[5]); ctx.closePath();
      const hot = t.s > 0.93 && f > 0.3;
      // la estela vira del color fresco al profundo a medida que se enfría
      const base = mix(tone.tail, tone.face, f);
      const c = hot ? tone.hot : t.up ? mix(base, tone.lit, 0.45) : mix(base, tone.shade, 0.4);
      ctx.fillStyle = `rgba(${c}, ${hot ? f * 0.6 : f * tone.faceAlpha * (0.5 + 0.5 * t.s)})`;
      ctx.fill();

      // bordes iluminados y bordes en sombra
      ctx.beginPath();
      if (t.up) { ctx.moveTo(p[4], p[5]); ctx.lineTo(p[0], p[1]); ctx.lineTo(p[2], p[3]); }
      else { ctx.moveTo(p[4], p[5]); ctx.lineTo(p[0], p[1]); }
      ctx.strokeStyle = `rgba(${tone.lit}, ${f * tone.edgeAlpha})`;
      ctx.stroke();
      ctx.beginPath();
      if (t.up) { ctx.moveTo(p[2], p[3]); ctx.lineTo(p[4], p[5]); }
      else { ctx.moveTo(p[0], p[1]); ctx.lineTo(p[2], p[3]); ctx.lineTo(p[4], p[5]); }
      ctx.strokeStyle = `rgba(${tone.shade}, ${f * tone.edgeAlpha * 0.8})`;
      ctx.stroke();
    }
  }

  // enfría todo y calienta lo que está bajo el cursor
  function stamp() {
    const R = tone.radius;
    let max = 0;
    for (const t of tris) {
      let h = t.heat * tone.decay;
      if (glow > 0.01) {
        const dx = t.cx - pos.x, dy = t.cy - pos.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < R * R) h = Math.max(h, Math.pow(1 - Math.sqrt(d2) / R, 1.2) * glow);
      }
      t.heat = h < 0.005 ? 0 : h;
      if (h > max) max = h;
    }
    return max;
  }

  function tick() {
    pos.x += (target.x - pos.x) * 0.14;
    pos.y += (target.y - pos.y) * 0.14;
    glow += (glowTarget - glow) * 0.08;
    const heat = stamp();
    draw();
    const moving = Math.abs(target.x - pos.x) > 0.3 || Math.abs(target.y - pos.y) > 0.3 || Math.abs(glowTarget - glow) > 0.005;
    raf = (moving || heat > 0.01) && visible ? requestAnimationFrame(tick) : 0;
  }
  const kick = () => { if (!raf && !reduceMotion) raf = requestAnimationFrame(tick); };

  if (reduceMotion) {
    glow = glowTarget = 0.35;
  } else if (canHover) {
    // se escucha en toda la página para que el efecto siga funcionando
    // aunque el cursor esté sobre el menú, que flota encima del hero
    window.addEventListener('pointermove', (e) => {
      const r = section.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) {
        if (glowTarget) { glowTarget = 0; kick(); }
        return;
      }
      target.x = e.clientX - r.left; target.y = e.clientY - r.top;
      if (glow < 0.02) { pos.x = target.x; pos.y = target.y; }
      glowTarget = 1;
      kick();
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { glowTarget = 0; kick(); });
  } else {
    // táctil: la luz recorre la sección sola, despacio
    let t0 = performance.now();
    const wander = (now) => {
      if (visible) {
        const t = (now - t0) / 1000;
        target.x = width * (0.5 + 0.38 * Math.sin(t * 0.35));
        target.y = height * (0.5 + 0.32 * Math.sin(t * 0.52 + 1));
        glowTarget = 0.8;
        pos.x += (target.x - pos.x) * 0.05; pos.y += (target.y - pos.y) * 0.05;
        glow += (glowTarget - glow) * 0.05;
        stamp();
        draw();
      }
      requestAnimationFrame(wander);
    };
    requestAnimationFrame(wander);
  }

  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) kick(); }).observe(section);
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 150); });
  build();
  if (reduceMotion) { pos.x = target.x = width * 0.9; pos.y = target.y = height * 0.85; stamp(); draw(); }
}
document.querySelectorAll('.tri-field').forEach(triField);

/* ---------------------------------------------------------
   Plano: inclinación 3D y vínculo entre nota y elemento
   --------------------------------------------------------- */
const store = document.querySelector('.store');
if (canHover && !reduceMotion) {
  figure.addEventListener('pointermove', (e) => {
    const r = store.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    store.style.setProperty('--ry', (x * 10).toFixed(2) + 'deg');
    store.style.setProperty('--rx', (-y * 8).toFixed(2) + 'deg');
    figure.classList.add('is-tilting');
  });
  figure.addEventListener('pointerleave', () => {
    store.style.setProperty('--rx', '0deg');
    store.style.setProperty('--ry', '0deg');
    figure.classList.remove('is-tilting');
  });
}
figure.querySelectorAll('[data-note]').forEach((el) => {
  const note = figure.querySelector('.' + el.dataset.note);
  const on = () => { el.classList.add('is-hot'); note.classList.add('is-hot'); };
  const off = () => { el.classList.remove('is-hot'); note.classList.remove('is-hot'); };
  [el, note.querySelector('span')].forEach((n) => {
    n.addEventListener('pointerenter', on);
    n.addEventListener('pointerleave', off);
  });
});

/* ---------------------------------------------------------
   Foco de luz que sigue al cursor dentro de las tarjetas
   --------------------------------------------------------- */
if (canHover) {
  document.querySelectorAll('.step, .channels > div, .timeline li, .form').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', e.clientX - r.left + 'px');
      card.style.setProperty('--my', e.clientY - r.top + 'px');
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--mx', '-999px');
      card.style.setProperty('--my', '-999px');
    });
  });
}

/* ---------------------------------------------------------
   Linterna de color en los títulos
   --------------------------------------------------------- */
if (canHover) {
  document.querySelectorAll('h1, h2, .step h3, .fact-num').forEach((el) => {
    el.classList.add('spot');
    if (el.closest('.media, .s3')) el.classList.add('spot-dark');
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--tx', e.clientX - r.left + 'px');
      el.style.setProperty('--ty', e.clientY - r.top + 'px');
      el.classList.add('is-lit');
    });
    el.addEventListener('pointerleave', () => el.classList.remove('is-lit'));
  });
}
