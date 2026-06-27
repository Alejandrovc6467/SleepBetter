// ── Catálogo de sonidos ───────────────────────────────────────────────────
// loop: true  → reproducción continua en bucle
// loop: false → reproducción aleatoria (suena al activar, luego a intervalos random)
const sounds = [
  { id: 'lluvia',  name: 'Lluvia',   icon: 'ti-cloud-rain',    file: 'audios/lluvia-suave.wav',  loop: true  },
  { id: 'viento',  name: 'Viento',   icon: 'ti-wind',          file: 'audios/viento.mp3',        loop: true  },
  { id: 'trueno',  name: 'Trueno',   icon: 'ti-bolt',          file: 'audios/trueno2.wav',       loop: false },
  { id: 'buho',    name: 'Búho',     icon: 'ti-feather',       file: 'audios/buho.mp3',          loop: false },
  { id: 'olas',    name: 'Olas',     icon: 'ti-ripple',        file: 'audios/olas.mp3',          loop: true  },
  { id: 'fogata',  name: 'Fogata',   icon: 'ti-flame',         file: 'audios/fogata.mp3',        loop: true  },
  { id: 'bosque',  name: 'Bosque',   icon: 'ti-trees',         file: 'audios/bosque.mp3',        loop: true  },
  { id: 'rio',     name: 'Río',      icon: 'ti-droplets',      file: 'audios/rio.mp3',           loop: true  },
   { id: 'viento',  name: 'Viento',   icon: 'ti-wind',          file: 'audios/viento.mp3',        loop: true  },
  { id: 'trueno',  name: 'Trueno',   icon: 'ti-bolt',          file: 'audios/trueno2.wav',       loop: false },
  { id: 'buho',    name: 'Búho',     icon: 'ti-feather',       file: 'audios/buho.mp3',          loop: false },
  { id: 'olas',    name: 'Olas',     icon: 'ti-ripple',        file: 'audios/olas.mp3',          loop: true  },
  { id: 'fogata',  name: 'Fogata',   icon: 'ti-flame',         file: 'audios/fogata.mp3',        loop: true  },
  { id: 'bosque',  name: 'Bosque',   icon: 'ti-trees',         file: 'audios/bosque.mp3',        loop: true  },
  { id: 'rio',     name: 'Río',      icon: 'ti-droplets',      file: 'audios/rio.mp3',           loop: true  },
];

// ── AudioContext compartido ───────────────────────────────────────────────
let ctx = null;
function getContext() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

// ── Estado por sonido ─────────────────────────────────────────────────────
const state = {};   // id → { buffer, source, gainNode, playing, volume, loading, randomTimeout }

// ── Helpers DOM ───────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function updatePlayingCount() {
  const count = Object.values(state).filter(s => s.playing).length;
  $('playing-count').textContent = count;
  $('empty-state').style.display = count === 0 ? 'flex' : 'none';
  const eq = $('eq-header');
  if (eq) eq.classList.toggle('active', count > 0);
}

// ── Construir grid de biblioteca ──────────────────────────────────────────
function buildGrid() {
  const grid = $('sounds-grid');
  sounds.forEach(s => {
    state[s.id] = { buffer: null, source: null, gainNode: null, playing: false, volume: 0.5, loading: false, randomTimeout: null };

    const btn = document.createElement('button');
    btn.className = 'sound-btn';
    btn.id = `snd-${s.id}`;
    btn.setAttribute('aria-label', s.name);
    btn.innerHTML = `
      <div class="sound-circle">
        <i class="ti ${s.icon}" aria-hidden="true"></i>
      </div>
      <span class="sound-name">${s.name}</span>
    `;
    btn.addEventListener('click', () => toggleSound(s));
    grid.appendChild(btn);
  });
}

// ── Cargar buffer de audio ────────────────────────────────────────────────
async function loadBuffer(s) {
  const st = state[s.id];
  if (st.buffer) return true;
  if (st.loading) return false;

  st.loading = true;
  try {
    const ac = getContext();
    const res = await fetch(s.file);
    if (!res.ok) throw new Error('Archivo no encontrado');
    const raw = await res.arrayBuffer();
    st.buffer = await ac.decodeAudioData(raw);
    st.loading = false;
    return true;
  } catch (e) {
    st.loading = false;
    console.warn(`[SleepBetter] No se pudo cargar: ${s.file}`);
    return false;
  }
}

// ── Intervalos aleatorios disponibles (en segundos) ──────────────────────
const RANDOM_INTERVALS = [20, 30, 35, 45, 50, 60, 90];

function pickRandomInterval() {
  return RANDOM_INTERVALS[Math.floor(Math.random() * RANDOM_INTERVALS.length)];
}

// ── Reproducir el buffer una sola vez (sin loop) ──────────────────────────
function playOnce(s) {
  const st = state[s.id];
  if (!st.playing) return;

  const ac = getContext();

  // Crear una nueva fuente cada vez (BufferSource es de un solo uso)
  const src = ac.createBufferSource();
  src.buffer = st.buffer;
  src.loop   = false;
  src.connect(st.gainNode);
  src.start(0);

  // Guardar referencia para poder parar si el usuario desactiva
  st.source = src;
}

// ── Programar la siguiente reproducción aleatoria ─────────────────────────
function scheduleRandom(s) {
  const st = state[s.id];
  if (!st.playing) return;

  const delay = pickRandomInterval() * 1000;
  st.randomTimeout = setTimeout(() => {
    if (!st.playing) return;
    playOnce(s);
    scheduleRandom(s); // programar la siguiente
  }, delay);
}

// ── Iniciar reproducción ──────────────────────────────────────────────────
function startSource(s) {
  const st = state[s.id];
  const ac = getContext();

  // Crear nodo de ganancia (compartido para toda la sesión del sonido)
  st.gainNode = ac.createGain();
  st.gainNode.gain.value = isMuted ? 0 : st.volume;
  st.gainNode.connect(ac.destination);

  if (s.loop) {
    // Reproducción continua en bucle
    st.source = ac.createBufferSource();
    st.source.buffer = st.buffer;
    st.source.loop   = true;
    st.source.connect(st.gainNode);
    st.source.start(0);
  } else {
    // Reproducción aleatoria: suena inmediatamente y luego a intervalos random
    playOnce(s);
    scheduleRandom(s);
  }
}

// ── Detener reproducción ──────────────────────────────────────────────────
function stopSource(s) {
  const st = state[s.id];

  // Cancelar timeout de reproducción aleatoria si existe
  if (st.randomTimeout) {
    clearTimeout(st.randomTimeout);
    st.randomTimeout = null;
  }

  if (st.source) {
    try { st.source.stop(); } catch (_) {}
    st.source.disconnect();
    st.source = null;
  }
  if (st.gainNode) {
    st.gainNode.disconnect();
    st.gainNode = null;
  }
}

// ── Toggle sonido ─────────────────────────────────────────────────────────
async function toggleSound(s) {
  const st = state[s.id];
  if (st.loading) return;

  const ac = getContext();
  if (ac.state === 'suspended') await ac.resume();

  if (st.playing) {
    removeSound(s);
  } else {
    const ok = await loadBuffer(s);
    if (!ok) return;
    st.playing = true;
    startSource(s);
    markActive(s.id, true);
    addNowPlayingCard(s);
    updatePlayingCount();
  }
}

// ── Quitar sonido ─────────────────────────────────────────────────────────
function removeSound(s) {
  const st = state[s.id];
  stopSource(s);
  st.playing = false;
  markActive(s.id, false);
  removeNowPlayingCard(s.id);
  updatePlayingCount();
}

// ── Marcar círculo activo / inactivo ─────────────────────────────────────
function markActive(id, active) {
  const btn = $(`snd-${id}`);
  if (btn) btn.classList.toggle('active', active);
}

// ── Crear tarjeta "Sonando ahora" ────────────────────────────────────────
function addNowPlayingCard(s) {
  const list = $('now-playing-list');

  const card = document.createElement('div');
  card.className = 'np-card';
  card.id = `np-${s.id}`;

  card.innerHTML = `
    <div class="np-icon-wrap">
      <i class="ti ${s.icon}" aria-hidden="true"></i>
      <button class="np-remove" aria-label="Quitar ${s.name}">
        <i class="ti ti-x" aria-hidden="true"></i>
      </button>
    </div>
    <div class="np-info">
      <div class="np-name">${s.name}</div>
      <div class="np-vol-row">
        <input
          type="range"
          id="npvol-${s.id}"
          min="0" max="100" value="50"
          aria-label="Volumen ${s.name}"
        />
      </div>
    </div>
  `;

  // Inicializar slider con color fill
  const slider = card.querySelector(`#npvol-${s.id}`);
  setSliderFill(slider, 50);

  // Control de volumen
  slider.addEventListener('input', () => {
    const val = parseInt(slider.value);
    state[s.id].volume = val / 100;
    if (state[s.id].gainNode) {
      state[s.id].gainNode.gain.value = state[s.id].volume;
    }
    setSliderFill(slider, val);
  });

  // Botón quitar
  card.querySelector('.np-remove').addEventListener('click', () => removeSound(s));

  list.appendChild(card);
}

function removeNowPlayingCard(id) {
  const card = $(`np-${id}`);
  if (card) {
    card.style.animation = 'slideOut .2s ease forwards';
    setTimeout(() => card.remove(), 200);
  }
}

function setSliderFill(slider, val) {
  slider.style.background =
    `linear-gradient(to right, var(--accent) ${val}%, var(--border) ${val}%)`;
}

// ── Animación de salida ───────────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
  @keyframes slideOut {
    from { opacity: 1; transform: translateX(0); }
    to   { opacity: 0; transform: translateX(12px); max-height: 0; padding: 0; margin: 0; }
  }
`;
document.head.appendChild(style);

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildGrid();
  updatePlayingCount();
  initRain();
  initTimer();
  initMute();
});

// ── Animación de lluvia ───────────────────────────────────────────────────
function initRain() {
  const canvas = document.getElementById('rain-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Gotas: { x, y, len, speed, opacity, width }
  let drops = [];
  let raf;

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    spawnDrops();
  }

  function spawnDrops() {
    const count = Math.floor((canvas.width / 480) * 80 + 40);
    drops = Array.from({ length: count }, () => makeDroplet(true));
  }

  function makeDroplet(scatter) {
    const speed = 4 + Math.random() * 6;
    return {
      x:       Math.random() * canvas.width,
      y:       scatter ? Math.random() * canvas.height : -20,
      len:     10 + Math.random() * 18,
      speed,
      opacity: 0.12 + Math.random() * 0.28,
      width:   0.6 + Math.random() * 0.8,
      // ángulo ligero hacia la derecha (viento suave)
      drift:   speed * 0.18,
    };
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drops.forEach(d => {
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + d.drift, d.y + d.len);
      ctx.strokeStyle = `rgba(174, 210, 255, ${d.opacity})`;
      ctx.lineWidth   = d.width;
      ctx.lineCap     = 'round';
      ctx.stroke();

      // avanzar
      d.y += d.speed;
      d.x += d.drift * 0.3;

      // reset al salir del canvas
      if (d.y > canvas.height + 20) {
        Object.assign(d, makeDroplet(false));
      }
    });

    raf = requestAnimationFrame(draw);
  }

  resize();
  draw();

  // Re-ajustar si cambia el tamaño (orientación, etc.)
  window.addEventListener('resize', () => {
    cancelAnimationFrame(raf);
    resize();
    draw();
  });
}
// ── TEMPORIZADOR ──────────────────────────────────────────────────────────
let timerInterval = null;
let timerSecondsLeft = 0;

function initTimer() {
  const btn      = $('timer-btn');
  const overlay  = $('timer-modal-overlay');
  const closeBtn = $('timer-modal-close');
  const stopBtn  = $('timer-stop');
  const options  = document.querySelectorAll('.timer-option');

  btn.addEventListener('click', () => {
    updateStopBtn();
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
  });

  closeBtn.addEventListener('click', closeTimerModal);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeTimerModal();
  });

  options.forEach(opt => {
    opt.addEventListener('click', () => {
      const minutes = parseInt(opt.dataset.minutes);
      startTimer(minutes * 60);
      closeTimerModal();
    });
  });

  stopBtn.addEventListener('click', () => {
    cancelTimer();
    closeTimerModal();
  });
}

function updateStopBtn() {
  const stopBtn = $('timer-stop');
  if (stopBtn) stopBtn.disabled = !timerInterval;
}

function closeTimerModal() {
  const overlay = $('timer-modal-overlay');
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
}

function cancelTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timerSecondsLeft = 0;
  $('timer-dot').classList.remove('active');
  $('timer-display').textContent = '--:--:--';
}

function startTimer(seconds) {
  if (timerInterval) clearInterval(timerInterval);
  timerSecondsLeft = seconds;
  $('timer-dot').classList.add('active');
  renderTimer();

  timerInterval = setInterval(() => {
    timerSecondsLeft--;
    renderTimer();
    if (timerSecondsLeft <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      $('timer-dot').classList.remove('active');
      $('timer-display').textContent = '--:--:--';
      stopAllSounds();
    }
  }, 1000);
}

function renderTimer() {
  const h = Math.floor(timerSecondsLeft / 3600);
  const m = Math.floor((timerSecondsLeft % 3600) / 60);
  const s = timerSecondsLeft % 60;
  const pad = n => String(n).padStart(2, '0');
  $('timer-display').textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function stopAllSounds() {
  // Copiar lista para evitar mutación durante iteración
  const playing = sounds.filter(s => state[s.id] && state[s.id].playing);
  // Deduplicar por id
  const seen = new Set();
  playing.forEach(s => {
    if (!seen.has(s.id)) {
      seen.add(s.id);
      removeSound(s);
    }
  });
}

// ── MUTE ──────────────────────────────────────────────────────────────────
let isMuted = false;

function initMute() {
  const btn = $('mute-toggle');
  btn.addEventListener('click', toggleMute);
}

function toggleMute() {
  isMuted = !isMuted;
  const btn  = $('mute-toggle');
  const icon = $('mute-icon');

  btn.classList.toggle('muted', isMuted);
  btn.setAttribute('aria-pressed', isMuted);
  icon.className = isMuted ? 'ti ti-volume-off' : 'ti ti-volume';

  Object.values(state).forEach(st => {
    if (st.gainNode) {
      st.gainNode.gain.value = isMuted ? 0 : st.volume;
    }
  });
}