(function () {
  const $ = id => document.getElementById(id);
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- Control de temporizadores / teclado ----------
  let timer = null, tos = [], keyH = null;
  const later = (fn, ms) => { const id = setTimeout(() => { tos = tos.filter(x => x !== id); fn(); }, ms); tos.push(id); return id; };
  const stop = () => {
    clearInterval(timer); timer = null;
    tos.forEach(clearTimeout); tos = [];
    if (keyH) { document.removeEventListener('keydown', keyH); keyH = null; }
  };

  // ---------- Récords guardados ----------
  const LSB = 'quizgo_games_best';
  const getBest = k => { try { return (JSON.parse(localStorage.getItem(LSB) || '{}'))[k] || 0; } catch (e) { return 0; } };
  const setBest = (k, v, lowerBetter) => {
    try {
      const o = JSON.parse(localStorage.getItem(LSB) || '{}');
      if (!o[k] || (lowerBetter ? v < o[k] : v > o[k])) { o[k] = v; localStorage.setItem(LSB, JSON.stringify(o)); return true; }
    } catch (e) {}
    return false;
  };

  // ---------- Estilos propios de los juegos ----------
  const st = document.createElement('style');
  st.textContent = `
  .g-x{color:#ff5a8a;text-shadow:0 0 18px rgba(255,90,138,.85)}
  .g-o{color:#4dd0ff;text-shadow:0 0 18px rgba(77,208,255,.85)}
  .g-cell{aspect-ratio:1;border-radius:1.1rem;font-size:3.6rem;font-weight:900;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);transition:background .15s,transform .15s}
  .g-cell:hover:not(:disabled){background:rgba(255,255,255,.18);transform:scale(1.04)}
  .g-win{background:rgba(74,222,128,.35)!important;border-color:#4ade80!important;box-shadow:0 0 25px rgba(74,222,128,.6)}
  .g-pop{animation:gpop .3s cubic-bezier(.175,.885,.32,1.275) both}
  @keyframes gpop{0%{transform:scale(.3);opacity:0}100%{transform:scale(1);opacity:1}}
  .mc{perspective:600px;position:relative;aspect-ratio:1;padding:0}
  .mc-in{position:absolute;inset:0;transition:transform .45s;transform-style:preserve-3d}
  .mc.up .mc-in,.mc.done .mc-in{transform:rotateY(180deg)}
  .mc-f,.mc-b{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:1rem;display:flex;align-items:center;justify-content:center;font-size:clamp(1.4rem,6vw,2.4rem)}
  .mc-f{background:linear-gradient(135deg,#7b2ff7,#ec4899);font-weight:900;box-shadow:0 4px 0 rgba(0,0,0,.35)}
  .mc-b{transform:rotateY(180deg);background:rgba(255,255,255,.22);border:1px solid rgba(255,255,255,.4)}
  .mc.done .mc-b{background:rgba(74,222,128,.35);border-color:#86efac}
  .c4-board{background:linear-gradient(160deg,#1d4ed8,#1e3a8a);border-radius:1.5rem;padding:.75rem;box-shadow:0 20px 40px rgba(0,0,0,.5),inset 0 2px 0 rgba(255,255,255,.25)}
  .c4-col{display:flex;flex-direction:column;gap:.5rem;border-radius:1rem;padding:0;transition:background .15s}
  .c4-col:hover:not(:disabled){background:rgba(255,255,255,.14)}
  .c4-cell{aspect-ratio:1;border-radius:50%;background:#0b1030;box-shadow:inset 0 4px 8px rgba(0,0,0,.65)}
  .c4-r{background:radial-gradient(circle at 35% 30%,#ff9a9a,#e21b3c 60%,#8f0f25)}
  .c4-y{background:radial-gradient(circle at 35% 30%,#fff3a0,#f2c200 60%,#a37f00)}
  .c4-drop{animation:c4drop .45s cubic-bezier(.3,1.3,.5,1)}
  @keyframes c4drop{from{transform:translateY(var(--d))}to{transform:none}}
  .c4-win{animation:c4pulse .6s infinite alternate}
  @keyframes c4pulse{to{filter:brightness(1.7);transform:scale(1.1)}}
  .rps-shake{display:inline-block;animation:rpsShake .25s infinite alternate}
  @keyframes rpsShake{from{transform:rotate(-14deg) translateY(0)}to{transform:rotate(14deg) translateY(-14px)}}
  .sim-pad{transition:background .08s,box-shadow .08s,transform .08s;border:4px solid rgba(0,0,0,.35)}
  .sim-pad:active{transform:scale(.97)}
  .dp{width:64px;height:64px;border-radius:1rem;font-size:1.6rem;font-weight:900;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3)}
  .dp:active{background:rgba(255,255,255,.35)}
  `;
  document.head.appendChild(st);

  const draw = html => {
    const a = $('app');
    a.className = 'w-full h-full flex flex-col relative overflow-auto stage-bg text-white';
    a.innerHTML = html;
  };

  // Al volver a otras pantallas, detener todo
  function patch() {
    if (!window.showLanding || !window.showLibrary) return false;
    ['showLanding', 'showLibrary'].forEach(n => {
      if (window[n].__patched) return;
      const orig = window[n];
      window[n] = function () { stop(); return orig.apply(this, arguments); };
      window[n].__patched = true;
    });
    return true;
  }
  const poll = setInterval(() => { if (patch()) clearInterval(poll); }, 100);

  // ================= UI COMÚN =================
  const topBar = title => `
    <div class="glass border-b border-white/10 flex items-center justify-between px-6 py-4 shadow-xl shrink-0">
      <div class="font-black text-2xl tracking-tighter cursor-pointer" onclick="showLanding()"><span class="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">QuizGo</span> <span class="text-white/70 text-base font-bold">· ${title}</span></div>
      <div class="flex gap-2">
        <button onclick="showGames()" class="text-sm font-bold text-white/80 hover:text-white px-4 py-2 rounded-xl hover:bg-white/10 transition">🎲 Juegos</button>
        <button onclick="showLanding()" class="text-sm font-bold text-white/80 hover:text-white px-4 py-2 rounded-xl hover:bg-white/10 transition">Inicio</button>
      </div>
    </div>`;
  const lvlBtn = (fn, arg, label, sub, grad) => `
    <button onclick="${fn}(${arg})" class="btn3d rounded-2xl px-5 py-4 text-left font-black text-white w-full transition hover:scale-[1.02]" style="background:linear-gradient(135deg,${grad[0]},${grad[1]})">
      <div class="text-lg">${label}</div><div class="text-xs font-semibold opacity-85">${sub}</div></button>`;
  const GR = { g: ['#26890c', '#4ecb71'], y: ['#d89e00', '#f2c94c'], o: ['#d9650b', '#ff9f1c'], r: ['#b0102b', '#e21b3c'], p: ['#46178f', '#9b51e0'] };
  const menuScreen = (title, icon, sub, buttons) => draw(`${topBar(title)}
    <div class="flex-1 flex flex-col items-center justify-center p-6">
      <div class="text-6xl mb-2">${icon}</div>
      <h1 class="text-4xl font-black mb-1 text-center">${title}</h1>
      <p class="text-white/70 font-semibold mb-6 text-center">${sub}</p>
      <div class="grid gap-3 w-full max-w-sm">${buttons.join('')}</div>
    </div>`);
  const pill = (t) => `<div class="glass rounded-xl px-4 py-2">${t}</div>`;

  // ================= MENÚ DE JUEGOS =================
  window.showGames = () => {
    stop();
    const card = (icon, name, desc, fn, grad) => `
      <div onclick="${fn}()" class="card-lift slide-up glass-card rounded-3xl border border-white/20 cursor-pointer overflow-hidden shadow-xl">
        <div class="h-36 flex items-center justify-center text-7xl" style="background:linear-gradient(135deg,${grad[0]},${grad[1]})">${icon}</div>
        <div class="p-5"><h3 class="font-black text-lg mb-1">${name}</h3><p class="text-xs text-white/60 font-medium mb-3">${desc}</p>
        <div class="text-center bg-white/15 text-xs font-black py-2.5 rounded-xl border border-white/20">▶ Jugar</div></div></div>`;
    draw(`${topBar('Juegos tradicionales')}
      <div class="flex-1 p-6 md:p-8 overflow-y-auto">
        <h1 class="text-3xl font-black mb-1">Juegos tradicionales</h1>
        <p class="text-white/60 text-sm font-medium mb-8">Elige un juego y un nivel de dificultad para divertirte. Tus récords se guardan solos.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl">
          ${card('❌⭕', 'Tres en raya', '4 niveles + modo 2 jugadores', 'tttMenu', ['#46178f', '#9b51e0'])}
          ${card('🧠', 'Memoria', 'Parejas con temas y estrellas · 4 niveles', 'memMenu', ['#0f8b8d', '#20b2aa'])}
          ${card('✊✋✌️', 'Piedra, papel o tijera', 'Series con rachas · 4 niveles', 'rpsMenu', ['#e21b3c', '#ff9f1c'])}
          ${card('🔴🟡', 'Conecta 4', 'Alinea 4 fichas · 4 niveles + 2 jugadores', 'c4Menu', ['#1d4ed8', '#38bdf8'])}
          ${card('🎵', 'Simón dice', 'Repite la secuencia de colores y sonidos', 'simonMenu', ['#d89e00', '#e21b3c'])}
          ${card('🐍', 'Culebrita', 'Come manzanas y no te choques · 4 niveles', 'snakeMenu', ['#26890c', '#0f8b8d'])}
        </div>
      </div>`);
  };

  // ================= TRES EN RAYA =================
  const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const winner = b => { for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return { w: b[a], line: [a, c, d] }; return b.every(x => x) ? { w: 'T' } : null; };
  const empties = b => b.map((v, i) => v ? -1 : i).filter(i => i >= 0);
  function minimax(b, turn, ai) {
    const r = winner(b);
    if (r) return r.w === ai ? 1 : r.w === 'T' ? 0 : -1;
    const hu = ai === 'O' ? 'X' : 'O';
    let best = turn === ai ? -2 : 2;
    for (const i of empties(b)) {
      b[i] = turn;
      const s = minimax(b, turn === ai ? hu : ai, ai);
      b[i] = null;
      best = turn === ai ? Math.max(best, s) : Math.min(best, s);
    }
    return best;
  }
  function bestMove(b, ai) {
    const hu = ai === 'O' ? 'X' : 'O';
    let bestS = -2, picks = [];
    for (const i of empties(b)) {
      b[i] = ai; const s = minimax(b, hu, ai); b[i] = null;
      if (s > bestS) { bestS = s; picks = [i]; } else if (s === bestS) picks.push(i);
    }
    return rnd(picks);
  }
  function quickMove(b, ai) {
    const hu = ai === 'O' ? 'X' : 'O';
    for (const who of [ai, hu]) for (const i of empties(b)) { b[i] = who; const w = winner(b); b[i] = null; if (w && w.w === who) return i; }
    return null;
  }
  function aiMove(b, level) {
    const m = empties(b);
    if (level === 1) return rnd(m);
    if (level === 2) { const q = quickMove(b, 'O'); return (q !== null && Math.random() < 0.7) ? q : rnd(m); }
    if (level === 3) return Math.random() < 0.85 ? bestMove(b, 'O') : rnd(m);
    return bestMove(b, 'O');
  }
  const TT = { level: 1, b: [], turn: 'X', over: false, sc: { X: 0, O: 0, T: 0 }, line: [], starter: 'X', last: -1, msg: '' };
  const LV_NAMES = { 0: '👥 2 jugadores', 1: '🟢 Fácil', 2: '🟡 Medio', 3: '🟠 Difícil', 4: '🔴 Imposible' };

  window.tttMenu = () => { stop(); menuScreen('Tres en raya', '❌⭕', 'Elige la dificultad', [
    lvlBtn('tttStart', 1, '🟢 Fácil', 'La computadora juega al azar', GR.g),
    lvlBtn('tttStart', 2, '🟡 Medio', 'A veces bloquea y gana', GR.y),
    lvlBtn('tttStart', 3, '🟠 Difícil', 'Casi no se equivoca', GR.o),
    lvlBtn('tttStart', 4, '🔴 Imposible', 'Perfecta: ¡no se puede ganar!', GR.r),
    lvlBtn('tttStart', 0, '👥 2 jugadores', 'Juega con un amigo en el mismo dispositivo', GR.p)]); };
  window.tttStart = lv => { stop(); TT.level = lv; TT.sc = { X: 0, O: 0, T: 0 }; TT.starter = 'X'; tttNew(false); };
  function tttNew(flip) {
    stop();
    if (flip) TT.starter = TT.starter === 'X' ? 'O' : 'X';
    TT.b = Array(9).fill(null); TT.turn = TT.starter; TT.over = false; TT.line = []; TT.last = -1; TT.msg = '';
    tttRender();
    if (TT.level !== 0 && TT.turn === 'O') tttAI();
  }
  window.tttNewRound = () => tttNew(true);
  function tttAI() {
    later(() => {
      if (TT.over || !document.querySelector('[data-ttt]')) return;
      const i = aiMove(TT.b, TT.level);
      TT.b[i] = 'O'; TT.last = i;
      if (tttEnd()) return;
      TT.turn = 'X'; tttRender();
    }, 450);
  }
  function tttRender() {
    const status = TT.msg || (TT.level === 0 ? `Turno de <span class="${TT.turn === 'X' ? 'g-x' : 'g-o'}">${TT.turn}</span>` : (TT.turn === 'X' ? 'Tu turno <span class="g-x">X</span>' : 'La PC está pensando…'));
    const names = TT.level === 0 ? ['Jugador X', 'Jugador O'] : ['Tú (X)', 'PC (O)'];
    draw(`${topBar('Tres en raya')}
      <div class="flex-1 flex flex-col items-center justify-center p-4" data-ttt="1">
        <div class="text-sm font-black opacity-80 mb-3">${LV_NAMES[TT.level]}</div>
        <div class="flex gap-3 mb-4 text-sm font-black">
          ${pill(`<span class="g-x">${names[0]}</span>: ${TT.sc.X}`)}${pill(`Empates: ${TT.sc.T}`)}${pill(`<span class="g-o">${names[1]}</span>: ${TT.sc.O}`)}
        </div>
        <div class="text-2xl font-black mb-4 h-9 text-center">${status}</div>
        <div class="grid grid-cols-3 gap-3 w-[min(86vw,360px)]">
          ${TT.b.map((v, i) => `<button onclick="tttClick(${i})" class="g-cell ${TT.line.includes(i) ? 'g-win' : ''}">${v ? `<span class="${v === 'X' ? 'g-x' : 'g-o'} ${TT.last === i ? 'g-pop' : ''}">${v}</span>` : ''}</button>`).join('')}
        </div>
        <div class="flex gap-3 mt-6">
          <button onclick="tttNewRound()" class="bg-[#26890c] text-white font-black px-6 py-3 rounded-2xl btn3d">🔄 Nueva ronda</button>
          <button onclick="tttMenu()" class="glass font-black px-6 py-3 rounded-2xl hover:bg-white/20 transition">Cambiar nivel</button>
        </div>
      </div>`);
  }
  function tttEnd() {
    const r = winner(TT.b); if (!r) return false;
    TT.over = true; TT.sc[r.w]++; TT.line = r.line || [];
    if (r.w === 'T') TT.msg = '🤝 ¡Empate!';
    else if (TT.level === 0) TT.msg = `🏆 ¡Ganó <span class="${r.w === 'X' ? 'g-x' : 'g-o'}">${r.w}</span>!`;
    else TT.msg = r.w === 'X' ? '🏆 ¡Ganaste!' : '😅 Ganó la PC';
    tttRender(); return true;
  }
  window.tttClick = i => {
    if (TT.over || TT.b[i]) return;
    if (TT.level !== 0 && TT.turn !== 'X') return;
    TT.b[i] = TT.turn; TT.last = i;
    if (tttEnd()) return;
    TT.turn = TT.turn === 'X' ? 'O' : 'X';
    tttRender();
    if (TT.level !== 0 && TT.turn === 'O') tttAI();
  };

  // ================= MEMORIA =================
  const THEMES = [
    ['🐶','🐱','🦁','🐸','🐵','🐼','🦊','🐯','🐰','🐨','🐷','🐙','🦄','🐢','🦋','🐧'],
    ['🍎','🍌','🍇','🍓','🍉','🍕','🍔','🍟','🍩','🍪','🍦','🌽','🥕','🍒','🥑','🍍'],
    ['⚽','🏀','🚗','🚀','✈️','🚲','🎸','🎧','📚','🎨','⏰','💎','🔔','🎁','🧩','🎈']
  ];
  const MEM = { pairs: 6, cards: [], open: [], found: 0, moves: 0, lock: false, t0: 0, done: false };
  window.memMenu = () => { stop(); menuScreen('Memoria', '🧠', 'Encuentra todas las parejas · el tema cambia cada partida', [
    lvlBtn('memStart', 6, '🟢 Fácil', `6 parejas · Récord: ${getBest('mem6') || '—'} mov.`, GR.g),
    lvlBtn('memStart', 8, '🟡 Medio', `8 parejas · Récord: ${getBest('mem8') || '—'} mov.`, GR.y),
    lvlBtn('memStart', 12, '🟠 Difícil', `12 parejas · Récord: ${getBest('mem12') || '—'} mov.`, GR.o),
    lvlBtn('memStart', 16, '🔴 Experto', `16 parejas · Récord: ${getBest('mem16') || '—'} mov.`, GR.r)]); };
  window.memStart = n => {
    stop();
    MEM.pairs = n;
    const a = shuffle(rnd(THEMES).slice(0, n).flatMap(e => [e, e]));
    MEM.cards = a.map(e => ({ e, up: false, done: false }));
    MEM.open = []; MEM.found = 0; MEM.moves = 0; MEM.lock = false; MEM.t0 = Date.now(); MEM.done = false;
    const cols = n <= 8 ? 4 : 6, best = getBest('mem' + n);
    draw(`${topBar('Memoria')}
      <div class="flex-1 flex flex-col items-center p-4 overflow-y-auto">
        <div class="flex flex-wrap justify-center gap-3 my-3 text-sm font-black">
          ${pill(`Movimientos: <span id="mem-m">0</span>`)}${pill(`Parejas: <span id="mem-f">0</span>/${n}`)}${pill(`⏱ <span id="mem-t">0s</span>`)}${pill(`🏅 Récord: ${best ? best + ' mov.' : '—'}`)}
        </div>
        <div id="mem-msg" class="text-2xl font-black mb-3 min-h-[2rem] text-center"></div>
        <div class="grid gap-2 w-[min(94vw,520px)]" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">
          ${MEM.cards.map((c, i) => `<button id="mc${i}" onclick="memClick(${i})" class="mc"><div class="mc-in"><div class="mc-f">?</div><div class="mc-b">${c.e}</div></div></button>`).join('')}
        </div>
        <div class="flex gap-3 mt-5 pb-4">
          <button onclick="memStart(${n})" class="bg-[#26890c] text-white font-black px-6 py-3 rounded-2xl btn3d">🔄 Reiniciar</button>
          <button onclick="memMenu()" class="glass font-black px-6 py-3 rounded-2xl hover:bg-white/20 transition">Cambiar nivel</button>
        </div>
      </div>`);
    timer = setInterval(() => { const t = $('mem-t'); if (t && !MEM.done) t.textContent = Math.floor((Date.now() - MEM.t0) / 1000) + 's'; }, 500);
  };
  function memPaint(i) {
    const el = $('mc' + i), c = MEM.cards[i]; if (!el) return;
    el.classList.toggle('up', c.up); el.classList.toggle('done', c.done);
  }
  function memStats() {
    if ($('mem-m')) $('mem-m').textContent = MEM.moves;
    if ($('mem-f')) $('mem-f').textContent = MEM.found;
  }
  window.memClick = i => {
    const c = MEM.cards[i];
    if (MEM.lock || MEM.done || c.up || c.done) return;
    c.up = true; MEM.open.push(i); memPaint(i);
    if (MEM.open.length < 2) return;
    MEM.moves++; MEM.lock = true; memStats();
    const [a, b] = MEM.open;
    if (MEM.cards[a].e === MEM.cards[b].e) {
      later(() => {
        MEM.cards[a].done = MEM.cards[b].done = true; MEM.cards[a].up = MEM.cards[b].up = false;
        MEM.found++; MEM.open = []; MEM.lock = false; memPaint(a); memPaint(b); memStats();
        if (MEM.found === MEM.pairs) {
          MEM.done = true; clearInterval(timer);
          const secs = Math.floor((Date.now() - MEM.t0) / 1000);
          const ratio = MEM.moves / MEM.pairs, stars = ratio <= 1.6 ? 3 : ratio <= 2.4 ? 2 : 1;
          const rec = setBest('mem' + MEM.pairs, MEM.moves, true);
          if ($('mem-msg')) $('mem-msg').innerHTML = `${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}<br>🏆 ¡Ganaste en ${MEM.moves} movimientos y ${secs}s!${rec ? '<br><span class="text-yellow-300">🏅 ¡Nuevo récord!</span>' : ''}`;
        }
      }, 350);
    } else {
      later(() => {
        MEM.cards[a].up = MEM.cards[b].up = false; MEM.open = []; MEM.lock = false; memPaint(a); memPaint(b);
      }, 850);
    }
  };

  // ================= PIEDRA, PAPEL O TIJERA =================
  const RPS_E = { r: '✊', p: '✋', s: '✌️' }, BEATS = { r: 's', p: 'r', s: 'p' }, BEATEN_BY = { r: 'p', p: 's', s: 'r' };
  const RPS = { level: 1, you: 0, pc: 0, hist: [], last: null, over: false, goal: 3, busy: false, log: [], streak: 0, shake: false };
  window.rpsMenu = () => { stop(); menuScreen('Piedra, papel o tijera', '✊✋✌️', 'Gana al mejor de la serie', [
    lvlBtn('rpsStart', 1, '🟢 Fácil', 'La PC elige al azar · a 3 puntos', GR.g),
    lvlBtn('rpsStart', 2, '🟡 Medio', 'La PC contraataca tu última jugada · a 5 puntos', GR.y),
    lvlBtn('rpsStart', 3, '🟠 Difícil', 'La PC analiza tus jugadas más usadas · a 7 puntos', GR.o),
    lvlBtn('rpsStart', 4, '🔴 Experto', 'La PC aprende tus secuencias · a 7 puntos', GR.r)]); };
  window.rpsStart = lv => { stop(); Object.assign(RPS, { level: lv, you: 0, pc: 0, hist: [], last: null, over: false, goal: [0, 3, 5, 7, 7][lv], busy: false, log: [], streak: 0, shake: false }); rpsRender(); };
  function rpsPick() {
    const k = ['r', 'p', 's'], h = RPS.hist;
    if (RPS.level === 1 || !h.length) return rnd(k);
    if (RPS.level === 2) return Math.random() < 0.6 ? BEATEN_BY[h[h.length - 1]] : rnd(k);
    const cnt = { r: 0, p: 0, s: 0 }; h.forEach(x => cnt[x]++);
    let likely = [...k].sort((a, b) => cnt[b] - cnt[a])[0];
    if (RPS.level === 4 && h.length >= 3) {
      const tr = { r: { r: 0, p: 0, s: 0 }, p: { r: 0, p: 0, s: 0 }, s: { r: 0, p: 0, s: 0 } };
      for (let i = 1; i < h.length; i++) tr[h[i - 1]][h[i]]++;
      const row = tr[h[h.length - 1]];
      if (row.r + row.p + row.s > 0) likely = [...k].sort((a, b) => row[b] - row[a])[0];
      return Math.random() < 0.9 ? BEATEN_BY[likely] : rnd(k);
    }
    return Math.random() < 0.85 ? BEATEN_BY[likely] : rnd(k);
  }
  function rpsRender() {
    const l = RPS.last;
    const dot = r => `<span class="inline-block w-3 h-3 rounded-full mx-0.5" style="background:${r === 'w' ? '#4ade80' : r === 'l' ? '#f87171' : '#cbd5e1'}"></span>`;
    let arena;
    if (RPS.shake) arena = `<span class="rps-shake">✊</span><span class="text-3xl opacity-60">VS</span><span class="rps-shake">✊</span>`;
    else if (l) arena = `<span class="pop">${RPS_E[l.you]}</span><span class="text-3xl opacity-60">VS</span><span class="pop">${RPS_E[l.pc]}</span>`;
    else arena = '❓';
    const msg = RPS.shake ? '¡Piedra, papel…!' : RPS.over ? (RPS.you > RPS.pc ? '🏆 ¡Ganaste la serie!' : '😅 La PC ganó la serie') : l ? (l.res === 'w' ? '✅ ¡Ganaste la ronda!' : l.res === 'l' ? '❌ Perdiste la ronda' : '🤝 Empate') : 'Elige tu jugada';
    const dis = RPS.over || RPS.busy;
    draw(`${topBar('Piedra, papel o tijera')}
      <div class="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <div class="flex gap-3 mb-3 text-sm font-black">${pill(`Tú: ${RPS.you}`)}${pill(`Meta: ${RPS.goal}`)}${pill(`PC: ${RPS.pc}`)}</div>
        <div class="h-5 mb-2">${RPS.log.slice(-10).map(dot).join('')}</div>
        <div class="flex items-center gap-8 text-7xl mb-3 h-24">${arena}</div>
        <div class="text-2xl font-black mb-1 h-8">${msg}</div>
        <div class="text-sm font-black text-orange-300 mb-4 h-5">${RPS.streak >= 2 ? '🔥 Racha de ' + RPS.streak : ''}</div>
        <div class="flex gap-4 mb-6">
          ${['r', 'p', 's'].map(k => `<button ${dis ? 'disabled' : ''} onclick="rpsPlay('${k}')" class="glass rounded-3xl w-24 h-24 text-5xl hover:bg-white/25 transition hover:scale-110 ${dis ? 'opacity-40' : ''}">${RPS_E[k]}</button>`).join('')}
        </div>
        <div class="flex gap-3">
          <button onclick="rpsStart(${RPS.level})" class="bg-[#26890c] text-white font-black px-6 py-3 rounded-2xl btn3d">🔄 Reiniciar</button>
          <button onclick="rpsMenu()" class="glass font-black px-6 py-3 rounded-2xl hover:bg-white/20 transition">Cambiar nivel</button>
        </div>
      </div>`);
  }
  window.rpsPlay = y => {
    if (RPS.over || RPS.busy) return;
    RPS.busy = true; RPS.shake = true; rpsRender();
    later(() => {
      const pc = rpsPick();
      const res = y === pc ? 't' : BEATS[y] === pc ? 'w' : 'l';
      if (res === 'w') { RPS.you++; RPS.streak++; } else { if (res === 'l') RPS.pc++; RPS.streak = 0; }
      RPS.hist.push(y); RPS.log.push(res); RPS.last = { you: y, pc, res };
      if (RPS.you >= RPS.goal || RPS.pc >= RPS.goal) RPS.over = true;
      RPS.busy = false; RPS.shake = false; rpsRender();
    }, 650);
  };

  // ================= CONECTA 4 =================
  const C4R = 6, C4C = 7;
  const C4 = { lv: 1, b: [], turn: 1, over: false, sc: { 1: 0, 2: 0, 0: 0 }, last: -1, win: [], starter: 1, msg: '' };
  function c4Drop(b, c, p) { for (let r = C4R - 1; r >= 0; r--) if (!b[r * C4C + c]) { b[r * C4C + c] = p; return r; } return -1; }
  function c4Win(b) {
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (let r = 0; r < C4R; r++) for (let c = 0; c < C4C; c++) {
      const p = b[r * C4C + c]; if (!p) continue;
      for (const [dr, dc] of dirs) {
        const cells = [r * C4C + c];
        for (let k = 1; k < 4; k++) {
          const rr = r + dr * k, cc = c + dc * k;
          if (rr < 0 || rr >= C4R || cc < 0 || cc >= C4C || b[rr * C4C + cc] !== p) break;
          cells.push(rr * C4C + cc);
        }
        if (cells.length === 4) return { p, cells };
      }
    }
    return null;
  }
  const c4Full = b => b.slice(0, C4C).every(Boolean);
  function c4Eval(b, ai) {
    const hu = ai === 1 ? 2 : 1; let s = 0;
    for (let r = 0; r < C4R; r++) if (b[r * C4C + 3] === ai) s += 3;
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (let r = 0; r < C4R; r++) for (let c = 0; c < C4C; c++) for (const [dr, dc] of dirs) {
      const er = r + dr * 3, ec = c + dc * 3;
      if (er < 0 || er >= C4R || ec < 0 || ec >= C4C) continue;
      let a = 0, h = 0, e = 0;
      for (let k = 0; k < 4; k++) { const v = b[(r + dr * k) * C4C + c + dc * k]; if (v === ai) a++; else if (v === hu) h++; else e++; }
      if (a && h) continue;
      if (a === 3 && e === 1) s += 5; else if (a === 2 && e === 2) s += 2;
      if (h === 3 && e === 1) s -= 6; else if (h === 2 && e === 2) s -= 1;
    }
    return s;
  }
  function c4Mini(b, depth, alpha, beta, maxing, ai) {
    const hu = ai === 1 ? 2 : 1, w = c4Win(b);
    if (w) return w.p === ai ? 100000 + depth : -100000 - depth;
    if (c4Full(b)) return 0;
    if (depth === 0) return c4Eval(b, ai);
    const order = [3, 2, 4, 1, 5, 0, 6].filter(c => !b[c]);
    let best = maxing ? -Infinity : Infinity;
    for (const c of order) {
      const r = c4Drop(b, c, maxing ? ai : hu);
      const v = c4Mini(b, depth - 1, alpha, beta, !maxing, ai);
      b[r * C4C + c] = 0;
      if (maxing) { best = Math.max(best, v); alpha = Math.max(alpha, best); } else { best = Math.min(best, v); beta = Math.min(beta, best); }
      if (alpha >= beta) break;
    }
    return best;
  }
  function c4Pick(lv) {
    const b = C4.b, cols = [0, 1, 2, 3, 4, 5, 6].filter(c => !b[c]);
    if (lv === 1) return rnd(cols);
    if (lv === 2) {
      if (Math.random() < 0.75) for (const who of [2, 1]) for (const c of cols) {
        const r = c4Drop(b, c, who); const w = c4Win(b); b[r * C4C + c] = 0;
        if (w && w.p === who) return c;
      }
      return rnd(cols);
    }
    const depth = lv === 3 ? 4 : 6;
    let bestV = -Infinity, picks = [];
    for (const c of cols) {
      const r = c4Drop(b, c, 2);
      const v = c4Mini(b, depth - 1, -Infinity, Infinity, false, 2);
      b[r * C4C + c] = 0;
      if (v > bestV) { bestV = v; picks = [c]; } else if (v === bestV) picks.push(c);
    }
    return rnd(picks);
  }
  window.c4Menu = () => { stop(); menuScreen('Conecta 4', '🔴🟡', 'Alinea 4 fichas en horizontal, vertical o diagonal', [
    lvlBtn('c4Start', 1, '🟢 Fácil', 'La PC juega al azar', GR.g),
    lvlBtn('c4Start', 2, '🟡 Medio', 'Gana y bloquea cuando lo ve', GR.y),
    lvlBtn('c4Start', 3, '🟠 Difícil', 'Piensa varias jugadas adelante', GR.o),
    lvlBtn('c4Start', 4, '🔴 Experto', 'Muy difícil de vencer', GR.r),
    lvlBtn('c4Start', 0, '👥 2 jugadores', 'Con un amigo en el mismo dispositivo', GR.p)]); };
  window.c4Start = lv => { stop(); C4.lv = lv; C4.sc = { 1: 0, 2: 0, 0: 0 }; C4.starter = 1; c4New(false); };
  function c4New(flip) {
    stop();
    if (flip) C4.starter = C4.starter === 1 ? 2 : 1;
    C4.b = Array(C4R * C4C).fill(0); C4.turn = C4.starter; C4.over = false; C4.last = -1; C4.win = []; C4.msg = '';
    c4Render();
    if (C4.lv !== 0 && C4.turn === 2) c4AI();
  }
  window.c4NewRound = () => c4New(true);
  function c4AI() {
    later(() => {
      if (C4.over || !$('c4-board')) return;
      const c = c4Pick(C4.lv), r = c4Drop(C4.b, c, 2);
      if (r < 0) return;
      C4.last = r * C4C + c; c4After();
    }, 350);
  }
  function c4After() {
    const w = c4Win(C4.b);
    if (w) {
      C4.over = true; C4.win = w.cells; C4.sc[w.p]++;
      C4.msg = C4.lv === 0 ? `🏆 ¡Ganó ${w.p === 1 ? '🔴' : '🟡'}!` : (w.p === 1 ? '🏆 ¡Ganaste!' : '😅 Ganó la PC');
    } else if (c4Full(C4.b)) { C4.over = true; C4.sc[0]++; C4.msg = '🤝 ¡Empate!'; }
    else { C4.turn = 3 - C4.turn; }
    c4Render();
    if (!C4.over && C4.lv !== 0 && C4.turn === 2) c4AI();
  }
  window.c4Click = c => {
    if (C4.over || (C4.lv !== 0 && C4.turn !== 1)) return;
    const r = c4Drop(C4.b, c, C4.turn); if (r < 0) return;
    C4.last = r * C4C + c; c4After();
  };
  function c4Render() {
    const names = C4.lv === 0 ? ['🔴 Rojo', '🟡 Amarillo'] : ['🔴 Tú', '🟡 PC'];
    const status = C4.msg || (C4.lv === 0 ? `Turno de ${C4.turn === 1 ? '🔴' : '🟡'}` : (C4.turn === 1 ? 'Tu turno 🔴' : 'La PC está pensando…'));
    let cols = '';
    for (let c = 0; c < C4C; c++) {
      let cells = '';
      for (let r = 0; r < C4R; r++) {
        const i = r * C4C + c, v = C4.b[i];
        cells += `<div class="c4-cell ${v === 1 ? 'c4-r' : v === 2 ? 'c4-y' : ''} ${i === C4.last ? 'c4-drop' : ''} ${C4.win.includes(i) ? 'c4-win' : ''}" style="--d:-${(r + 1) * 115}%"></div>`;
      }
      cols += `<button onclick="c4Click(${c})" class="c4-col" ${C4.over ? 'disabled' : ''}>${cells}</button>`;
    }
    draw(`${topBar('Conecta 4')}
      <div class="flex-1 flex flex-col items-center justify-center p-4">
        <div class="text-sm font-black opacity-80 mb-2">${C4.lv === 0 ? '👥 2 jugadores' : ['', '🟢 Fácil', '🟡 Medio', '🟠 Difícil', '🔴 Experto'][C4.lv]}</div>
        <div class="flex gap-3 mb-3 text-sm font-black">${pill(`${names[0]}: ${C4.sc[1]}`)}${pill(`Empates: ${C4.sc[0]}`)}${pill(`${names[1]}: ${C4.sc[2]}`)}</div>
        <div class="text-2xl font-black mb-3 h-9 text-center">${status}</div>
        <div id="c4-board" class="c4-board grid grid-cols-7 gap-2 w-[min(94vw,440px)]">${cols}</div>
        <div class="flex gap-3 mt-5">
          <button onclick="c4NewRound()" class="bg-[#26890c] text-white font-black px-6 py-3 rounded-2xl btn3d">🔄 Nueva ronda</button>
          <button onclick="c4Menu()" class="glass font-black px-6 py-3 rounded-2xl hover:bg-white/20 transition">Cambiar nivel</button>
        </div>
      </div>`);
  }

  // ================= SIMÓN DICE =================
  const SIMC = [{ c: '#22d04a', d: '#0f6e26', f: 329.6 }, { c: '#ff3b5c', d: '#7a0d20', f: 261.6 }, { c: '#ffd426', d: '#8a6f00', f: 220 }, { c: '#2f8cff', d: '#0a3a75', f: 164.8 }];
  const SIM = { lv: 1, seq: [], i: 0, state: 'idle', mute: false };
  let ac = null;
  function beep(f, d) {
    if (SIM.mute) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = f; g.gain.value = 0.18;
      o.connect(g); g.connect(ac.destination); o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d / 1000);
      o.stop(ac.currentTime + d / 1000);
    } catch (e) {}
  }
  function lit(k, ms) {
    const el = $('sp' + k); if (!el) return;
    el.style.background = SIMC[k].c; el.style.boxShadow = `0 0 50px ${SIMC[k].c}`;
    beep(SIMC[k].f, ms);
    later(() => { const e = $('sp' + k); if (e) { e.style.background = SIMC[k].d; e.style.boxShadow = ''; } }, ms);
  }
  const simSet = (id, t) => { const e = $(id); if (e) e.innerHTML = t; };
  window.simonMenu = () => { stop(); menuScreen('Simón dice', '🎵', 'Mira la secuencia y repítela sin equivocarte', [
    lvlBtn('simonStart', 1, '🟢 Fácil', `Lento · Récord: ${getBest('simon1') || 0} rondas`, GR.g),
    lvlBtn('simonStart', 2, '🟡 Medio', `Velocidad normal · Récord: ${getBest('simon2') || 0} rondas`, GR.y),
    lvlBtn('simonStart', 3, '🟠 Difícil', `Rápido · Récord: ${getBest('simon3') || 0} rondas`, GR.o),
    lvlBtn('simonStart', 4, '🔴 Experto', `Muy rápido · Récord: ${getBest('simon4') || 0} rondas`, GR.r)]); };
  window.simonStart = lv => {
    stop(); SIM.lv = lv; SIM.seq = []; SIM.i = 0; SIM.state = 'wait';
    draw(`${topBar('Simón dice')}
      <div class="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <div class="flex gap-3 mb-3 text-sm font-black">${pill(`Ronda: <span id="sim-r">0</span>`)}${pill(`🏅 Récord: <span id="sim-b">${getBest('simon' + lv)}</span>`)}</div>
        <div id="sim-s" class="text-2xl font-black mb-4 h-9">Prepárate…</div>
        <div class="grid grid-cols-2 gap-4 w-[min(82vw,340px)]">
          ${SIMC.map((p, k) => `<button id="sp${k}" onclick="simonPress(${k})" class="sim-pad aspect-square rounded-3xl" style="background:${p.d}"></button>`).join('')}
        </div>
        <div class="flex gap-3 mt-6">
          <button onclick="simonStart(${lv})" class="bg-[#26890c] text-white font-black px-6 py-3 rounded-2xl btn3d">🔄 Reiniciar</button>
          <button onclick="simonMute()" id="sim-mute" class="glass font-black px-5 py-3 rounded-2xl hover:bg-white/20 transition">${SIM.mute ? '🔇' : '🔊'}</button>
          <button onclick="simonMenu()" class="glass font-black px-6 py-3 rounded-2xl hover:bg-white/20 transition">Cambiar nivel</button>
        </div>
      </div>`);
    later(simNext, 700);
  };
  window.simonMute = () => { SIM.mute = !SIM.mute; simSet('sim-mute', SIM.mute ? '🔇' : '🔊'); };
  function simNext() {
    SIM.state = 'show'; SIM.i = 0; SIM.seq.push(Math.floor(Math.random() * 4));
    simSet('sim-r', SIM.seq.length); simSet('sim-s', '👀 Mira con atención');
    const base = [0, 760, 560, 400, 290][SIM.lv], spd = Math.max(base * 0.55, base - SIM.seq.length * 9);
    SIM.seq.forEach((k, n) => later(() => lit(k, spd * 0.75), 600 + n * spd));
    later(() => { SIM.state = 'input'; SIM.i = 0; simSet('sim-s', '👉 ¡Tu turno!'); }, 600 + SIM.seq.length * spd);
  }
  window.simonPress = k => {
    if (SIM.state !== 'input') return;
    lit(k, 220);
    if (k === SIM.seq[SIM.i]) {
      SIM.i++;
      if (SIM.i === SIM.seq.length) {
        SIM.state = 'wait';
        const rec = setBest('simon' + SIM.lv, SIM.seq.length, false);
        if (rec) simSet('sim-b', SIM.seq.length);
        simSet('sim-s', '✅ ¡Muy bien!');
        later(simNext, 900);
      }
    } else {
      SIM.state = 'over';
      beep(110, 600);
      simSet('sim-s', `❌ Fallaste · llegaste a la ronda ${SIM.seq.length}`);
    }
  };

  // ================= CULEBRITA =================
  const SN = { n: 20, cell: 20, lv: 1, snake: [], dir: [1, 0], q: [], food: null, bonus: null, walls: [], score: 0, over: false, paused: false, started: false, wrap: false, speed: 150, ctx: null };
  function snRR(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); c.fill(); }
  window.snakeMenu = () => { stop(); menuScreen('Culebrita', '🐍', 'Come manzanas, crece y no te choques', [
    lvlBtn('snakeStart', 1, '🟢 Fácil', `Atraviesas las paredes · Récord: ${getBest('snake1')}`, GR.g),
    lvlBtn('snakeStart', 2, '🟡 Medio', `Las paredes chocan · Récord: ${getBest('snake2')}`, GR.y),
    lvlBtn('snakeStart', 3, '🟠 Difícil', `Más rápido · Récord: ${getBest('snake3')}`, GR.o),
    lvlBtn('snakeStart', 4, '🔴 Experto', `Rápido y con obstáculos · Récord: ${getBest('snake4')}`, GR.r)]); };
  function snFree() {
    const taken = new Set([...SN.snake, ...SN.walls].map(p => p[0] + ',' + p[1]));
    if (SN.food) taken.add(SN.food[0] + ',' + SN.food[1]);
    if (SN.bonus) taken.add(SN.bonus.x + ',' + SN.bonus.y);
    const free = [];
    for (let y = 0; y < SN.n; y++) for (let x = 0; x < SN.n; x++) if (!taken.has(x + ',' + y)) free.push([x, y]);
    return free.length ? rnd(free) : null;
  }
  window.snakeStart = lv => {
    stop();
    Object.assign(SN, { lv, snake: [[10, 10], [9, 10], [8, 10]], dir: [1, 0], q: [], food: null, bonus: null, walls: [], score: 0, over: false, paused: false, started: false, wrap: lv === 1, speed: [0, 150, 125, 95, 80][lv] });
    if (lv === 4) { while (SN.walls.length < 10) { const x = Math.floor(Math.random() * SN.n), y = Math.floor(Math.random() * SN.n); if (y >= 8 && y <= 12 && x <= 14) continue; if (!SN.walls.some(w => w[0] === x && w[1] === y)) SN.walls.push([x, y]); } }
    SN.food = snFree();
    draw(`${topBar('Culebrita')}
      <div class="flex-1 flex flex-col items-center p-3 overflow-y-auto">
        <div class="flex gap-3 mb-2 text-sm font-black">${pill(`🍎 <span id="sn-s">0</span>`)}${pill(`🏅 Récord: <span id="sn-b">${getBest('snake' + lv)}</span>`)}</div>
        <canvas id="sn-cv" width="400" height="400" class="rounded-2xl border-2 border-white/25 shadow-2xl" style="width:min(92vw,400px);aspect-ratio:1;touch-action:none"></canvas>
        <div id="sn-msg" class="text-lg font-black my-2 h-7 text-center"></div>
        <div class="dpad grid grid-cols-3 gap-2 mb-3">
          <div></div><button class="dp" onclick="snDir(0,-1)">▲</button><div></div>
          <button class="dp" onclick="snDir(-1,0)">◀</button><button class="dp" onclick="snPause()">⏯</button><button class="dp" onclick="snDir(1,0)">▶</button>
          <div></div><button class="dp" onclick="snDir(0,1)">▼</button><div></div>
        </div>
        <div class="flex gap-3 pb-3">
          <button onclick="snakeStart(${lv})" class="bg-[#26890c] text-white font-black px-6 py-3 rounded-2xl btn3d">🔄 Reiniciar</button>
          <button onclick="snakeMenu()" class="glass font-black px-6 py-3 rounded-2xl hover:bg-white/20 transition">Cambiar nivel</button>
        </div>
      </div>`);
    const cv = $('sn-cv'); SN.ctx = cv.getContext('2d');
    keyH = e => {
      if (!$('sn-cv')) return;
      const k = e.key, map = { ArrowUp: [0, -1], w: [0, -1], W: [0, -1], ArrowDown: [0, 1], s: [0, 1], S: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0], ArrowRight: [1, 0], d: [1, 0], D: [1, 0] };
      if (map[k]) { e.preventDefault(); snDir(map[k][0], map[k][1]); }
      else if (k === ' ' || k === 'p' || k === 'P') { e.preventDefault(); snPause(); }
    };
    document.addEventListener('keydown', keyH);
    let tx = 0, ty = 0;
    cv.addEventListener('touchstart', e => { const t = e.touches[0]; tx = t.clientX; ty = t.clientY; }, { passive: true });
    cv.addEventListener('touchend', e => {
      const t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
      if (Math.abs(dx) > Math.abs(dy)) snDir(dx > 0 ? 1 : -1, 0); else snDir(0, dy > 0 ? 1 : -1);
    }, { passive: true });
    snDraw();
  };
  window.snDir = (dx, dy) => {
    if (SN.over || SN.paused) return;
    const last = SN.q.length ? SN.q[SN.q.length - 1] : SN.dir;
    if ((dx === -last[0] && dy === -last[1]) || (dx === last[0] && dy === last[1])) { if (SN.started) return; }
    if (!SN.started) {
      if (dx === -SN.dir[0] && dy === -SN.dir[1]) return;
      SN.started = true; SN.dir = [dx, dy];
      const m = $('sn-msg'); if (m) m.textContent = '';
      clearInterval(timer); timer = setInterval(snStep, SN.speed); return;
    }
    if (SN.q.length < 2) SN.q.push([dx, dy]);
  };
  window.snPause = () => {
    if (!SN.started || SN.over) return;
    SN.paused = !SN.paused;
    clearInterval(timer);
    if (!SN.paused) timer = setInterval(snStep, SN.speed);
    const m = $('sn-msg'); if (m) m.textContent = SN.paused ? '⏸ Pausa' : '';
    snDraw();
  };
  function snDie() {
    SN.over = true; clearInterval(timer);
    const rec = setBest('snake' + SN.lv, SN.score, false);
    if (rec && $('sn-b')) $('sn-b').textContent = SN.score;
    const m = $('sn-msg'); if (m) m.innerHTML = `💥 ¡Fin! ${SN.score} puntos${rec && SN.score ? ' · <span class="text-yellow-300">🏅 ¡Récord!</span>' : ''}`;
    snDraw();
  }
  function snStep() {
    if (SN.over || SN.paused) return;
    if (SN.q.length) SN.dir = SN.q.shift();
    const n = SN.n, h = SN.snake[0];
    let nx = h[0] + SN.dir[0], ny = h[1] + SN.dir[1];
    if (SN.wrap) { nx = (nx + n) % n; ny = (ny + n) % n; }
    else if (nx < 0 || ny < 0 || nx >= n || ny >= n) return snDie();
    if (SN.walls.some(w => w[0] === nx && w[1] === ny)) return snDie();
    const eatF = SN.food && nx === SN.food[0] && ny === SN.food[1];
    const eatB = SN.bonus && nx === SN.bonus.x && ny === SN.bonus.y;
    const body = (eatF || eatB) ? SN.snake : SN.snake.slice(0, -1);
    if (body.some(s => s[0] === nx && s[1] === ny)) return snDie();
    SN.snake.unshift([nx, ny]);
    if (eatF) {
      SN.score++; SN.food = null; SN.food = snFree();
      if (SN.score % 5 === 0 && !SN.bonus) { const p = snFree(); if (p) SN.bonus = { x: p[0], y: p[1], t: Date.now() + 6000 }; }
    } else if (eatB) { SN.score += 5; SN.bonus = null; }
    else SN.snake.pop();
    if (SN.bonus && Date.now() > SN.bonus.t) SN.bonus = null;
    const s = $('sn-s'); if (s) s.textContent = SN.score;
    snDraw();
  }
  function snDraw() {
    const c = SN.ctx; if (!c) return;
    const n = SN.n, s = SN.cell, W = n * s;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { c.fillStyle = (x + y) % 2 ? '#14103a' : '#191447'; c.fillRect(x * s, y * s, s, s); }
    SN.walls.forEach(w => { c.fillStyle = '#6b7280'; snRR(c, w[0] * s + 1, w[1] * s + 1, s - 2, s - 2, 4); c.fillStyle = '#9ca3af'; snRR(c, w[0] * s + 4, w[1] * s + 4, s - 8, s - 8, 2); });
    c.textAlign = 'center'; c.textBaseline = 'middle';
    if (SN.food) { c.font = (s * 0.85) + 'px serif'; c.fillText('🍎', SN.food[0] * s + s / 2, SN.food[1] * s + s / 2 + 1); }
    if (SN.bonus) { c.font = ((Math.floor(Date.now() / 250) % 2 ? 0.95 : 0.7) * s) + 'px serif'; c.fillText('⭐', SN.bonus.x * s + s / 2, SN.bonus.y * s + s / 2 + 1); }
    const L = SN.snake.length;
    for (let i = L - 1; i >= 0; i--) {
      const p = SN.snake[i], t = i / L;
      c.fillStyle = i === 0 ? '#86efac' : `hsl(140,70%,${52 - t * 20}%)`;
      snRR(c, p[0] * s + 1, p[1] * s + 1, s - 2, s - 2, i === 0 ? 8 : 6);
    }
    const hd = SN.snake[0], dx = SN.dir[0], dy = SN.dir[1], cx = hd[0] * s + s / 2, cy = hd[1] * s + s / 2;
    [[-1, 1], [1, 1]].forEach(([a]) => {
      const ex = cx + (dx ? dx * 4 : a * 4), ey = cy + (dy ? dy * 4 : -2) + (dx ? a * 4 : 0);
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ex, ey, 3, 0, 7); c.fill();
      c.fillStyle = '#111'; c.beginPath(); c.arc(ex + dx, ey + dy, 1.5, 0, 7); c.fill();
    });
    if (!SN.started && !SN.over) {
      c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(0, W / 2 - 40, W, 80);
      c.fillStyle = '#fff'; c.font = 'bold 20px sans-serif';
      c.fillText('Pulsa una flecha o desliza', W / 2, W / 2 - 10);
      c.fillText('para empezar', W / 2, W / 2 + 16);
    }
    if (SN.over) { c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(0, 0, W, W); c.fillStyle = '#fff'; c.font = 'bold 34px sans-serif'; c.fillText('Fin del juego', W / 2, W / 2); }
  }
})();






(function () {
  const $ = id => document.getElementById(id), rnd = a => a[Math.floor(Math.random() * a.length)], ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shuf = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  let T = [];
  const iv = (f, m) => { const i = setInterval(f, m); T.push(i); return i; }, to = (f, m) => { const i = setTimeout(f, m); T.push(i); return i; };
  const stop = () => { T.forEach(i => { clearInterval(i); clearTimeout(i); }); T = []; };
  const LSB = 'quizgo_games_best2';
  const best = k => { try { return JSON.parse(localStorage.getItem(LSB) || '{}')[k] || 0; } catch (e) { return 0; } };
  const setBest = (k, v, low) => { try { const o = JSON.parse(localStorage.getItem(LSB) || '{}'); if (!o[k] || (low ? v < o[k] : v > o[k])) { o[k] = v; localStorage.setItem(LSB, JSON.stringify(o)); return true; } } catch (e) {} return false; };
  const gx = window.gx = {};

  const st = document.createElement('style');
  st.textContent = `
  .gx-float{display:inline-block;animation:gxf 2.2s ease-in-out infinite}
  @keyframes gxf{0%,100%{transform:translateY(0) rotate(-6deg)}50%{transform:translateY(-14px) rotate(6deg)}}
  .gx-pulse{animation:gxp 1.2s ease-in-out infinite}
  @keyframes gxp{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
  .gx-pop{display:inline-block;animation:gxpop .3s cubic-bezier(.175,.885,.32,1.275) both}
  @keyframes gxpop{0%{transform:scale(.2);opacity:0}100%{transform:scale(1);opacity:1}}
  .gx-shake{display:inline-block;animation:gxsh .12s infinite alternate}
  @keyframes gxsh{from{transform:rotate(-18deg) translateY(0)}to{transform:rotate(18deg) translateY(-12px)}}
  .gx-hole{aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 50% 70%,#2a1a0a,#0d0703);box-shadow:inset 0 10px 20px rgba(0,0,0,.8),0 4px 0 rgba(255,255,255,.12);font-size:3.2rem;display:flex;align-items:center;justify-content:center;overflow:hidden}
  .gx-bub{position:absolute;bottom:-100px;border-radius:50%;border:2px solid rgba(255,255,255,.5);cursor:pointer;animation:gxrise var(--d) linear forwards}
  @keyframes gxrise{to{transform:translateY(calc(-58vh - 120px))}}
  .gx-burst{animation:gxb .25s ease-out forwards!important}
  @keyframes gxb{to{transform:scale(1.8);opacity:0}}
  .gx-coin{perspective:700px;width:150px;height:150px;margin:10px auto}
  .gx-coin.toss{animation:gxtoss 1.2s ease-out}
  @keyframes gxtoss{0%,100%{transform:translateY(0)}50%{transform:translateY(-120px)}}
  .gx-coin-in{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform 1.2s cubic-bezier(.2,.7,.3,1)}
  .gx-face{position:absolute;inset:0;border-radius:50%;backface-visibility:hidden;-webkit-backface-visibility:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;font-size:1.1rem;background:radial-gradient(circle at 35% 30%,#fff3a0,#f2c200 60%,#a37f00);color:#6b4e00;border:6px solid #d89e00;box-shadow:0 8px 20px rgba(0,0,0,.5)}
  .gx-face span{font-size:3rem}
  .gx-back{transform:rotateY(180deg)}
  .gx-card{width:130px;height:180px;border-radius:1rem;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:3.6rem;font-weight:900;box-shadow:0 12px 30px rgba(0,0,0,.5);animation:gxflip .5s ease both}
  @keyframes gxflip{from{transform:rotateY(90deg) scale(.8)}to{transform:none}}
  .gx-die{font-size:5rem;line-height:1;display:inline-block}
  `;
  document.head.appendChild(st);

  const draw = html => { const a = $('app'); a.className = 'w-full h-full flex flex-col relative overflow-auto stage-bg text-white'; a.innerHTML = html; };
  const top = t => `<div class="glass border-b border-white/10 flex items-center justify-between px-6 py-4 shadow-xl shrink-0">
    <div class="font-black text-2xl tracking-tighter cursor-pointer" onclick="showLanding()"><span class="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">QuizGo</span> <span class="text-white/70 text-base font-bold">· ${t}</span></div>
    <div class="flex gap-2"><button onclick="showGames()" class="text-sm font-bold text-white/80 hover:text-white px-4 py-2 rounded-xl hover:bg-white/10 transition">🎲 Juegos</button><button onclick="showLanding()" class="text-sm font-bold text-white/80 hover:text-white px-4 py-2 rounded-xl hover:bg-white/10 transition">Inicio</button></div></div>`;
  const pill = t => `<div class="glass rounded-xl px-4 py-2">${t}</div>`;
  const wrap = (t, inner) => draw(top(t) + `<div class="flex-1 flex flex-col items-center justify-center p-4 text-center">${inner}</div>`);
  const btn = (fn, label, c = '#1368ce') => `<button onclick="${fn}" class="text-white font-black px-6 py-3 rounded-2xl btn3d" style="background:${c}">${label}</button>`;

  function end(id, msg, key, val, low, ico) {
    stop();
    const rec = key && setBest(key, val, low), cols = ['#ffc82c', '#ff5a5f', '#4ecb71', '#4d9de0', '#c77dff', '#ff7eb6'];
    $('app').insertAdjacentHTML('beforeend', `<div class="confetti" style="z-index:49">${Array.from({ length: 40 }, () => `<i style="--l:${ri(0, 100)}%;--c:${rnd(cols)};--d:${ri(4, 8)}s;--dl:-${ri(0, 6)}s"></i>`).join('')}</div>
      <div class="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"><div class="glass rounded-3xl p-8 text-center max-w-sm gx-pop">
      <div class="text-7xl gx-float mb-2">${ico || '🏆'}</div><div class="text-2xl font-black mb-2">${msg}</div>${rec ? '<div class="text-yellow-300 font-black">🏅 ¡Nuevo récord!</div>' : ''}
      <div class="flex gap-3 justify-center mt-5"><button onclick="gx.go('${id}')" class="bg-[#26890c] text-white font-black px-6 py-3 rounded-2xl btn3d">🔄 Otra vez</button><button onclick="showGames()" class="glass font-black px-6 py-3 rounded-2xl">Juegos</button></div></div></div>`);
  }

  // ===== 1. TOPOS =====
  function topos() {
    let sc = 0, t = 30, h = Array(9).fill(0);
    wrap('Atrapa topos', `<div class="flex gap-3 mb-4 text-sm font-black">${pill('🔨 <span id="a">0</span>')}${pill('⏱ <span id="b">30</span>s')}${pill('🏅 ' + best('topos'))}</div>
      <div class="grid grid-cols-3 gap-3 w-[min(88vw,380px)]">${h.map((_, i) => `<button id="h${i}" onclick="gx.hit(${i})" class="gx-hole"></button>`).join('')}</div>`);
    const clr = i => { h[i] = 0; const e = $('h' + i); if (e) e.innerHTML = ''; };
    gx.hit = i => { if (h[i] !== 1) return; h[i] = 2; sc++; $('a').textContent = sc; $('h' + i).innerHTML = '<span class="gx-pop">💥</span>'; to(() => clearIf(i, 2), 300); };
    const clearIf = (i, s) => { if (h[i] === s) clr(i); };
    iv(() => { const i = ri(0, 8); if (h[i]) return; h[i] = 1; $('h' + i).innerHTML = '<span class="gx-pop">🐹</span>'; to(() => clearIf(i, 1), rnd([700, 900, 1100])); }, 650);
    iv(() => { t--; $('b').textContent = t; if (t <= 0) end('topos', `🔨 ¡Atrapaste ${sc} topos!`, 'topos', sc); }, 1000);
  }

  // ===== 2. ADIVINA EL NÚMERO =====
  function adivina() {
    const n = ri(1, 100); let left = 7;
    wrap('Adivina el número', `<div class="text-6xl gx-float mb-2" id="th">🌡️</div><div class="text-lg font-black mb-2">Pienso en un número del 1 al 100</div>
      <div class="text-2xl mb-3" id="lv">${'❤️'.repeat(7)}</div><div id="ms" class="text-xl font-black h-8 mb-3">¡Escribe tu primer intento!</div>
      <input id="g" type="number" min="1" max="100" class="bg-black/40 border-2 border-white/20 rounded-2xl p-3 text-3xl font-black text-center w-40 mb-4 text-white" onkeydown="if(event.key==='Enter')gx.guess()">${btn('gx.guess()', 'Probar 🎯')}`);
    gx.guess = () => {
      const v = +$('g').value; if (!v || v < 1 || v > 100) return;
      left--; $('lv').textContent = '❤️'.repeat(left) || '💔'; $('g').value = '';
      if (v === n) return end('adivina', `🎉 ¡Era ${n}! Usaste ${7 - left} intentos`, 'adivina', 7 - left, true);
      const d = Math.abs(v - n), hot = d <= 5 ? '🔥 ¡Hirviendo!' : d <= 15 ? '🌶️ Caliente' : d <= 30 ? '🙂 Tibio' : '🥶 Frío';
      $('th').innerHTML = `<span class="gx-pop">${d <= 5 ? '🔥' : d <= 15 ? '🌶️' : d <= 30 ? '🙂' : '🥶'}</span>`;
      $('ms').innerHTML = `${v < n ? '⬆️ Más alto' : '⬇️ Más bajo'} · ${hot}`;
      if (left <= 0) end('adivina', `😅 Era el ${n}`, null, 0, false, '😅');
    };
  }

  // ===== 3. AHORCADO DE GLOBOS =====
  const WORDS = ['ELEFANTE', 'PLATANO', 'ESCUELA', 'MARIPOSA', 'COMPUTADORA', 'GUITARRA', 'MONTAÑA', 'CHOCOLATE', 'BICICLETA', 'DINOSAURIO', 'ASTRONAUTA', 'PINGUINO', 'TELEFONO', 'CUMPLEAÑOS', 'ARCOIRIS', 'VOLCAN', 'TORTUGA', 'HELADO', 'PIRATA', 'CASTILLO'];
  function ahorcado() {
    const w = rnd(WORDS); const g = new Set(); let e = 0;
    wrap('Ahorcado de globos', `<div id="bl" class="mb-4 flex gap-2 justify-center"></div><div id="w" class="mb-5"></div><div id="k" class="flex flex-wrap justify-center gap-1.5 max-w-md"></div>`);
    const paint = () => {
      $('w').innerHTML = [...w].map(c => `<span class="inline-block w-8 border-b-4 border-white/60 mx-0.5 text-3xl font-black">${g.has(c) ? c : '&nbsp;'}</span>`).join('');
      $('bl').innerHTML = Array.from({ length: 6 }, (_, i) => i < e ? '<span class="gx-pop text-4xl">💥</span>' : `<span class="gx-float text-4xl" style="animation-delay:${i * .25}s">🎈</span>`).join('');
      $('k').innerHTML = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('').map(c => `<button ${g.has(c) ? 'disabled' : ''} onclick="gx.let('${c}')" class="glass rounded-lg w-9 h-10 font-black ${g.has(c) ? 'opacity-30' : ''}">${c}</button>`).join('');
    };
    gx.let = c => { g.add(c); if (!w.includes(c)) e++; paint();
      if ([...w].every(x => g.has(x))) to(() => end('ahorcado', `🎉 ¡Salvaste los globos! Era ${w}`, 'ahorcado', 6 - e), 500);
      else if (e >= 6) to(() => end('ahorcado', `😅 La palabra era ${w}`, null, 0, false, '💥'), 500); };
    paint();
  }

  // ===== 4. REFLEJOS =====
  function reflejos() {
    let rd = 0, tot = 0, ph = 0, t0 = 0, w = 0;
    wrap('Reflejos', `<div class="flex gap-3 mb-4 text-sm font-black">${pill('Ronda <span id="a">0</span>/5')}${pill('🏅 ' + (best('reflejos') ? best('reflejos') + ' ms' : '—'))}</div>
      <button id="r" onclick="gx.rf()" class="w-[min(88vw,380px)] h-60 rounded-3xl text-2xl font-black btn3d gx-pulse" style="background:#1368ce">Toca para empezar</button>`);
    const box = (c, t) => { const e = $('r'); e.style.background = c; e.innerHTML = t; };
    gx.rf = () => {
      if (ph === 0) { ph = 1; box('#e21b3c', '✋ Espera…'); w = to(() => { ph = 2; t0 = performance.now(); box('#26890c', '⚡ ¡YA!'); }, ri(1200, 3500)); }
      else if (ph === 1) { clearTimeout(w); ph = 0; box('#d9650b', '😬 ¡Muy pronto!<br><span class="text-base">Toca para reintentar</span>'); }
      else if (ph === 2) {
        const ms = Math.round(performance.now() - t0); tot += ms; rd++; $('a').textContent = rd;
        if (rd >= 5) { ph = 3; const av = Math.round(tot / 5); return to(() => end('reflejos', `⚡ Promedio: ${av} ms`, 'reflejos', av, true), 500); }
        ph = 0; box('#46178f', `<span class="gx-pop text-5xl">${ms} ms</span><br><span class="text-base">Toca para seguir</span>`);
      }
    };
  }

  // ===== 5. BURBUJAS =====
  function burbujas() {
    let sc = 0, t = 30;
    wrap('Revienta burbujas', `<div class="flex gap-3 mb-3 text-sm font-black">${pill('🫧 <span id="a">0</span>')}${pill('⏱ <span id="b">30</span>s')}${pill('🏅 ' + best('burbujas'))}</div>
      <div id="ar" class="relative overflow-hidden rounded-3xl glass w-[min(94vw,520px)] h-[58vh]"></div>`);
    iv(() => {
      const a = $('ar'); if (!a) return;
      const s = ri(40, 90), d = document.createElement('div');
      d.className = 'gx-bub'; d.style.cssText = `left:${ri(2, 85)}%;width:${s}px;height:${s}px;--d:${ri(30, 60) / 10}s;background:radial-gradient(circle at 30% 30%,rgba(255,255,255,.9),${rnd(['#ff7eb6', '#4d9de0', '#ffd23f', '#4ecb71', '#c77dff'])}aa)`;
      d.onpointerdown = () => { if (d.dataset.p) return; d.dataset.p = 1; sc += s < 60 ? 2 : 1; $('a').textContent = sc; d.classList.add('gx-burst'); to(() => d.remove(), 250); };
      d.addEventListener('animationend', e => { if (e.animationName === 'gxrise') d.remove(); });
      a.appendChild(d);
    }, 420);
    iv(() => { t--; $('b').textContent = t; if (t <= 0) end('burbujas', `🫧 ¡${sc} puntos!`, 'burbujas', sc); }, 1000);
  }

  // ===== 6. DADOS =====
  function dados() {
    let r = 0, y = 0, p = 0, busy = 0; const F = '⚀⚁⚂⚃⚄⚅';
    wrap('Dados', `<div class="flex gap-3 mb-3 text-sm font-black">${pill('Ronda <span id="r">0</span>/5')}${pill('Tú: <span id="y">0</span>')}${pill('PC: <span id="p">0</span>')}</div>
      <div class="text-sm font-black opacity-70">💻 PC</div><div class="mb-3"><span id="d0" class="gx-die">⚀</span> <span id="d1" class="gx-die">⚀</span></div>
      <div class="text-sm font-black opacity-70">🙂 Tú</div><div class="mb-3"><span id="d2" class="gx-die">⚀</span> <span id="d3" class="gx-die">⚀</span></div>
      <div id="ms" class="text-xl font-black h-8 mb-3">¡Tira los dados!</div>${btn('gx.roll()', '🎲 Tirar', '#26890c')}`);
    gx.roll = () => {
      if (busy || r >= 5) return; busy = 1;
      const els = [0, 1, 2, 3].map(i => $('d' + i)); els.forEach(e => e.classList.add('gx-shake'));
      const f = iv(() => els.forEach(e => e.textContent = F[ri(0, 5)]), 80);
      to(() => {
        clearInterval(f); const v = [ri(1, 6), ri(1, 6), ri(1, 6), ri(1, 6)];
        els.forEach((e, i) => { e.textContent = F[v[i] - 1]; e.classList.remove('gx-shake'); });
        const pc = v[0] + v[1], me = v[2] + v[3]; r++; $('r').textContent = r;
        if (me > pc) { y++; $('ms').textContent = `✅ ¡Ganas! ${me} vs ${pc}`; } else if (pc > me) { p++; $('ms').textContent = `❌ Pierdes ${me} vs ${pc}`; } else $('ms').textContent = `🤝 Empate ${me} vs ${pc}`;
        $('y').textContent = y; $('p').textContent = p; busy = 0;
        if (r >= 5) to(() => end('dados', y > p ? `🎉 ¡Ganaste ${y} a ${p}!` : y < p ? `😅 La PC ganó ${p} a ${y}` : '🤝 ¡Empate!', 'dados', y, false, y > p ? '🏆' : '🎲'), 900);
      }, 900);
    };
  }

  // ===== 7. MATE RÁPIDO =====
  function mate() {
    let sc = 0, t = 30, s = 0, q;
    const mk = () => { const o = rnd(['+', '-', '×']); let a = ri(2, 12), b = ri(2, 12); if (o === '-' && b > a) [a, b] = [b, a];
      const r = o === '+' ? a + b : o === '-' ? a - b : a * b, set = new Set([r]); while (set.size < 4) set.add(r + ri(-6, 6));
      q = { t: `${a} ${o} ${b}`, r, o: shuf([...set]) }; };
    wrap('Mate rápido', `<div class="flex gap-3 mb-4 text-sm font-black">${pill('✅ <span id="a">0</span>')}${pill('⏱ <span id="b">30</span>s')}${pill('🔥 <span id="s">0</span>')}${pill('🏅 ' + best('mate'))}</div>
      <div id="q" class="text-6xl font-black mb-6"></div><div id="o" class="grid grid-cols-2 gap-3 w-[min(88vw,340px)]"></div>`);
    const rq = () => { $('q').innerHTML = `<span class="gx-pop">${q.t} = ?</span>`; $('o').innerHTML = q.o.map(v => `<button onclick="gx.ans(${v})" class="glass rounded-2xl py-5 text-3xl font-black hover:bg-white/25">${v}</button>`).join(''); };
    gx.ans = v => { if (v === q.r) { sc++; s++; } else { s = 0; $('q').classList.add('gx-shake'); }
      $('a').textContent = sc; $('s').textContent = s; mk(); rq(); };
    iv(() => { t--; $('b').textContent = t; if (t <= 0) end('mate', `🧮 ¡${sc} respuestas correctas!`, 'mate', sc); }, 1000);
    mk(); rq();
  }

  // ===== 8. MAYOR O MENOR =====
  function mayor() {
    let c = ri(1, 13), s = 0; const L = v => ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }[v] || v);
    const card = v => { const su = rnd(['♠', '♥', '♦', '♣']); return `<div class="gx-card ${'♥♦'.includes(su) ? 'text-red-600' : 'text-gray-900'}"><div>${L(v)}</div><div>${su}</div></div>`; };
    wrap('Mayor o menor', `<div class="flex gap-3 mb-4 text-sm font-black">${pill('🔥 Racha: <span id="s">0</span>')}${pill('🏅 ' + best('mayor'))}</div>
      <div id="cd" class="mb-6">${card(c)}</div><div id="ms" class="text-xl font-black h-8 mb-4">¿La siguiente será mayor o menor?</div>
      <div class="flex gap-4">${btn('gx.hl(1)', '⬆️ Mayor', '#26890c')}${btn('gx.hl(0)', '⬇️ Menor', '#e21b3c')}</div>`);
    gx.hl = h => { let n; do { n = ri(1, 13); } while (n === c); const ok = h ? n > c : n < c; c = n; $('cd').innerHTML = card(n);
      if (ok) { s++; $('s').textContent = s; $('ms').textContent = '✅ ¡Bien!'; } else { $('ms').textContent = '❌ ¡Fallaste!'; to(() => end('mayor', `🃏 Tu racha fue de ${s}`, 'mayor', s, false, '🃏'), 700); } };
  }

  // ===== 9. CARA O CRUZ =====
  function moneda() {
    let rot = 0, s = 0, b = best('moneda'), busy = 0;
    wrap('Cara o cruz', `<div class="flex gap-3 mb-2 text-sm font-black">${pill('🔥 Racha: <span id="s">0</span>')}${pill('🏅 Mejor: <span id="b">' + b + '</span>')}</div>
      <div id="cw" class="gx-coin"><div id="cn" class="gx-coin-in"><div class="gx-face"><span>🙂</span>CARA</div><div class="gx-face gx-back"><span>⭐</span>CRUZ</div></div></div>
      <div id="ms" class="text-xl font-black h-8 my-4">Elige: ¿cara o cruz?</div><div class="flex gap-4">${btn('gx.pick(0)', '🙂 Cara', '#1368ce')}${btn('gx.pick(1)', '⭐ Cruz', '#d89e00')}</div>`);
    gx.pick = p => {
      if (busy) return; busy = 1; const res = Math.random() < .5 ? 0 : 1;
      rot = (Math.floor(rot / 360) + 5) * 360 + (res ? 180 : 0);
      $('cw').classList.remove('toast'); $('cw').classList.add('toast'); $('cw').classList.remove('toast'); void $('cw').offsetWidth; $('cw').classList.add('toss');
      $('cn').style.transform = `rotateY(${rot}deg)`; $('ms').textContent = '🌀 Girando…';
      to(() => {
        $('cw').classList.remove('toss');
        if (p === res) { s++; $('ms').textContent = '✅ ¡Acertaste!'; if (s > b) { b = s; setBest('moneda', b, false); $('b').textContent = b; } } else { s = 0; $('ms').textContent = '❌ Era ' + (res ? 'cruz' : 'cara'); }
        $('s').textContent = s; busy = 0;
      }, 1300);
    };
  }

  // ===== 10. ESCRIBE RÁPIDO =====
  const WL = ['casa', 'perro', 'luz', 'sol', 'amigo', 'verde', 'feliz', 'jugar', 'libro', 'agua', 'cielo', 'queso', 'tigre', 'house', 'green', 'happy', 'water', 'friend', 'school', 'apple', 'music', 'robot', 'pizza', 'lluvia', 'estrella'];
  function escribe() {
    let sc = 0, t = 30, w = rnd(WL);
    wrap('Escribe rápido', `<div class="flex gap-3 mb-4 text-sm font-black">${pill('✅ <span id="a">0</span>')}${pill('⏱ <span id="b">30</span>s')}${pill('🏅 ' + best('escribe'))}</div>
      <div id="w" class="text-6xl font-black mb-5 tracking-widest"></div>
      <input id="i" autocomplete="off" autocapitalize="off" spellcheck="false" class="bg-black/40 border-2 border-white/20 rounded-2xl p-4 text-3xl font-black text-center w-[min(88vw,340px)] text-white" oninput="gx.typ(this.value)">`);
    const show = v => { $('w').innerHTML = [...w].map((c, i) => `<span style="color:${i < v.length ? (v[i] === c ? '#4ade80' : '#f87171') : '#fff'}">${c}</span>`).join(''); };
    gx.typ = v => { v = v.toLowerCase().trim();
      if (v === w) { sc++; $('a').textContent = sc; let n; do { n = rnd(WL); } while (n === w); w = n; $('i').value = ''; show(''); $('w').classList.remove('gx-pop'); void $('w').offsetWidth; $('w').classList.add('gx-pop'); } else show(v); };
    show(''); $('i').focus();
    iv(() => { t--; $('b').textContent = t; if (t <= 0) end('escribe', `⌨️ ¡${sc} palabras en 30 s!`, 'escribe', sc); }, 1000);
  }

  // ===== REGISTRO + PANTALLA "CÓMO SE JUEGA" =====
  const G = [
    { id: 'topos', icon: '🐹', name: 'Atrapa topos', desc: 'Golpea los topos que asoman · 30 s', g: ['#8a5a2b', '#d89e00'], run: topos, how: 'Aparecen topos en los huecos y se esconden rápido.<br>👉 <b>Toca cada topo</b> antes de que desaparezca.<br>Tienes <b>30 segundos</b>: ¡consigue el máximo de golpes!' },
    { id: 'adivina', icon: '🌡️', name: 'Adivina el número', desc: 'Frío o caliente · 7 intentos', g: ['#e21b3c', '#38bdf8'], run: adivina, how: 'Pienso en un número del <b>1 al 100</b>.<br>👉 Escribe tu intento y te diré si es <b>más alto o más bajo</b>.<br>El termómetro cambia: 🥶 frío, 🙂 tibio, 🌶️ caliente, 🔥 hirviendo.<br>Tienes <b>7 corazones</b>; menos intentos = mejor récord.' },
    { id: 'ahorcado', icon: '🎈', name: 'Ahorcado de globos', desc: 'Adivina la palabra · 6 globos', g: ['#ff7eb6', '#7b61ff'], run: ahorcado, how: 'Hay una palabra secreta (cada raya es una letra).<br>👉 <b>Toca letras</b> del teclado: si está, aparece; si no, <b>revienta un globo</b> 💥.<br>Ganas si completas la palabra antes de perder los <b>6 globos</b>.' },
    { id: 'reflejos', icon: '⚡', name: 'Reflejos', desc: 'Toca cuando se ponga verde', g: ['#26890c', '#e21b3c'], run: reflejos, how: 'La caja empieza roja ✋.<br>👉 Cuando se ponga <b>verde ⚡ ¡toca lo más rápido que puedas!</b><br>Si tocas antes, repites la ronda. Son <b>5 rondas</b>; tu promedio en milisegundos es tu puntaje (menos es mejor).' },
    { id: 'burbujas', icon: '🫧', name: 'Revienta burbujas', desc: 'Pincha burbujas · 30 s', g: ['#4d9de0', '#c77dff'], run: burbujas, how: 'Suben burbujas de colores.<br>👉 <b>Tócalas para reventarlas</b>: las pequeñas valen <b>2 puntos</b>, las grandes 1.<br>Tienes <b>30 segundos</b>.' },
    { id: 'dados', icon: '🎲', name: 'Dados', desc: 'Duelo contra la PC · 5 rondas', g: ['#d9650b', '#ffd23f'], run: dados, how: 'Tú y la PC lanzan <b>2 dados</b> cada uno.<br>👉 Pulsa <b>Tirar</b>: gana la ronda quien tenga la <b>suma más alta</b>.<br>Después de <b>5 rondas</b> gana quien tenga más victorias.' },
    { id: 'mate', icon: '🧮', name: 'Mate rápido', desc: 'Operaciones veloces · 30 s', g: ['#0f8b8d', '#4ecb71'], run: mate, how: 'Verás sumas, restas y multiplicaciones.<br>👉 Elige la <b>respuesta correcta</b> entre 4 opciones.<br>Cada acierto suma 1 punto; si fallas, la racha 🔥 vuelve a 0. Tienes <b>30 segundos</b>.' },
    { id: 'mayor', icon: '🃏', name: 'Mayor o menor', desc: 'Adivina la siguiente carta', g: ['#1d4ed8', '#e21b3c'], run: mayor, how: 'Se muestra una carta (A=1 … K=13).<br>👉 Adivina si la <b>siguiente será mayor ⬆️ o menor ⬇️</b>.<br>Cada acierto suma a tu racha. Con el <b>primer fallo</b> termina el juego.' },
    { id: 'moneda', icon: '🪙', name: 'Cara o cruz', desc: 'Moneda 3D · suma rachas', g: ['#d89e00', '#f2c94c'], run: moneda, how: 'Elige <b>cara 🙂 o cruz ⭐</b> y la moneda gira en el aire.<br>👉 Si aciertas, tu <b>racha</b> sube; si fallas, vuelve a 0.<br>¡Intenta superar tu mejor racha!' },
    { id: 'escribe', icon: '⌨️', name: 'Escribe rápido', desc: 'Teclea palabras · 30 s', g: ['#46178f', '#ec4899'], run: escribe, how: 'Aparece una palabra grande.<br>👉 <b>Escríbela</b> en la caja: las letras se ponen <b>verdes</b> si van bien y rojas si te equivocas.<br>Al terminarla sale otra sola. Tienes <b>30 segundos</b>.' }
  ];
  gx.open = id => {
    stop(); const g = G.find(x => x.id === id);
    draw(top(g.name) + `<div class="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div class="gx-float text-8xl mb-3">${g.icon}</div><h1 class="text-4xl font-black mb-3">${g.name}</h1>
      <div class="glass rounded-3xl p-5 max-w-md text-left text-sm font-semibold leading-relaxed mb-6"><div class="font-black text-purple-300 mb-2">📖 Cómo se juega</div>${g.how}</div>
      <button onclick="gx.go('${id}')" class="bg-[#26890c] text-white font-black text-xl px-12 py-4 rounded-2xl btn3d gx-pulse">▶ ¡Jugar!</button></div>`);
  };
  gx.go = id => { stop(); G.find(x => x.id === id).run(); };
  const cardHTML = g => `<div onclick="gx.open('${g.id}')" class="card-lift slide-up glass-card rounded-3xl border border-white/20 cursor-pointer overflow-hidden shadow-xl">
    <div class="h-36 flex items-center justify-center text-7xl" style="background:linear-gradient(135deg,${g.g[0]},${g.g[1]})"><span class="gx-float">${g.icon}</span></div>
    <div class="p-5"><h3 class="font-black text-lg mb-1">${g.name}</h3><p class="text-xs text-white/60 font-medium mb-3">${g.desc}</p>
    <div class="text-center bg-white/15 text-xs font-black py-2.5 rounded-xl border border-white/20">📖 Reglas y jugar</div></div></div>`;

  // ===== Integración (solo añade; no modifica el código existente) =====
  const poll = setInterval(() => {
    if (!window.showGames || !window.snakeStart || !window.showLanding || !window.showLibrary) return;
    clearInterval(poll);
    const og = window.showGames;
    window.showGames = function () { stop(); og.apply(this, arguments); const gr = document.querySelector('#app .grid.max-w-5xl'); if (gr) gr.insertAdjacentHTML('beforeend', G.map(cardHTML).join('')); };
    ['showLanding', 'showLibrary'].forEach(n => { const f = window[n]; window[n] = function () { stop(); return f.apply(this, arguments); }; });
    // Serpiente con más espacio
    const os = window.snakeStart;
    window.snakeStart = function () {
      os.apply(this, arguments);
      const c = $('sn-cv'); if (c) { c.style.width = 'min(96vw,78vh,720px)'; c.style.maxWidth = 'none'; }
    };
  }, 100);
})();
