// Menú mobile
const toggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('nav');
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  nav.classList.toggle('open', !open);
});
nav.addEventListener('click', (e) => {
  if (e.target.closest('a')) {
    toggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('open');
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
