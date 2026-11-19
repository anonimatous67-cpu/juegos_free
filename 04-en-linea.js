import { getApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, onSnapshot, updateDoc, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

(function () {
  const fbApp = getApp(), auth = getAuth(fbApp), db = getFirestore(fbApp);
  const gamesC = () => collection(db, 'games'), playersC = () => collection(db, 'players');
  let me = auth.currentUser;
  const ready = new Promise(res => { if (me) res(me); onAuthStateChanged(auth, u => { if (u) { me = u; res(u); } }); });

  // ---------- utilidades ----------
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const mul = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const shuf = (a, R = Math.random) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const EM = ['🐶', '🐱', '🦁', '🐸', '🐵', '🐼', '🦊', '🐯', '🐰', '🐨', '🐷', '🐙', '🦄', '🐢', '🦋', '🐧'];
  const av = n => EM[[...String(n || '?')].reduce((a, c) => a + c.charCodeAt(0), 0) % EM.length];
  const SES = 'quizgo_arcade_session';
  const getSession = () => { try { return JSON.parse(localStorage.getItem(SES) || 'null'); } catch (e) { return null; } };
  const setSession = s => { try { localStorage.setItem(SES, JSON.stringify(s)); } catch (e) {} };
  const clearSession = () => { try { localStorage.removeItem(SES); } catch (e) {} };
  const ag = window.ag = {};

  const st = document.createElement('style');
  st.textContent = `
  .ag-x{color:#ff5a8a;text-shadow:0 0 14px rgba(255,90,138,.8)} .ag-o{color:#4dd0ff;text-shadow:0 0 14px rgba(77,208,255,.8)}
  .ag-cell{aspect-ratio:1;border-radius:.9rem;font-weight:900;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);padding:0}
  .ag-cell:not(:disabled):hover{background:rgba(255,255,255,.2)}
  .ag-win{background:rgba(74,222,128,.35)!important;border-color:#4ade80!important}
  .ag-board{background:linear-gradient(160deg,#1d4ed8,#1e3a8a);border-radius:1rem;padding:.4rem}
  .ag-col{display:flex;flex-direction:column;gap:.3rem;border-radius:.6rem;padding:0}
  .ag-col:not(:disabled):hover{background:rgba(255,255,255,.16)}
  .ag-hole{aspect-ratio:1;border-radius:50%;background:#0b1030;box-shadow:inset 0 3px 6px rgba(0,0,0,.65)}
  .ag-r{background:radial-gradient(circle at 35% 30%,#ff9a9a,#e21b3c 60%,#8f0f25)}
  .ag-y{background:radial-gradient(circle at 35% 30%,#fff3a0,#f2c200 60%,#a37f00)}
  .ag-pop{display:inline-block;animation:agpop .3s cubic-bezier(.175,.885,.32,1.275) both}
  @keyframes agpop{0%{transform:scale(.2);opacity:0}100%{transform:scale(1);opacity:1}}
  .ag-mole{aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 50% 70%,#2a1a0a,#0d0703);box-shadow:inset 0 10px 20px rgba(0,0,0,.8);font-size:3rem;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:0}
  .ag-bub{position:absolute;bottom:-100px;border-radius:50%;border:2px solid rgba(255,255,255,.5);cursor:pointer;animation:agrise var(--d) linear forwards}
  @keyframes agrise{to{transform:translateY(calc(-52vh - 120px))}}
  .ag-burst{animation:agb .25s ease-out forwards!important} @keyframes agb{to{transform:scale(1.8);opacity:0}}
  .ag-shake{animation:agsh .12s 3 alternate} @keyframes agsh{from{transform:translateX(-8px)}to{transform:translateX(8px)}}
  .ag-big{font-size:7rem;font-weight:900;animation:agpop .4s both}
  `;
  document.head.appendChild(st);

  const draw = (html, cls = 'stage-bg text-white') => { const a = $('app'); a.className = 'w-full h-full flex flex-col relative overflow-auto ' + cls; a.innerHTML = html; };
  const top = t => `<div class="glass border-b border-white/10 flex items-center justify-between px-6 py-4 shadow-xl shrink-0">
    <div class="font-black text-2xl tracking-tighter cursor-pointer" onclick="showLanding()"><span class="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">QuizGo</span> <span class="text-white/70 text-base font-bold">· ${t}</span></div>
    <div class="flex gap-2"><button onclick="showGames()" class="text-sm font-bold text-white/80 hover:text-white px-4 py-2 rounded-xl hover:bg-white/10 transition">🎲 Juegos</button><button onclick="showLanding()" class="text-sm font-bold text-white/80 hover:text-white px-4 py-2 rounded-xl hover:bg-white/10 transition">Inicio</button></div></div>`;
  const pill = t => `<div class="glass rounded-xl px-4 py-2">${t}</div>`;
  const bt = (fn, label, c = '#1368ce', extra = '') => `<button onclick="${fn}" class="text-white font-black px-6 py-3 rounded-2xl btn3d ${extra}" style="background:${c}">${label}</button>`;
  const confetti = () => { const cols = ['#ffc82c', '#ff5a5f', '#4ecb71', '#4d9de0', '#c77dff', '#ff7eb6']; return `<div class="confetti">${Array.from({ length: 40 }, () => `<i style="--l:${ri(0, 100)}%;--c:${rnd(cols)};--d:${ri(4, 8)}s;--dl:-${ri(0, 6)}s"></i>`).join('')}</div>`; };

  // ---------- catálogo de juegos en línea ----------
  const AG = {
    mate:     { n: 'Mate rápido', i: '🧮', t: 'race', d: 30, how: 'Todos reciben las MISMAS operaciones. Gana quien responda más en 30 s.' },
    escribe:  { n: 'Escribe rápido', i: '⌨️', t: 'race', d: 30, how: 'Todos escriben las mismas palabras. Gana quien teclee más en 30 s.' },
    topos:    { n: 'Atrapa topos', i: '🐹', t: 'race', d: 30, how: 'Toca los topos que asoman. Mismos topos para todos, 30 s.' },
    burbujas: { n: 'Revienta burbujas', i: '🫧', t: 'race', d: 30, how: 'Pincha burbujas: las pequeñas valen 2. Mismas burbujas para todos, 30 s.' },
    ttt:      { n: 'Tres en raya', i: '❌⭕', t: 'duel', how: 'Duelos 1 contra 1 (se emparejan solos). Victoria 3 pts · empate 1 pt.' },
    c4:       { n: 'Conecta 4', i: '🔴🟡', t: 'duel', how: 'Duelos 1 contra 1. Alinea 4 fichas. Victoria 3 pts · empate 1 pt.' },
    rps:      { n: 'Piedra, papel o tijera', i: '✊✋✌️', t: 'duel', how: 'Duelos 1 contra 1: el primero en ganar 3 rondas. Victoria 3 pts · empate 1 pt.' }
  };

  // ---------- estado ----------
  let R = null;
  const addT = id => { if (R) R.tm.push(id); return id; };
  const clearT = () => { if (R) { R.tm.forEach(i => { clearInterval(i); clearTimeout(i); }); R.tm = []; } };
  const every = (f, m) => addT(setInterval(f, m));
  const later = (f, m) => addT(setTimeout(f, m));
  function cleanup() { if (R) { clearT(); R.unsub.forEach(u => { try { u(); } catch (e) {} }); R = null; } }
  const byUid = () => { const m = {}; (R ? R.players : []).forEach(p => m[p.uid] = p); return m; };
  const nameOf = u => { const p = byUid()[u]; return p ? p.nick : '—'; };
  const movesOf = (p, r) => (p && p.rd === r.round && p.gm === r.game) ? (p.moves || []) : [];

  // ================= EVALUADORES DE DUELOS (reproducen las jugadas de A y B) =================
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  function evalTTT(A, B) {
    const b = Array(9).fill(''); let res = null, line = [];
    for (let k = 0; k < Math.max(A.length, B.length) && !res; k++) for (const [mv, mk] of [[A[k], 'X'], [B[k], 'O']]) {
      if (mv === undefined || res || b[mv]) continue;
      b[mv] = mk;
      for (const l of LINES) if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) { res = mk === 'X' ? 'A' : 'B'; line = l; break; }
      if (!res && b.every(Boolean)) res = 'D';
    }
    return { b, res, line, turn: A.length > B.length ? 'B' : 'A' };
  }
  function c4w(b) {
    const D = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
      const p = b[r * 7 + c]; if (!p) continue;
      for (const [dr, dc] of D) {
        const cells = [r * 7 + c];
        for (let k = 1; k < 4; k++) { const rr = r + dr * k, cc = c + dc * k; if (rr < 0 || rr >= 6 || cc < 0 || cc >= 7 || b[rr * 7 + cc] !== p) break; cells.push(rr * 7 + cc); }
        if (cells.length === 4) return { p, cells };
      }
    }
    return null;
  }
  function evalC4(A, B) {
    const b = Array(42).fill(0); let res = null, cells = [];
    const drop = (c, p) => { for (let r = 5; r >= 0; r--) if (!b[r * 7 + c]) { b[r * 7 + c] = p; return 1; } return 0; };
    for (let k = 0; k < Math.max(A.length, B.length) && !res; k++) for (const [mv, p] of [[A[k], 1], [B[k], 2]]) {
      if (mv === undefined || res) continue;
      if (!drop(mv, p)) continue;
      const w = c4w(b);
      if (w) { res = w.p === 1 ? 'A' : 'B'; cells = w.cells; } else if (b.every(Boolean)) res = 'D';
    }
    return { b, res, cells, turn: A.length > B.length ? 'B' : 'A' };
  }
  const BEATS = { r: 's', p: 'r', s: 'p' }, RE = { r: '✊', p: '✋', s: '✌️' };
  function evalRPS(A, B) {
    let a = 0, b = 0, res = null; const rounds = [], n = Math.min(A.length, B.length);
    for (let i = 0; i < n && !res; i++) {
      const x = A[i], y = B[i]; let r = 't';
      if (x !== y) r = BEATS[x] === y ? 'a' : 'b';
      if (r === 'a') a++; if (r === 'b') b++;
      rounds.push({ x, y, r });
      if (a >= 3) res = 'A'; else if (b >= 3) res = 'B'; else if (rounds.length >= 9) res = a > b ? 'A' : b > a ? 'B' : 'D';
    }
    return { a, b, rounds, res, A, B };
  }
  const evalDuel = (g, A, B) => g === 'ttt' ? evalTTT(A, B) : g === 'c4' ? evalC4(A, B) : evalRPS(A, B);

  // ---------- dibujo de tableros ----------
  function tttHTML(ev, click, mini) {
    return `<div class="grid grid-cols-3 gap-${mini ? 1 : 3}" style="width:${mini ? '120px' : 'min(84vw,340px)'}">${ev.b.map((v, i) => `<button ${click && !v && !ev.res ? `onclick="ag.tt(${i})"` : 'disabled'} class="ag-cell ${ev.line.includes(i) ? 'ag-win' : ''}" style="font-size:${mini ? '1.3rem' : '3.2rem'}">${v ? `<span class="${v === 'X' ? 'ag-x' : 'ag-o'}">${v}</span>` : ''}</button>`).join('')}</div>`;
  }
  function c4HTML(ev, click, mini) {
    let cols = '';
    for (let c = 0; c < 7; c++) {
      let cells = '';
      for (let r = 0; r < 6; r++) { const i = r * 7 + c, v = ev.b[i]; cells += `<div class="ag-hole ${v === 1 ? 'ag-r' : v === 2 ? 'ag-y' : ''}" style="${ev.cells.includes(i) ? 'filter:brightness(1.6)' : ''}"></div>`; }
      cols += `<button ${click && !ev.res && !ev.b[c] ? `onclick="ag.c4(${c})"` : 'disabled'} class="ag-col">${cells}</button>`;
    }
    return `<div class="ag-board grid grid-cols-7 gap-1" style="width:${mini ? '190px' : 'min(92vw,420px)'}">${cols}</div>`;
  }
  function rpsMini(ev, na, nb) {
    const last = ev.rounds.slice(-3).map(r => `<span class="mx-1">${RE[r.x]}<span class="opacity-50">vs</span>${RE[r.y]}</span>`).join('');
    return `<div class="text-center"><div class="text-2xl font-black">${ev.a} <span class="opacity-50">-</span> ${ev.b}</div><div class="text-xl mt-1 h-8">${last || '…'}</div></div>`;
  }

  // ================= PANTALLAS: INICIO / UNIRSE =================
  ag.home = () => {
    cleanup();
    draw(`${top('Juegos en línea')}
    <div class="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div class="text-7xl mb-2">🌐</div>
      <h1 class="text-4xl font-black mb-1">Juegos en línea</h1>
      <p class="text-white/70 font-semibold mb-7 max-w-md">Crea una sala con PIN como <b>observador</b> y mira jugar a todos en vivo, o únete a una sala con tu PIN.</p>
      <div class="grid gap-4 w-full max-w-sm">
        <button onclick="ag.create()" class="btn3d rounded-2xl px-5 py-5 text-left font-black text-white" style="background:linear-gradient(135deg,#46178f,#9b51e0)"><div class="text-xl">👁️ Crear sala (Observador)</div><div class="text-xs font-semibold opacity-85">Tú controlas la partida y ves todo en vivo</div></button>
        <button onclick="ag.joinScreen()" class="btn3d rounded-2xl px-5 py-5 text-left font-black text-white" style="background:linear-gradient(135deg,#26890c,#4ecb71)"><div class="text-xl">🎮 Unirme con PIN</div><div class="text-xs font-semibold opacity-85">Entra a la sala de tu profesor o amigo</div></button>
      </div>
    </div>`);
  };
  ag.joinScreen = pin => {
    cleanup();
    const p = typeof pin === 'string' ? pin : (new URLSearchParams(location.search).get('apin') || '');
    draw(`${top('Unirse a sala')}
    <div class="flex-1 flex flex-col items-center justify-center p-6">
      <div class="glass p-7 w-full max-w-[380px] rounded-[2rem] text-center space-y-4 border border-white/20">
        <div class="text-6xl">🎮</div><h2 class="text-2xl font-black">Unirme a una sala</h2>
        <input id="ag-pin" inputmode="numeric" maxlength="6" value="${esc(p)}" placeholder="PIN de la sala" class="w-full text-center py-4 bg-black/50 border-2 border-white/20 rounded-2xl font-black text-2xl text-white placeholder-white/40 focus:outline-none focus:border-purple-400">
        <input id="ag-nick" maxlength="20" placeholder="Tu apodo" class="w-full text-center py-4 bg-black/50 border-2 border-white/20 rounded-2xl font-black text-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-400" onkeydown="if(event.key==='Enter')ag.join()">
        <button onclick="ag.join()" class="w-full py-4 text-white font-black text-xl rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 btn3d">¡Entrar!</button>
        <button onclick="ag.home()" class="text-sm font-bold text-white/70 hover:text-white">← Volver</button>
      </div></div>`);
  };
  ag.join = async () => {
    await ready;
    const pin = $('ag-pin').value.trim(), nick = $('ag-nick').value.trim().slice(0, 20);
    if (!pin || !nick) return alert('Ingresa un PIN y tu apodo.');
    try {
      const gs = await getDoc(doc(gamesC(), 'A' + pin));
      if (!gs.exists() || gs.data().kind !== 'arcade') return alert('Sala no encontrada. Revisa el PIN.');
      if (gs.data().state === 'over') return alert('Esta sala ya terminó.');
      const id = 'A' + pin + '_' + me.uid, mine = await getDoc(doc(playersC(), id));
      if (!mine.exists()) await setDoc(doc(playersC(), id), { gamePin: 'A' + pin, uid: me.uid, nick, joinedAt: Date.now(), total: 0, rs: 0, rd: 0, gm: '', done: 0, moves: [] });
      setSession({ role: 'player', pin });
      attachPlayer(pin);
    } catch (e) { alert('Error: ' + e.message); }
  };
  ag.resume = async silent => {
    await ready; const s = getSession(); if (!s) return;
    try {
      const gs = await getDoc(doc(gamesC(), 'A' + s.pin));
      if (!gs.exists()) { clearSession(); if (!silent) alert('La sala ya no existe.'); return ag.home(); }
      if (s.role === 'host') { if (gs.data().hostId !== me.uid) { clearSession(); return ag.home(); } return attachHost(s.pin); }
      const ps = await getDoc(doc(playersC(), 'A' + s.pin + '_' + me.uid));
      if (!ps.exists()) { clearSession(); if (!silent) alert('Ya no estás en esa sala.'); return ag.home(); }
      attachPlayer(s.pin);
    } catch (e) { alert('No se pudo reconectar: ' + e.message); }
  };

  // ================= OBSERVADOR (HOST) =================
  ag.create = async () => {
    await ready; cleanup();
    try {
      let pin;
      for (let i = 0; i < 6; i++) { pin = String(ri(100000, 999999)); if (!(await getDoc(doc(gamesC(), 'A' + pin))).exists()) break; }
      await setDoc(doc(gamesC(), 'A' + pin), { kind: 'arcade', hostId: me.uid, title: 'Juegos en línea', game: 'mate', state: 'lobby', round: 0, seed: 0, pairs: [], createdAt: Date.now() });
      setSession({ role: 'host', pin });
      attachHost(pin);
    } catch (e) { alert('No se pudo crear la sala: ' + e.message); }
  };
  function attachHost(pin) {
    cleanup();
    R = { role: 'host', pin, gid: 'A' + pin, room: null, players: [], unsub: [], tm: [], key: '', busy: false };
    R.unsub.push(onSnapshot(doc(gamesC(), R.gid), s => { if (R && R.role === 'host' && s.exists()) { R.room = s.data(); hostRender(); } }));
    R.unsub.push(onSnapshot(query(playersC(), where('gamePin', '==', R.gid)), snap => {
      if (!R || R.role !== 'host') return;
      R.players = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
      hostLive();
    }));
  }
  function hostRender() {
    if (!R || !R.room) return;
    const r = R.room, key = r.state + '-' + r.round + '-' + r.game;
    if (key !== R.key) { R.key = key; clearT(); R.busy = false; ({ lobby: hostLobby, play: hostPlay, result: hostResult, over: hostOver })[r.state](); }
    hostLive();
  }
  function lbHTML(ps, r, n = 10) {
    const med = ['🥇', '🥈', '🥉'];
    return [...ps].sort((a, b) => (b.total || 0) - (a.total || 0)).slice(0, n).map((p, i) => `
      <div class="glass rounded-2xl px-5 py-3 flex items-center justify-between font-black border ${me && p.uid === me.uid ? 'border-yellow-300' : 'border-white/15'}">
        <span class="flex items-center gap-3 min-w-0"><span class="w-8 text-center text-2xl shrink-0">${med[i] || i + 1}</span><span class="text-3xl">${av(p.nick)}</span><span class="truncate">${esc(p.nick)}</span></span>
        <span class="shrink-0 text-xl">${p.total || 0} ${r && p.rd === r.round && p.gm === r.game && p.rs ? `<span class="text-green-400 text-sm">+${p.rs}</span>` : ''}</span></div>`).join('');
  }
  function hostLobby() {
    const r = R.room, url = location.href.split('?')[0].split('#')[0];
    screenHostLobby(r, url);
  }
  function screenHostLobby(r, url) {
    draw(`${top('Sala · Observador')}
    <div class="flex-1 min-h-0 flex flex-col w-full">
      <div class="flex flex-wrap items-stretch justify-between gap-5 p-5 md:p-7">
        <div class="glass rounded-3xl p-4 flex items-center gap-4 border border-white/20">
          <div id="ag-qr" class="bg-white p-2 rounded-2xl w-[108px] h-[108px] flex items-center justify-center text-3xl shrink-0"></div>
          <div><div class="text-xs font-black tracking-widest text-purple-300 mb-1">1 · ENTRA EN TU MÓVIL</div><div class="font-bold text-sm break-all max-w-xs text-white/90">${esc(url)}</div><div class="text-xs font-black tracking-widest text-purple-300 mt-2">2 · ESCRIBE EL PIN</div></div>
        </div>
        <div class="glass rounded-3xl px-9 py-4 text-center border border-white/20 flex flex-col justify-center"><div class="text-xs font-black tracking-widest text-purple-300">PIN DE LA SALA</div><div class="text-6xl md:text-7xl font-black tracking-widest">${R.pin}</div></div>
      </div>
      <div class="px-5 md:px-7"><div class="text-xs font-black tracking-widest uppercase opacity-75 mb-2">Elige el juego</div>
        <div class="flex flex-wrap gap-2">${Object.entries(AG).map(([k, g]) => `<button onclick="ag.setGame('${k}')" class="px-4 py-2 rounded-2xl font-black text-sm border-2 transition ${r.game === k ? 'border-white bg-white/25 scale-105' : 'border-white/10 bg-white/5 hover:bg-white/15'}">${g.i} ${g.n}</button>`).join('')}</div>
        <div class="text-sm font-semibold text-white/75 mt-3">📖 ${AG[r.game].how}</div></div>
      <div class="flex-1 min-h-0 overflow-y-auto p-5 md:p-7">
        <div class="glass rounded-full px-7 py-2 mb-4 font-black inline-block border border-white/20">👥 <span id="ag-cnt">0</span> jugadores conectados</div>
        <div id="ag-empty" class="text-center opacity-80 my-8"><div class="text-6xl mb-2">📱</div><div class="text-lg font-bold">¡Entra con el PIN para unirte!</div></div>
        <div id="ag-pl" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"></div>
      </div>
      <div class="shrink-0 p-4 flex justify-center gap-4 glass border-t border-white/10">
        <button onclick="if(confirm('¿Cerrar la sala?'))ag.end()" class="px-6 py-3 font-bold rounded-2xl glass hover:bg-white/20">Cerrar sala</button>
        <button id="ag-start" onclick="ag.hStart()" class="px-12 py-3 text-xl font-black text-white bg-[#1368ce] rounded-2xl btn3d opacity-40" disabled>▶ Comenzar ronda</button>
      </div>
    </div>`);
    try { if (window.QRCode) new QRCode($('ag-qr'), { text: url + '?apin=' + R.pin, width: 90, height: 90 }); else $('ag-qr').textContent = '📱'; } catch (e) { $('ag-qr').textContent = '📱'; }
  }
  ag.setGame = async g => { try { await updateDoc(doc(gamesC(), R.gid), { game: g }); } catch (e) { alert(e.message); } };
  ag.kick = async id => { if (confirm('¿Expulsar jugador?')) { try { await deleteDoc(doc(playersC(), id)); } catch (e) {} } };
  ag.hStart = async () => {
    const r = R.room, g = AG[r.game]; let pairs = [];
    if (g.t === 'duel') { const ids = shuf(R.players.map(p => p.uid)); for (let i = 0; i < ids.length; i += 2) pairs.push({ a: ids[i], b: ids[i + 1] || '' }); }
    try { await updateDoc(doc(gamesC(), R.gid), { state: 'play', round: (r.round || 0) + 1, seed: ri(1, 1e9), pairs }); } catch (e) { alert(e.message); }
  };
  ag.hNext = () => ag.hStart();
  ag.hLobby = async () => { try { await updateDoc(doc(gamesC(), R.gid), { state: 'lobby' }); } catch (e) {} };
  ag.hOver = async () => { try { await updateDoc(doc(gamesC(), R.gid), { state: 'over' }); } catch (e) {} };
  ag.hFinish = async () => { if (!R || R.role !== 'host' || !R.room || R.room.state !== 'play') return; try { await updateDoc(doc(gamesC(), R.gid), { state: 'result' }); } catch (e) {} };
  ag.end = async () => {
    const h = R; clearSession(); cleanup();
    if (h && h.role === 'host') { try { const b = writeBatch(db); h.players.forEach(p => b.delete(doc(playersC(), p.id))); b.delete(doc(gamesC(), h.gid)); await b.commit(); } catch (e) {} }
    ag.home();
  };
  function hostPlay() {
    const r = R.room, g = AG[r.game];
    draw(`<div class="glass shadow-2xl px-6 py-4 flex items-center justify-between shrink-0 border-b border-white/10 gap-3 flex-wrap">
      <div class="font-black text-lg">${g.i} ${g.n} · Ronda ${r.round} · <span class="text-purple-300">PIN ${R.pin}</span></div>
      <div id="ag-prog" class="font-black text-white/80"></div>
      <button onclick="ag.hFinish()" class="px-6 py-2.5 font-black text-white bg-[#1368ce] rounded-xl btn3d">Mostrar resultados</button></div>
      <div id="ag-body" class="flex-1 p-5 md:p-7 overflow-y-auto"></div>`);
    if (g.t === 'race') later(ag.hFinish, (g.d + 14) * 1000);
  }
  function hostLive() {
    if (!R || R.role !== 'host' || !R.room) return;
    const r = R.room, g = AG[r.game], ps = R.players;
    if (r.state === 'lobby') {
      const l = $('ag-pl'); if (!l) return;
      l.innerHTML = ps.map(p => `<button title="Expulsar" onclick="ag.kick('${p.id}')" class="glass rounded-3xl p-4 flex flex-col items-center hover:scale-105 transition border border-white/20"><div class="text-5xl">${av(p.nick)}</div><span class="mt-2 px-3 py-1 rounded-full bg-black/40 font-black text-sm max-w-full truncate">${esc(p.nick)}</span></button>`).join('');
      $('ag-cnt').textContent = ps.length; $('ag-empty').classList.toggle('hidden', ps.length > 0);
      const b = $('ag-start'); b.disabled = !ps.length; b.classList.toggle('opacity-40', !ps.length);
    } else if (r.state === 'play') {
      const body = $('ag-body'); if (!body) return;
      let all;
      if (g.t === 'race') {
        const list = ps.map(p => ({ p, rs: p.rd === r.round && p.gm === r.game ? (p.rs || 0) : 0 })).sort((a, b) => b.rs - a.rs), mx = Math.max(1, ...list.map(x => x.rs));
        body.innerHTML = `<div class="max-w-3xl mx-auto space-y-2">${list.map(({ p, rs }) => `<div class="glass rounded-2xl px-4 py-2 flex items-center gap-3 border border-white/15"><span class="text-3xl">${av(p.nick)}</span><span class="w-28 truncate font-black">${esc(p.nick)}</span><div class="flex-1 h-4 bg-black/40 rounded-full overflow-hidden"><div class="h-4 bg-gradient-to-r from-purple-500 to-pink-500" style="width:${rs / mx * 100}%;transition:width .3s"></div></div><span class="w-10 text-right font-black text-xl">${rs}</span>${p.done === r.round && p.rd === r.round ? '✅' : ''}</div>`).join('')}</div>`;
        all = ps.length && ps.every(p => p.rd === r.round && p.done === r.round);
      } else {
        const m = byUid();
        body.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 max-w-6xl mx-auto">${(r.pairs || []).map(pr => {
          const A = m[pr.a], B = pr.b ? m[pr.b] : null, nA = A ? A.nick : '—', nB = B ? B.nick : '(descansa)';
          if (!B) return `<div class="glass rounded-3xl p-4 text-center border border-white/15"><div class="font-black">${av(nA)} ${esc(nA)}</div><div class="opacity-70 text-sm mt-2">Descansa esta ronda (+2 pts)</div></div>`;
          const ev = evalDuel(r.game, movesOf(A, r), movesOf(B, r));
          const status = ev.res ? (ev.res === 'D' ? '🤝 Empate' : '🏆 ' + esc(ev.res === 'A' ? nA : nB)) : (r.game === 'rps' ? 'Jugando…' : 'Turno de ' + esc(ev.turn === 'A' ? nA : nB));
          const sym = r.game === 'ttt' ? ['X', 'O'] : r.game === 'c4' ? ['🔴', '🟡'] : ['', ''];
          const board = r.game === 'ttt' ? tttHTML(ev, false, true) : r.game === 'c4' ? c4HTML(ev, false, true) : rpsMini(ev);
          return `<div class="glass rounded-3xl p-4 flex flex-col items-center gap-2 border border-white/15"><div class="font-black text-sm text-center">${av(nA)} ${esc(nA)} <span class="opacity-60">${sym[0]}</span> <span class="opacity-50">vs</span> ${av(nB)} ${esc(nB)} <span class="opacity-60">${sym[1]}</span></div>${board}<div class="font-black text-sm ${ev.res ? 'text-green-300' : 'text-white/70'}">${status}</div></div>`;
        }).join('')}</div>`;
        all = (r.pairs || []).length && ps.filter(p => (r.pairs || []).some(q => q.a === p.uid || q.b === p.uid)).every(p => p.rd === r.round && p.done === r.round);
      }
      const doneN = ps.filter(p => p.rd === r.round && p.done === r.round).length;
      const pg = $('ag-prog'); if (pg) pg.textContent = `Terminaron: ${doneN} / ${ps.length}`;
      if (all && !R.busy) { R.busy = true; later(ag.hFinish, 1500); }
    } else if (r.state === 'result' || r.state === 'over') {
      const lb = $('ag-lb'); if (lb) lb.innerHTML = r.state === 'over' ? '' : lbHTML(ps, r, 12);
      if (r.state === 'over') hostOverInner();
    }
  }
  function hostResult() {
    const r = R.room, g = AG[r.game];
    draw(`<div class="glass shadow-2xl px-6 py-4 flex items-center justify-between shrink-0 border-b border-white/10 gap-3 flex-wrap">
      <div class="font-black text-lg">${g.i} ${g.n} · Resultados de la ronda ${r.round}</div>
      <div class="flex gap-2 flex-wrap">${bt('ag.hNext()', '▶ Otra ronda', '#26890c')}${bt('ag.hLobby()', '🎮 Cambiar juego', '#1368ce')}${bt('ag.hOver()', '🏁 Finalizar', '#7b61ff')}</div></div>
      <div class="flex-1 p-6 overflow-y-auto"><h2 class="text-3xl font-black text-center mb-5">🏆 Tabla de clasificación</h2><div id="ag-lb" class="max-w-2xl mx-auto space-y-3"></div></div>`);
  }
  function hostOver() {
    draw(`${confetti()}<div class="relative z-10 flex flex-col items-center w-full min-h-full p-6"><h1 class="text-5xl md:text-6xl font-black mb-6 mt-2">🏆 ¡Podio final!</h1><div id="ag-pod" class="w-full flex flex-col items-center flex-1"></div>
      <div class="flex gap-3 mt-6">${bt('ag.exportCSV()', '⬇️ Descargar CSV', 'rgba(255,255,255,.15)')}${bt('ag.end()', 'Cerrar sala', '#fff', '!text-purple-900')}</div></div>`);
  }
  function podiumHTML(ps) {
    const s = [...ps].sort((a, b) => (b.total || 0) - (a.total || 0));
    const col = (p, h, bg, n) => p ? `<div class="flex flex-col items-center">${n === 1 ? '<div class="text-4xl -mb-2">👑</div>' : ''}<div class="text-6xl">${av(p.nick)}</div><div class="font-black text-center max-w-[10rem] truncate">${esc(p.nick)}<br><span class="text-sm opacity-90">${p.total || 0} pts</span></div><div class="${bg} w-28 md:w-40 ${h} rounded-t-3xl flex items-center justify-center text-5xl font-black text-black/70 mt-2">${n}</div></div>` : '';
    return `<div class="flex items-end justify-center gap-3">${col(s[1], 'h-28', 'bg-slate-300', 2)}${col(s[0], 'h-40', 'bg-yellow-400', 1)}${col(s[2], 'h-20', 'bg-amber-700', 3)}</div>
      <div class="mt-6 w-full max-w-xl space-y-2">${s.slice(3).map((p, i) => `<div class="glass rounded-2xl px-4 py-2 flex justify-between font-black"><span>#${i + 4} ${av(p.nick)} ${esc(p.nick)}</span><span>${p.total || 0}</span></div>`).join('')}</div>`;
  }
  function hostOverInner() { const b = $('ag-pod'); if (b) b.innerHTML = podiumHTML(R.players); }
  ag.exportCSV = () => {
    const s = [...R.players].sort((a, b) => (b.total || 0) - (a.total || 0));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\uFEFFPosicion,Jugador,Puntos\n' + s.map((p, i) => `${i + 1},"${String(p.nick).replace(/"/g, '""')}",${p.total || 0}`).join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'resultados_juegos_en_linea.csv'; document.body.appendChild(a); a.click(); a.remove();
  };

  // ================= JUGADOR =================
  function attachPlayer(pin) {
    cleanup();
    R = { role: 'player', pin, gid: 'A' + pin, id: 'A' + pin + '_' + me.uid, room: null, players: [], myDoc: null, unsub: [], tm: [], key: '', round: 0, base: 0, moves: [], rs: 0, finished: false, hadMe: false, duel: null };
    R.unsub.push(onSnapshot(doc(gamesC(), R.gid), s => {
      if (!R || R.role !== 'player') return;
      if (!s.exists()) { if (s.metadata.fromCache) return; alert('El observador cerró la sala.'); clearSession(); return window.showLanding(); }
      R.room = s.data(); playerRender();
    }));
    R.unsub.push(onSnapshot(query(playersC(), where('gamePin', '==', R.gid)), snap => {
      if (!R || R.role !== 'player') return;
      R.players = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      R.myDoc = R.players.find(p => p.id === R.id) || null;
      if (R.myDoc) R.hadMe = true;
      else if (R.hadMe && !snap.metadata.fromCache) { alert('Saliste de la sala.'); clearSession(); return window.showLanding(); }
      playerRender();
    }));
  }
  const writeMe = f => updateDoc(doc(playersC(), R.id), f).catch(() => {});
  function startPlayerRound() {
    const r = R.room, m = R.myDoc;
    R.round = r.round; R.finished = false; R.duel = null;
    if (m.rd === r.round && m.gm === r.game) { R.base = (m.total || 0) - (m.rs || 0); R.moves = (m.moves || []).slice(); R.rs = m.rs || 0; R.resumed = true; R.finished = m.done === r.round; }
    else { R.base = m.total || 0; R.moves = []; R.rs = 0; R.resumed = false; writeMe({ gm: r.game, rd: r.round, rs: 0, done: 0, moves: [] }); }
  }
  function playerRender() {
    if (!R || R.role !== 'player' || !R.room || !R.myDoc) return;
    const r = R.room;
    if (r.state === 'play' && R.round !== r.round) startPlayerRound();
    const key = r.state + '-' + r.round + '-' + r.game;
    if (key !== R.key) {
      R.key = key; clearT();
      ({ lobby: pLobby, play: pPlay, result: pResult, over: pOver })[r.state]();
    }
    playerLive();
  }
  const leaveBtn = `<button onclick="if(confirm('¿Salir de la sala?'))ag.leave()" class="glass px-6 py-3 rounded-2xl font-bold hover:bg-white/25 border border-white/20">Salir</button>`;
  ag.leave = async () => { const id = R && R.id; clearSession(); cleanup(); if (id) { try { await deleteDoc(doc(playersC(), id)); } catch (e) {} } window.showLanding(); };
  function pLobby() {
    const r = R.room, g = AG[r.game], m = R.myDoc;
    draw(`<div class="flex-1 flex flex-col items-center justify-center p-6 text-center"><div class="glass rounded-3xl p-8 flex flex-col items-center border border-white/20 max-w-sm w-full">
      <div class="text-8xl mb-2">${av(m.nick)}</div><h1 class="text-4xl font-black mb-2">¡Estás dentro!</h1>
      <p class="text-2xl font-black px-6 py-1.5 rounded-full bg-black/30 mb-4">${esc(m.nick)}</p>
      <div class="font-black mb-1">${g.i} ${g.n}</div><div class="text-sm font-semibold opacity-80 mb-3">${g.how}</div><p class="text-sm font-bold opacity-80">Esperando al observador…</p></div><div class="mt-6">${leaveBtn}</div></div>`);
  }
  function pPlay() {
    const r = R.room, g = AG[r.game];
    if (g.t === 'duel') {
      draw(`<div class="glass shadow-2xl px-5 py-3 flex justify-between items-center shrink-0 border-b border-white/10"><div class="font-black">${g.i} ${g.n} · Ronda ${r.round}</div><div class="font-black">🏅 ${R.base} pts</div></div>
        <div id="ag-duel" class="flex-1 flex flex-col items-center justify-center p-4 text-center gap-3"></div>`);
      return;
    }
    draw(`<div class="glass shadow-2xl px-5 py-3 flex justify-between items-center shrink-0 border-b border-white/10"><div class="font-black">${g.i} ${g.n} · Ronda ${r.round}</div><div class="font-black">🏅 <span id="ag-s">${R.rs}</span></div><div class="font-black text-xl">⏱ <span id="ag-t">${g.d}</span></div></div>
      <div id="ag-box" class="flex-1 flex flex-col items-center justify-center p-4 text-center"></div>`);
    const box = $('ag-box');
    if (R.finished || R.resumed) { if (!R.finished) { R.finished = true; writeMe({ done: r.round }); } box.innerHTML = `<div class="text-6xl mb-3">✅</div><div class="text-2xl font-black">Ya jugaste esta ronda</div><div class="font-bold opacity-80 mt-2">Llevas ${R.rs} puntos · espera al observador…</div>`; return; }
    let c = 3; box.innerHTML = `<div class="ag-big">${c}</div>`;
    every(() => { c--; if (c > 0) box.innerHTML = `<div class="ag-big">${c}</div>`; else { clearT(); runRace(box); } }, 1000);
  }
  function runRace(box) {
    const r = R.room, g = AG[r.game], rng = mul(r.seed); let left = g.d;
    const h = { every, later, rng,
      score: n => { R.rs = n; const e = $('ag-s'); if (e) e.textContent = n; if (!R.wt) R.wt = later(() => { R.wt = null; writeMe({ rs: R.rs, total: R.base + R.rs }); }, 300); } };
    R.wt = null;
    every(() => { left--; const t = $('ag-t'); if (t) t.textContent = Math.max(0, left); if (left <= 0) endRace(box); }, 1000);
    RACE[r.game](box, rng, h);
  }
  function endRace(box) {
    clearT(); R.finished = true; const r = R.room;
    writeMe({ rs: R.rs, total: R.base + R.rs, done: r.round });
    box.innerHTML = `<div class="text-6xl mb-3">⏱</div><div class="text-3xl font-black">¡Tiempo!</div><div class="text-2xl font-black text-yellow-300 mt-2">${R.rs} puntos</div><div class="font-bold opacity-80 mt-3">Esperando a los demás…</div>`;
  }

  // ---------- juegos de carrera (mismos retos para todos, usando la semilla) ----------
  const WL = ['casa', 'perro', 'luz', 'sol', 'amigo', 'verde', 'feliz', 'jugar', 'libro', 'agua', 'cielo', 'queso', 'tigre', 'house', 'green', 'happy', 'water', 'friend', 'school', 'apple', 'music', 'robot', 'pizza', 'lluvia', 'estrella'];
  const RACE = {
    mate(box, rng, h) {
      let sc = 0, q;
      const mk = () => { const o = ['+', '-', '×'][Math.floor(rng() * 3)]; let a = 2 + Math.floor(rng() * 11), b = 2 + Math.floor(rng() * 11); if (o === '-' && b > a) [a, b] = [b, a];
        const res = o === '+' ? a + b : o === '-' ? a - b : a * b, set = new Set([res]); while (set.size < 4) set.add(res + Math.floor(rng() * 13) - 6);
        q = { t: `${a} ${o} ${b}`, res, o: shuf([...set], rng) }; };
      const paint = () => { box.innerHTML = `<div class="text-6xl font-black mb-6 ag-pop">${q.t} = ?</div><div class="grid grid-cols-2 gap-3 w-[min(88vw,340px)]">${q.o.map(v => `<button onclick="ag.ans(${v})" class="glass rounded-2xl py-5 text-3xl font-black hover:bg-white/25">${v}</button>`).join('')}</div>`; };
      ag.ans = v => { if (v === q.res) { sc++; h.score(sc); } mk(); paint(); };
      mk(); paint();
    },
    escribe(box, rng, h) {
      let sc = 0, w = WL[Math.floor(rng() * WL.length)];
      box.innerHTML = `<div id="ag-w" class="text-6xl font-black mb-5 tracking-widest"></div><input id="ag-i" autocomplete="off" autocapitalize="off" spellcheck="false" class="bg-black/40 border-2 border-white/20 rounded-2xl p-4 text-3xl font-black text-center w-[min(88vw,340px)] text-white">`;
      const show = v => { $('ag-w').innerHTML = [...w].map((c, i) => `<span style="color:${i < v.length ? (v[i] === c ? '#4ade80' : '#f87171') : '#fff'}">${c}</span>`).join(''); };
      $('ag-i').oninput = e => { const v = e.target.value.toLowerCase().trim(); if (v === w) { sc++; h.score(sc); let n; do { n = WL[Math.floor(rng() * WL.length)]; } while (n === w); w = n; e.target.value = ''; show(''); } else show(v); };
      show(''); $('ag-i').focus();
    },
    topos(box, rng, h) {
      let sc = 0; const s = Array(9).fill(0);
      box.innerHTML = `<div class="grid grid-cols-3 gap-3 w-[min(88vw,380px)]">${s.map((_, i) => `<button id="ah${i}" onclick="ag.hit(${i})" class="ag-mole"></button>`).join('')}</div>`;
      const clr = (i, v) => { if (s[i] === v) { s[i] = 0; const e = $('ah' + i); if (e) e.innerHTML = ''; } };
      ag.hit = i => { if (s[i] !== 1) return; s[i] = 2; sc++; h.score(sc); $('ah' + i).innerHTML = '<span class="ag-pop">💥</span>'; h.later(() => clr(i, 2), 300); };
      h.every(() => { const i = Math.floor(rng() * 9), d = 700 + Math.floor(rng() * 3) * 200; if (s[i]) return; s[i] = 1; $('ah' + i).innerHTML = '<span class="ag-pop">🐹</span>'; h.later(() => clr(i, 1), d); }, 650);
    },
    burbujas(box, rng, h) {
      let sc = 0;
      box.innerHTML = `<div id="ag-ar" class="relative overflow-hidden rounded-3xl glass w-[min(94vw,520px)] h-[52vh]"></div>`;
      h.every(() => {
        const a = $('ag-ar'); if (!a) return;
        const s = 40 + Math.floor(rng() * 51), l = 2 + Math.floor(rng() * 84), d = (30 + Math.floor(rng() * 31)) / 10, col = ['#ff7eb6', '#4d9de0', '#ffd23f', '#4ecb71', '#c77dff'][Math.floor(rng() * 5)];
        const e = document.createElement('div'); e.className = 'ag-bub';
        e.style.cssText = `left:${l}%;width:${s}px;height:${s}px;--d:${d}s;background:radial-gradient(circle at 30% 30%,rgba(255,255,255,.9),${col}aa)`;
        e.onpointerdown = () => { if (e.dataset.p) return; e.dataset.p = 1; sc += s < 60 ? 2 : 1; h.score(sc); e.classList.add('ag-burst'); setTimeout(() => e.remove(), 250); };
        e.addEventListener('animationend', ev => { if (ev.animationName === 'agrise') e.remove(); });
        a.appendChild(e);
      }, 420);
    }
  };

  // ---------- duelos (jugador) ----------
  function playerLive() {
    if (!R || R.role !== 'player' || !R.room) return;
    const r = R.room;
    if (r.state === 'play' && AG[r.game].t === 'duel') renderDuel();
    else if (r.state === 'result') { const lb = $('ag-lb'); if (lb) lb.innerHTML = lbHTML(R.players, r, 8); const rk = $('ag-rank'); if (rk) rk.textContent = rankText(); }
    else if (r.state === 'over') { const b = $('ag-pod'); if (b) b.innerHTML = podiumHTML(R.players); }
  }
  function renderDuel() {
    const r = R.room, box = $('ag-duel'); if (!box) return;
    const pair = (r.pairs || []).find(p => p.a === me.uid || p.b === me.uid);
    if (!pair) { box.innerHTML = `<div class="text-5xl">⏳</div><div class="text-xl font-black">Llegaste después de empezar.<br>Espera la siguiente ronda.</div>`; return; }
    const isA = pair.a === me.uid, oppUid = isA ? pair.b : pair.a;
    if (!oppUid) {
      box.innerHTML = `<div class="text-6xl">😴</div><div class="text-2xl font-black">Descansas esta ronda</div><div class="font-bold opacity-80">+2 puntos · espera al observador</div>`;
      if (!R.finished) { R.finished = true; writeMe({ rs: 2, total: R.base + 2, done: r.round }); }
      return;
    }
    const opp = R.players.find(p => p.uid === oppUid), on = opp ? opp.nick : 'Rival', om = movesOf(opp, r);
    const A = isA ? R.moves : om, B = isA ? om : R.moves, ev = evalDuel(r.game, A, B);
    const myTurn = r.game === 'rps' ? (R.moves.length <= om.length && !ev.res) : ((isA ? ev.turn === 'A' : ev.turn === 'B') && !ev.res);
    R.duel = { isA, ev, myTurn };
    let status;
    if (ev.res) status = ev.res === 'D' ? '🤝 ¡Empate!' : ((ev.res === 'A') === isA ? '🏆 ¡Ganaste!' : '😅 Perdiste');
    else if (r.game === 'rps') status = R.moves.length > om.length ? `Elegiste ${RE[R.moves[R.moves.length - 1]]} · esperando a ${esc(on)}…` : 'Elige tu jugada';
    else status = myTurn ? '🟢 Tu turno' : `⏳ Turno de ${esc(on)}`;
    const sym = r.game === 'ttt' ? (isA ? 'Tú eres X' : 'Tú eres O') : r.game === 'c4' ? (isA ? 'Tú eres 🔴' : 'Tú eres 🟡') : '';
    let body;
    if (r.game === 'ttt') body = tttHTML(ev, myTurn, false);
    else if (r.game === 'c4') body = c4HTML(ev, myTurn, false);
    else {
      const my = isA ? ev.a : ev.b, ot = isA ? ev.b : ev.a;
      body = `<div class="text-4xl font-black">${my} <span class="opacity-50">-</span> ${ot}</div>
        <div class="text-3xl h-12">${ev.rounds.slice(-4).map(x => { const m = isA ? x.x : x.y, o = isA ? x.y : x.x; return `<span class="mx-1">${RE[m]}<span class="text-base opacity-50">vs</span>${RE[o]}</span>`; }).join('')}</div>
        <div class="flex gap-4">${['r', 'p', 's'].map(k => `<button ${myTurn ? `onclick="ag.rps('${k}')"` : 'disabled'} class="glass rounded-3xl w-24 h-24 text-5xl ${myTurn ? 'hover:bg-white/25 hover:scale-110' : 'opacity-40'} transition">${RE[k]}</button>`).join('')}</div>`;
    }
    box.innerHTML = `<div class="text-sm font-black opacity-80">${av(me.nick || '')} Tú vs ${av(on)} ${esc(on)} ${sym ? '· ' + sym : ''}</div><div class="text-2xl font-black h-9">${status}</div>${body}`;
    if (ev.res && !R.finished) {
      R.finished = true; const pts = ev.res === 'D' ? 1 : ((ev.res === 'A') === isA ? 3 : 0);
      writeMe({ rs: pts, total: R.base + pts, done: r.round });
    }
  }
  const sendMove = v => { R.moves = [...R.moves, v]; writeMe({ moves: R.moves }); renderDuel(); };
  ag.tt = i => { const d = R.duel; if (!d || !d.myTurn || d.ev.res || d.ev.b[i]) return; sendMove(i); };
  ag.c4 = c => { const d = R.duel; if (!d || !d.myTurn || d.ev.res || d.ev.b[c]) return; sendMove(c); };
  ag.rps = k => { const d = R.duel; if (!d || !d.myTurn) return; sendMove(k); };

  const rankText = () => { const s = [...R.players].sort((a, b) => (b.total || 0) - (a.total || 0)), i = s.findIndex(p => p.uid === me.uid); return i >= 0 ? `Tu posición: #${i + 1} · ${s[i].total || 0} pts` : ''; };
  function pResult() {
    draw(`<div class="flex-1 flex flex-col items-center p-5 overflow-y-auto"><h1 class="text-3xl font-black mt-3 mb-1">🏆 Resultados</h1><div id="ag-rank" class="font-black text-yellow-300 mb-4"></div><div id="ag-lb" class="w-full max-w-md space-y-2"></div><p class="text-sm font-bold opacity-80 mt-5">Esperando al observador…</p><div class="mt-4">${leaveBtn}</div></div>`);
  }
  function pOver() {
    draw(`${confetti()}<div class="relative z-10 flex-1 flex flex-col items-center p-5 overflow-y-auto"><h1 class="text-4xl font-black my-4">🏁 ¡Fin de la sala!</h1><div id="ag-pod" class="w-full flex flex-col items-center"></div><div class="mt-6">${bt('ag.leave()', 'Volver al inicio', '#fff', '!text-purple-900')}</div></div>`);
  }

  // ================= INTEGRACIÓN (solo añade, no modifica) =================
  function inject() {
    const b = $('btn-juegos'); if (!b || $('btn-online')) return;
    const el = document.createElement('button'); el.id = 'btn-online';
    el.className = 'bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 text-white text-sm font-black px-6 py-3 rounded-2xl btn3d flex items-center gap-2 shadow-lg transition transform hover:scale-105';
    el.innerHTML = '<span>🌐</span> <span>Juegos en línea</span>'; el.onclick = () => ag.home();
    b.parentNode.insertBefore(el, b);
    const s = getSession();
    if (s) { const rb = document.createElement('button'); rb.className = 'glass text-white text-sm font-black px-4 py-3 rounded-2xl border border-white/25'; rb.textContent = `🔄 Mi sala en línea (${s.pin})`; rb.onclick = () => ag.resume(); b.parentNode.insertBefore(rb, b); }
  }
  function addCard() {
    const gr = document.querySelector('#app .grid.max-w-5xl'); if (!gr || $('ag-card')) return;
    gr.insertAdjacentHTML('beforeend', `<div id="ag-card" onclick="ag.home()" class="card-lift slide-up glass-card rounded-3xl border border-cyan-300/40 cursor-pointer overflow-hidden shadow-xl">
      <div class="h-36 flex items-center justify-center text-7xl" style="background:linear-gradient(135deg,#0ea5e9,#6366f1)">🌐</div>
      <div class="p-5"><h3 class="font-black text-lg mb-1">Juegos en línea</h3><p class="text-xs text-white/60 font-medium mb-3">Sala con PIN + observador · 7 juegos multijugador</p>
      <div class="text-center bg-white/15 text-xs font-black py-2.5 rounded-xl border border-white/20">🌐 Crear / Unirse</div></div></div>`);
  }
  const poll = setInterval(() => {
    if (!window.showLanding || !window.showGames || !window.showLibrary) return;
    clearInterval(poll);
    ['showLanding', 'showLibrary', 'showGames'].forEach(n => {
      const f = window[n];
      window[n] = function () { cleanup(); const out = f.apply(this, arguments); if (n === 'showLanding') inject(); if (n === 'showGames') addCard(); return out; };
    });
    inject();
  }, 100);

  // Entrada directa por QR (?apin=123456)
  const apin = new URLSearchParams(location.search).get('apin');
  if (apin) {
    let tries = 0;
    const w = setInterval(() => {
      if (++tries > 40) return clearInterval(w);
      if ($('in-pin') && !R) { clearInterval(w); ag.joinScreen(apin); }
    }, 300);
  }
})();
