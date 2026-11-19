window.__started = true;
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { initializeFirestore, doc, setDoc, getDoc, getDocs, collection, query, where, onSnapshot, updateDoc, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCnVH5hnu5wUVyHe4efuWFsigMQMwrGiik",
  authDomain: "juego-en-linea-7ec9d.firebaseapp.com",
  projectId: "juego-en-linea-7ec9d",
  storageBucket: "juego-en-linea-7ec9d.firebasestorage.app",
  messagingSenderId: "266462814776",
  appId: "1:266462814776:web:d3e8ec37d9f35f51b6bccd"
};
const fbApp = initializeApp(firebaseConfig);
const auth = initializeAuth(fbApp, { persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence] });
const db = initializeFirestore(fbApp, { experimentalAutoDetectLongPolling: true });

// ================= UTILIDADES =================
const $ = id => document.getElementById(id);
const app = $('app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gamesCol = () => collection(db, 'games');
const playersCol = () => collection(db, 'players');
const OPT = [{c:'#e21b3c',s:'#b0102b'},{c:'#1368ce',s:'#0f509e'},{c:'#d89e00',s:'#a87b00'},{c:'#26890c',s:'#1d6909'}];
const shape = (i, s = 28) => {
  const p = ['<polygon points="12,3 22,21 2,21"/>','<polygon points="12,2 22,12 12,22 2,12"/>','<circle cx="12" cy="12" r="10"/>','<rect x="3" y="3" width="18" height="18"/>'][i];
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="white">${p}</svg>`;
};
const optIdx = (q, i) => q.type === 'tf' ? (i === 0 ? 1 : 0) : i;
const optBox = (q, i, extra = '') => { const k = optIdx(q, i); return `style="background:${OPT[k].c};box-shadow:0 6px 0 ${OPT[k].s}" ${extra}`; };
const visibleOpts = q => q.type === 'tf' ? [0, 1] : q.options.map((t, i) => String(t).trim() ? i : -1).filter(i => i >= 0);
const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const TYPES = {
  quiz:   { n: 'Quiz', i: '🔲' },
  tf:     { n: 'Verdadero o falso', i: '✔️' },
  type:   { n: 'Respuesta corta', i: '📝' },
  slider: { n: 'Slider numérico', i: '🎚️' },
  poll:   { n: 'Encuesta', i: '📊' }
};
const mkQ = (type = 'quiz') => ({
  type, text: '', image: '', time: 20, points: 'standard',
  options: type === 'tf' ? ['Verdadero', 'Falso'] : ['', '', '', ''],
  correct: 0, answers: [''], min: 0, max: 100, sliderCorrect: 50, margin: 5
});
const clone = o => JSON.parse(JSON.stringify(o));

// ================= CARPETAS Y CREACIÓN =================
const LS_FOLDERS = 'quizgo_folders_data';
function getFolders() {
  const def = [
    { id: 'tablas', name: 'Tablas de Matemática', icon: '🔢', desc: 'Sumar, restar, multiplicar y dividir', grad: ['#ff9f1c', '#ff5a5f'] },
    { id: 'primaria34', name: 'Primaria 3° y 4°', icon: '🎒', desc: '6 Quizzes de 50 preguntas c/u', grad: ['#4ecb71', '#2e9a4f'] },
    { id: 'ingles_abc', name: 'Pronunciación del Abecedario', icon: '🔤', desc: '4 Quizzes de Pronunciación de Letras (A-X)', grad: ['#1368ce', '#7b61ff'] },
    { id: 'animales_read', name: 'Nombres de Animales', icon: '🦁', desc: '8 Quizzes de Pronunciación de Animales en Inglés (14 preguntas c/u)', grad: ['#ff9f1c', '#4ecb71'] },
    { id: 'palabras_daily', name: 'Palabras Cotidianas en Inglés', icon: '💬', desc: '8 Quizzes de Palabras y Frases Cotidianas (Escritura y Pronunciación)', grad: ['#7b61ff', '#ff7eb6'] }
  ];
  try {
    let f = JSON.parse(localStorage.getItem(LS_FOLDERS));
    if (f && Array.isArray(f) && f.length) {
      def.forEach(d => { if (!f.some(x => x.id === d.id)) f.push(d); });
      localStorage.setItem(LS_FOLDERS, JSON.stringify(f));
      return f;
    }
  } catch(e) {}
  localStorage.setItem(LS_FOLDERS, JSON.stringify(def));
  return def;
}
let FOLDERS = getFolders();
window.__cf = null;

window.newFolder = () => {
  const name = prompt('Ingresa el nombre de la nueva carpeta:');
  if (!name || !name.trim()) return;
  const grads = [['#46178f', '#9b51e0'], ['#1368ce', '#2f80ed'], ['#e21b3c', '#eb5757'], ['#d89e00', '#f2c94c'], ['#26890c', '#27ae60']];
  const grad = grads[Math.floor(Math.random() * grads.length)];
  FOLDERS.push({ id: 'f_' + Date.now(), name: name.trim(), icon: '📁', desc: 'Carpeta personalizada', grad });
  localStorage.setItem(LS_FOLDERS, JSON.stringify(FOLDERS));
  showLibrary();
};

window.openFolderEdit = id => {
  const f = FOLDERS.find(x => x.id === id);
  if (!f) return;
  $('f-id').value = f.id;
  $('f-name').value = f.name || '';
  $('f-img').value = f.img || '';
  $('modal-folder').classList.remove('hidden');
};

window.readFolderImg = input => {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    $('f-img').value = e.target.result;
  };
  reader.readAsDataURL(file);
};

window.saveFolderEdit = () => {
  const id = $('f-id').value;
  const f = FOLDERS.find(x => x.id === id);
  if (f) {
    f.name = $('f-name').value.trim() || f.name;
    f.img = $('f-img').value.trim();
    localStorage.setItem(LS_FOLDERS, JSON.stringify(FOLDERS));
    showLibrary(window.__cf);
  }
};

// ================= SESIÓN =================
const SES = 'quizgo_session';
const getSession = () => { try { return JSON.parse(localStorage.getItem(SES) || 'null'); } catch (e) { return null; } };
const setSession = s => { try { localStorage.setItem(SES, JSON.stringify(s)); } catch (e) {} };
const clearSession = () => { try { localStorage.removeItem(SES); } catch (e) {} };

// ================= PERSONAJES REALISTAS 3D (ESTILO KAHOOT) =================
const AV_COLORS = [
  ['#ff5a5f','#b31b20','#ffe5e6'], // Rojo
  ['#ff9f1c','#b86000','#fff0db'], // Naranja
  ['#ffd23f','#b58d00','#fff9e0'], // Amarillo
  ['#4ecb71','#207337','#e8f9ed'], // Verde
  ['#2ec4b6','#127067','#e0f8f6'], // Turquesa
  ['#4d9de0','#1c5e96','#e6f2fc'], // Azul
  ['#7b61ff','#4427cd','#eeebff'], // Violeta
  ['#c77dff','#7724b8','#faefff'], // Rosa Neón
  ['#ff7eb6','#bf266b','#ffe8f2'], // Rosa Pastel
  ['#8a99ad','#404e5f','#f0f4f8']  // Plateado
];
const AV_BODY_N = ['Burbuja 3D', 'Gatito 3D', 'Osito 3D', 'Conejo 3D', 'Bot Metal', 'Fantasma 3D'];
const AV_EYE_N = ['Brillantes 3D', 'Felices', 'Ojos Kawaii', 'Guiño 3D'];
const AV_MOUTH_N = ['Sonrisa 3D', 'Abierta 3D', 'Gatuna', 'Lengua 3D'];
const AV_ACC_N = ['Sin accesorio', 'Corona Real', 'Gafas de Sol 3D', 'Lentes Nerdy', 'Gorro Fiesta', 'Audífonos Pro', 'Lazo Coquette'];
const AV_AN_N = ['Saltarín', 'Flotante', 'Bailarín', 'Giratorio', 'Latido', 'Gelatina'];
const DEF_AV = { b: 0, c: 5, e: 0, m: 0, a: 0, an: 0 };

// Cuerpos 3D Renderizados con Sombras y Manos con Guantes Blancos
const BODIES_3D = [
  // 0: Blob 3D
  (gradId, darkGrad, c, d) => `
    <ellipse cx="50" cy="85" rx="30" ry="8" fill="rgba(0,0,0,0.35)"/>
    <circle cx="22" cy="62" r="11" fill="url(#handGrad)"/>
    <circle cx="78" cy="62" r="11" fill="url(#handGrad)"/>
    <circle cx="50" cy="54" r="36" fill="url(#${gradId})"/>
    <ellipse cx="40" cy="32" rx="16" ry="8" fill="#ffffff" opacity="0.45" transform="rotate(-25 40 32)"/>`,
  
  // 1: Gatito 3D
  (gradId, darkGrad, c, d) => `
    <ellipse cx="50" cy="87" rx="32" ry="7" fill="rgba(0,0,0,0.35)"/>
    <polygon points="16,38 24,6 48,24" fill="url(#${gradId})"/>
    <polygon points="84,38 76,6 52,24" fill="url(#${gradId})"/>
    <polygon points="22,34 26,14 42,26" fill="url(#${darkGrad})"/>
    <polygon points="78,34 74,14 58,26" fill="url(#${darkGrad})"/>
    <circle cx="20" cy="64" r="10" fill="url(#handGrad)"/>
    <circle cx="80" cy="64" r="10" fill="url(#handGrad)"/>
    <circle cx="50" cy="56" r="35" fill="url(#${gradId})"/>
    <ellipse cx="38" cy="32" rx="15" ry="7" fill="#ffffff" opacity="0.45" transform="rotate(-25 38 32)"/>`,

  // 2: Osito 3D
  (gradId, darkGrad, c, d) => `
    <ellipse cx="50" cy="87" rx="32" ry="7" fill="rgba(0,0,0,0.35)"/>
    <circle cx="22" cy="26" r="14" fill="url(#${gradId})"/>
    <circle cx="78" cy="26" r="14" fill="url(#${gradId})"/>
    <circle cx="22" cy="26" r="7" fill="url(#${darkGrad})"/>
    <circle cx="78" cy="26" r="7" fill="url(#${darkGrad})"/>
    <circle cx="18" cy="64" r="10" fill="url(#handGrad)"/>
    <circle cx="82" cy="64" r="10" fill="url(#handGrad)"/>
    <circle cx="50" cy="58" r="35" fill="url(#${gradId})"/>
    <ellipse cx="50" cy="64" rx="14" ry="10" fill="#ffffff" opacity="0.35"/>
    <ellipse cx="38" cy="34" rx="14" ry="7" fill="#ffffff" opacity="0.45" transform="rotate(-25 38 34)"/>`,

  // 3: Conejo 3D
  (gradId, darkGrad, c, d) => `
    <ellipse cx="50" cy="88" rx="30" ry="7" fill="rgba(0,0,0,0.35)"/>
    <ellipse cx="32" cy="20" rx="9" ry="22" fill="url(#${gradId})"/>
    <ellipse cx="68" cy="20" rx="9" ry="22" fill="url(#${gradId})"/>
    <ellipse cx="32" cy="22" rx="4.5" ry="15" fill="url(#${darkGrad})"/>
    <ellipse cx="68" cy="22" rx="4.5" ry="15" fill="url(#${darkGrad})"/>
    <circle cx="18" cy="66" r="10" fill="url(#handGrad)"/>
    <circle cx="82" cy="66" r="10" fill="url(#handGrad)"/>
    <circle cx="50" cy="60" r="33" fill="url(#${gradId})"/>
    <ellipse cx="38" cy="38" rx="13" ry="6" fill="#ffffff" opacity="0.45" transform="rotate(-25 38 38)"/>`,

  // 4: Robot 3D
  (gradId, darkGrad, c, d) => `
    <ellipse cx="50" cy="88" rx="34" ry="7" fill="rgba(0,0,0,0.35)"/>
    <line x1="50" y1="8" x2="50" y2="24" stroke="#ff3b30" stroke-width="4" stroke-linecap="round"/>
    <circle cx="50" cy="8" r="6" fill="#ff453a"/>
    <circle cx="50" cy="8" r="2" fill="#fff"/>
    <rect x="15" y="24" width="70" height="60" rx="22" fill="url(#${gradId})"/>
    <rect x="22" y="30" width="56" height="48" rx="15" fill="#1c1c1e" opacity="0.85"/>
    <rect x="6" y="46" width="10" height="20" rx="4" fill="url(#${darkGrad})"/>
    <rect x="84" y="46" width="10" height="20" rx="4" fill="url(#${darkGrad})"/>`,

  // 5: Fantasma 3D
  (gradId, darkGrad, c, d) => `
    <ellipse cx="50" cy="88" rx="28" ry="6" fill="rgba(0,0,0,0.25)"/>
    <circle cx="18" cy="58" r="9" fill="url(#handGrad)"/>
    <circle cx="82" cy="58" r="9" fill="url(#handGrad)"/>
    <path d="M16 88 V50 a34 34 0 0 1 68 0 V88 l-11.3 -7 l-11.3 7 l-11.4 -7 l-11.3 7 l-11.3 -7 l-11.3 7 z" fill="url(#${gradId})"/>
    <ellipse cx="38" cy="30" rx="14" ry="7" fill="#ffffff" opacity="0.45" transform="rotate(-25 38 30)"/>`
];

// Ojos 3D Expresivos
const EYES_3D = [
  // 0: Brillantes
  `<circle cx="36" cy="50" r="8.5" fill="#111"/>
   <circle cx="64" cy="50" r="8.5" fill="#111"/>
   <circle cx="38.5" cy="47.5" r="3.5" fill="#fff"/>
   <circle cx="66.5" cy="47.5" r="3.5" fill="#fff"/>
   <circle cx="34" cy="53" r="1.5" fill="#fff"/>
   <circle cx="62" cy="53" r="1.5" fill="#fff"/>`,
  // 1: Felices
  `<path d="M28 53 q8 -12 16 0 M56 53 q8 -12 16 0" stroke="#1c1c1e" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
  // 2: Kawaii
  `<circle cx="36" cy="50" r="9" fill="#1c1c1e"/>
   <circle cx="64" cy="50" r="9" fill="#1c1c1e"/>
   <circle cx="38.5" cy="46.5" r="4.2" fill="#fff"/>
   <circle cx="66.5" cy="46.5" r="4.2" fill="#fff"/>
   <circle cx="33.5" cy="53" r="2" fill="#fff"/>
   <circle cx="61.5" cy="53" r="2" fill="#fff"/>
   <ellipse cx="27" cy="56" rx="5" ry="3" fill="#ff3b30" opacity="0.5"/>
   <ellipse cx="73" cy="56" rx="5" ry="3" fill="#ff3b30" opacity="0.5"/>`,
  // 3: Guiño
  `<path d="M28 50 h16" stroke="#1c1c1e" stroke-width="4.5" stroke-linecap="round"/>
   <circle cx="64" cy="50" r="8.5" fill="#1c1c1e"/>
   <circle cx="66.5" cy="47.5" r="3.5" fill="#fff"/>`
];

// Bocas 3D
const MOUTHS_3D = [
  // 0: Sonrisa
  `<path d="M38 66 q12 12 24 0" stroke="#1c1c1e" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  // 1: Abierta con lengua
  `<path d="M38 65 q12 18 24 0 z" fill="#8e001c" stroke="#1c1c1e" stroke-width="2.5"/>
   <path d="M43 72 q5 6 10 0" fill="#ff453a"/>`,
  // 2: Gatuna
  `<path d="M39 66 q6 7 11 0 q6 7 11 0" stroke="#1c1c1e" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
  // 3: Lengua afuera
  `<path d="M38 65 q12 10 24 0" stroke="#1c1c1e" stroke-width="4" fill="none" stroke-linecap="round"/>
   <path d="M45 70 q5 11 10 0 z" fill="#ff3b30" stroke="#1c1c1e" stroke-width="1.5"/>`
];

// Accesorios 3D con Brillo
const ACCS_3D = [
  ``, // Ninguno
  // 1: Corona Real 3D
  `<polygon points="28,26 28,6 40,18 50,2 60,18 72,6 72,26" fill="url(#goldGrad)" stroke="#b58d00" stroke-width="2" stroke-linejoin="round"/>
   <circle cx="50" cy="5" r="3" fill="#ff3b30"/>
   <circle cx="28" cy="8" r="2.5" fill="#007aff"/>
   <circle cx="72" cy="8" r="2.5" fill="#34c759"/>`,
  // 2: Gafas de Sol 3D
  `<rect x="22" y="42" width="26" height="18" rx="8" fill="url(#darkGlassGrad)" stroke="#1c1c1e" stroke-width="2"/>
   <rect x="52" y="42" width="26" height="18" rx="8" fill="url(#darkGlassGrad)" stroke="#1c1c1e" stroke-width="2"/>
   <path d="M48 48 h4" stroke="#1c1c1e" stroke-width="4"/>
   <path d="M26 45 l8 -2" stroke="#fff" stroke-width="2" opacity="0.6"/>
   <path d="M56 45 l8 -2" stroke="#fff" stroke-width="2" opacity="0.6"/>`,
  // 3: Lentes Nerdy
  `<circle cx="36" cy="50" r="13" stroke="#1c1c1e" stroke-width="3.5" fill="rgba(255,255,255,0.2)"/>
   <circle cx="64" cy="50" r="13" stroke="#1c1c1e" stroke-width="3.5" fill="rgba(255,255,255,0.2)"/>
   <path d="M49 50 h2" stroke="#1c1c1e" stroke-width="4"/>`,
  // 4: Gorro Fiesta 3D
  `<polygon points="50,2 32,32 68,32" fill="url(#pinkGrad)"/>
   <circle cx="50" cy="3" r="5" fill="#fff"/>
   <circle cx="44" cy="20" r="2.5" fill="#ffd23f"/>
   <circle cx="56" cy="26" r="2.5" fill="#30d158"/>`,
  // 5: Audífonos Pro 3D
  `<path d="M16 52 a34 34 0 0 1 68 0" stroke="#1c1c1e" stroke-width="6" fill="none"/>
   <rect x="8" y="42" width="14" height="24" rx="7" fill="url(#darkGlassGrad)" stroke="#3a3a3c" stroke-width="2"/>
   <rect x="78" y="42" width="14" height="24" rx="7" fill="url(#darkGlassGrad)" stroke="#3a3a3c" stroke-width="2"/>`,
  // 6: Lazo Coquette
  `<polygon points="70,28 86,18 86,38" fill="url(#pinkGrad)"/>
   <polygon points="70,28 54,18 54,38" fill="url(#pinkGrad)"/>
   <circle cx="70" cy="28" r="5" fill="#ff2d55"/>`
];

const EYES_SAD_3D = `
  <circle cx="36" cy="52" r="7.5" fill="#1c1c1e"/>
  <circle cx="64" cy="52" r="7.5" fill="#1c1c1e"/>
  <circle cx="38" cy="50" r="2.5" fill="#fff"/>
  <circle cx="66" cy="50" r="2.5" fill="#fff"/>
  <path d="M26 44 L42 48 M74 44 L58 48" stroke="#1c1c1e" stroke-width="3.5" stroke-linecap="round"/>`;
const MOUTH_SAD_3D = `<path d="M38 72 q12 -10 24 0" stroke="#1c1c1e" stroke-width="4" fill="none" stroke-linecap="round"/>`;
const TEAR_3D = `<path class="tear" d="M28 60 q-5 8 0 11 q5 -3 0 -11z" fill="#64d2ff" stroke="#007aff" stroke-width="0.8"/>`;

let avUidCounter = 0;

function avatarSVG(av, mood) {
  const a = { ...DEF_AV, ...(av || {}) };
  const sad = mood === 'sad';
  const [c, d, light] = AV_COLORS[a.c] || AV_COLORS[0];
  const uid = 'av_' + (++avUidCounter);

  const defs = `
    <defs>
      <radialGradient id="grad_${uid}" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stop-color="${light}"/>
        <stop offset="40%" stop-color="${c}"/>
        <stop offset="100%" stop-color="${d}"/>
      </radialGradient>
      <radialGradient id="darkGrad_${uid}" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stop-color="${c}"/>
        <stop offset="100%" stop-color="${d}"/>
      </radialGradient>
      <radialGradient id="handGrad" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="70%" stop-color="#e5e5ea"/>
        <stop offset="100%" stop-color="#feffff"/>
      </radialGradient>
      <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffe875"/>
        <stop offset="50%" stop-color="#ffd23f"/>
        <stop offset="100%" stop-color="#b58d00"/>
      </linearGradient>
      <linearGradient id="darkGlassGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3a3a3c"/>
        <stop offset="100%" stop-color="#1c1c1e"/>
      </linearGradient>
      <linearGradient id="pinkGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ff7eb6"/>
        <stop offset="100%" stop-color="#ff2d55"/>
      </linearGradient>
    </defs>`;

  const bodyHTML = (BODIES_3D[a.b] || BODIES_3D[0])(`grad_${uid}`, `darkGrad_${uid}`, c, d);
  const eyeHTML = sad ? EYES_SAD_3D : (EYES_3D[a.e] || EYES_3D[0]);
  const mouthHTML = sad ? MOUTH_SAD_3D + TEAR_3D : (MOUTHS_3D[a.m] || MOUTHS_3D[0]);
  const accHTML = ACCS_3D[a.a] || '';

  return `<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    ${defs}
    ${bodyHTML}
    <!-- Rubor en mejillas -->
    <ellipse cx="26" cy="62" rx="6" ry="4" fill="#ff2d55" opacity="${sad ? 0.2 : 0.45}"/>
    <ellipse cx="74" cy="62" rx="6" ry="4" fill="#ff2d55" opacity="${sad ? 0.2 : 0.45}"/>
    <g class="blink">${eyeHTML}</g>
    ${mouthHTML}
    ${accHTML}
  </svg>`;
}

function avatarHTML(av, size = 64, anim = true, mood = '') {
  const a = { ...DEF_AV, ...(av || {}) };
  const sad = mood === 'sad';
  return `<div class="av-wrap ${sad ? 'av-sad av-an-sad' : anim ? 'av-an-' + (a.an || 0) : ''}" style="width:${size}px;height:${size}px">${avatarSVG(a, mood)}</div>`;
}

function bubbles() {
  return `<div class="bubbles">${Array.from({ length: 18 }, () => `<i style="--s:${35 + Math.random() * 100 | 0}px;--l:${Math.random() * 100 | 0}%;--d:${10 + Math.random() * 12 | 0}s;--dl:-${Math.random() * 15 | 0}s"></i>`).join('')}</div>`;
}
function confetti() {
  const cols = ['#ffc82c', '#ff5a5f', '#4ecb71', '#4d9de0', '#c77dff', '#ff7eb6'];
  return `<div class="confetti">${Array.from({ length: 40 }, () => `<i style="--l:${Math.random() * 100 | 0}%;--c:${cols[Math.random() * 6 | 0]};--d:${4 + Math.random() * 5 | 0}s;--dl:-${Math.random() * 8 | 0}s"></i>`).join('')}</div>`;
}
function toast(html) {
  const t = document.createElement('div');
  t.className = 'toast rounded-full px-6 py-3 flex items-center gap-3 text-white font-extrabold shadow-2xl glass';
  t.style.border = '1px solid rgba(255,255,255,0.4)';
  t.style.top = (20 + document.querySelectorAll('.toast').length * 64) + 'px';
  t.innerHTML = html; document.body.appendChild(t); setTimeout(() => t.remove(), 2900);
}
window.addEventListener('offline', () => toast('<span>📡 Sin conexión… se reconectará solo</span>'));
window.addEventListener('online', () => toast('<span>✅ Conexión recuperada</span>'));

const CARD_GRADS = [['#46178f', '#9b51e0'], ['#1368ce', '#2f80ed'], ['#e21b3c', '#eb5757'], ['#d89e00', '#f2c94c'], ['#26890c', '#27ae60'], ['#0f8b8d', '#20b2aa']];
const rnd = n => Math.floor(Math.random() * n);
const avRand = () => ({ b: rnd(6), c: rnd(10), e: rnd(4), m: rnd(4), a: rnd(7), an: rnd(6) });
const loadAvatar = () => { try { const a = JSON.parse(localStorage.getItem('quizgo_avatar') || 'null'); if (a) return { ...DEF_AV, ...a }; } catch (e) {} return avRand(); };
const saveAvatar = a => { try { localStorage.setItem('quizgo_avatar', JSON.stringify(a)); } catch (e) {} };

let AVED = null;
function renderAvatarEditor() {
  const { av, nick, mode } = AVED;
  const prev = $('av-opts'), top = prev ? prev.scrollTop : 0;
  const col = AV_COLORS[av.c][0];
  const tile = (sel, fn, inner, label = '') => `<button onclick="${fn}" class="rounded-2xl p-2 border-2 transition flex flex-col items-center ${sel ? 'border-white bg-white/20 scale-105 shadow-lg' : 'border-white/10 bg-white/5 hover:bg-white/15'}">${inner}${label ? `<span class="text-[11px] font-bold mt-1.5 opacity-90">${label}</span>` : ''}</button>`;
  const mini = (o, anim = false) => avatarHTML({ ...av, ...o }, 58, anim);
  const sec = (t, inner, cols = 'grid-cols-3 sm:grid-cols-6') => `<div><h3 class="text-xs font-black tracking-widest uppercase opacity-75 mb-2.5">${t}</h3><div class="grid ${cols} gap-2.5">${inner}</div></div>`;
  screen(`
    <div class="shrink-0 text-center pt-5 pb-2"><h1 class="text-3xl font-black tracking-tight">Crea tu personaje 3D</h1></div>
    <div class="flex-1 flex flex-col md:flex-row min-h-0 px-4 max-w-6xl mx-auto w-full gap-6">
      <div class="md:w-2/5 flex flex-col items-center justify-center p-6 shrink-0 glass rounded-3xl my-2">
        <div class="relative">
          <div class="absolute inset-0 rounded-full blur-3xl opacity-60" style="background:${col}"></div>
          <div class="relative">${avatarHTML(av, 200)}</div>
        </div>
        <div class="mt-5 text-3xl font-black">${esc(nick)}</div>
        <div class="text-sm font-semibold opacity-75 mb-5">${AV_BODY_N[av.b]} · ${AV_AN_N[av.an]}</div>
        <button onclick="avRandom()" class="glass px-6 py-2.5 rounded-full font-bold text-sm hover:bg-white/25 transition">🎲 Sorpréndeme</button>
      </div>
      <div id="av-opts" class="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 glass rounded-3xl my-2">
        ${sec('Personaje', AV_BODY_N.map((n, i) => tile(av.b === i, `avSet('b',${i})`, mini({ b: i }), n)).join(''))}
        ${sec('Color', AV_COLORS.map(([c, d], i) => `<button onclick="avSet('c',${i})" class="w-11 h-11 rounded-full border-[3px] transition ${av.c === i ? 'border-white scale-110 shadow-lg' : 'border-transparent'}" style="background:linear-gradient(135deg,${c},${d})"></button>`).join(''), 'grid-cols-5 sm:grid-cols-10')}
        ${sec('Ojos', AV_EYE_N.map((n, i) => tile(av.e === i, `avSet('e',${i})`, mini({ e: i }), n)).join(''), 'grid-cols-4')}
        ${sec('Boca', AV_MOUTH_N.map((n, i) => tile(av.m === i, `avSet('m',${i})`, mini({ m: i }), n)).join(''), 'grid-cols-4')}
        ${sec('Accesorio', AV_ACC_N.map((n, i) => tile(av.a === i, `avSet('a',${i})`, mini({ a: i }), n)).join(''), 'grid-cols-4 sm:grid-cols-7')}
        ${sec('Animación', AV_AN_N.map((n, i) => tile(av.an === i, `avSet('an',${i})`, mini({ an: i }, true), n)).join(''))}
      </div>
    </div>
    <div class="shrink-0 p-4 flex justify-between items-center max-w-6xl mx-auto w-full">
      <button onclick="avCancel()" class="px-6 py-2.5 font-bold rounded-xl glass hover:bg-white/20 transition">${mode === 'join' ? 'Volver' : 'Cancelar'}</button>
      <button onclick="avConfirm()" class="px-10 py-3.5 font-black text-lg text-white rounded-2xl bg-[#26890c] btn3d">${mode === 'join' ? '¡Entrar al juego!' : 'Guardar personaje'}</button>
    </div>`, 'stage-bg text-white');
  const n = $('av-opts'); if (n) n.scrollTop = top;
}
window.avSet = (k, v) => { AVED.av[k] = v; renderAvatarEditor(); };
window.avRandom = () => { AVED.av = avRand(); renderAvatarEditor(); };
window.avCancel = () => {
  const m = AVED.mode; AVED = null;
  if (m === 'join') showLanding(); else if (Pl) { Pl.key = ''; playerRender(); }
};
window.avConfirm = async () => {
  saveAvatar(AVED.av);
  if (AVED.mode === 'join') return doJoin();
  try { await updateDoc(doc(playersCol(), Pl.id), { avatar: AVED.av }); } catch (e) { alert('No se pudo guardar: ' + e.message); }
  AVED = null; if (Pl) { Pl.key = ''; playerRender(); }
};
window.avChange = () => { if (!Pl || !Pl.me) return; AVED = { av: { ...DEF_AV, ...(Pl.me.avatar || {}) }, mode: 'edit', nick: Pl.me.nickname }; renderAvatarEditor(); };

function screen(html, cls = 'bg-brand text-white') {
  app.className = `w-full h-full flex flex-col relative overflow-auto ${cls}`;
  app.innerHTML = html;
}

function isCorrect(q, a) {
  if (a === null || a === undefined) return false;
  if (q.type === 'quiz' || q.type === 'tf') return Number(a) === q.correct;
  if (q.type === 'type') return q.answers.some(x => norm(x) && norm(x) === norm(a));
  if (q.type === 'slider') return Math.abs(Number(a) - q.sliderCorrect) <= q.margin;
  return false;
}
function correctText(q) {
  if (q.type === 'quiz' || q.type === 'tf') return q.options[q.correct];
  if (q.type === 'type') return q.answers.filter(x => x.trim()).join(' / ');
  if (q.type === 'slider') return q.margin > 0 ? `${q.sliderCorrect} (±${q.margin})` : String(q.sliderCorrect);
  return '';
}
function calcPoints(q, correct, ms, prev) {
  if (q.type === 'poll') return { pts: 0, bonus: 0, streak: prev };
  if (!correct) return { pts: 0, bonus: 0, streak: 0 };
  const streak = prev + 1;
  if (q.points === 'none') return { pts: 0, bonus: 0, streak };
  let pts = Math.round(1000 * (1 - Math.min(1, ms / (q.time * 1000)) / 2));
  if (q.points === 'double') pts *= 2;
  const bonus = streak >= 2 ? (Math.min(streak, 6) - 1) * 100 : 0;
  return { pts, bonus, streak };
}

// ================= GENERADOR DE TABLAS =================
const TAB_TIME = 60;
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function genTabla(op, seed) {
  const R = mulberry(seed);
  const shuf = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const raw = [];
  for (let t = 1; t <= 10; t++) {
    shuf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, 3).forEach(m => {
      if (op === 'sum') { const a = t + m; raw.push({ t: `¿Cuánto es ${t} + ${m}?`, a, near: [a + 1, a - 1, a + 2, a - 2, a + 10, a - 10, a + 3] }); }
      else if (op === 'res') { const a = m; raw.push({ t: `¿Cuánto es ${t + m} − ${t}?`, a, near: [a + 1, a - 1, a + 2, a - 2, t, t + m, a + 3] }); }
      else if (op === 'mul') { const a = t * m; raw.push({ t: `¿Cuánto es ${t} × ${m}?`, a, near: [t * (m + 1), t * (m - 1), a + 1, a - 1, a + 2, a - 2, (t + 1) * m, (t - 1) * m] }); }
      else { const a = m; raw.push({ t: `¿Cuánto es ${t * m} ÷ ${t}?`, a, near: [a + 1, a - 1, a + 2, a - 2, t, a + 3, t + 1] }); }
    });
  }
  const build = r => {
    const cand = shuf([...new Set(r.near)].filter(x => x >= 0 && x !== r.a));
    const wrong = cand.slice(0, 3);
    while (wrong.length < 3) { const x = r.a + wrong.length + 3 + Math.floor(R() * 6); if (x !== r.a && !wrong.includes(x)) wrong.push(x); }
    const pos = Math.floor(R() * 4); const opts = [...wrong]; opts.splice(pos, 0, r.a);
    return { ...mkQ('quiz'), text: r.t, options: opts.map(String), correct: pos, time: TAB_TIME };
  };
  return shuf(raw).map(build);
}
function genMezcla(seed) {
  const R = mulberry(seed);
  const all = [['sum', 8], ['res', 7], ['mul', 8], ['div', 7]].flatMap(([op, n], k) => genTabla(op, seed + 10 + k).slice(0, n));
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
  return all;
}
const TAB_DEFS = [
  { id: 'tab_suma',  title: '➕ Tabla de Sumar Completa (30 Preguntas)',        gen: () => genTabla('sum', 101) },
  { id: 'tab_resta', title: '➖ Tabla de Restar Completa (30 Preguntas)',        gen: () => genTabla('res', 202) },
  { id: 'tab_mult',  title: '✖️ Tabla de Multiplicar Completa (30 Preguntas)',   gen: () => genTabla('mul', 303) },
  { id: 'tab_div',   title: '➗ Tabla de Dividir Completa (30 Preguntas)',        gen: () => genTabla('div', 404) },
  { id: 'tab_mezcla', title: '🧮 Las 4 Operaciones Mezcladas (30 Preguntas)',    gen: () => genMezcla(505) }
];
const LS_DEL = 'quizgo_deleted_tab';
const getDeletedTab = () => { try { return JSON.parse(localStorage.getItem(LS_DEL) || '[]'); } catch (e) { return []; } };

// ================= GENERADORES DE PREGUNTAS Y QUIZZES =================
function generate50(type) {
  let list = [];
  const add = (t, o, c) => {
    let arr = o.map((val, idx) => ({ val, ok: idx === c }));
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    list.push({ ...mkQ('quiz'), text: t, options: arr.map(x => x.val), correct: arr.findIndex(x => x.ok), time: 20 });
  };
  
  if (type === 'math') {
    let used = new Set();
    while (list.length < 15) { let a=Math.floor(Math.random()*40)+10, b=Math.floor(Math.random()*40)+10; let t = `¿Cuánto es ${a} + ${b}?`; if(!used.has(t)){ used.add(t); add(t, [a+b+2, a+b, a+b-1, a+b+10].map(String), 1); } }
    while (list.length < 30) { let a=Math.floor(Math.random()*50)+30, b=Math.floor(Math.random()*25)+5; let t = `¿Cuánto es ${a} - ${b}?`; if(!used.has(t)){ used.add(t); add(t, [a-b+5, a-b-2, a-b, a-b+1].map(String), 2); } }
    while (list.length < 40) { let a=Math.floor(Math.random()*9)+2, b=Math.floor(Math.random()*9)+2; let t = `¿Cuánto es ${a} x ${b}?`; if(!used.has(t)){ used.add(t); add(t, [a*b+1, a*b-2, a*b+a, a*b].map(String), 3); } }
    while (list.length < 45) { let a=Math.floor(Math.random()*9)+2, b=Math.floor(Math.random()*5)+2; let t = `¿Cuánto es ${a*b} ÷ ${b}?`; if(!used.has(t)){ used.add(t); add(t, [a+1, a, a-1, a+2].map(String), 1); } }
    add('¿Cuántos lados tiene un triángulo?', ['2','3','4','5'], 1);
    add('¿Cuántos lados tiene un cuadrado?', ['4','3','5','6'], 0);
    add('Si tengo 10 manzanas y regalo 3, ¿cuántas me quedan?', ['5','6','7','8'], 2);
    add('¿Qué número sigue: 2, 4, 6, 8, ...?', ['9','10','12','14'], 1);
    add('¿Qué número sigue: 5, 10, 15, ...?', ['16','18','20','25'], 2);
  } else if (type === 'comu') {
    const listQ = [
      '¿Cuál es el sinónimo de "alegre"?|feliz|triste|enojado|llorón|0', '¿Cuál es el sinónimo de "veloz"?|rápido|lento|fuerte|débil|0', '¿Cuál es el sinónimo de "bello"?|hermoso|feo|horrible|malo|0', '¿Cuál es el sinónimo de "gigante"?|enorme|enano|chico|suave|0', '¿Cuál es el sinónimo de "listo"?|inteligente|tonto|lento|ciego|0', '¿Cuál es el sinónimo de "fácil"?|sencillo|complicado|duro|largo|0', '¿Cuál es el sinónimo de "difícil"?|complejo|fácil|suave|corto|0', '¿Cuál es el sinónimo de "caminar"?|andar|correr|dormir|cantar|0', '¿Cuál es el sinónimo de "hablar"?|conversar|callar|llorar|reír|0', '¿Cuál es el sinónimo de "mirar"?|observar|ignorar|cerrar|tapar|0', '¿Cuál es el sinónimo de "saltar"?|brincar|caer|sentar|acostar|0', '¿Cuál es el sinónimo de "comer"?|alimentarse|beber|ayunar|jugar|0', '¿Cuál es el sinónimo de "escribir"?|redactar|leer|borrar|pintar|0', '¿Cuál es el sinónimo de "escuchar"?|oír|hablar|gritar|cantar|0', '¿Cuál es el sinónimo de "pequeño"?|chico|grande|mediano|largo|0',
      '¿Cuál es el antónimo de "alto"?|bajo|grande|largo|ancho|0', '¿Cuál es el antónimo de "frío"?|caliente|helado|fresco|tibio|0', '¿Cuál es el antónimo de "bueno"?|malo|amable|lindo|feo|0', '¿Cuál es el antónimo de "oscuro"?|claro|negro|gris|sombra|0', '¿Cuál es el antónimo de "limpio"?|sucio|lavado|puro|transparente|0', '¿Cuál es el antónimo de "nuevo"?|viejo|reciente|moderno|útil|0', '¿Cuál es el antónimo de "lleno"?|vacío|repleto|pesado|ligero|0', '¿Cuál es el antónimo de "rico"?|pobre|millonario|sabroso|salado|0', '¿Cuál es el antónimo de "dulce"?|amargo|salado|rico|suave|0', '¿Cuál es el antónimo de "fuerte"?|débil|poderoso|duro|pesado|0', '¿Cuál es el antónimo de "rápido"?|lento|veloz|ligero|pronto|0', '¿Cuál es el antónimo de "feliz"?|triste|alegre|contento|emocionado|0', '¿Cuál es el antónimo de "subir"?|bajar|trepar|correr|saltar|0', '¿Cuál es el antónimo de "entrar"?|salir|pasar|llegar|venir|0', '¿Cuál es el antónimo de "ganar"?|perder|triunfar|vencer|jugar|0',
      '¿Qué palabra está escrita correctamente? (1)|zanahoria|sanahoria|sanaoria|zahanaoria|0', '¿Qué palabra está escrita correctamente? (2)|hielo|yelo|ielo|hillo|0', '¿Qué palabra está escrita correctamente? (3)|vaca|baca|vaka|bacaa|0', '¿Qué palabra está escrita correctamente? (4)|queso|keso|ceso|qeso|0', '¿Qué palabra está escrita correctamente? (5)|zapato|sapato|çapato|zappato|0', '¿Qué palabra está escrita correctamente? (6)|burro|vuro|vurro|buro|0', '¿Qué palabra está escrita correctamente? (7)|barco|varco|varko|barko|0', '¿Qué palabra está escrita correctamente? (8)|huevo|uevo|huebo|uebo|0', '¿Qué palabra está escrita correctamente? (9)|gato|jato|gatto|hato|0', '¿Qué palabra está escrita correctamente? (10)|perro|pero|perrro|peero|0',
      '¿Cuál es un sustantivo propio? (1)|Perú|mesa|silla|perro|0', '¿Cuál es un sustantivo propio? (2)|Lima|gato|lápiz|borrador|0', '¿Cuál es un sustantivo propio? (3)|María|casa|árbol|flor|0', '¿Cuál es un sustantivo propio? (4)|Amazonas|río|lago|mar|0', '¿Cuál es un sustantivo propio? (5)|Carlos|niño|hombre|señor|0', '¿Cuál es un sustantivo propio? (6)|Cusco|ciudad|pueblo|calle|0', '¿Cuál es un sustantivo propio? (7)|Arequipa|montaña|volcán|valle|0', '¿Cuál es un sustantivo propio? (8)|Piura|sol|arena|playa|0', '¿Cuál es un sustantivo propio? (9)|Juan|amigo|compañero|profesor|0', '¿Cuál es un sustantivo propio? (10)|Misti|cerro|piedra|tierra|0'
    ];
    for(let i=0; i<50; i++) { let p = listQ[i].split('|'); add(p[0], [p[1],p[2],p[3],p[4]], parseInt(p[5])); }
  } else if (type === 'ciencia') {
    const listQ = [
      '¿Qué animal es el Perro?|Mamífero|Ave|Reptil|Pez|0', '¿Qué animal es el León?|Mamífero|Reptil|Anfibio|Ave|0', '¿Qué animal es el Águila?|Ave|Mamífero|Reptil|Pez|0', '¿Qué animal es el Tiburón?|Pez|Mamífero|Anfibio|Reptil|0', '¿Qué animal es la Rana?|Anfibio|Reptil|Mamífero|Ave|0', '¿Qué animal es la Serpiente?|Reptil|Anfibio|Ave|Mamífero|0', '¿Qué animal es la Vaca?|Mamífero|Reptil|Pez|Ave|0', '¿Qué animal es el Oso?|Mamífero|Anfibio|Ave|Pez|0', '¿Qué animal es el Pingüino?|Ave|Mamífero|Reptil|Pez|0', '¿Qué animal es la Ballena?|Mamífero|Pez|Reptil|Anfibio|0',
      '¿Qué animal es el Gato?|Mamífero|Ave|Reptil|Anfibio|0', '¿Qué animal es el Caballo?|Mamífero|Reptil|Pez|Ave|0', '¿Qué animal es el Cocodrilo?|Reptil|Mamífero|Anfibio|Pez|0', '¿Qué animal es el Loro?|Ave|Mamífero|Reptil|Pez|0', '¿Qué animal es el Elefante?|Mamífero|Reptil|Pez|Anfibio|0', '¿Qué animal es el Delfín?|Mamífero|Pez|Ave|Reptil|0', '¿Qué animal es el Sapo?|Anfibio|Reptil|Mamífero|Pez|0', '¿Qué animal es la Tortuga?|Reptil|Anfibio|Ave|Mamífero|0', '¿Qué animal es la Paloma?|Ave|Mamífero|Reptil|Anfibio|0', '¿Qué animal es el Tigre?|Mamífero|Ave|Reptil|Pez|0',
      '¿Qué animal es la Oveja?|Mamífero|Ave|Reptil|Anfibio|0', '¿Qué animal es el Pato?|Ave|Mamífero|Reptil|Pez|0', '¿Qué animal es la Iguana?|Reptil|Mamífero|Ave|Anfibio|0', '¿Qué animal es el Avestruz?|Ave|Mamífero|Reptil|Pez|0', '¿Qué animal es el Hipopótamo?|Mamífero|Reptil|Ave|Anfibio|0',
      '¿Dónde se encuentra el corazón?|En el pecho|En la cabeza|En las piernas|En los brazos|0', '¿Dónde se encuentra el cerebro?|En la cabeza|En el pecho|En el estómago|En la espalda|0', '¿Dónde se encuentra el estómago?|En el abdomen|En el pecho|En la cabeza|En los pies|0', '¿Dónde se encuentran los pulmones?|En el pecho|En la cabeza|En el abdomen|En los brazos|0', '¿Dónde se encuentran los riñones?|En el abdomen/espalda|En el pecho|En la cabeza|En las piernas|0',
      '¿Qué parte de la planta absorbe agua?|La raíz|El tallo|Las hojas|Las flores|0', '¿Qué parte de la planta realiza la fotosíntesis?|Las hojas|La raíz|El tallo|El fruto|0', '¿Qué parte de la planta la sostiene?|El tallo|La raíz|Las hojas|La flor|0', '¿Qué parte de la planta se convierte en fruto?|La flor|La hoja|El tallo|La raíz|0', '¿Qué parte de la planta contiene las semillas?|El fruto|La flor|La raíz|El tallo|0',
      '¿Qué planeta es conocido como el planeta rojo?|Marte|Venus|Júpiter|Saturno|0', '¿Cuál es el planeta más grande del sistema solar?|Júpiter|Saturno|Tierra|Urano|0', '¿Qué estrella nos da luz y calor?|El Sol|La Luna|Sirio|Polaris|0', '¿Cuál es el satélite natural de la Tierra?|La Luna|Marte|Europa|Titán|0', '¿En qué estado está el hielo?|Sólido|Líquido|Gaseoso|Plasma|0',
      '¿En qué estado está el vapor de agua?|Gaseoso|Líquido|Sólido|Plasma|0', '¿Qué gas respiramos para vivir?|Oxígeno|Dióxido de carbono|Nitrógeno|Helio|0', '¿Cuántos huesos tiene un adulto?|206|150|300|100|0', '¿Cuál es el órgano más grande del cuerpo?|La piel|El hígado|El cerebro|El corazón|0', '¿Qué transporta la sangre por el cuerpo?|Oxígeno y nutrientes|Aire solamente|Agua solamente|Gases tóxicos|0',
      '¿Qué usan los peces para respirar bajo el agua?|Branquias|Pulmones|Piel|Escamas|0', '¿Cómo nacen las aves?|De huevos (Ovíparos)|De su madre (Vivíparos)|De semillas|De larvas|0', '¿Qué comen los animales carnívoros?|Carne|Plantas|Frutas|Insectos únicamente|0', '¿Qué comen los animales herbívoros?|Plantas|Carne|Peces|Otros animales|0', '¿Qué tipo de animal es el ser humano?|Mamífero|Reptil|Anfibio|Ave|0'
    ];
    for(let i=0; i<50; i++) { let p = listQ[i].split('|'); add(p[0], [p[1],p[2],p[3],p[4]], parseInt(p[5])); }
  } else if (type === 'social') {
    const listQ = [
      '¿En qué continente está el Perú?|América|Europa|Asia|África|0', '¿Cuál es la capital del Perú?|Lima|Cusco|Arequipa|Piura|0', '¿Qué océano baña la costa peruana?|Pacífico|Atlántico|Índico|Ártico|0', '¿Quién proclamó la independencia del Perú?|San Martín|Bolívar|Pizarro|Túpac Amaru|0', '¿En qué año fue la independencia del Perú?|1821|1824|1810|1800|0', 
      '¿Cuál es el río más largo del mundo?|Amazonas|Nilo|Rímac|Marañón|0', '¿Qué cultura hizo las Líneas de Nazca?|Nazca|Paracas|Moche|Inca|0', '¿Capital del Imperio Inca?|Cusco|Lima|Trujillo|Puno|0', '¿Qué es el Huascarán?|Un nevado|Un río|Un lago|Un desierto|0', '¿Lago navegable más alto del mundo?|Titicaca|Junín|Llanganuco|Rimac|0',
      '¿Qué idioma hablaban los Incas?|Quechua|Aymara|Castellano|Inglés|0', '¿Moneda oficial del Perú?|Sol|Dólar|Peso|Euro|0', '¿Animal del escudo nacional del Perú?|Vicuña|Llama|Alpaca|Cóndor|0', '¿Planta del escudo nacional del Perú?|Árbol de la quina|Cantuta|Puya|Maca|0', '¿Qué representa la cornucopia en el escudo?|Reino mineral|Reino animal|Reino vegetal|Riqueza de otros países|0', 
      '¿Cuántas regiones naturales tradicionales hay en Perú?|3 (y el mar)|2|5|4|0', '¿Héroe del monitor Huáscar?|Miguel Grau|Francisco Bolognesi|Alfonso Ugarte|José Olaya|0', '¿Héroe de la Batalla de Arica?|Bolognesi|Grau|Ugarte|Olaya|0', '¿Se lanzó del morro de Arica?|Alfonso Ugarte|Bolognesi|Grau|Olaya|0', '¿Mártir pescador chorrillano?|José Olaya|Bolognesi|Grau|Ugarte|0',
      '¿Cuál es la ciudad conocida como la Ciudad Blanca?|Arequipa|Cusco|Piura|Trujillo|0', '¿Dónde se encuentra Machu Picchu?|Cusco|Puno|Lima|Ayacucho|0', '¿A qué cultura pertenecen los fardos funerarios?|Paracas|Nazca|Inca|Moche|0', '¿Quién fue el primer presidente del Perú?|José de la Riva Agüero|San Martín|Simón Bolívar|Ramón Castilla|0', '¿Qué presidente liberó a los esclavos en Perú?|Ramón Castilla|San Martín|Fujimori|Bolognesi|0',
      '¿De qué país se independizó Perú?|España|Francia|Inglaterra|Portugal|0', '¿Con qué país limita el Perú al sur?|Chile|Ecuador|Colombia|Brasil|0', '¿Con qué país limita el Perú al norte? (1)|Ecuador|Chile|Bolivia|Argentina|0', '¿Con qué país limita el Perú al norte? (2)|Colombia|Bolivia|Chile|Argentina|0', '¿Con qué país limita el Perú al este? (1)|Brasil|Ecuador|Chile|Océano Pacífico|0',
      '¿Con qué país limita el Perú al sureste?|Bolivia|Ecuador|Colombia|Venezuela|0', '¿Quién es considerado el Caballero de los Mares?|Miguel Grau|San Martín|Bolognesi|Alfonso Ugarte|0', '¿Cuál es el baile nacional del Perú?|La Marinera|El Huayno|El Festejo|La Danza de Tijeras|0', '¿Qué instrumento es típico de la música afroperuana?|El Cajón|La Quena|La Zampoña|El Arpa|0', '¿Qué cultura construyó la ciudadela de Chan Chan?|Chimú|Moche|Inca|Chavín|0',
      '¿Cuál es la montaña de los 7 colores?|Vinicunca|Huascarán|Misti|Yerupajá|0', '¿Qué Inca fundó el imperio según la leyenda del Lago Titicaca?|Manco Cápac|Pachacútec|Atahualpa|Huáscar|0', '¿Quién era la esposa de Manco Cápac?|Mama Ocllo|Mama Huaco|Cura Ocllo|Micaela Bastidas|0', '¿Dónde salieron los hermanos Ayar según la leyenda?|Cerro Tamputoco|Lago Titicaca|Río Amazonas|Machu Picchu|0', '¿Qué es el Inti Raymi?|Fiesta del Sol|Fiesta de la Luna|Fiesta de la Tierra|Fiesta del Agua|0',
      '¿Quién fue Micaela Bastidas?|Esposa de Túpac Amaru II|Esposa de Manco Cápac|Una heroína de Arica|Una escritora peruana|0', '¿Cuál fue el principal dios de los Incas?|El Sol (Inti)|La Luna (Quilla)|La Tierra (Pachamama)|El Mar (Mama Cocha)|0', '¿Qué era el Chasqui en el Imperio Inca?|Un mensajero|Un guerrero|Un sacerdote|Un agricultor|0', '¿Qué herramienta usaban los Incas para contar?|Quipu|Ábaco|Calculadora|Piedras|0', '¿Cuál es el desierto peruano donde están las famosas líneas?|Desierto de Nazca|Desierto de Sechura|Desierto del Sahara|Desierto del Atacama|0',
      '¿Cuál es el río que cruza la ciudad de Lima?|Río Rímac|Río Amazonas|Río Marañón|Río Ucayali|0', '¿En qué región se encuentra el volcán Misti?|Arequipa|Cusco|Puno|Moquegua|0', '¿Cómo se le llama a la selva peruana?|Amazonía|Costa|Sierra|Andes|0', '¿Qué cultura peruana es conocida por las Cabezas Clavas?|Chavín|Moche|Nazca|Paracas|0', '¿Qué océano está al oeste del Perú?|Océano Pacífico|Océano Atlántico|Océano Índico|Océano Ártico|0'
    ];
    for(let i=0; i<50; i++) { let p = listQ[i].split('|'); add(p[0], [p[1],p[2],p[3],p[4]], parseInt(p[5])); }
  } else if (type === 'reli') {
    const listQ = [
      '¿Primer libro de la Biblia?|Génesis|Éxodo|Mateo|Apocalipsis|0', '¿Quién construyó el arca para el diluvio?|Noé|Moisés|Abraham|David|0', '¿Quién recibió los 10 mandamientos?|Moisés|Noé|Jesús|Pedro|0', '¿Dónde nació Jesús?|Belén|Nazaret|Jerusalén|Roma|0', '¿Quién es la madre de Jesús?|María|Marta|Isabel|Ana|0', 
      '¿Quién fue el padre adoptivo de Jesús?|José|Joaquín|Zacarías|Juan|0', '¿Cuántos apóstoles tenía Jesús?|12|10|7|3|0', '¿Qué apóstol traicionó a Jesús?|Judas|Pedro|Juan|Mateo|0', '¿Quién negó a Jesús 3 veces antes que cantara el gallo?|Pedro|Juan|Judas|Tomás|0', '¿Qué celebramos en Navidad?|Nacimiento de Jesús|Muerte de Jesús|Resurrección|Milagros|0',
      '¿Qué celebramos en Pascua de Resurrección?|Resurrección de Jesús|Nacimiento|Bautismo|La Última Cena|0', '¿Qué oración principal nos enseñó Jesús?|Padre Nuestro|Ave María|Credo|Salve|0', '¿Santa limeña patrona de América?|Santa Rosa de Lima|Madre Teresa|Santa Ana|Santa María|0', '¿A quién se le conoce como el Santo de la escoba?|San Martín de Porres|San Francisco|San Juan|San Pedro|0', '¿En qué río fue Jesús bautizado?|Río Jordán|Río Nilo|Río Amazonas|Río Rímac|0',
      '¿Quién bautizó a Jesús?|Juan el Bautista|Pedro|José|Moisés|0', '¿Qué celebramos en Jueves Santo?|La Última Cena|El Nacimiento de Jesús|La Resurrección|El Bautismo|0', '¿Qué celebramos el Viernes Santo?|La Muerte de Jesús|La Resurrección de Jesús|La Última Cena|El Bautismo de Jesús|0', '¿A los cuántos días resucitó Jesús?|Al tercer día|Al segundo día|Al quinto día|Al séptimo día|0', '¿Cuál es el último libro de la Biblia?|Apocalipsis|Génesis|Mateo|Salmos|0',
      '¿Qué día de la semana los cristianos van a misa regularmente?|Domingo|Lunes|Jueves|Sábado|0', '¿Cómo se llama la oración dirigida a la Virgen María?|Ave María|Padre Nuestro|El Credo|El Gloria|0', '¿Qué milagro hizo Jesús en las bodas de Caná?|Convertir el agua en vino|Multiplicar panes|Caminar sobre el agua|Sanar a un ciego|0', '¿A quién le dijo Jesús: "Levántate y anda"?|A Lázaro|A Pedro|A Juan|A Mateo|0', '¿Cuántos panes y peces multiplicó Jesús?|5 panes y 2 peces|3 panes y 1 pez|10 panes y 5 peces|2 panes y 2 peces|0',
      '¿Qué rey quiso matar al niño Jesús?|El rey Herodes|El rey David|El rey Salomón|El faraón|0', '¿Quién venció al gigante Goliat?|David|Moisés|Josué|Sansón|0', '¿Qué hombre perdió su fuerza al cortarle el cabello?|Sansón|David|Salomón|Pedro|0', '¿Quién fue tragado por un gran pez o ballena?|Jonás|Pedro|Juan|Mateo|0', '¿Qué mandamiento es: "Honrarás a tu..."?|Padre y madre|Prójimo|Dios|Amigo|0',
      '¿Cuál es la oración donde decimos en qué creemos los católicos?|El Credo|El Padre Nuestro|El Ave María|El Salve|0', '¿Cómo murió Jesús?|Crucificado|Apedreado|Decapitado|De viejo|0', '¿Qué regalo llevaron los Reyes Magos? (1)|Oro|Plata|Cobre|Bronce|0', '¿Qué regalo llevaron los Reyes Magos? (2)|Incienso|Perfume|Comida|Ropa|0', '¿Qué regalo llevaron los Reyes Magos? (3)|Mirra|Tierra|Agua|Madera|0',
      '¿Cuántos días estuvo Jesús en el desierto ayunando?|40 días|30 días|10 días|7 días|0', '¿Cómo se llamaba el ángel que le anunció a María que tendría a Jesús?|Arcángel Gabriel|Arcángel Miguel|Arcángel Rafael|Ángel de la Guarda|0', '¿Quién liberó a los israelitas de Egipto?|Moisés|David|Abraham|José|0', '¿De qué árbol no podían comer Adán y Eva?|El árbol de la ciencia del bien y del mal|El árbol de la vida|Un manzano|Una higuera|0', '¿Qué forma tomó el diablo para engañar a Eva?|Una serpiente|Un león|Una paloma|Un dragón|0',
      '¿Qué sacramento recibimos cuando nos echan agua bendita en la cabeza?|El Bautismo|La Comunión|La Confirmación|El Matrimonio|0', '¿Qué sacramento es cuando recibimos el cuerpo de Cristo por primera vez?|Primera Comunión|Bautismo|Confirmación|Unción de los enfermos|0', '¿A quién le dio Dios gran sabiduría?|Al rey Salomón|Al rey David|A Moisés|A Sansón|0', '¿Quién era el hermano de Moisés?|Aarón|David|José|Juan|0', '¿Qué profeta abrió el mar Rojo con la ayuda de Dios?|Moisés|Josué|Abraham|Elías|0',
      '¿Cómo se llamaba el jardín donde vivían Adán y Eva?|El Edén|El Paraíso de Caná|El jardín de Getsemaní|Nazaret|0', '¿Dónde oró Jesús antes de ser entregado?|Huerto de los Olivos (Getsemaní)|En el desierto|En el templo|En el mar de Galilea|0', '¿Qué apóstol no creyó en la resurrección hasta ver las heridas de Jesús?|Tomás|Pedro|Juan|Mateo|0', '¿Quién ayudó a Jesús a cargar la cruz?|Simón de Cirene|Pedro|Juan|Judas|0', '¿Cuál es el primer mandamiento?|Amarás a Dios sobre todas las cosas|No matarás|No robarás|Honrarás a tu padre y a tu madre|0'
    ];
    for(let i=0; i<50; i++) { let p = listQ[i].split('|'); add(p[0], [p[1],p[2],p[3],p[4]], parseInt(p[5])); }
  } else if (type === 'arte') {
    const listQ = [
      '¿Cuáles son los colores primarios?|Rojo, amarillo y azul|Verde, naranja y morado|Blanco y negro|Rojo y verde|0', '¿Amarillo + Azul = ?|Verde|Naranja|Morado|Marrón|0', '¿Rojo + Amarillo = ?|Naranja|Verde|Morado|Rosa|0', '¿Rojo + Azul = ?|Morado|Verde|Naranja|Negro|0', '¿Blanco + Negro = ?|Gris|Marrón|Rosa|Azul|0', 
      '¿Instrumento de percusión peruano?|Cajón|Quena|Zampoña|Guitarra|0', '¿Instrumento de viento andino?|Quena|Cajón|Guitarra|Piano|0', '¿Danza típica de la costa peruana?|Marinera|Huayno|Pandilla|Danza de tijeras|0', '¿Danza típica de la sierra peruana?|Huayno|Marinera|Festejo|Vals|0', '¿Danza típica de la selva peruana?|Anaconda|Huaylas|Marinera|Tondero|0',
      '¿Técnica de doblar papel para hacer figuras?|Origami|Collage|Pintura|Escultura|0', '¿Técnica de pegar recortes de papel o tela?|Collage|Origami|Acuarela|Dibujo|0', '¿Material escolar usado para modelar figuras?|Plastilina|Papel|Lápiz|Pintura|0', '¿Arte de pintar paisajes, personas o cosas?|Pintura|Escultura|Música|Danza|0', '¿Cajas andinas típicas con pequeñas figuras adentro?|Retablos ayacuchanos|Huacos|Cajones|Vasijas|0',
      '¿Qué color obtenemos al mezclar rojo y blanco?|Rosado|Naranja|Morado|Celeste|0', '¿Qué color obtenemos al mezclar azul y blanco?|Celeste|Rosado|Verde claro|Gris|0', '¿Cuáles son los colores secundarios?|Verde, naranja y morado|Rojo, azul y amarillo|Blanco, negro y gris|Marrón, rosado y celeste|0', '¿Cómo se le llama al arte de crear figuras en piedra o barro?|Escultura|Pintura|Dibujo|Música|0', '¿Qué usamos para pintar con acuarelas?|Agua y pinceles|Solo los dedos|Lápices de colores|Crayones|0',
      '¿Qué danza peruana se baila con pañuelo en mano?|Marinera|Huayno|Danza de Tijeras|Anaconda|0', '¿Qué tipo de instrumento es la guitarra?|De cuerda|De viento|De percusión|De teclado|0', '¿Qué tipo de instrumento es el tambor?|De percusión|De cuerda|De viento|De teclado|0', '¿Qué tipo de instrumento es la flauta?|De viento|De percusión|De cuerda|De teclado|0', '¿Quién dirige una orquesta musical?|El director de orquesta|El cantante principal|El guitarrista|El baterista|0',
      '¿Qué arte escénico cuenta historias con movimiento del cuerpo y música?|La Danza / El Ballet|La Escultura|La Fotografía|La Pintura|0', '¿Dónde se exhiben las obras de arte y pinturas antiguas?|En un museo|En un hospital|En un supermercado|En una comisaría|0', '¿Qué danza peruana se caracteriza por movimientos acrobáticos con unas tijeras de metal?|Danza de Tijeras|Huaylas|Festejo|Tondero|0', '¿Con qué parte del cuerpo se toca principalmente el cajón peruano?|Con las manos|Con los pies|Con la boca|Con palillos|0', '¿Qué cerámica antigua del Perú es famosa por sus "Huacos Retratos"?|Cultura Moche|Cultura Paracas|Cultura Inca|Cultura Chimú|0',
      '¿Qué técnica artística usa pequeños trozos de vidrio o cerámica para crear una imagen?|Mosaico|Acuarela|Origami|Óleo|0', '¿Qué es el folclore?|Conjunto de tradiciones y costumbres de un pueblo|Una técnica para pintar|Un instrumento de viento|Una marca de colores|0', '¿Qué danza afroperuana es muy alegre y se baila al ritmo del cajón?|El Festejo|El Huayno|La Marinera|La Diablada|0', '¿Qué color es considerado un color frío?|Azul|Rojo|Amarillo|Naranja|0', '¿Qué color es considerado un color cálido?|Naranja|Celeste|Azul|Verde agua|0',
      '¿Cómo se llama la persona que escribe canciones o música?|Compositor|Pintor|Escultor|Bailarín|0', '¿Qué instrumento de percusión se agita con la mano y suena como semillas por dentro?|Maracas|Zampoña|Quena|Guitarra|0', '¿Qué arte se encarga de diseñar y construir edificios hermosos?|La Arquitectura|La Pintura|La Literatura|La Música|0', '¿Qué arte se refiere a escribir cuentos, poesías o novelas?|La Literatura|La Escultura|La Danza|El Teatro|0', '¿Cómo se llama el lugar donde los actores realizan una obra de teatro?|El escenario|La galería|El museo|El cine|0',
      '¿Qué es un retrato?|La pintura o dibujo de una persona|Un paisaje de la naturaleza|Una vasija de barro|Una canción andina|0', '¿Qué es un paisaje en el arte?|La pintura de la naturaleza y el entorno|La pintura de un rostro|Una escultura de piedra|Un baile típico|0', '¿Qué usamos para mezclar los colores antes de pintar?|La paleta de colores|El caballete|El lienzo|El borrador|0', '¿Cómo se llama el soporte de madera donde el pintor coloca su cuadro?|El caballete|La paleta|El pincel|La espátula|0', '¿Qué famosa tela o tapiz antiguo del Perú destaca por sus bellos colores y bordados?|Los Mantos Paracas|Los Huacos Retratos|Las Líneas de Nazca|Los Retablos|0',
      '¿Qué tipo de canto o música se hace solo con la voz humana, sin instrumentos?|A capela|Orquesta|Banda|Coro instrumental|0', '¿Qué es un mural?|Una pintura grande realizada sobre una pared|Un pequeño dibujo en papel|Una pequeña escultura|Una danza grupal|0', '¿Qué instrumento musical andino está hecho de varios tubos de caña atados juntos?|La Zampoña|La Quena|El Charango|El Cajón|0', '¿Qué pequeña guitarra andina, originalmente hecha con caparazón de armadillo, es típica de Perú y Bolivia?|El Charango|La Guitarra criolla|El Ukelele|El Arpa andina|0', '¿Qué nombre recibe el arte de capturar imágenes con una cámara?|La Fotografía|La Pintura|El Dibujo|El Teatro|0'
    ];
    for(let i=0; i<50; i++) { let p = listQ[i].split('|'); add(p[0], [p[1],p[2],p[3],p[4]], parseInt(p[5])); }
  }
  return list;
}

function generateABC(part) {
  let list = [];
  const add = (t, o, c) => {
    let arr = o.map((val, idx) => ({ val, ok: idx === c }));
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    list.push({ ...mkQ('quiz'), text: t, options: arr.map(x => x.val), correct: arr.findIndex(x => x.ok), time: 20 });
  };

  if (part === 1) {
    add('¿Cómo se pronuncia la letra "A" en inglés?', ['Ei', 'A', 'Ai', 'E'], 0);
    add('¿Qué letra en inglés se pronuncia "Ei"?', ['A', 'E', 'I', 'O'], 0);
    add('¿Cuál es la pronunciación correcta de la letra "B"?', ['Bi', 'Be', 'Vi', 'Pi'], 0);
    add('Si escuchas la pronunciación "Bi", ¿a qué letra corresponde?', ['B', 'V', 'P', 'D'], 0);
    add('¿Cómo se pronuncia la letra "C" en inglés?', ['Si', 'Ce', 'Ci', 'Ki'], 0);
    add('¿Qué letra en inglés se pronuncia "Si"?', ['C', 'S', 'Z', 'X'], 0);
    add('¿Cuál es la pronunciación correcta de la letra "D"?', ['Di', 'De', 'Bi', 'Ti'], 0);
    add('Si escuchas "Di", ¿de qué letra se trata en inglés?', ['D', 'B', 'T', 'G'], 0);
    add('¿Cómo se pronuncia la letra "E" en inglés?', ['I', 'E', 'Ei', 'Ai'], 0);
    add('¿Qué letra en inglés se pronuncia como la vocal "I" en español?', ['E', 'I', 'A', 'U'], 0);
    add('¿Cuál es la pronunciación correcta de la letra "F"?', ['Ef', 'Fe', 'Fi', 'Efe'], 0);
    add('Si escuchas la pronunciación "Ef", ¿qué letra es en inglés?', ['F', 'S', 'X', 'E'], 0);
  } else if (part === 2) {
    add('¿Cómo se pronuncia la letra "G" en inglés?', ['Yi', 'Ge', 'Gi', 'Ji'], 0);
    add('¿Qué letra en inglés se pronuncia "Yi"?', ['G', 'J', 'Y', 'H'], 0);
    add('¿Cuál es la pronunciación de la letra "H" en inglés?', ['Eich', 'Ache', 'Hache', 'Ech'], 0);
    add('Si alguien dice "Eich", ¿a qué letra se refiere en inglés?', ['H', 'A', 'K', 'X'], 0);
    add('¿Cómo se pronuncia la letra "I" en inglés?', ['Ai', 'I', 'Ei', 'Oui'], 0);
    add('¿Qué letra en inglés se pronuncia "Ai"?', ['I', 'E', 'A', 'Y'], 0);
    add('¿Cómo se pronuncia la letra "J" en inglés?', ['Yei', 'Jota', 'Ji', 'Gei'], 0);
    add('Si escuchas "Yei", ¿a qué letra corresponde en inglés?', ['J', 'G', 'Y', 'K'], 0);
    add('¿Cuál es la pronunciación correcta de la letra "K"?', ['Kei', 'Ca', 'Ki', 'Kaf'], 0);
    add('¿Qué letra en inglés suena como "Kei"?', ['K', 'Q', 'C', 'G'], 0);
    add('¿Cómo se pronuncia la letra "L" en inglés?', ['El', 'Ele', 'Li', 'Lu'], 0);
    add('Si escuchas la pronunciación "El", ¿qué letra es?', ['L', 'E', 'R', 'M'], 0);
  } else if (part === 3) {
    add('¿Cómo se pronuncia la letra "M" en inglés?', ['Em', 'Eme', 'Mi', 'Mu'], 0);
    add('¿Qué letra en inglés se pronuncia "Em"?', ['M', 'N', 'E', 'W'], 0);
    add('¿Cuál es la pronunciación de la letra "N" en inglés?', ['En', 'Ene', 'Ni', 'Nu'], 0);
    add('Si escuchas "En", ¿a qué letra corresponde?', ['N', 'M', 'E', 'L'], 0);
    add('¿Cómo se pronuncia la letra "O" en inglés?', ['Ou', 'O', 'Au', 'U'], 0);
    add('¿Qué letra en inglés se pronuncia "Ou"?', ['O', 'U', 'W', 'Q'], 0);
    add('¿Cuál es la pronunciación correcta de la letra "P"?', ['Pi', 'Pe', 'Pu', 'Bi'], 0);
    add('Si escuchas "Pi", ¿qué letra se menciona en inglés?', ['P', 'B', 'T', 'D'], 0);
    add('¿Cómo se pronuncia la letra "Q" en inglés?', ['Ciu', 'Cu', 'Kiu', 'Que'], 0);
    add('¿Qué letra en inglés se pronuncia "Ciu" (o "Kiu")?', ['Q', 'K', 'C', 'U'], 0);
    add('¿Cuál es la pronunciación correcta de la letra "R"?', ['Ar', 'Er', 'Ere', 'Ri'], 0);
    add('Si escuchas "Ar", ¿de qué letra en inglés se trata?', ['R', 'A', 'H', 'L'], 0);
  } else if (part === 4) {
    add('¿Cómo se pronuncia la letra "S" en inglés?', ['Es', 'Ese', 'Si', 'Su'], 0);
    add('¿Qué letra en inglés se pronuncia "Es"?', ['S', 'C', 'X', 'Z'], 0);
    add('¿Cuál es la pronunciación de la letra "T" en inglés?', ['Ti', 'Te', 'Tu', 'Di'], 0);
    add('Si escuchas "Ti", ¿a qué letra corresponde en inglés?', ['T', 'D', 'P', 'C'], 0);
    add('¿Cómo se pronuncia la letra "U" en inglés?', ['Iu', 'U', 'Ou', 'Yu'], 0);
    add('¿Qué letra en inglés se pronuncia "Iu"?', ['U', 'W', 'Y', 'O'], 0);
    add('¿Cuál es la pronunciación de la letra "V" en inglés?', ['Vi', 'Ve', 'B', 'Uv'], 0);
    add('Si escuchas "Vi" (con sonido labiodental), ¿qué letra es?', ['V', 'B', 'F', 'P'], 0);
    add('¿Cómo se pronuncia la letra "W" en inglés?', ['Dabliu', 'Doble u', 'Uve doble', 'Wa'], 0);
    add('¿Qué letra en inglés se pronuncia "Dabliu"?', ['W', 'V', 'U', 'M'], 0);
    add('¿Cuál es la pronunciación correcta de la letra "X"?', ['Eks', 'Equis', 'Xi', 'Sks'], 0);
    add('Si escuchas "Eks", ¿de qué letra se trata?', ['X', 'S', 'K', 'Z'], 0);
  }
  return list;
}

function generateAnimals(part) {
  let list = [];
  const add = (t, o, c) => {
    let arr = o.map((val, idx) => ({ val, ok: idx === c }));
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    list.push({ ...mkQ('quiz'), text: t, options: arr.map(x => x.val), correct: arr.findIndex(x => x.ok), time: 20 });
  };

  if (part === 1) {
    add('¿Cómo se escribe "Perro" en inglés?', ['Dog', 'Doc', 'Duk', 'Dag'], 0);
    add('¿Cómo se pronuncia "Dog" (Perro) en inglés?', ['Dog', 'Dok', 'Dug', 'Duj'], 0);
    add('¿Cómo se escribe "Gato" en inglés?', ['Cat', 'Cut', 'Cet', 'Kit'], 0);
    add('¿Cómo se pronuncia "Cat" (Gato) en inglés?', ['Kat', 'Ket', 'Sat', 'Kut'], 0);
    add('¿Cómo se escribe "Vaca" en inglés?', ['Cow', 'Cowu', 'Kow', 'Cof'], 0);
    add('¿Cómo se pronuncia "Cow" (Vaca) en inglés?', ['Kau', 'Kow', 'Koo', 'Kav'], 0);
    add('¿Cómo se escribe "Cerdo" en inglés?', ['Pig', 'Pik', 'Peg', 'Pij'], 0);
    add('¿Cómo se pronuncia "Pig" (Cerdo) en inglés?', ['Pig', 'Pai', 'Pij', 'Peg'], 0);
    add('¿Cómo se escribe "Oveja" en inglés?', ['Sheep', 'Ship', 'Shep', 'Sip'], 0);
    add('¿Cómo se pronuncia "Sheep" (Oveja) en inglés?', ['Schip', 'Shep', 'Sip', 'Schipe'], 0);
    add('¿Cómo se escribe "Caballo" en inglés?', ['Horse', 'Hors', 'Jors', 'Jorse'], 0);
    add('¿Cómo se pronuncia "Horse" (Caballo) en inglés?', ['Jors', 'Jorse', 'Hors', 'Jor'], 0);
    add('¿Cómo se escribe "Pato" en inglés?', ['Duck', 'Duk', 'Dak', 'Doc'], 0);
    add('¿Cómo se pronuncia "Duck" (Pato) en inglés?', ['Dak', 'Duk', 'Dock', 'Duk'], 0);
  } else if (part === 2) {
    add('¿Cómo se escribe "Gallo" en inglés?', ['Rooster', 'Roster', 'Ruster', 'Ruste'], 0);
    add('¿Cómo se pronuncia "Rooster" (Gallo) en inglés?', ['Ruster', 'Roster', 'Ruster', 'Ruste'], 0);
    add('¿Cómo se escribe "Gallina" en inglés?', ['Hen', 'Jen', 'Jin', 'Jan'], 0);
    add('¿Cómo se pronuncia "Hen" (Gallina) en inglés?', ['Jen', 'Hen', 'Jin', 'Jan'], 0);
    add('¿Cómo se escribe "Conejo" en inglés?', ['Rabbit', 'Rabit', 'Rebit', 'Rabite'], 0);
    add('¿Cómo se pronuncia "Rabbit" (Conejo) en inglés?', ['Rabit', 'Rebit', 'Rabi', 'Rabite'], 0);
    add('¿Cómo se escribe "Cabra" en inglés?', ['Goat', 'Got', 'Gut', 'Gaut'], 0);
    add('¿Cómo se pronuncia "Goat" (Cabra) en inglés?', ['Gout', 'Got', 'Guat', 'Goat'], 0);
    add('¿Cómo se escribe "Burro" en inglés?', ['Donkey', 'Donki', 'Donke', 'Dunkey'], 0);
    add('¿Cómo se pronuncia "Donkey" (Burro) en inglés?', ['Donki', 'Donke', 'Donkai', 'Dunki'], 0);
    add('¿Cómo se escribe "Pavo" en inglés?', ['Turkey', 'Turki', 'Terki', 'Turke'], 0);
    add('¿Cómo se pronuncia "Turkey" (Pavo) en inglés?', ['Terki', 'Turki', 'Turke', 'Terka'], 0);
    add('¿Cómo se escribe "Ganso" en inglés?', ['Goose', 'Gus', 'Gos', 'Guse'], 0);
    add('¿Cómo se pronuncia "Goose" (Ganso) en inglés?', ['Gus', 'Gos', 'Guz', 'Guse'], 0);
  } else if (part === 3) {
    add('¿Cómo se escribe "León" en inglés?', ['Lion', 'Laion', 'Lio', 'Lione'], 0);
    add('¿Cómo se pronuncia "Lion" (León) en inglés?', ['Laion', 'Lion', 'Lian', 'Liun'], 0);
    add('¿Cómo se escribe "Tigre" en inglés?', ['Tiger', 'Taiger', 'Tigr', 'Tijera'], 0);
    add('¿Cómo se pronuncia "Tiger" (Tigre) en inglés?', ['Taiger', 'Tiger', 'Tijuer', 'Taguer'], 0);
    add('¿Cómo se escribe "Elefante" en inglés?', ['Elephant', 'Elefant', 'Elipfant', 'Elefante'], 0);
    add('¿Cómo se pronuncia "Elephant" (Elefante) en inglés?', ['Elefant', 'Elefante', 'Elifant', 'Elefant'], 0);
    add('¿Cómo se escribe "Mono" en inglés?', ['Monkey', 'Monki', 'Monke', 'Munkey'], 0);
    add('¿Cómo se pronuncia "Monkey" (Mono) en inglés?', ['Monki', 'Munki', 'Monkey', 'Manki'], 0);
    add('¿Cómo se escribe "Cebra" en inglés?', ['Zebra', 'Zibra', 'Sebra', 'Zebram'], 0);
    add('¿Cómo se pronuncia "Zebra" (Cebra) en inglés?', ['Zibra', 'Zebra', 'Sebra', 'Zebro'], 0);
    add('¿Cómo se escribe "Jirafa" en inglés?', ['Giraffe', 'Jiraf', 'Jirafa', 'Giraf'], 0);
    add('¿Cómo se pronuncia "Giraffe" (Jirafa) en inglés?', ['Jiraf', 'Guiraf', 'Jirafa', 'Giraf'], 0);
    add('¿Cómo se escribe "Oso" en inglés?', ['Bear', 'Ber', 'Bir', 'Be-ar'], 0);
    add('¿Cómo se pronuncia "Bear" (Oso) en inglés?', ['Ber', 'Bir', 'Bar', 'Be-ar'], 0);
  } else if (part === 4) {
    add('¿Cómo se escribe "Hipopótamo" en inglés?', ['Hippo', 'Jipo', 'Hipo', 'Jipou'], 0);
    add('¿Cómo se pronuncia "Hippo" (Hipopótamo) en inglés?', ['Jipo', 'Hipo', 'Jipou', 'Jipi'], 0);
    add('¿Cómo se escribe "Rinoceronte" en inglés?', ['Rhino', 'Raino', 'Rino', 'Rinow'], 0);
    add('¿Cómo se pronuncia "Rhino" (Rinoceronte) en inglés?', ['Raino', 'Rino', 'Rino', 'Rainu'], 0);
    add('¿Cómo se escribe "Serpiente" en inglés?', ['Snake', 'Snek', 'Esneik', 'Snaque'], 0);
    add('¿Cómo se pronuncia "Snake" (Serpiente) en inglés?', ['Esneik', 'Snek', 'Esnek', 'Snaque'], 0);
    add('¿Cómo se escribe "Cocodrilo" en inglés?', ['Crocodile', 'Crocodail', 'Crocodil', 'Crococil'], 0);
    add('¿Cómo se pronuncia "Crocodile" (Cocodrilo) en inglés?', ['Crocodail', 'Crocodil', 'Crocodile', 'Crocodil'], 0);
    add('¿Cómo se escribe "Canguro" en inglés?', ['Kangaroo', 'Cangaru', 'Kangarus', 'Kangarou'], 0);
    add('¿Cómo se pronuncia "Kangaroo" (Canguro) en inglés?', ['Cangaru', 'Cangaro', 'Kangarou', 'Kangarus'], 0);
    add('¿Cómo se escribe "Oso Panda" en inglés?', ['Panda', 'Penda', 'Pande', 'Pando'], 0);
    add('¿Cómo se pronuncia "Panda" (Oso Panda) en inglés?', ['Panda', 'Penda', 'Pande', 'Pando'], 0);
    add('¿Cómo se escribe "Gorila" en inglés?', ['Gorilla', 'Gorila', 'Guerila', 'Goril'], 0);
    add('¿Cómo se pronuncia "Gorilla" (Gorila) en inglés?', ['Gorila', 'Guerila', 'Goril', 'Gorilla'], 0);
  } else if (part === 5) {
    add('¿Cómo se escribe "Pez" en inglés?', ['Fish', 'Fisch', 'Fis', 'Fise'], 0);
    add('¿Cómo se pronuncia "Fish" (Pez) en inglés?', ['Fish', 'Fis', 'Fich', 'Fise'], 0);
    add('¿Cómo se escribe "Tiburón" en inglés?', ['Shark', 'Sark', 'Schark', 'Charc'], 0);
    add('¿Cómo se pronuncia "Shark" (Tiburón) en inglés?', ['Shark', 'Sark', 'Chark', 'Sharc'], 0);
    add('¿Cómo se escribe "Delfín" en inglés?', ['Dolphin', 'Dolfin', 'Dolfi', 'Dolfing'], 0);
    add('¿Cómo se pronuncia "Dolphin" (Delfín) en inglés?', ['Dolfin', 'Dolfi', 'Dolpin', 'Dolfing'], 0);
    add('¿Cómo se escribe "Ballena" en inglés?', ['Whale', 'Jueil', 'Wel', 'Guel'], 0);
    add('¿Cómo se pronuncia "Whale" (Ballena) en inglés?', ['Jueil', 'Wel', 'Jual', 'Guel'], 0);
    add('¿Cómo se escribe "Tortuga de mar" en inglés?', ['Turtle', 'Tertl', 'Turtel', 'Tortl'], 0);
    add('¿Cómo se pronuncia "Turtle" (Tortuga) en inglés?', ['Tertl', 'Turtel', 'Tortol', 'Tertol'], 0);
    add('¿Cómo se escribe "Pulpo" en inglés?', ['Octopus', 'Octopas', 'Octopos', 'Octupus'], 0);
    add('¿Cómo se pronuncia "Octopus" (Pulpo) en inglés?', ['Octopus', 'Octopas', 'Octopos', 'Octupus'], 0);
    add('¿Cómo se escribe "Cangrejo" en inglés?', ['Crab', 'Krab', 'Creab', 'Crabe'], 0);
    add('¿Cómo se pronuncia "Crab" (Cangrejo) en inglés?', ['Crab', 'Kreb', 'Creab', 'Creb'], 0);
  } else if (part === 6) {
    add('¿Cómo se escribe "Foca" en inglés?', ['Seal', 'Sil', 'Sel', 'Seale'], 0);
    add('¿Cómo se pronuncia "Seal" (Foca) en inglés?', ['Sil', 'Sel', 'Cil', 'Seale'], 0);
    add('¿Cómo se escribe "Pingüino" en inglés?', ['Penguin', 'Penwin', 'Pengwin', 'Pengin'], 0);
    add('¿Cómo se pronuncia "Penguin" (Pingüino) en inglés?', ['Penguin', 'Penwin', 'Pengwin', 'Pengin'], 0);
    add('¿Cómo se escribe "Medusa" en inglés?', ['Jellyfish', 'Jelifish', 'Yelifish', 'Jelificas'], 0);
    add('¿Cómo se pronuncia "Jellyfish" (Medusa) en inglés?', ['Yelifish', 'Jelifish', 'Yelifis', 'Jelifis'], 0);
    add('¿Cómo se escribe "Langosta" en inglés?', ['Lobster', 'Lobstor', 'Lobs', 'Lobster'], 0);
    add('¿Cómo se pronuncia "Lobster" (Langosta) en inglés?', ['Lobster', 'Lobstor', 'Lobster', 'Lobste'], 0);
    add('¿Cómo se escribe "Calamar" en inglés?', ['Squid', 'Escuid', 'Skuid', 'Squide'], 0);
    add('¿Cómo se pronuncia "Squid" (Calamar) en inglés?', ['Escuid', 'Skuid', 'Sguid', 'Escuit'], 0);
    add('¿Cómo se escribe "Morsa" en inglés?', ['Walrus', 'Oalras', 'Gualrus', 'Walros'], 0);
    add('¿Cómo se pronuncia "Walrus" (Morsa) en inglés?', ['Oalras', 'Gualrus', 'Walrus', 'Walros'], 0);
    add('¿Cómo se escribe "Estrella de mar" en inglés?', ['Starfish', 'Estarfish', 'Starfisch', 'Estarfis'], 0);
    add('¿Cómo se pronuncia "Starfish" (Estrella de mar) en inglés?', ['Estarfish', 'Starfish', 'Estarfis', 'Starfis'], 0);
  } else if (part === 7) {
    add('¿Cómo se escribe "Águila" en inglés?', ['Eagle', 'Igl', 'Egle', 'Igual'], 0);
    add('¿Cómo se pronuncia "Eagle" (Águila) en inglés?', ['Igl', 'Egle', 'Igel', 'Igul'], 0);
    add('¿Cómo se escribe "Búho" en inglés?', ['Owl', 'Aul', 'Oul', 'Ool'], 0);
    add('¿Cómo se pronuncia "Owl" (Búho) en inglés?', ['Aul', 'Oul', 'Ool', 'Avul'], 0);
    add('¿Cómo se escribe "Loro" en inglés?', ['Parrot', 'Perrot', 'Parot', 'Perot'], 0);
    add('¿Cómo se pronuncia "Parrot" (Loro) en inglés?', ['Perrot', 'Parot', 'Parrote', 'Perot'], 0);
    add('¿Cómo se escribe "Abeja" en inglés?', ['Bee', 'Bi', 'Be', 'Bii'], 0);
    add('¿Cómo se pronuncia "Bee" (Abeja) en inglés?', ['Bi', 'Be', 'Bei', 'Bie'], 0);
    add('¿Cómo se escribe "Mariposa" en inglés?', ['Butterfly', 'Baterflai', 'Buterflai', 'Baterfli'], 0);
    add('¿Cómo se pronuncia "Butterfly" (Mariposa) en inglés?', ['Baterflai', 'Buterflai', 'Baterfli', 'Buterfly'], 0);
    add('¿Cómo se escribe "Hormiga" en inglés?', ['Ant', 'Ent', 'An', 'Ante'], 0);
    add('¿Cómo se pronuncia "Ant" (Hormiga) en inglés?', ['Ent', 'Ant', 'Ante', 'An'], 0);
    add('¿Cómo se escribe "Araña" en inglés?', ['Spider', 'Espaider', 'Espider', 'Spaidar'], 0);
    add('¿Cómo se pronuncia "Spider" (Araña) en inglés?', ['Espaider', 'Espider', 'Spaider', 'Espaidar'], 0);
  } else if (part === 8) {
    add('¿Cómo se escribe "Flamenco" en inglés?', ['Flamingo', 'Flemingo', 'Flamingu', 'Flamingue'], 0);
    add('¿Cómo se pronuncia "Flamingo" (Flamenco) en inglés?', ['Flemingo', 'Flamingo', 'Flamingu', 'Flemingu'], 0);
    add('¿Cómo se escribe "Cisne" en inglés?', ['Swan', 'Suan', 'Esuan', 'Swane'], 0);
    add('¿Cómo se pronuncia "Swan" (Cisne) en inglés?', ['Suan', 'Esuan', 'Soan', 'Swen'], 0);
    add('¿Cómo se escribe "Halcón" en inglés?', ['Falcon', 'Felcon', 'Falkeon', 'Falco'], 0);
    add('¿Cómo se pronuncia "Falcon" (Halcón) en inglés?', ['Felcon', 'Falcon', 'Falkon', 'Felkan'], 0);
    add('¿Cómo se escribe "Libélula" en inglés?', ['Dragonfly', 'Dragonflai', 'Dregonflai', 'Dragonfli'], 0);
    add('¿Cómo se pronuncia "Dragonfly" (Libélula) en inglés?', ['Dregonflai', 'Dragonflai', 'Dragonfli', 'Dregonfli'], 0);
    add('¿Cómo se escribe "Mosquito" en inglés?', ['Mosquito', 'Mosquitou', 'Moskito', 'Moskitu'], 0);
    add('¿Cómo se pronuncia "Mosquito" (Mosquito) en inglés?', ['Moskito', 'Mosquitou', 'Moskito', 'Moskitu'], 0);
    add('¿Cómo se escribe "Mosca" en inglés?', ['Fly', 'Flai', 'Fli', 'Flu'], 0);
    add('¿Cómo se pronuncia "Fly" (Mosca) en inglés?', ['Flai', 'Fli', 'Fly', 'Flei'], 0);
    add('¿Cómo se escribe "Escarabajo" en inglés?', ['Beetle', 'Bitl', 'Betle', 'Bitel'], 0);
    add('¿Cómo se pronuncia "Beetle" (Escarabajo) en inglés?', ['Bitl', 'Bitel', 'Betle', 'Betl'], 0);
  }
  return list;
}

function generateDailyWords(part) {
  let list = [];
  const add = (t, o, c) => {
    let arr = o.map((val, idx) => ({ val, ok: idx === c }));
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    list.push({ ...mkQ('quiz'), text: t, options: arr.map(x => x.val), correct: arr.findIndex(x => x.ok), time: 20 });
  };

  if (part === 1) {
    add('¿Cómo se escribe "Hola" en inglés?', ['Hello', 'Helo', 'Jello', 'Halo'], 0);
    add('¿Cómo se pronuncia "Hello" (Hola) en inglés?', ['Jelóu', 'Jelo', 'Jalo', 'Elou'], 0);
    add('¿Cómo se escribe "Buenos días" en inglés?', ['Good morning', 'Gud morning', 'Good moring', 'Good mornig'], 0);
    add('¿Cómo se pronuncia "Good morning" en inglés?', ['Gud mórning', 'Gud mornin', 'Gud mornig', 'Gud moring'], 0);
    add('¿Cómo se escribe "Buenas tardes" en inglés?', ['Good afternoon', 'Good afternon', 'Gud afternoon', 'Good evening'], 0);
    add('¿Cómo se pronuncia "Good afternoon" en inglés?', ['Gud áfternun', 'Gud afternon', 'Gud ívning', 'Gud náit'], 0);
    add('¿Cómo se escribe "Buenas noches" (llegada)?', ['Good evening', 'Good night', 'Good eveing', 'Gud evening'], 0);
    add('¿Cómo se pronuncia "Good evening" en inglés?', ['Gud ívning', 'Gud náit', 'Gud evning', 'Gud ivnin'], 0);
    add('¿Cómo se escribe "Buenas noches" (despedida)?', ['Good night', 'Good evening', 'Gud night', 'Good nitgh'], 0);
    add('¿Cómo se pronuncia "Good night" en inglés?', ['Gud náit', 'Gud ívning', 'Gud nit', 'Gud naigt'], 0);
    add('¿Cómo se escribe "Adiós" en inglés?', ['Goodbye', 'Goodby', 'Gudbai', 'Godbye'], 0);
    add('¿Cómo se pronuncia "Goodbye" en inglés?', ['Gudbái', 'Gudbi', 'Godbai', 'Gudbei'], 0);
    add('¿Cómo se escribe "Por favor" en inglés?', ['Please', 'Plis', 'Pleas', 'Pleaz'], 0);
    add('¿Cómo se pronuncia "Please" en inglés?', ['Plis', 'Ples', 'Pleas', 'Pliis'], 0);
    add('¿Cómo se escribe "Gracias" en inglés?', ['Thank you', 'Tank you', 'Sanck you', 'Thanc you'], 0);
    add('¿Cómo se pronuncia "Thank you" en inglés?', ['Zánk iu', 'Tank iu', 'Sank iu', 'Tenk iu'], 0);
    add('¿Cómo se escribe "De nada" en inglés?', ["You're welcome", 'You welcome', 'Yur welcome', 'Youre welcom'], 0);
    add('¿Cómo se pronuncia "You\'re welcome" en inglés?', ['Iur uélcam', 'Iur velcom', 'Iu welcom', 'Iur uelcom'], 0);
    add('¿Cómo se escribe "Lo siento / Perdón" en inglés?', ['Sorry', 'Sori', 'Sory', 'Sorri'], 0);
    add('¿Cómo se pronuncia "Sorry" en inglés?', ['Sóri', 'Sori', 'Sari', 'Suri'], 0);
  } else if (part === 2) {
    add('¿Cómo se escribe "Mamá" en inglés?', ['Mom / Mother', 'Mam / Mader', 'Mommy / Mader', 'Mother / Mammy'], 0);
    add('¿Cómo se pronuncia "Mother" (Mamá) en inglés?', ['Máder', 'Mader', 'Muder', 'Mador'], 0);
    add('¿Cómo se escribe "Papá" en inglés?', ['Dad / Father', 'Dadd / Fader', 'Father / Dady', 'Dad / Fader'], 0);
    add('¿Cómo se pronuncia "Father" (Papá) en inglés?', ['Fáder', 'Fader', 'Fuder', 'Fador'], 0);
    add('¿Cómo se escribe "Hermano" en inglés?', ['Brother', 'Broder', 'Brotherr', 'Brader'], 0);
    add('¿Cómo se pronuncia "Brother" en inglés?', ['Bráder', 'Broder', 'Bruder', 'Brador'], 0);
    add('¿Cómo se escribe "Hermana" en inglés?', ['Sister', 'Siter', 'Sistr', 'Sistor'], 0);
    add('¿Cómo se pronuncia "Sister" en inglés?', ['Síster', 'Sistor', 'Suster', 'Sistar'], 0);
    add('¿Cómo se escribe "Hijo" en inglés?', ['Son', 'Sun', 'Sone', 'San'], 0);
    add('¿Cómo se pronuncia "Son" (Hijo) en inglés?', ['San', 'Son', 'Sun', 'Sone'], 0);
    add('¿Cómo se escribe "Hija" en inglés?', ['Daughter', 'Dauter', 'Daugter', 'Dorter'], 0);
    add('¿Cómo se pronuncia "Daughter" en inglés?', ['Dóter', 'Dauter', 'Doter', 'Darter'], 0);
    add('¿Cómo se escribe "Amigo / Amiga" en inglés?', ['Friend', 'Frend', 'Friens', 'Frind'], 0);
    add('¿Cómo se pronuncia "Friend" en inglés?', ['Frend', 'Frind', 'Friend', 'Frand'], 0);
    add('¿Cómo se escribe "Niño / Chica" en inglés?', ['Boy / Girl', 'Boi / Guerl', 'Boy / Guirl', 'Boy / Girl'], 0);
    add('¿Cómo se pronuncia "Boy / Girl"?', ['Bói / Guerl', 'Boi / Girl', 'Boi / Guirl', 'Bui / Guerl'], 0);
  } else if (part === 3) {
    add('¿Cómo se escribe "Casa" en inglés?', ['House', 'Jaus', 'Hous', 'Howse'], 0);
    add('¿Cómo se pronuncia "House" (Casa) en inglés?', ['Jaus', 'Jus', 'Jos', 'Jous'], 0);
    add('¿Cómo se escribe "Mesa" en inglés?', ['Table', 'Teibl', 'Tabel', 'Tabl'], 0);
    add('¿Cómo se pronuncia "Table" (Mesa) en inglés?', ['Téibl', 'Table', 'Tabel', 'Tibl'], 0);
    add('¿Cómo se escribe "Silla" en inglés?', ['Chair', 'Cher', 'Chai', 'Chare'], 0);
    add('¿Cómo se pronuncia "Chair" (Silla) en inglés?', ['Cher', 'Chair', 'Shir', 'Char'], 0);
    add('¿Cómo se escribe "Puerta" en inglés?', ['Door', 'Dor', 'Doar', 'Dooer'], 0);
    add('¿Cómo se pronuncia "Door" (Puerta) en inglés?', ['Dor', 'Dur', 'Dour', 'Dar'], 0);
    add('¿Cómo se escribe "Ventana" en inglés?', ['Window', 'Uindou', 'Window', 'Windu'], 0);
    add('¿Cómo se pronuncia "Window" (Ventana) en inglés?', ['Uíndou', 'Windou', 'Uindu', 'Windu'], 0);
    add('¿Cómo se escribe "Cama" en inglés?', ['Bed', 'Bet', 'Bdd', 'Bede'], 0);
    add('¿Cómo se pronuncia "Bed" (Cama) en inglés?', ['Bed', 'Bet', 'Bid', 'Bad'], 0);
    add('¿Cómo se escribe "Teléfono" en inglés?', ['Phone', 'Foun', 'Phon', 'Fone'], 0);
    add('¿Cómo se pronuncia "Phone" (Teléfono) en inglés?', ['Foun', 'Fon', 'Fun', 'Fan'], 0);
    add('¿Cómo se escribe "Llave" en inglés?', ['Key', 'Ki', 'Kei', 'Kee'], 0);
    add('¿Cómo se pronuncia "Key" (Llave) en inglés?', ['Ki', 'Kei', 'Ke', 'Kai'], 0);
  } else if (part === 4) {
    add('¿Cómo se escribe "Agua" en inglés?', ['Water', 'Uoter', 'Watr', 'Watter'], 0);
    add('¿Cómo se pronuncia "Water" (Agua) en inglés?', ['Uóter', 'Water', 'Vuater', 'Uater'], 0);
    add('¿Cómo se escribe "Pan" en inglés?', ['Bread', 'Bred', 'Bread', 'Breet'], 0);
    add('¿Cómo se pronuncia "Bread" (Pan) en inglés?', ['Bred', 'Brid', 'Brad', 'Breat'], 0);
    add('¿Cómo se escribe "Leche" en inglés?', ['Milk', 'Milc', 'Melk', 'Milke'], 0);
    add('¿Cómo se pronuncia "Milk" (Leche) en inglés?', ['Milk', 'Melk', 'Milc', 'Malk'], 0);
    add('¿Cómo se escribe "Café" en inglés?', ['Coffee', 'Cofi', 'Cofee', 'Coffe'], 0);
    add('¿Cómo se pronuncia "Coffee" (Café) en inglés?', ['Cófi', 'Cofe', 'Cafi', 'Cufu'], 0);
    add('¿Cómo se escribe "Manzana" en inglés?', ['Apple', 'Apl', 'Aple', 'Appel'], 0);
    add('¿Cómo se pronuncia "Apple" (Manzana) en inglés?', ['Ápl', 'Apel', 'Epl', 'Aple'], 0);
    add('¿Cómo se escribe "Carne" en inglés?', ['Meat', 'Mit', 'Meed', 'Meate'], 0);
    add('¿Cómo se pronuncia "Meat" (Carne) en inglés?', ['Mit', 'Met', 'Mat', 'Meit'], 0);
    add('¿Cómo se escribe "Arroz" en inglés?', ['Rice', 'Rais', 'Rise', 'Ryce'], 0);
    add('¿Cómo se pronuncia "Rice" (Arroz) en inglés?', ['Ráis', 'Ris', 'Rici', 'Reis'], 0);
    add('¿Cómo se escribe "Comida" en inglés?', ['Food', 'Fud', 'Foode', 'Fut'], 0);
    add('¿Cómo se pronuncia "Food" (Comida) en inglés?', ['Fud', 'Fod', 'Faut', 'Fod'], 0);
  } else if (part === 5) {
    add('¿Cómo se escribe "Hoy" en inglés?', ['Today', 'Tudei', 'Tuday', 'Todaye'], 0);
    add('¿Cómo se pronuncia "Today" (Hoy) en inglés?', ['Tudéi', 'Tudai', 'Tude', 'Tudi'], 0);
    add('¿Cómo se escribe "Mañana" en inglés?', ['Tomorrow', 'Tumorou', 'Tomorow', 'Tomorrowe'], 0);
    add('¿Cómo se pronuncia "Tomorrow" (Mañana) en inglés?', ['Tumórou', 'Tomorou', 'Tumorof', 'Tomorow'], 0);
    add('¿Cómo se escribe "Ayer" en inglés?', ['Yesterday', 'Iesterdei', 'Yestarday', 'Yesterdei'], 0);
    add('¿Cómo se pronuncia "Yesterday" (Ayer) en inglés?', ['Iésterdei', 'Yesterdei', 'Iestardai', 'Yestardi'], 0);
    add('¿Cómo se escribe "Día" en inglés?', ['Day', 'Dei', 'Dai', 'Daye'], 0);
    add('¿Cómo se pronuncia "Day" (Día) en inglés?', ['Dei', 'Dai', 'De', 'Di'], 0);
    add('¿Cómo se escribe "Noche" en inglés?', ['Night', 'Nait', 'Nigth', 'Nite'], 0);
    add('¿Cómo se pronuncia "Night" (Noche) en inglés?', ['Náit', 'Nit', 'Nigt', 'Neit'], 0);
    add('¿Cómo se escribe "Hora" en inglés?', ['Hour', 'Auar', 'Our', 'Houer'], 0);
    add('¿Cómo se pronuncia "Hour" (Hora) en inglés?', ['Áuar', 'Juar', 'Jur', 'Our'], 0);
    add('¿Cómo se escribe "Semana" en inglés?', ['Week', 'Uik', 'Weec', 'Wek'], 0);
    add('¿Cómo se pronuncia "Week" (Semana) en inglés?', ['Uík', 'Wik', 'Wek', 'Uek'], 0);
    add('¿Cómo se escribe "Tiempo / Hora" en inglés?', ['Time', 'Taim', 'Tyme', 'Tiem'], 0);
    add('¿Cómo se pronuncia "Time" (Tiempo) en inglés?', ['Táim', 'Tim', 'Teim', 'Tami'], 0);
  } else if (part === 6) {
    add('¿Cómo se escribe "Comer" en inglés?', ['Eat', 'It', 'Eate', 'Eet'], 0);
    add('¿Cómo se pronuncia "Eat" (Comer) en inglés?', ['It', 'Et', 'Eat', 'Eit'], 0);
    add('¿Cómo se escribe "Beber" en inglés?', ['Drink', 'Drinc', 'Drenk', 'Drinke'], 0);
    add('¿Cómo se pronuncia "Drink" (Beber) en inglés?', ['Drink', 'Drenk', 'Drinc', 'Drank'], 0);
    add('¿Cómo se escribe "Dormir" en inglés?', ['Sleep', 'Slip', 'Slep', 'Sleepe'], 0);
    add('¿Cómo se pronuncia "Sleep" (Dormir) en inglés?', ['Slip', 'Slep', 'Slap', 'Sleip'], 0);
    add('¿Cómo se escribe "Hablar" en inglés?', ['Speak', 'Spik', 'Speec', 'Speake'], 0);
    add('¿Cómo se pronuncia "Speak" (Hablar) en inglés?', ['Spik', 'Spek', 'Spak', 'Speik'], 0);
    add('¿Cómo se escribe "Ir" en inglés?', ['Go', 'Gou', 'Goe', 'Goo'], 0);
    add('¿Cómo se pronuncia "Go" (Ir) en inglés?', ['Gou', 'Go', 'Gu', 'Gai'], 0);
    add('¿Cómo se escribe "Venir" en inglés?', ['Come', 'Cam', 'Cume', 'Com'], 0);
    add('¿Cómo se pronuncia "Come" (Venir) en inglés?', ['Cam', 'Com', 'Cum', 'Came'], 0);
    add('¿Cómo se escribe "Ver / Mirar" en inglés?', ['See / Watch', 'Si / Uoch', 'See / Wach', 'Si / Watch'], 0);
    add('¿Cómo se pronuncia "See / Watch"?', ['Si / Uóch', 'Se / Wach', 'Si / Voch', 'Sei / Uoch'], 0);
    add('¿Cómo se escribe "Trabajar" en inglés?', ['Work', 'Uerc', 'Worck', 'Worke'], 0);
    add('¿Cómo se pronuncia "Work" (Trabajar) en inglés?', ['Uerc', 'Work', 'Vork', 'Uorc'], 0);
  } else if (part === 7) {
    add('¿Cómo se escribe "Escuela / Colegio" en inglés?', ['School', 'Escul', 'Eskul', 'Schol'], 0);
    add('¿Cómo se pronuncia "School" (Escuela) en inglés?', ['Escul', 'Escol', 'Eskul', 'Schul'], 0);
    add('¿Cómo se escribe "Trabajo" en inglés?', ['Work', 'Uerc', 'Worck', 'Worc'], 0);
    add('¿Cómo se pronuncia "Work" (Trabajo) en inglés?', ['Uerc', 'Work', 'Vork', 'Uorc'], 0);
    add('¿Cómo se escribe "Tienda" en inglés?', ['Store', 'Stor', 'Stoar', 'Estor'], 0);
    add('¿Cómo se pronuncia "Store" (Tienda) en inglés?', ['Stor', 'Estor', 'Stur', 'Stori'], 0);
    add('¿Cómo se escribe "Hospital" en inglés?', ['Hospital', 'Jospital', 'Hospitel', 'Jospitel'], 0);
    add('¿Cómo se pronuncia "Hospital" en inglés?', ['Jóspital', 'Hospital', 'Jospitel', 'Ospital'], 0);
    add('¿Cómo se escribe "Parque" en inglés?', ['Park', 'Parc', 'Parque', 'Parke'], 0);
    add('¿Cómo se pronuncia "Park" (Parque) en inglés?', ['Parc', 'Park', 'Perk', 'Parke'], 0);
    add('¿Cómo se escribe "Restaurante" en inglés?', ['Restaurant', 'Restorant', 'Restaurante', 'Restorantt'], 0);
    add('¿Cómo se pronuncia "Restaurant" en inglés?', ['Réstorant', 'Restaurante', 'Rastorant', 'Restorante'], 0);
    add('¿Cómo se escribe "Baño" en inglés?', ['Bathroom', 'Bazrum', 'Batrum', 'Bathroome'], 0);
    add('¿Cómo se pronuncia "Bathroom" (Baño) en inglés?', ['Bázrum', 'Batrum', 'Basrum', 'Badrum'], 0);
  } else if (part === 8) {
    add('¿Cómo se escribe "Feliz" en inglés?', ['Happy', 'Japi', 'Hapy', 'Happi'], 0);
    add('¿Cómo se pronuncia "Happy" (Feliz) en inglés?', ['Jápi', 'Japi', 'Hapi', 'Jepi'], 0);
    add('¿Cómo se escribe "Triste" en inglés?', ['Sad', 'Sat', 'Sadd', 'Sade'], 0);
    add('¿Cómo se pronuncia "Sad" (Triste) en inglés?', ['Sad', 'Sat', 'Sed', 'Sard'], 0);
    add('¿Cómo se escribe "Cansado / Cansada" en inglés?', ['Tired', 'Taiard', 'Tyred', 'Tiredd'], 0);
    add('¿Cómo se pronuncia "Tired" en inglés?', ['Táiard', 'Tired', 'Teiard', 'Tirad'], 0);
    add('¿Cómo se escribe "Grande" en inglés?', ['Big', 'Bik', 'Bigg', 'Bige'], 0);
    add('¿Cómo se pronuncia "Big" (Grande) en inglés?', ['Big', 'Bik', 'Beg', 'Bag'], 0);
    add('¿Cómo se escribe "Pequeño / Pequeña" en inglés?', ['Small', 'Smol', 'Esmai', 'Smal'], 0);
    add('¿Cómo se pronuncia "Small" en inglés?', ['Smól', 'Esmol', 'Smal', 'Esmal'], 0);
    add('¿Cómo se escribe "Bueno / Buena" en inglés?', ['Good', 'Gud', 'Goode', 'Gudness'], 0);
    add('¿Cómo se pronuncia "Good" en inglés?', ['Gud', 'God', 'Gaud', 'Gud'], 0);
    add('¿Cómo se escribe "Malo / Mala" en inglés?', ['Bad', 'Bat', 'Badd', 'Bade'], 0);
    add('¿Cómo se pronuncia "Bad" en inglés?', ['Bad', 'Bat', 'Bed', 'Bard'], 0);
  }
  return list;
}

const LS = 'quizgo_quizzes_all_v10';
function loadQuizzes() {
  const defaults = [
    { id: 'p34_1', folder: 'primaria34', title: '🧮 Matemática - 3° y 4° Primaria (50 Preguntas)', questions: generate50('math') },
    { id: 'p34_2', folder: 'primaria34', title: '📖 Comunicación - 3° y 4° Primaria (50 Preguntas)', questions: generate50('comu') },
    { id: 'p34_3', folder: 'primaria34', title: '🌿 Ciencia y Tecnología - 3° y 4° (50 Preguntas)', questions: generate50('ciencia') },
    { id: 'p34_4', folder: 'primaria34', title: '🌎 Personal Social - 3° y 4° Primaria (50 Preguntas)', questions: generate50('social') },
    { id: 'p34_5', folder: 'primaria34', title: '⛪ Religión y Valores - 3° y 4° Primaria (50 Preguntas)', questions: generate50('reli') },
    { id: 'p34_6', folder: 'primaria34', title: '🎨 Arte y Cultura - 3° y 4° Primaria (50 Preguntas)', questions: generate50('arte') },
    { id: 'abc_1', folder: 'ingles_abc', title: '🔤 Pronunciación Inglés 1 (A, B, C, D, E, F)', questions: generateABC(1) },
    { id: 'abc_2', folder: 'ingles_abc', title: '🔤 Pronunciación Inglés 2 (G, H, I, J, K, L)', questions: generateABC(2) },
    { id: 'abc_3', folder: 'ingles_abc', title: '🔤 Pronunciación Inglés 3 (M, N, O, P, Q, R)', questions: generateABC(3) },
    { id: 'abc_4', folder: 'ingles_abc', title: '🔤 Pronunciación Inglés 4 (S, T, U, V, W, X)', questions: generateABC(4) },
    { id: 'anim_1', folder: 'animales_read', title: '🐶 Animales 1: Granja y Mascotas I (14 Preguntas)', questions: generateAnimals(1) },
    { id: 'anim_2', folder: 'animales_read', title: '🐓 Animales 2: Granja y Mascotas II (14 Preguntas)', questions: generateAnimals(2) },
    { id: 'anim_3', folder: 'animales_read', title: '🦁 Animales 3: Salvajes y Selva I (14 Preguntas)', questions: generateAnimals(3) },
    { id: 'anim_4', folder: 'animales_read', title: '🦏 Animales 4: Salvajes y Selva II (14 Preguntas)', questions: generateAnimals(4) },
    { id: 'anim_5', folder: 'animales_read', title: '🐬 Animales 5: Marinos y Acuáticos I (14 Preguntas)', questions: generateAnimals(5) },
    { id: 'anim_6', folder: 'animales_read', title: '🦭 Animales 6: Marinos y Acuáticos II (14 Preguntas)', questions: generateAnimals(6) },
    { id: 'anim_7', folder: 'animales_read', title: '🦅 Animales 7: Aves e Insectos I (14 Preguntas)', questions: generateAnimals(7) },
    { id: 'anim_8', folder: 'animales_read', title: '🦩 Animales 8: Aves e Insectos II (14 Preguntas)', questions: generateAnimals(8) },
    { id: 'daily_1', folder: 'palabras_daily', title: '👋 Palabras 1: Saludos y Expresiones Básicas', questions: generateDailyWords(1) },
    { id: 'daily_2', folder: 'palabras_daily', title: '👨‍👩‍👧‍👦 Palabras 2: La Familia y Personas', questions: generateDailyWords(2) },
    { id: 'daily_3', folder: 'palabras_daily', title: '🏠 Palabras 3: En la Casa y Objetos', questions: generateDailyWords(3) },
    { id: 'daily_4', folder: 'palabras_daily', title: '🍎 Palabras 4: Comida y Bebida', questions: generateDailyWords(4) },
    { id: 'daily_5', folder: 'palabras_daily', title: '📅 Palabras 5: Días, Tiempo y Momentos', questions: generateDailyWords(5) },
    { id: 'daily_6', folder: 'palabras_daily', title: '🚶‍♂️ Palabras 6: Verbos y Acciones Diarias', questions: generateDailyWords(6) },
    { id: 'daily_7', folder: 'palabras_daily', title: '🏦 Palabras 7: Lugares de la Ciudad', questions: generateDailyWords(7) },
    { id: 'daily_8', folder: 'palabras_daily', title: '😊 Palabras 8: Sentimientos y Adjetivos Comunes', questions: generateDailyWords(8) }
  ];

  try {
    let l = JSON.parse(localStorage.getItem(LS) || 'null');
    if (!Array.isArray(l) || l.length === 0) l = [];
    
    defaults.forEach(defQ => { if (!l.some(x => x.id === defQ.id)) l.push(defQ); });
    
    const delTab = getDeletedTab();
    TAB_DEFS.forEach(d => { if (!l.some(x => x.id === d.id) && !delTab.includes(d.id)) { l.push({ id: d.id, title: d.title, folder: 'tablas', questions: d.gen() }); } });
    
    saveQuizzes(l);
    return l;
  } catch (e) {
    return defaults;
  }
}
const saveQuizzes = l => { try { localStorage.setItem(LS, JSON.stringify(l)); } catch (e) {} };

function validate(quiz) {
  if (!quiz || !Array.isArray(quiz.questions) || !quiz.questions.length) return 'El quiz no tiene preguntas.';
  for (let i = 0; i < quiz.questions.length; i++) {
    const q = quiz.questions[i], n = `Pregunta ${i + 1}: `;
    if (!q.text || !q.text.trim()) return n + 'falta el texto de la pregunta.';
    if (q.type === 'quiz' || q.type === 'poll') {
      if (q.options.filter(o => o.trim()).length < 2) return n + 'necesita al menos 2 respuestas.';
      if (q.type === 'quiz' && !(q.options[q.correct] || '').trim()) return n + 'marca una respuesta correcta que no esté vacía.';
    }
    if (q.type === 'type' && !q.answers.some(a => a.trim())) return n + 'agrega al menos una respuesta aceptada.';
    if (q.type === 'slider') {
      if (!(Number(q.min) < Number(q.max))) return n + 'el mínimo debe ser menor que el máximo.';
      if (q.sliderCorrect < q.min || q.sliderCorrect > q.max) return n + 'la respuesta correcta debe estar dentro del rango.';
    }
  }
  return null;
}

// ================= CSV =================
function parseCSV(text) {
  const first = text.split('\n')[0] || '';
  const delim = (first.includes(';') && !first.includes(',')) ? ';' : ',';
  const rows = []; let row = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === delim) { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ''));
}
function csvToQuiz(text, title) {
  let rows = parseCSV(text.replace(/^\uFEFF/, ''));
  if (rows.length && isNaN(parseInt(rows[0][5]))) rows = rows.slice(1);
  const questions = rows.filter(r => r.length >= 6).map(r => {
    const t = parseInt(r[6]);
    return { ...mkQ('quiz'), text: r[0].trim(), options: [r[1], r[2], r[3], r[4]].map(x => (x || '').trim()),
      correct: Math.min(3, Math.max(0, (parseInt(r[5]) || 1) - 1)), time: [5,10,20,30,60,90,120,240].includes(t) ? t : 20 };
  });
  return { id: 'q' + Date.now(), title: title || 'Quiz importado', questions };
}
const csvCell = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
function download(name, text, mime) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\uFEFF' + text], { type: mime + ';charset=utf-8' }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
}
window.downloadTemplate = () => download('plantilla_quiz.csv',
  'Pregunta,Opcion 1,Opcion 2,Opcion 3,Opcion 4,Correcta (1-4),Tiempo (segundos)\n"¿Cuánto es 2+2?",3,4,5,6,2,20\n', 'text/csv');
window.exportQuiz = (id, fmt) => {
  const qz = loadQuizzes().find(x => x.id === id); if (!qz) return;
  const base = (qz.title || 'quiz').replace(/[^\w\-]+/g, '_');
  if (fmt === 'json') return download(base + '.json', JSON.stringify(qz, null, 2), 'application/json');
  let out = 'Pregunta,Opcion 1,Opcion 2,Opcion 3,Opcion 4,Correcta (1-4),Tiempo (segundos)\n';
  qz.questions.filter(q => q.type === 'quiz' || q.type === 'tf').forEach(q => {
    const o = q.options.concat(['', '', '', '']).slice(0, 4);
    out += [csvCell(q.text), ...o.map(csvCell), q.correct + 1, q.time].join(',') + '\n';
  });
  download(base + '.csv', out, 'text/csv');
};
window.importFile = input => {
  const f = input.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = e => {
    try {
      let qz;
      if (f.name.toLowerCase().endsWith('.json')) {
        qz = JSON.parse(e.target.result);
        qz.questions = (qz.questions || []).map(q => ({ ...mkQ(q.type || 'quiz'), ...q }));
      } else qz = csvToQuiz(e.target.result, f.name.replace(/\.[^.]+$/, ''));
      const err = validate(qz);
      if (err) return alert('Archivo inválido: ' + err);
      qz.id = 'q' + Date.now(); qz.title = qz.title || 'Quiz importado';
      if (window.__cf) qz.folder = window.__cf;
      else if (!FOLDERS.some(fo => fo.id === qz.folder)) delete qz.folder;
      const l = loadQuizzes(); l.unshift(qz); saveQuizzes(l); showLibrary(window.__cf);
    } catch (er) { alert('No se pudo leer el archivo: ' + er.message); }
  };
  r.readAsText(f); input.value = '';
};

// ================= ESTADO GLOBAL =================
let user = null, H = null, Pl = null, ED = null, S = null;
function cleanup() {
  if (H) { clearInterval(H.timer); H.unsub.forEach(u => u()); H = null; }
  if (Pl) { clearInterval(Pl.timer); Pl.unsub.forEach(u => u()); Pl = null; }
  if (S) { clearInterval(S.timer); S = null; }
}

// ================= AUTENTICACIÓN =================
let started = false;
async function initAuth() {
  onAuthStateChanged(auth, u => { if (u) { user = u; if (!started) { started = true; tryResume(); } } });
  try {
    const espera = new Promise((_, rej) => setTimeout(() => rej(new Error('tiempo de espera agotado')), 12000));
    await Promise.race([signInAnonymously(auth), espera]);
  } catch (error) {
    if (!started) { started = true; showLanding(); }
    setTimeout(() => alert('No se pudo conectar con Firebase. Revisa tu conexión a internet.'), 300);
  }
}

// ================= RECONEXIÓN A PARTIDA =================
async function tryResume() {
  if (!getSession()) return showLanding();
  await window.resumeSession(true);
}
window.resumeSession = async silent => {
  const s = getSession();
  if (!s || !user) return showLanding();
  try {
    const gs = await getDoc(doc(gamesCol(), s.pin));
    if (!gs.exists()) { clearSession(); if (!silent) alert('La partida ya no existe.'); return showLanding(); }
    if (s.role === 'host') {
      if (gs.data().hostId !== user.uid) { clearSession(); return showLanding(); }
      return attachHost(s.pin);
    }
    const id = `${s.pin}_${user.uid}`;
    const ps = await getDoc(doc(playersCol(), id));
    if (!ps.exists()) { clearSession(); if (!silent) alert('Ya no estás en esa partida.'); return showLanding(); }
    return attachPlayer(s.pin, id, true);
  } catch (e) {
    if (!silent) alert('No se pudo reconectar: ' + e.message);
    showLanding();
  }
};
window.leaveGame = async del => {
  const p = Pl; clearSession(); showLanding();
  if (del && p) { try { await deleteDoc(doc(playersCol(), p.id)); } catch (e) {} }
};

// ================= PANTALLA PRINCIPAL (HERO Y PERSONAJES 3D CON FONDO NEÓN VIBRANTE) =================
window.showLanding = () => {
  cleanup();
  const pin = new URLSearchParams(location.search).get('pin') || '';
  const ses = getSession();

  // Generamos 3 personajes vistosos
  const char1 = { b: 0, c: 5, e: 0, m: 1, a: 5, an: 0 }; // Burbuja Azul con Audífonos
  const char2 = { b: 1, c: 0, e: 2, m: 0, a: 1, an: 1 }; // Gatito Rojo con Corona
  const char3 = { b: 2, c: 7, e: 0, m: 3, a: 2, an: 2 }; // Osito Neón con Gafas de Sol

  screen(`
    ${bubbles()}
    <!-- Luces de neón ambientales multitono que combinan con personajes y letras -->
    <div class="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-purple-600/40 to-pink-500/30 rounded-full blur-[140px] pointer-events-none"></div>
    <div class="absolute bottom-10 left-10 w-[400px] h-[400px] bg-pink-600/30 rounded-full blur-[120px] pointer-events-none"></div>
    <div class="absolute top-10 right-10 w-[450px] h-[450px] bg-blue-600/30 rounded-full blur-[120px] pointer-events-none"></div>

    <!-- Barra Superior Cristalina -->
    <div class="relative z-10 w-full glass border-b border-white/10 flex items-center justify-between px-6 py-4 shadow-2xl shrink-0 backdrop-blur-2xl">
      <div class="text-white font-black text-2xl tracking-tighter flex items-center gap-2 cursor-pointer" onclick="showLanding()">
        <span class="bg-gradient-to-r from-purple-300 via-pink-300 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)]">QuizGo</span>
        <span class="text-[10px] bg-gradient-to-r from-pink-500 to-purple-600 text-white px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider shadow-md animate-pulse">PRO 3D</span>
      </div>
      <div class="flex items-center gap-3">
        <button id="btn-juegos" onclick="showGames()" class="bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 hover:from-amber-300 hover:to-pink-400 text-white text-sm font-black px-6 py-3 rounded-2xl btn3d flex items-center gap-2 shadow-lg transition transform hover:scale-105">
          <span>🎲</span> <span>Juegos</span>
        </button>
        <button onclick="showLibrary()" class="bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white text-sm font-black px-6 py-3 rounded-2xl btn3d flex items-center gap-2 shadow-lg transition transform hover:scale-105">
          <span>✏️</span> <span>Biblioteca & Crear</span>
        </button>
      </div>
    </div>

    <!-- Contenido Central -->
    <div class="relative z-10 flex-1 flex flex-col items-center justify-center p-4 md:p-6 overflow-y-auto">
      
      <!-- ESCENARIO PODIO CON PERSONAJES REALISTAS 3D Y LUZ DE FONDO -->
      <div class="flex items-end justify-center gap-4 sm:gap-8 mb-4 pop relative">
        <!-- Personaje Izquierda -->
        <div class="flex flex-col items-center">
          <div class="relative transform hover:scale-110 transition duration-300 drop-shadow-[0_15px_30px_rgba(77,157,224,0.4)]">
            ${avatarHTML(char1, 88)}
          </div>
          <div class="w-20 h-4 bg-black/50 rounded-full blur-md -mt-2"></div>
        </div>

        <!-- Personaje Centro (Líder) -->
        <div class="flex flex-col items-center -mt-6">
          <div class="relative transform hover:scale-115 transition duration-300 drop-shadow-[0_20px_40px_rgba(255,90,95,0.5)]">
            <div class="absolute -top-7 left-1/2 -translate-x-1/2 text-2xl animate-bounce drop-shadow"></div>
            ${avatarHTML(char2, 110)}
          </div>
          <div class="w-24 h-5 bg-black/60 rounded-full blur-md -mt-2"></div>
        </div>

        <!-- Personaje Derecha -->
        <div class="flex flex-col items-center">
          <div class="relative transform hover:scale-110 transition duration-300 drop-shadow-[0_15px_30px_rgba(199,125,255,0.4)]">
            ${avatarHTML(char3, 88)}
          </div>
          <div class="w-20 h-4 bg-black/50 rounded-full blur-md -mt-2"></div>
        </div>
      </div>

      <!-- Título Principal 3D en Altísima Definición -->
      <div class="text-center mb-6">
        <h1 class="text-white text-6xl md:text-8xl font-extrabold tracking-tight drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)] mb-1 bg-gradient-to-b from-white via-purple-100 to-pink-200 bg-clip-text text-transparent" style="text-shadow:0 0 40px rgba(199,125,255,0.5)">
          QuizGo
        </h1>
        <p class="text-purple-200 text-sm md:text-base font-extrabold tracking-wide max-w-md mx-auto drop-shadow-md">
          ¡Aprende, compite y diviértete en tiempo real! 
        </p>
      </div>

      <!-- Tarjeta Glass Formulario -->
      <div class="glass p-7 w-full max-w-[380px] shadow-[0_25px_60px_rgba(0,0,0,0.65)] rounded-[2.5rem] text-center slide-up border border-white/20 backdrop-blur-2xl relative overflow-hidden">
        <div class="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl"></div>
        <div class="absolute -bottom-24 -left-24 w-48 h-48 bg-pink-500/20 rounded-full blur-2xl"></div>

        <div class="relative z-10 space-y-4">
          <!-- Input PIN -->
          <div class="relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-lg opacity-80">🔢</span>
            <input id="in-pin" inputmode="numeric" maxlength="6" value="${esc(pin)}" placeholder="PIN del juego" class="w-full text-center pl-10 pr-4 py-4 bg-black/50 border-2 border-white/20 rounded-2xl font-black text-2xl text-white placeholder-white/40 focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-500/30 transition shadow-inner">
          </div>

          <!-- Input Apodo -->
          <div class="relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-lg opacity-80">👤</span>
            <input id="in-nick" maxlength="20" placeholder="Tu apodo épico" class="w-full text-center pl-10 pr-4 py-4 bg-black/50 border-2 border-white/20 rounded-2xl font-black text-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-500/30 transition shadow-inner" onkeydown="if(event.key==='Enter')joinGame()">
          </div>

          <!-- Botón de ingresar -->
          <button onclick="joinGame()" class="w-full py-4.5 text-white font-black text-xl rounded-2xl bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 hover:from-green-400 hover:to-emerald-400 btn3d shadow-[0_10px_25px_rgba(38,137,12,0.4)] transition transform active:scale-98 flex items-center justify-center gap-2">
            <span>..</span> <span>¡Unirse a la partida!</span>
          </button>
        </div>
      </div>

      <!-- Badges Informativos -->
      <div class="flex flex-wrap items-center justify-center gap-2 mt-6 text-xs font-extrabold text-white/90">
        <span class="px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center gap-1.5 shadow-md">...<span>En vivo</span></span>
        <span class="px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center gap-1.5 shadow-md">...<span>+100 Quizzes</span></span>
        <span class="px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center gap-1.5 shadow-md">...<span>Multijugador</span></span>
      </div>

      ${ses ? `<button onclick="resumeSession()" class="mt-5 glass px-6 py-3.5 rounded-2xl font-black text-sm hover:bg-white/25 transition border border-white/25 shadow-2xl slide-up flex items-center gap-2 text-purple-200 hover:text-white">🔄 Volver a mi partida anterior (PIN ${esc(ses.pin)})</button>` : ''}
    </div>`, 'stage-bg text-white');
};

// ================= BIBLIOTECA =================
function quizCard(q, i) {
  return `
    <div class="card-lift slide-up glass-card rounded-3xl border border-white/10 relative shadow-xl flex flex-col justify-between" style="animation-delay:${i * 50}ms">
      <div class="h-36 relative flex items-center justify-center overflow-hidden rounded-t-3xl" style="background:linear-gradient(135deg,${CARD_GRADS[[...q.id].reduce((a, c) => a + c.charCodeAt(0), 0) % CARD_GRADS.length].join(',')})">
        <div class="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/20 blur-xl"></div>
        <div class="absolute -left-6 -bottom-10 w-28 h-28 rounded-full bg-white/10 blur-xl"></div>
        <div class="relative flex gap-2 text-4xl drop-shadow-md">${[...new Set(q.questions.map(x => TYPES[x.type] ? TYPES[x.type].i : '❓'))].slice(0, 4).join(' ')}</div>
        <span class="absolute bottom-3 right-3 bg-black/50 backdrop-blur-md text-white text-xs font-black px-3 py-1 rounded-full border border-white/15">${q.questions.length} preguntas</span>
      </div>
      <div class="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 class="font-black text-base text-white leading-snug line-clamp-2 mb-2">${esc(q.title)}</h3>
        </div>
        <div class="flex gap-2.5 pt-2">
          <button onclick="presentQuiz('${q.id}')" class="flex-1 bg-[#26890c] hover:bg-[#20720a] text-white text-xs font-black py-2.5 rounded-xl btn3d">▶ Presentar</button>
          <button onclick="soloStart('${q.id}')" class="flex-1 bg-white/15 hover:bg-white/25 text-white text-xs font-black py-2.5 rounded-xl transition border border-white/20">Modo Solo</button>
        </div>
      </div>
      <button onclick="toggleMenu(event,'menu-${i}')" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/70 text-white font-black flex items-center justify-center border border-white/20 z-10">⋮</button>
      <div id="menu-${i}" class="hidden absolute top-14 right-3 w-52 glass bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl py-2 z-50 text-sm text-white">
        <button onclick="presentQuiz('${q.id}')" class="w-full text-left px-4 py-2.5 hover:bg-white/15 font-bold">👨‍🏫 Presentar en vivo</button>
        <button onclick="soloStart('${q.id}')" class="w-full text-left px-4 py-2.5 hover:bg-white/15">▶️ Jugar en solitario</button>
        <div class="border-t border-white/10 my-1"></div>
        <button onclick="editQuiz('${q.id}')" class="w-full text-left px-4 py-2.5 hover:bg-white/15">✏️ Editar quiz</button>
        <button onclick="dupQuiz('${q.id}')" class="w-full text-left px-4 py-2.5 hover:bg-white/15">📋 Duplicar</button>
        <button onclick="exportQuiz('${q.id}','csv')" class="w-full text-left px-4 py-2.5 hover:bg-white/15">⬇️ Exportar CSV</button>
        <button onclick="exportQuiz('${q.id}','json')" class="w-full text-left px-4 py-2.5 hover:bg-white/15">⬇️ Exportar JSON</button>
        <div class="border-t border-white/10 my-1"></div>
        <button onclick="delQuiz('${q.id}')" class="w-full text-left px-4 py-2.5 hover:bg-red-500/20 text-red-400 font-bold">🗑️ Eliminar</button>
      </div>
    </div>`;
}

function folderCard(f, count) {
  const bgStyle = f.img ? `background: url('${esc(f.img)}') center/cover no-repeat` : `background:linear-gradient(135deg,${f.grad.join(',')})`;
  return `
    <div class="card-lift slide-up glass-card rounded-3xl border border-white/20 relative shadow-xl cursor-pointer flex flex-col justify-between" onclick="showLibrary('${f.id}')">
      <div class="h-36 relative flex items-center justify-center overflow-hidden rounded-t-3xl" style="${bgStyle}">
        <div class="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/20 blur-xl"></div>
        <div class="absolute -left-6 -bottom-10 w-28 h-28 rounded-full bg-white/10 blur-xl"></div>
        ${f.img ? '' : `<div class="relative text-7xl drop-shadow-md">${f.icon}</div>`}
        <span class="absolute bottom-3 right-3 bg-black/50 backdrop-blur-md text-white text-xs font-black px-3 py-1 rounded-full border border-white/15">${count} quizzes</span>
      </div>
      <div class="p-5 relative">
        <h3 class="font-black text-base text-white leading-snug mb-1">${f.icon} ${esc(f.name)}</h3>
        <p class="text-xs text-white/60 font-medium mb-3">${esc(f.desc)}</p>
        <div class="w-full text-center bg-white/15 text-white text-xs font-black py-2.5 rounded-xl border border-white/20">📂 Abrir carpeta</div>
      </div>
      <button onclick="event.stopPropagation(); openFolderEdit('${f.id}')" class="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/70 text-white font-black flex items-center justify-center border border-white/20 z-10 text-sm" title="Editar carpeta">✏️</button>
    </div>`;
}

window.showLibrary = folder => {
  cleanup(); ED = null;
  folder = folder || null; window.__cf = folder;
  const all = loadQuizzes();
  const fo = FOLDERS.find(f => f.id === folder) || null;
  if (!fo) window.__cf = null;
  const list = fo ? all.filter(q => q.folder === fo.id) : all.filter(q => !FOLDERS.some(f => f.id === q.folder));
  const folderCards = fo ? '' : FOLDERS.map(f => folderCard(f, all.filter(q => q.folder === f.id).length)).join('');
  const cards = list.map((q, i) => quizCard(q, i)).join('') || (fo ? `<div class="col-span-full text-center text-white/70 font-bold py-16">La carpeta está vacía. Crea un quiz con “+ Crear quiz”.</div>` : '');
  
  screen(`
    <div class="glass h-18 border-b border-white/10 flex items-center justify-between px-6 shadow-xl shrink-0">
      <div class="text-white font-black text-2xl tracking-tighter cursor-pointer flex items-center gap-2" onclick="showLanding()">
        <span class="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">QuizGo</span>
      </div>
      <div class="flex gap-3">
        <button onclick="showLanding()" class="text-sm font-bold text-white/80 hover:text-white px-4 py-2 rounded-xl hover:bg-white/10 transition">Inicio</button>
        ${!fo ? `<button onclick="newFolder()" class="bg-[#7b61ff] hover:bg-[#6849f5] text-white text-sm font-black px-5 py-2.5 rounded-xl btn3d flex items-center gap-2">+ Crear carpeta</button>` : ''}
        <button onclick="newQuiz()" class="bg-[#1368ce] hover:bg-[#0f55b0] text-white text-sm font-black px-5 py-2.5 rounded-xl btn3d flex items-center gap-2">+ Crear quiz</button>
      </div>
    </div>
    <div class="flex-1 p-6 md:p-8 overflow-y-auto">
      <div class="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          ${fo ? `<button onclick="showLibrary()" class="text-sm font-bold text-white/80 hover:text-white mb-2 px-3 py-1.5 rounded-xl glass hover:bg-white/15 transition">← Volver a la biblioteca</button>` : ''}
          <h1 class="text-3xl font-black tracking-tight mb-1">${fo ? `📁 ${esc(fo.name)}` : 'Biblioteca de Quizzes'}</h1>
          <p class="text-white/60 text-sm font-medium">${fo ? 'Puedes editar cada quiz y guardarlo sin iniciar la partida (⋮ → Editar quiz → Guardar)' : 'Elige un tema escolar o crea el tuyo propio para jugar'}</p>
        </div>
        <div class="flex flex-wrap gap-3 text-sm font-bold">
          <label class="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl cursor-pointer shadow-lg transition flex items-center gap-2 border border-purple-400/30">📥 Importar CSV / JSON<input type="file" accept=".csv,.json" class="hidden" onchange="importFile(this)"></label>
          <button onclick="downloadTemplate()" class="glass hover:bg-white/20 px-5 py-2.5 rounded-xl transition border border-white/20">Descargar plantilla CSV</button>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">${folderCards}${cards}</div>
    </div>
    
    <div id="modal-folder" class="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center hidden p-4">
      <div class="glass w-full max-w-[400px] rounded-3xl shadow-2xl overflow-hidden border border-white/20 slide-up">
        <div class="p-8 flex flex-col gap-4">
          <h3 class="font-black text-xl text-white">Editar Carpeta</h3>
          <input id="f-name" class="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-purple-400" placeholder="Nombre de la carpeta">
          <input id="f-img" class="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-purple-400" placeholder="URL de la imagen de fondo (opcional)">
          <label class="w-full bg-[#1368ce] hover:bg-[#0f55b0] text-white px-4 py-3 rounded-xl cursor-pointer text-center font-bold text-sm transition">
            O subir imagen local
            <input type="file" accept="image/*" class="hidden" onchange="readFolderImg(this)">
          </label>
          <input type="hidden" id="f-id">
        </div>
        <div class="glass border-t border-white/10 p-4 flex justify-end gap-3">
          <button class="glass hover:bg-white/20 font-black px-6 py-2.5 rounded-xl text-sm" onclick="$('modal-folder').classList.add('hidden')">Cancelar</button>
          <button class="bg-[#26890c] hover:bg-[#20720a] font-black px-6 py-2.5 rounded-xl text-sm text-white" onclick="saveFolderEdit()">Guardar</button>
        </div>
      </div>
    </div>
  `, 'stage-bg text-white');
};
window.toggleMenu = (e, id) => {
  e.stopPropagation();
  document.querySelectorAll('[id^="menu-"]').forEach(m => { if (m.id !== id) m.classList.add('hidden'); });
  const m = $(id); if (m) m.classList.toggle('hidden');
};
window.closeAllMenus = () => document.querySelectorAll('[id^="menu-"]').forEach(m => m.classList.add('hidden'));
window.dupQuiz = id => { const l = loadQuizzes(); const q = l.find(x => x.id === id); if (!q) return; const c = clone(q); c.id = 'q' + Date.now(); c.title += ' (copia)'; l.unshift(c); saveQuizzes(l); showLibrary(window.__cf); };
window.delQuiz = id => {
  if (!confirm('¿Eliminar este quiz?')) return;
  if (id.startsWith('tab_')) { const d = getDeletedTab(); if (!d.includes(id)) d.push(id); try { localStorage.setItem(LS_DEL, JSON.stringify(d)); } catch (e) {} }
  saveQuizzes(loadQuizzes().filter(x => x.id !== id)); showLibrary(window.__cf);
};

// ================= EDITOR =================
window.newQuiz = () => {
  const q = mkQ(); const folder = window.__cf;
  if (folder === 'tablas') q.time = TAB_TIME;
  ED = { quiz: { id: 'q' + Date.now(), title: '', questions: [q], ...(folder ? { folder } : {}) }, qi: 0 };
  renderEditor();
};
window.editQuiz = id => { const q = loadQuizzes().find(x => x.id === id); if (!q) return; ED = { quiz: clone(q), qi: 0 }; renderEditor(); };
window.edExit = () => showLibrary(ED && ED.quiz.folder);
const curQ = () => ED.quiz.questions[ED.qi];

function renderEditor() {
  const q = curQ();
  const left = ED.quiz.questions.map((qq, i) => `
    <div onclick="edSel(${i})" class="rounded-2xl p-3 mb-2.5 cursor-pointer transition border ${i === ED.qi ? 'border-purple-400 bg-purple-600/30 shadow-lg' : 'border-white/10 bg-white/5 hover:bg-white/10'}">
      <div class="flex justify-between text-[11px] font-black text-white/70 mb-1">
        <span>#${i + 1} · ${TYPES[qq.type].i} ${TYPES[qq.type].n}</span>
        <span class="flex gap-2"><button title="Duplicar" onclick="event.stopPropagation();edDup(${i})" class="hover:text-purple-300">⧉</button> <button title="Eliminar" onclick="event.stopPropagation();edDel(${i})" class="hover:text-red-400">🗑</button></span>
      </div>
      <div id="thumb-${i}" class="text-xs font-bold truncate">${esc(qq.text) || '(sin texto)'}</div>
    </div>`).join('');

  let center = '';
  if (q.type === 'quiz' || q.type === 'poll') {
    center = `<div class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">` + [0,1,2,3].map(i => `
      <div class="glass rounded-2xl flex items-stretch h-20 shadow-xl overflow-hidden border border-white/15" style="border-left:8px solid ${OPT[i].c}">
        <div class="w-14 flex items-center justify-center" style="background:${OPT[i].c}">${shape(i, 24)}</div>
        <input value="${esc(q.options[i])}" oninput="edOpt(${i},this.value)" placeholder="Opción ${i + 1}" class="flex-1 px-4 bg-transparent font-bold text-white placeholder-white/40 focus:outline-none min-w-0">
        ${q.type === 'quiz' ? `<button onclick="edCorrect(${i})" title="Marcar como correcta" class="w-16 flex items-center justify-center text-3xl font-black ${q.correct === i ? 'bg-green-500 text-white shadow-inner' : 'text-white/20 hover:bg-white/10'}">✓</button>` : ''}
      </div>`).join('') + `</div>`;
  } else if (q.type === 'tf') {
    center = `<div class="grid grid-cols-2 gap-4 w-full max-w-3xl">` + [0,1].map(i => `
      <button onclick="edCorrect(${i})" class="h-28 rounded-2xl flex items-center justify-center gap-3 text-white text-2xl font-black btn3d ${q.correct === i ? 'ring-4 ring-green-400 scale-105' : 'opacity-75'}" style="background:${OPT[optIdx(q, i)].c}">
        ${shape(optIdx(q, i), 32)} ${q.options[i]} ${q.correct === i ? '✓' : ''}</button>`).join('') + `</div>`;
  } else if (q.type === 'type') {
    center = `<div class="w-full max-w-2xl glass rounded-3xl p-6 border border-white/15 shadow-xl">
      <label class="font-black text-sm block mb-2 text-white/90">Respuestas aceptadas (una por línea)</label>
      <textarea oninput="edAnswers(this.value)" rows="5" class="w-full bg-black/40 border border-white/20 rounded-2xl p-4 font-bold text-white focus:outline-none focus:border-purple-400">${esc(q.answers.join('\n'))}</textarea></div>`;
  } else if (q.type === 'slider') {
    const f = (label, k) => `<label class="text-xs font-black text-white/80 block">${label}<input type="number" value="${q[k]}" oninput="edNum('${k}',this.value)" class="w-full bg-black/40 border border-white/20 rounded-xl p-3 mt-1 font-bold text-white focus:outline-none focus:border-purple-400"></label>`;
    center = `<div class="w-full max-w-2xl glass rounded-3xl p-6 border border-white/15 shadow-xl grid grid-cols-2 md:grid-cols-4 gap-4">
      ${f('Mínimo', 'min')}${f('Máximo', 'max')}${f('Correcto', 'sliderCorrect')}${f('Margen (±)', 'margin')}</div>`;
  }

  const sel = (opts, cur, fn) => `<select onchange="${fn}(this.value)" class="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-sm font-bold text-white focus:outline-none focus:border-purple-400">${opts.map(([v, l]) => `<option value="${v}" ${String(v) === String(cur) ? 'selected' : ''} class="bg-gray-900">${l}</option>`).join('')}</select>`;

  screen(`
    <div class="glass h-18 border-b border-white/10 flex items-center justify-between px-6 shadow-xl shrink-0 gap-4">
      <div class="flex items-center gap-4 min-w-0">
        <div class="text-white font-black text-xl tracking-tighter hidden sm:block">QuizGo Editor</div>
        <input value="${esc(ED.quiz.title)}" oninput="ED_title(this.value)" placeholder="Título del quiz..." class="bg-black/30 border border-white/20 rounded-xl px-4 py-2 text-sm font-black w-48 sm:w-80 text-white focus:outline-none focus:border-purple-400">
      </div>
      <div class="flex items-center gap-3 shrink-0">
        <button class="text-white/70 hover:text-white font-bold text-sm px-4 py-2 rounded-xl hover:bg-white/10 transition" onclick="if(confirm('¿Salir sin guardar?'))edExit()">Salir</button>
        <button class="glass hover:bg-white/25 text-white font-black text-sm px-5 py-2.5 rounded-xl transition border border-white/20" onclick="edSave(false)">💾 Guardar</button>
        <button class="bg-[#26890c] hover:bg-[#20720a] text-white font-black text-sm px-6 py-2.5 rounded-xl btn3d" onclick="edSave(true)">Guardar y presentar</button>
      </div>
    </div>
    <div class="flex flex-1 overflow-hidden">
      <div class="w-56 md:w-64 glass border-r border-white/10 flex flex-col p-4 shrink-0 overflow-y-auto">
        <div class="flex-1 space-y-2">${left}</div>
        <button onclick="$('modal-add').classList.remove('hidden')" class="bg-[#1368ce] hover:bg-[#0f55b0] text-white font-black text-sm py-3 rounded-2xl btn3d mt-3">➕ Añadir pregunta</button>
      </div>
      <div class="flex-1 flex flex-col items-center p-6 md:p-8 overflow-y-auto">
        <textarea oninput="edText(this.value)" rows="2" placeholder="Escribe tu pregunta aquí..." class="w-full max-w-4xl text-center text-2xl md:text-3xl font-black py-5 px-6 glass rounded-3xl border border-white/20 shadow-2xl focus:outline-none focus:border-purple-400 text-white resize-none">${esc(q.text)}</textarea>
        <div class="w-full max-w-md glass mt-6 mb-6 rounded-3xl border border-white/15 shadow-xl p-4 flex flex-col items-center">
          ${q.image ? `<img src="${esc(q.image)}" class="max-h-48 object-contain mb-3 rounded-2xl"><button onclick="edImg('')" class="text-xs font-black text-red-400 hover:underline">Quitar imagen</button>` : `
          <div class="text-sm font-bold text-white/70 mb-2">🖼️ Imagen opcional</div>
          <input placeholder="Pega URL de imagen y presiona Enter" onkeydown="if(event.key==='Enter')edImg(this.value.trim())" class="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2 text-sm text-white placeholder-white/40 focus:outline-none">`}
        </div>
        ${center}
      </div>
      <div class="w-60 md:w-72 glass border-l border-white/10 p-6 flex flex-col gap-6 overflow-y-auto shrink-0">
        <h3 class="font-black text-sm tracking-widest uppercase opacity-85">Propiedades</h3>
        <div><label class="text-xs font-black text-white/70 block mb-2">Tipo</label>${sel(Object.entries(TYPES).map(([k, v]) => [k, v.i + ' ' + v.n]), q.type, 'edType')}</div>
        <div><label class="text-xs font-black text-white/70 block mb-2">⏱️ Tiempo</label>${sel([5,10,20,30,60,90,120,240].map(s => [s, s + ' segundos']), q.time, 'edTime')}</div>
        <div><label class="text-xs font-black text-white/70 block mb-2">🏆 Puntos</label>${sel([['standard', 'Estándar'], ['double', 'Doble'], ['none', 'Sin puntos']], q.points, 'edPoints')}</div>
      </div>
    </div>
    <div id="modal-add" class="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center hidden p-4">
      <div class="glass w-full max-w-[620px] rounded-3xl shadow-2xl overflow-hidden border border-white/20 slide-up">
        <div class="p-8">
          <h3 class="font-black text-xl mb-4 text-white">Elige el tipo de pregunta</h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            ${Object.entries(TYPES).map(([k, v]) => `<button onclick="edAdd('${k}')" class="glass-card hover:bg-white/20 border border-white/20 rounded-2xl shadow-xl h-28 flex flex-col items-center justify-center transition hover:scale-105"><div class="text-4xl mb-2">${v.i}</div><span class="font-black text-xs">${v.n}</span></button>`).join('')}
          </div>
        </div>
        <div class="glass border-t border-white/10 p-4 flex justify-end"><button class="glass hover:bg-white/20 font-black px-6 py-2.5 rounded-xl text-sm" onclick="$('modal-add').classList.add('hidden')">Cancelar</button></div>
      </div>
    </div>`, 'stage-bg text-white');
}
window.$ = $;
window.ED_title = v => { ED.quiz.title = v; };
window.edSel = i => { ED.qi = i; renderEditor(); };
window.edAdd = t => { const q = mkQ(t); if (ED.quiz.folder === 'tablas') q.time = TAB_TIME; ED.quiz.questions.push(q); ED.qi = ED.quiz.questions.length - 1; renderEditor(); };
window.edDup = i => { ED.quiz.questions.splice(i + 1, 0, clone(ED.quiz.questions[i])); ED.qi = i + 1; renderEditor(); };
window.edDel = i => {
  if (ED.quiz.questions.length === 1) return alert('El quiz debe tener al menos una pregunta.');
  ED.quiz.questions.splice(i, 1); ED.qi = Math.min(ED.qi, ED.quiz.questions.length - 1); renderEditor();
};
window.edText = v => { curQ().text = v; const t = $('thumb-' + ED.qi); if (t) t.textContent = v || '(sin texto)'; };
window.edOpt = (i, v) => { curQ().options[i] = v; };
window.edCorrect = i => { curQ().correct = i; renderEditor(); };
window.edAnswers = v => { curQ().answers = v.split('\n'); };
window.edNum = (k, v) => { curQ()[k] = Number(v); };
window.edTime = v => { curQ().time = Number(v); };
window.edPoints = v => { curQ().points = v; };
window.edImg = v => { curQ().image = v; renderEditor(); };
window.edType = t => {
  const q = curQ(); q.type = t;
  if (t === 'tf') { q.options = ['Verdadero', 'Falso']; if (q.correct > 1) q.correct = 0; }
  else if (q.options.length < 4 || q.options[0] === 'Verdadero') { q.options = ['', '', '', '']; q.correct = 0; }
  renderEditor();
};
window.edSave = present => {
  const qz = ED.quiz;
  const err = validate(qz); if (err) return alert(err);
  qz.title = (qz.title || '').trim() || 'Quiz sin título';
  const l = loadQuizzes(), i = l.findIndex(x => x.id === qz.id);
  if (i >= 0) l[i] = clone(qz); else l.unshift(clone(qz));
  saveQuizzes(l);
  if (present) presentQuiz(qz.id); else { showLibrary(qz.folder); toast('<span>💾 Quiz guardado</span>'); }
};

// ================= PANEL DE RESPUESTA =================
function answerPanel(q, fn) {
  if (q.type === 'type') return `<div class="flex flex-col gap-4 p-6 max-w-md mx-auto glass rounded-3xl border border-white/20">
    <input id="ans-text" maxlength="100" autocomplete="off" placeholder="Escribe tu respuesta aquí" class="bg-black/40 border-2 border-white/20 rounded-2xl p-4 text-2xl font-black text-center text-white placeholder-white/50 focus:outline-none focus:border-purple-400" onkeydown="if(event.key==='Enter')${fn}(this.value)">
    <button onclick="${fn}(document.getElementById('ans-text').value)" class="bg-[#1368ce] hover:bg-[#0f55b0] text-white font-black py-4 rounded-2xl btn3d text-lg shadow-xl">Enviar respuesta</button></div>`;
  if (q.type === 'slider') return `<div class="flex flex-col gap-5 p-8 max-w-md mx-auto glass rounded-3xl border border-white/20 text-center">
    <div id="ans-val" class="text-6xl font-black text-purple-300 drop-shadow-md">${Math.round((q.min + q.max) / 2)}</div>
    <input id="ans-range" type="range" min="${q.min}" max="${q.max}" value="${Math.round((q.min + q.max) / 2)}" oninput="document.getElementById('ans-val').textContent=this.value" class="w-full accent-purple-500">
    <div class="flex justify-between text-sm font-bold text-white/70"><span>${q.min}</span><span>${q.max}</span></div>
    <button onclick="${fn}(Number(document.getElementById('ans-range').value))" class="bg-[#1368ce] hover:bg-[#0f55b0] text-white font-black py-4 rounded-2xl btn3d text-lg shadow-xl">Enviar respuesta</button></div>`;
  const vis = visibleOpts(q);
  return `<div class="grid grid-cols-2 auto-rows-fr gap-4 h-full min-h-[240px] max-w-5xl mx-auto w-full p-2">${vis.map(i => `
    <button ${optBox(q, i, `onclick="${fn}(${i})"`)} class="btn3d rounded-3xl flex flex-col items-center justify-center gap-3 p-6 text-white font-black text-xl md:text-2xl hover:scale-[1.02] transition">
      ${shape(optIdx(q, i), 44)}<span class="break-words text-center leading-tight">${esc(q.options[i])}</span></button>`).join('')}</div>`;
}

// ================= ANFITRIÓN (HOST) =================
function attachHost(pin, folder) {
  cleanup();
  H = { pin, game: null, players: [], unsub: [], timer: null, key: '', busy: false, seen: new Set(), folder: folder || null };
  H.unsub.push(onSnapshot(doc(gamesCol(), pin), s => { if (H && s.exists()) { H.game = s.data(); hostRender(); } }));
  H.unsub.push(onSnapshot(query(playersCol(), where('gamePin', '==', pin)), snap => { if (H) { H.players = snap.docs.map(d => ({ id: d.id, ...d.data() })); hostLive(); } }));
}
window.presentQuiz = async id => {
  if (!user) return alert('No hay conexión con Firebase.');
  const qz = loadQuizzes().find(x => x.id === id); if (!qz) return;
  cleanup();
  try {
    let pin;
    for (let i = 0; i < 6; i++) {
      pin = String(Math.floor(100000 + Math.random() * 900000));
      if (!(await getDoc(doc(gamesCol(), pin))).exists()) break;
    }
    await setDoc(doc(gamesCol(), pin), { hostId: user.uid, title: qz.title, state: 'lobby', qIndex: 0, startAt: 0, createdAt: Date.now(), questions: clone(qz.questions) });
    setSession({ role: 'host', pin });
    attachHost(pin, qz.folder);
  } catch (e) { alert('No se pudo crear la partida: ' + e.message); }
};
function hostRender() {
  if (!H || !H.game) return;
  const g = H.game, key = g.state + '-' + g.qIndex;
  if (key !== H.key) {
    H.key = key; H.busy = false; clearInterval(H.timer);
    ({ lobby: hostLobby, question: hostQuestion, result: hostResultScreen, podium: hostPodium })[g.state]();
  }
  hostLive();
}
function hostLive() {
  if (!H || !H.game) return;
  const g = H.game;
  if (g.state === 'lobby') {
    const l = $('players-list'); if (!l) return;
    H.players.filter(p => !H.seen.has(p.id)).forEach(p => toast(`${avatarHTML(p.avatar, 32)}<span>${esc(p.nickname)} se unió 🎉</span>`));
    l.innerHTML = H.players.map(p => {
      const c = AV_COLORS[(p.avatar || DEF_AV).c || 0][0], isNew = !H.seen.has(p.id);
      return `<button title="Expulsar" onclick="kick('${p.id}')" class="${isNew ? 'slide-up' : ''} relative overflow-hidden rounded-3xl p-5 pb-4 flex flex-col items-center transition hover:scale-105" style="background:linear-gradient(160deg,${c}88,rgba(255,255,255,.05));border:1px solid rgba(255,255,255,0.25);box-shadow:0 12px 30px rgba(0,0,0,0.3)">
        <div class="absolute -top-10 w-32 h-32 rounded-full blur-2xl opacity-60" style="background:${c}"></div>
        <div class="relative">${avatarHTML(p.avatar, 92)}</div>
        <span class="relative mt-3 px-4 py-1 rounded-full bg-black/40 backdrop-blur-md font-black text-sm max-w-full truncate border border-white/15">${esc(p.nickname)}</span></button>`;
    }).join('');
    H.players.forEach(p => H.seen.add(p.id));
    $('pcount').textContent = H.players.length;
    const has = H.players.length > 0, b = $('btn-start');
    b.disabled = !has; b.classList.toggle('opacity-40', !has); b.classList.toggle('glow', has);
    $('empty-hint').classList.toggle('hidden', has);
  } else if (g.state === 'question') {
    const n = H.players.filter(p => p.answerQ === g.qIndex).length;
    const c = $('hcount'); if (c) c.textContent = `Respuestas: ${n} / ${H.players.length}`;
    if (H.players.length && n === H.players.length) hostShowResults();
  } else if (g.state === 'result') hostResultInner();
  else if (g.state === 'podium') hostPodiumInner();
}
function hostLobby() {
  const url = location.href.split('?')[0].split('#')[0];
  H.seen = new Set();
  screen(`
    ${bubbles()}
    <div class="relative z-10 flex flex-col flex-1 min-h-0 w-full">
      <div class="flex flex-wrap items-stretch justify-between gap-6 p-6 md:p-8">
        <div class="glass rounded-3xl p-5 flex items-center gap-5 slide-up border border-white/20 shadow-2xl">
          <div id="qr" class="bg-white p-3 rounded-2xl w-[112px] h-[112px] flex items-center justify-center text-4xl shrink-0 shadow-lg"></div>
          <div>
            <div class="text-xs font-black tracking-widest text-purple-300 mb-1">1 · ENTRA EN TU MÓVIL</div>
            <div class="font-bold text-sm md:text-base break-all max-w-xs text-white/90">${esc(url)}</div>
            <div class="text-xs font-black tracking-widest text-purple-300 mt-2 mb-1">2 · ESCRIBE EL PIN</div>
          </div>
        </div>
        <div class="glass text-white rounded-3xl px-10 py-5 text-center shadow-2xl slide-up border border-white/20 flex flex-col justify-center" style="animation-delay:.1s">
          <div class="text-xs font-black tracking-widest text-purple-300">PIN DEL JUEGO</div>
          <div class="text-6xl md:text-7xl font-black tracking-widest text-white drop-shadow-lg">${H.pin}</div>
        </div>
      </div>
      <div class="flex-1 min-h-0 flex flex-col items-center px-6 pb-6 overflow-y-auto">
        <h2 class="text-3xl md:text-5xl font-black text-center mb-3 pop drop-shadow-md">${esc(H.game.title)}</h2>
        <div class="glass rounded-full px-8 py-2.5 mb-6 font-black text-lg border border-white/20 shadow-xl">👥 <span id="pcount">0</span> jugadores conectados<span class="dots"></span></div>
        <div id="empty-hint" class="text-center opacity-80 my-12"><div class="text-7xl mb-3 animate-bounce">📱</div><div class="text-xl font-bold">¡Ingresa el PIN para unirte al juego!</div></div>
        <div id="players-list" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5 w-full max-w-7xl"></div>
      </div>
      <div class="shrink-0 p-5 flex justify-center gap-4 glass border-t border-white/10">
        <button onclick="if(confirm('¿Cancelar?'))endGame()" class="px-6 py-3 font-bold rounded-2xl glass hover:bg-white/20 transition">Cancelar</button>
        <button id="btn-start" onclick="hostStart()" class="px-14 py-3.5 text-2xl font-black text-white bg-[#1368ce] hover:bg-[#0f55b0] rounded-2xl btn3d opacity-40 shadow-2xl transition" disabled>▶ Comenzar Partida</button>
      </div>
    </div>`, 'stage-bg text-white');
  try { if (window.QRCode) new QRCode($('qr'), { text: url + '?pin=' + H.pin, width: 92, height: 92 }); else $('qr').textContent = '📱'; } catch (e) { $('qr').textContent = '📱'; }
}
window.kick = async id => { if (confirm('¿Expulsar?')) { try { await deleteDoc(doc(playersCol(), id)); } catch (e) {} } };
window.hostStart = async () => { await updateDoc(doc(gamesCol(), H.pin), { state: 'question', qIndex: 0, startAt: Date.now() }); };
function hostOptionsHTML(q) {
  if (q.type === 'type') return `<div class="text-center text-3xl font-black text-white/90 pb-12">✍️ Los jugadores están escribiendo su respuesta...</div>`;
  if (q.type === 'slider') return `<div class="text-center text-3xl font-black text-white/90 pb-12">🎚️ Los jugadores están usando el control deslizante...</div>`;
  return `<div class="grid grid-cols-2 gap-4 w-full max-w-6xl mx-auto p-4">${visibleOpts(q).map(i => `
    <div ${optBox(q, i)} class="slide-up rounded-3xl shadow-2xl flex items-center p-6 text-white text-2xl md:text-4xl font-black gap-5 min-h-[110px] border border-white/20">${shape(optIdx(q, i), 44)}<span class="break-words min-w-0">${esc(q.options[i])}</span></div>`).join('')}</div>`;
}
function hostQuestion() {
  const g = H.game, q = g.questions[g.qIndex];
  screen(`
    <div class="glass shadow-2xl px-8 py-4 flex items-center justify-between shrink-0 border-b border-white/10">
      <div class="font-black text-lg text-white/80">Pregunta ${g.qIndex + 1} de ${g.questions.length}</div>
      <div id="htimer" class="text-6xl font-black text-purple-300 drop-shadow">${q.time}</div>
      <button onclick="hostShowResults()" class="px-6 py-2.5 font-black text-white bg-[#1368ce] hover:bg-[#0f55b0] rounded-xl btn3d">Omitir pregunta</button>
    </div>
    <div class="h-2.5 bg-black/40 shrink-0"><div id="hbar" class="bar h-2.5 bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg" style="width:100%"></div></div>
    <div class="glass mx-8 mt-6 p-6 rounded-3xl text-center shadow-2xl border border-white/15 shrink-0">
      <h1 class="text-3xl md:text-5xl font-black leading-tight">${esc(q.text)}</h1>
    </div>
    <div class="flex-1 flex flex-col items-center justify-center min-h-0 px-6 py-4">
      ${q.image ? `<img src="${esc(q.image)}" class="max-h-[35vh] object-contain rounded-2xl shadow-xl mb-4 border border-white/20">` : ''}
      <div id="hcount" class="text-3xl font-black text-purple-200">Respuestas: 0 / ${H.players.length}</div>
    </div>
    ${hostOptionsHTML(q)}`, 'stage-bg text-white');
  H.timer = setInterval(() => {
    if (!H) return;
    const left = q.time - (Date.now() - H.game.startAt) / 1000;
    const t = $('htimer'); if (t) t.textContent = Math.max(0, Math.ceil(left));
    const b = $('hbar'); if (b) b.style.width = Math.max(0, left / q.time * 100) + '%';
    if (left <= 0) hostShowResults();
  }, 200);
}
window.hostShowResults = async () => {
  if (!H || H.busy || !H.game || H.game.state !== 'question') return;
  H.busy = true; clearInterval(H.timer);
  const g = H.game, q = g.questions[g.qIndex];
  const ev = H.players.map(p => {
    const answered = p.answerQ === g.qIndex;
    const correct = answered && isCorrect(q, p.answer);
    const r = calcPoints(q, correct, answered ? p.answerMs : q.time * 1000, p.streak || 0);
    return { p, correct, r, total: (p.score || 0) + r.pts + r.bonus };
  });
  const ranked = [...ev].sort((a, b) => b.total - a.total);
  try {
    const batch = writeBatch(db);
    ev.forEach(e => batch.update(doc(playersCol(), e.p.id), {
      score: e.total, streak: e.r.streak, lastPoints: e.r.pts + e.r.bonus, lastBonus: e.r.bonus,
      lastCorrect: e.correct, rank: ranked.indexOf(e) + 1, resultQ: g.qIndex
    }));
    batch.update(doc(gamesCol(), H.pin), { state: 'result' });
    await batch.commit();
  } catch (e) { H.busy = false; }
};
function lbRows(players, idx, n) {
  const medals = ['🥇', '🥈', '🥉'], edge = ['#ffd700', '#c0c0c0', '#cd7f32'];
  return [...players].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, n).map((p, i) => `
    <div class="slide-in flex items-center justify-between glass rounded-2xl shadow-xl px-5 py-3 text-white font-black border-l-8 border border-white/15" style="border-left-color:${edge[i] || '#a0aec0'};animation-delay:${i * 90}ms">
      <span class="flex items-center gap-4 min-w-0"><span class="w-8 text-center text-2xl shrink-0">${medals[i] || i + 1}</span>${avatarHTML(p.avatar, 46)}<span class="truncate text-lg">${esc(p.nickname)}</span>${p.streak >= 2 ? `<span class="text-orange-400 text-base shrink-0">🔥${p.streak}</span>` : ''}</span>
      <span class="shrink-0 text-xl">${(p.score || 0).toLocaleString()} ${p.resultQ === idx && p.lastPoints ? `<span class="text-green-400 text-base ml-2">+${p.lastPoints}</span>` : ''}</span>
    </div>`).join('');
}
function hostResultScreen() {
  const g = H.game, last = g.qIndex + 1 >= g.questions.length;
  screen(`
    <div class="glass shadow-2xl px-8 py-4 flex items-center justify-between shrink-0 border-b border-white/10">
      <div class="font-black text-lg text-white/80">Pregunta ${g.qIndex + 1} de ${g.questions.length} · Resultados</div>
      <button onclick="hostNext()" class="px-8 py-3 font-black text-white bg-[#1368ce] hover:bg-[#0f55b0] rounded-2xl btn3d text-lg shadow-xl">${last ? '🏆 Ver Podio Final' : 'Siguiente Pregunta ▶'}</button>
    </div>
    <div id="hres-body" class="flex-1 p-8 overflow-y-auto"></div>`, 'stage-bg text-white');
}
function hostResultInner() {
  const body = $('hres-body'); if (!body) return;
  const g = H.game, q = g.questions[g.qIndex], ps = H.players;
  const answered = ps.filter(p => p.answerQ === g.qIndex);
  let bars = '';
  if (['quiz', 'tf', 'poll'].includes(q.type)) {
    const vis = visibleOpts(q), counts = vis.map(i => answered.filter(p => Number(p.answer) === i).length), max = Math.max(1, ...counts);
    bars = vis.map((i, k) => `<div class="flex flex-col items-center w-28">
      <div class="font-black mb-2 text-2xl">${counts[k]}</div>
      <div class="bar w-full rounded-t-2xl shadow-2xl border-t border-x border-white/30" style="height:${Math.max(12, counts[k] / max * 220)}px;background:${OPT[optIdx(q, i)].c}"></div>
      <div class="mt-2 text-center text-xs font-black truncate w-full px-1">${esc(q.options[i])}</div>
      ${q.type !== 'poll' && i === q.correct ? '<div class="text-green-400 text-3xl mt-1">✓</div>' : '<div class="h-9"></div>'}</div>`).join('');
  } else {
    const ok = ps.filter(p => p.resultQ === g.qIndex && p.lastCorrect).length, bad = answered.length - ok, none = ps.length - answered.length;
    const max = Math.max(1, ok, bad, none);
    bars = [['Correctas', ok, '#26890c'], ['Incorrectas', bad, '#e21b3c'], ['Sin respuesta', none, '#666']].map(([l, n, c]) => `<div class="flex flex-col items-center w-32">
      <div class="font-black mb-2 text-2xl">${n}</div><div class="bar w-full rounded-t-2xl shadow-2xl border-t border-x border-white/30" style="height:${Math.max(12, n / max * 220)}px;background:${c}"></div><div class="mt-2 text-sm font-black">${l}</div></div>`).join('');
  }
  body.innerHTML = `
    <h2 class="text-3xl md:text-4xl font-black text-center mb-4">${esc(q.text)}</h2>
    ${q.type !== 'poll' ? `<div class="text-center text-2xl mb-8 font-bold">Respuesta correcta: <span class="font-black text-green-400 px-4 py-1 rounded-xl glass border border-green-500/30">${esc(correctText(q))}</span></div>` : '<div class="mb-6"></div>'}
    <div class="flex flex-wrap gap-12 justify-center items-end mb-12">${bars}</div>
    <div class="max-w-2xl mx-auto space-y-3"><h3 class="font-black text-xl text-center mb-4">🏆 Tabla de Clasificación</h3>${lbRows(ps, g.qIndex, 5)}</div>`;
}
window.hostNext = async () => {
  const g = H.game, ref = doc(gamesCol(), H.pin);
  if (g.qIndex + 1 < g.questions.length) await updateDoc(ref, { state: 'question', qIndex: g.qIndex + 1, startAt: Date.now() });
  else await updateDoc(ref, { state: 'podium' });
};
function hostPodium() {
  screen(`${confetti()}
    <div class="relative z-10 flex flex-col items-center w-full min-h-full p-6 md:p-8">
      <h1 class="text-5xl md:text-7xl font-black mb-8 mt-2 pop tracking-tight">🏆 ¡Podio de Campeones!</h1>
      <div id="podium-body" class="w-full flex flex-col items-center flex-1 justify-center"></div>
      <div class="flex gap-4 mt-8 mb-4">
        <button onclick="exportResults()" class="px-6 py-3.5 glass font-black rounded-2xl hover:bg-white/20 transition border border-white/20">⬇️ Descargar Resultados CSV</button>
        <button onclick="endGame()" class="px-10 py-3.5 bg-white text-purple-900 font-black rounded-2xl btn3d text-lg shadow-2xl">Finalizar Partida</button>
      </div>
    </div>`, 'stage-bg text-white');
}
function hostPodiumInner() {
  const b = $('podium-body'); if (!b) return;
  const s = [...H.players].sort((a, c) => (c.score || 0) - (a.score || 0));
  const col = (p, h, bg, fs, n) => p ? `<div class="flex flex-col items-center slide-up" style="animation-delay:${n === 1 ? 400 : n === 2 ? 200 : 0}ms">
      ${n === 1 ? '<div class="text-5xl -mb-4 pop">👑</div>' : ''}${avatarHTML(p.avatar, n === 1 ? 130 : 100)}
      <div class="font-black mb-3 mt-2 ${fs} text-center max-w-[11rem] truncate">${esc(p.nickname)}<br><span class="text-lg opacity-90 font-bold">${(p.score || 0).toLocaleString()} pts</span></div>
      <div class="${bg} w-32 md:w-44 ${h} rounded-t-3xl flex items-center justify-center text-6xl font-black text-black/70 shadow-2xl border-t border-x border-white/40">${n}</div></div>` : '';
  const rest = s.slice(3);
  const restHTML = rest.length ? `<div class="mt-10 w-full max-w-6xl">
      <h3 class="text-center font-black text-xl opacity-90 mb-4">💙 ¡Gran esfuerzo de todos los participantes!</h3>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">${rest.map((p, i) => `
        <div class="glass rounded-3xl p-4 pt-5 flex flex-col items-center relative slide-up border border-white/15" style="animation-delay:${i * 60}ms">
          <span class="absolute top-3 left-3 text-xs font-black bg-black/40 rounded-full px-2.5 py-0.5 border border-white/20">#${i + 4}</span>
          ${avatarHTML(p.avatar, 80, true, 'sad')}
          <div class="font-black mt-2 truncate max-w-full text-base">${esc(p.nickname)}</div>
          <div class="text-sm font-bold opacity-75">${(p.score || 0).toLocaleString()} pts</div>
        </div>`).join('')}</div></div>` : '';
  b.innerHTML = `<div class="flex items-end justify-center gap-3 md:gap-6">${col(s[1], 'h-36', 'bg-slate-300', 'text-2xl', 2)}${col(s[0], 'h-52', 'bg-yellow-400', 'text-3xl', 1)}${col(s[2], 'h-28', 'bg-amber-700', 'text-xl', 3)}</div>${restHTML}`;
}
window.exportResults = () => {
  const s = [...H.players].sort((a, c) => (c.score || 0) - (a.score || 0));
  download('resultados_quizgo.csv', 'Posicion,Jugador,Puntaje\n' + s.map((p, i) => `${i + 1},${csvCell(p.nickname)},${p.score || 0}`).join('\n'), 'text/csv');
};
window.endGame = async () => {
  const h = H; clearSession();
  if (h) { try { const b = writeBatch(db); h.players.forEach(p => b.delete(doc(playersCol(), p.id))); b.delete(doc(gamesCol(), h.pin)); await b.commit(); } catch (e) {} }
  cleanup(); showLibrary(h && h.folder);
};

// ================= JUGADOR =================
window.joinGame = async () => {
  if (!user) return alert('No hay conexión con Firebase.');
  const pin = $('in-pin').value.trim(), nick = $('in-nick').value.trim().slice(0, 20);
  if (!pin || !nick) return alert('Ingresa un PIN y tu apodo.');
  try {
    const gs = await getDoc(doc(gamesCol(), pin));
    if (!gs.exists()) return alert('Juego no encontrado. Revisa el PIN.');
    const myId = `${pin}_${user.uid}`;
    const mine = await getDoc(doc(playersCol(), myId));
    if (mine.exists()) {
      setSession({ role: 'player', pin, nick: mine.data().nickname });
      toast('<span>🔄 ¡Volviste a la partida!</span>');
      return attachPlayer(pin, myId, true);
    }
    if (gs.data().state === 'podium') return alert('Este juego ya ha finalizado.');
    const others = await getDocs(query(playersCol(), where('gamePin', '==', pin)));
    let old = null; others.forEach(d => { const x = d.data(); if (x.uid !== user.uid && norm(x.nickname) === norm(nick)) old = { id: d.id, data: x }; });
    if (old) {
      if (!confirm('Ese apodo ya está en esta sala.\n\n¿Eres tú y te desconectaste? Pulsa Aceptar para recuperar tu lugar y tu puntaje.\n(Si es otra persona, pulsa Cancelar y elige otro apodo.)')) return;
      try {
        await setDoc(doc(playersCol(), myId), { ...old.data, uid: user.uid });
        try { await deleteDoc(doc(playersCol(), old.id)); } catch (e) {}
        setSession({ role: 'player', pin, nick: old.data.nickname });
        toast('<span>🔄 ¡Recuperaste tu lugar!</span>');
        return attachPlayer(pin, myId, true);
      } catch (e) { return alert('No se pudo recuperar tu lugar: ' + e.message); }
    }
    AVED = { av: loadAvatar(), mode: 'join', pin, nick };
    return renderAvatarEditor();
  } catch (e) { alert('Error: ' + e.message); }
};
window.doJoin = async () => {
  const { pin, nick, av } = AVED;
  try {
    const id = `${pin}_${user.uid}`;
    await setDoc(doc(playersCol(), id), { gamePin: pin, uid: user.uid, nickname: nick, avatar: av, score: 0, streak: 0, answer: null, answerQ: -1, answerMs: 0, resultQ: -1, lastPoints: 0, lastBonus: 0, lastCorrect: false, rank: 0 });
    AVED = null;
    setSession({ role: 'player', pin, nick });
    attachPlayer(pin, id, false);
  } catch (e) { alert('Error: ' + e.message); }
};
function attachPlayer(pin, id, resumed) {
  cleanup();
  Pl = { pin, id, game: null, me: null, unsub: [], key: '', startLocal: 0, qStarted: -1, answeredQ: -1, timeUpQ: -1, timer: null, resumed: !!resumed };
  Pl.unsub.push(onSnapshot(doc(gamesCol(), pin), s => {
    if (!Pl) return;
    if (!s.exists()) {
      if (s.metadata.fromCache) return;
      if (!Pl.game || Pl.game.state !== 'podium') alert('El anfitrión finalizó la partida.');
      clearSession(); return showLanding();
    }
    Pl.game = s.data(); playerRender();
  }));
  Pl.unsub.push(onSnapshot(doc(playersCol(), id), s => {
    if (!Pl) return;
    if (!s.exists()) {
      if (s.metadata.fromCache) return;
      if (Pl.me && Pl.game && Pl.game.state !== 'podium') alert('Fuiste expulsado.');
      clearSession(); return showLanding();
    }
    Pl.me = s.data(); playerRender();
  }));
}
function playerRender() {
  if (!Pl || !Pl.game || !Pl.me) return;
  const g = Pl.game, me = Pl.me, st = g.state, idx = g.qIndex, q = g.questions[idx];
  if (st === 'question' && Pl.qStarted !== idx) {
    Pl.qStarted = idx;
    const elapsed = Pl.resumed ? Math.max(0, Date.now() - (g.startAt || Date.now())) : 0;
    Pl.startLocal = performance.now() - elapsed;
  }
  Pl.resumed = false;
  if (st === 'question' && me.answerQ === idx) Pl.answeredQ = idx;
  let key;
  if (st === 'lobby') key = 'lobby';
  else if (st === 'question') key = `q${idx}-${Pl.answeredQ === idx ? 'a' : Pl.timeUpQ === idx ? 't' : 'o'}`;
  else if (st === 'result') key = `r${idx}-${me.resultQ === idx}`;
  else key = 'podium';
  if (key === Pl.key) return;
  Pl.key = key; clearInterval(Pl.timer);

  if (st === 'lobby') {
    screen(`${bubbles()}<div class="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div class="glass rounded-3xl p-8 flex flex-col items-center slide-up border border-white/20 shadow-2xl max-w-sm w-full">
        <div class="relative mb-4"><div class="absolute inset-0 rounded-full blur-3xl opacity-70" style="background:${AV_COLORS[(me.avatar || DEF_AV).c || 0][0]}"></div><div class="relative">${avatarHTML(me.avatar, 170)}</div></div>
        <h1 class="text-4xl font-black mb-2 pop">¡Estás dentro!</h1>
        <p class="text-2xl font-black px-6 py-1.5 rounded-full bg-black/30 mb-4 border border-white/15">${esc(me.nickname)}</p>
        <p class="text-sm font-bold opacity-80 dots">Esperando al anfitrión</p>
      </div>
      <div class="flex gap-3 mt-6">
        <button onclick="avChange()" class="glass px-8 py-3 rounded-2xl font-black hover:bg-white/25 transition border border-white/20 shadow-lg">🎨 Cambiar personaje</button>
        <button onclick="if(confirm('¿Salir de la partida?'))leaveGame(true)" class="glass px-6 py-3 rounded-2xl font-bold hover:bg-white/25 transition border border-white/20 shadow-lg">Salir</button>
      </div></div>`, 'stage-bg text-white');
  } else if (st === 'question') {
    if (key.endsWith('-a')) return screen(`<div class="flex-1 flex flex-col items-center justify-center text-3xl font-black text-white text-center p-6 stage-bg">${avatarHTML(me.avatar, 140)}<div class="mt-6">¡Respuesta enviada!<br><span class="text-xl font-bold opacity-80">Esperando resultados...</span></div></div>`, 'stage-bg text-white');
    if (key.endsWith('-t')) return screen(`<div class="flex-1 flex flex-col items-center justify-center text-3xl font-black text-white text-center p-6 stage-bg"><div class="text-7xl mb-4 animate-bounce">⌛</div>¡Se acabó el tiempo!</div>`, 'stage-bg text-white');
    screen(`
      <div class="glass shadow-2xl px-5 py-3.5 flex justify-between items-center shrink-0 border-b border-white/10"><div class="font-black text-sm">${idx + 1}/${g.questions.length}</div><div id="ptimer" class="text-3xl font-black text-purple-300">${q.time}</div></div>
      <div class="px-5 py-4 text-center font-black text-xl shrink-0 leading-tight">${esc(q.text)}</div>
      <div class="flex-1 p-3 min-h-0">${answerPanel(q, 'playerSubmit')}</div>`, 'stage-bg text-white');
    Pl.timer = setInterval(() => {
      if (!Pl) return;
      const left = Math.max(0, q.time - (performance.now() - Pl.startLocal) / 1000);
      const el = $('ptimer'); if (el) el.textContent = Math.ceil(left);
      if (left <= 0) { clearInterval(Pl.timer); if (Pl.answeredQ !== idx) { Pl.timeUpQ = idx; playerRender(); } }
    }, 250);
  } else if (st === 'result') {
    if (me.resultQ !== idx) return screen(`<div class="flex-1 flex items-center justify-center text-3xl font-black stage-bg text-white">Calculando puntaje...</div>`);
    const answered = me.answerQ === idx;
    if (q.type === 'poll') return screen(`<div class="flex-1 flex flex-col items-center justify-center p-6 text-center stage-bg text-white"><h1 class="text-4xl font-black pop">¡Respuesta registrada!</h1></div>`);
    const ok = me.lastCorrect;
    screen(`<div class="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div class="mb-4">${avatarHTML(me.avatar, 110)}</div>
      <div class="text-6xl mb-2 pop">${ok ? '✓' : '✗'}</div>
      <h1 class="text-5xl font-black mb-4 pop">${ok ? '¡Correcto!' : answered ? 'Incorrecto' : 'Sin respuesta'}</h1>
      ${ok ? `<div class="text-4xl font-black mb-3 text-yellow-300">+${me.lastPoints} pts</div>` : `<div class="text-xl mb-3 font-semibold opacity-90">Respuesta correcta: <b>${esc(correctText(q))}</b></div>`}
      ${me.streak >= 2 ? `<div class="text-2xl font-black mb-4 text-orange-400">🔥 Racha de ${me.streak}${me.lastBonus ? ` (+${me.lastBonus})` : ''}</div>` : ''}
      <div class="glass px-8 py-3 rounded-2xl font-black text-2xl border border-white/20 shadow-xl mb-3">Puntaje: ${(me.score || 0).toLocaleString()}</div>
      <div class="text-lg font-bold opacity-90">Posición actual: #${me.rank}</div></div>`, ok ? 'bg-gradient-to-br from-green-600 to-emerald-900 text-white' : 'bg-gradient-to-br from-red-600 to-rose-950 text-white');
  } else {
    const sad = me.rank >= 4, win = me.rank >= 1 && me.rank <= 3;
    screen(`${win ? confetti() : bubbles()}<div class="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div class="glass rounded-3xl p-8 flex flex-col items-center slide-up border border-white/20 shadow-2xl max-w-sm w-full">
        ${avatarHTML(me.avatar, 160, true, sad ? 'sad' : '')}
        <div class="text-6xl my-3">${me.rank === 1 ? '🥇' : me.rank === 2 ? '🥈' : me.rank === 3 ? '🥉' : '😢'}</div>
        <h1 class="text-3xl font-black mb-2">${sad ? '¡Buen intento!' : '¡Excelente trabajo!'}</h1>
        <div class="text-2xl font-black mb-1">Posición: #${me.rank || '-'}</div>
        <div class="text-xl font-bold opacity-90">Puntaje total: ${(me.score || 0).toLocaleString()}</div>
      </div>
      <button onclick="leaveGame(false)" class="px-10 py-3.5 mt-8 bg-white text-purple-900 font-black rounded-2xl btn3d text-lg shadow-2xl">Volver al inicio</button></div>`, 'stage-bg text-white');
  }
}
window.playerSubmit = async val => {
  if (!Pl || !Pl.game) return;
  const idx = Pl.game.qIndex, q = Pl.game.questions[idx];
  if (Pl.answeredQ === idx || Pl.timeUpQ === idx) return;
  if (q.type === 'type' && !String(val).trim()) return;
  const ms = Math.min(q.time * 1000, Math.round(performance.now() - Pl.startLocal));
  Pl.answeredQ = idx; playerRender();
  try { await updateDoc(doc(playersCol(), Pl.id), { answer: val, answerQ: idx, answerMs: ms }); } catch (e) {}
};

// ================= MODO SOLITARIO =================
window.soloBack = () => showLibrary(window.__cf);
window.soloStart = id => {
  const qz = loadQuizzes().find(x => x.id === id); if (!qz) return;
  cleanup(); S = { quiz: qz, i: 0, score: 0, streak: 0, okCount: 0, startLocal: 0, timer: null, done: false };
  soloQuestion();
};
function soloQuestion() {
  const q = S.quiz.questions[S.i]; S.done = false; S.startLocal = performance.now();
  screen(`
    <div class="glass shadow-2xl px-6 py-4 flex justify-between items-center shrink-0 border-b border-white/10">
      <div class="font-black text-sm md:text-base">${S.i + 1}/${S.quiz.questions.length} · ${S.score.toLocaleString()} pts</div>
      <div id="ptimer" class="text-3xl font-black text-purple-300">${q.time}</div>
      <button onclick="if(confirm('¿Salir?'))soloBack()" class="text-sm font-bold text-white/70 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/10 transition">Salir</button>
    </div>
    <div class="glass mx-6 mt-6 p-6 rounded-3xl text-center shadow-2xl border border-white/15 shrink-0">
      <div class="text-2xl md:text-3xl font-black leading-tight">${esc(q.text)}</div>
    </div>
    ${q.image ? `<img src="${esc(q.image)}" class="max-h-40 object-contain mx-auto my-3 rounded-2xl border border-white/20">` : ''}
    <div class="flex-1 p-4 min-h-0">${answerPanel(q, 'soloSubmit')}</div>`, 'stage-bg text-white');
  S.timer = setInterval(() => {
    if (!S) return;
    const left = Math.max(0, q.time - (performance.now() - S.startLocal) / 1000);
    const el = $('ptimer'); if (el) el.textContent = Math.ceil(left);
    if (left <= 0) soloSubmit(null);
  }, 250);
}
window.soloSubmit = val => {
  if (!S || S.done) return;
  const q = S.quiz.questions[S.i];
  if (val !== null && q.type === 'type' && !String(val).trim()) return;
  S.done = true; clearInterval(S.timer);
  const ms = Math.min(q.time * 1000, performance.now() - S.startLocal);
  const ok = val !== null && isCorrect(q, val);
  const r = calcPoints(q, ok, ms, S.streak);
  S.score += r.pts + r.bonus; S.streak = r.streak; if (ok) S.okCount++;
  const last = S.i + 1 >= S.quiz.questions.length;
  screen(`<div class="flex-1 flex flex-col items-center justify-center p-6 text-center">
    ${q.type === 'poll' ? '<h1 class="text-4xl font-black">Respuesta registrada</h1>' : `
    <div class="text-7xl mb-3 pop">${ok ? '✓' : '✗'}</div>
    <h1 class="text-5xl font-black mb-4 pop">${ok ? '¡Correcto!' : val === null ? 'Tiempo agotado' : 'Incorrecto'}</h1>
    ${ok ? `<div class="text-4xl font-black mb-3 text-yellow-300">+${r.pts + r.bonus} pts</div>` : `<div class="text-xl mb-3 font-semibold opacity-90">Respuesta correcta: <b>${esc(correctText(q))}</b></div>`}
    ${S.streak >= 2 ? `<div class="text-2xl font-black mb-4 text-orange-400">🔥 Racha de ${S.streak}</div>` : ''}`}
    <div class="glass px-8 py-3 rounded-2xl font-black text-2xl border border-white/20 shadow-xl mb-8">Puntaje total: ${S.score.toLocaleString()}</div>
    <button onclick="${last ? 'soloEnd()' : 'soloNext()'}" class="px-10 py-4 bg-white text-purple-900 font-black rounded-2xl btn3d text-lg shadow-2xl">${last ? 'Ver resultado final' : 'Siguiente pregunta ▶'}</button></div>`, q.type === 'poll' ? 'stage-bg text-white' : ok ? 'bg-gradient-to-br from-green-600 to-emerald-950 text-white' : 'bg-gradient-to-br from-red-600 to-rose-950 text-white');
};
window.soloNext = () => { S.i++; soloQuestion(); };
window.soloEnd = () => {
  const total = S.quiz.questions.filter(q => q.type !== 'poll').length;
  screen(`${confetti()}<div class="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center">
    <div class="glass rounded-3xl p-8 flex flex-col items-center slide-up border border-white/20 shadow-2xl max-w-sm w-full">
      <div class="text-7xl mb-4">🏆</div>
      <h1 class="text-4xl font-black mb-3">¡Quiz Completado!</h1>
      <div class="text-3xl font-black text-yellow-300 mb-2">${S.score.toLocaleString()} pts</div>
      <div class="text-xl font-bold opacity-90 mb-6">Aciertos: ${S.okCount} de ${total}</div>
    </div>
    <div class="flex gap-4 mt-8">
      <button onclick="soloStart('${S.quiz.id}')" class="px-8 py-3.5 bg-white text-purple-900 font-black rounded-2xl btn3d shadow-xl">Jugar de nuevo</button>
      <button onclick="soloBack()" class="px-8 py-3.5 glass font-black rounded-2xl hover:bg-white/20 transition border border-white/20">Volver a la biblioteca</button>
    </div></div>`, 'stage-bg text-white');
};

initAuth();
