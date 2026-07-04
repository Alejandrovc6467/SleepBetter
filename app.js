// ── Catálogo de sonidos ───────────────────────────────────────────────────
// loop: true  → reproducción continua en bucle
// loop: false → reproducción aleatoria (suena al activar, luego a intervalos random)
// category: agrupa el sonido dentro del slider de categorías de la biblioteca
const sounds = [
  { id: 'lluvia',  name: 'Lluvia',   icon: 'ti-cloud-rain',    file: 'audios/lluvia-suave.wav',  loop: true,  category: 'Naturaleza' },
  { id: 'viento',  name: 'Viento',   icon: 'ti-wind',          file: 'audios/viento-suave.wav',  loop: true,  category: 'Naturaleza' },
  { id: 'trueno',  name: 'Trueno',   icon: 'ti-bolt',          file: 'audios/trueno2.wav',       loop: false, category: 'Naturaleza' },
  { id: 'buho',    name: 'Búho',     icon: 'ti-feather',       file: 'audios/buho.mp3',          loop: false, category: 'Animales' },
  { id: 'buho2',   name: 'Búho 2',   icon: 'ti-feather',       file: 'audios/buho2.mp3',         loop: false, category: 'Animales' },
  { id: 'olas',    name: 'Olas',     icon: 'ti-ripple',        file: 'audios/olas.ogg',          loop: true,  category: 'Agua' },
  { id: 'fogata',  name: 'Fogata',   icon: 'ti-flame',         file: 'audios/fogata.mp3',        loop: true,  category: 'Ambiente' },
  { id: 'bosque',  name: 'Bosque',   icon: 'ti-trees',         file: 'audios/forest.mp3',        loop: true,  category: 'Naturaleza' },
  { id: 'rio',     name: 'Río',      icon: 'ti-droplets',      file: 'audios/river.mp3',         loop: true,  category: 'Agua' },
  { id: 'lobo',    name: 'Lobo',     icon: 'ti-dog',           file: 'audios/wolf.mp3',          loop: false, category: 'Animales' },
  { id: 'universe',    name: 'Universo',     icon: 'ti-planet',         file: 'audios/universe.mp3',           loop: true, category: 'Espacio' },
]

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

// ── FAVORITOS (persistidos en localStorage) ───────────────────────────────
const FAVORITES_KEY = 'sleepbetter:favorites';
const DEFAULT_FAVORITES = ['lluvia', 'buho', 'buho2', 'trueno', 'fogata', 'lobo'];

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch (e) {
    console.warn('[SleepBetter] No se pudieron leer los favoritos guardados', e);
  }
  // Primera vez que se abre la app: usar favoritos por defecto y guardarlos
  const defaults = new Set(DEFAULT_FAVORITES);
  persistFavoritesSet(defaults);
  return defaults;
}

function persistFavoritesSet(set) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...set]));
  } catch (e) {
    console.warn('[SleepBetter] No se pudieron guardar los favoritos', e);
  }
}

const favorites = loadFavorites();
let favoritesGridEl = null; // referencia al grid de la página "Favoritos"

function toggleFavorite(id) {
  const wasFav = favorites.has(id);
  if (wasFav) {
    favorites.delete(id);
  } else {
    favorites.add(id);
  }
  persistFavoritesSet(favorites);
  renderFavoritesGrid();
  showToast(
    wasFav ? 'Eliminado de favoritos' : 'Agregado a favoritos',
    wasFav ? 'ti-heart-off' : 'ti-heart'
  );
}

function renderFavoritesGrid() {
  if (!favoritesGridEl) return;
  favoritesGridEl.innerHTML = '';

  const filtered = sounds.filter(s => favorites.has(s.id));

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state favorites-empty';
    empty.innerHTML = `
      <i class="ti ti-heart-off" aria-hidden="true"></i>
      <span>Mantén presionado un sonido para agregarlo aquí</span>
    `;
    favoritesGridEl.appendChild(empty);
    return;
  }

  filtered.forEach(s => favoritesGridEl.appendChild(createSoundButton(s)));
}

// ── Burbuja de aviso (toast) ───────────────────────────────────────────────
let _toastTimeout = null;
function showToast(message, icon = 'ti-heart') {
  const toast = $('fav-toast');
  if (!toast) return;
  toast.innerHTML = `<i class="ti ${icon}" aria-hidden="true"></i><span>${message}</span>`;
  toast.classList.add('visible');
  clearTimeout(_toastTimeout);
  _toastTimeout = setTimeout(() => {
    toast.classList.remove('visible');
  }, 1800);
}

function updatePlayingCount() {
  const count = Object.values(state).filter(s => s.playing).length;
  $('playing-count').textContent = count;
  $('empty-state').style.display = count === 0 ? 'flex' : 'none';
  const eq = $('eq-header');
  if (eq) eq.classList.toggle('active', count > 0);
}

// ── Categorías ────────────────────────────────────────────────────────────
// "Favoritos" siempre primero, luego cada categoría en orden de aparición en `sounds`
function getCategories() {
  const cats = [];
  sounds.forEach(s => {
    if (!cats.includes(s.category)) cats.push(s.category);
  });
  return ['Favoritos', ...cats];
}

// ── Crear un botón de sonido (usado en todas las páginas, incl. Favoritos) ─
// Presión larga (>2s) agrega/quita el sonido de favoritos.
// Click normal alterna la reproducción, salvo que la presión larga ya haya actuado.
function createSoundButton(s) {
  // Inicializar estado del sonido solo una vez (el sonido puede repetirse
  // entre "Favoritos" y su categoría correspondiente)
  if (!state[s.id]) {
    state[s.id] = { buffer: null, source: null, gainNode: null, playing: false, volume: 0.5, loading: false, randomTimeout: null };
  }

  const btn = document.createElement('button');
  btn.className = 'sound-btn' + (state[s.id].playing ? ' active' : '');
  btn.dataset.soundId = s.id;
  btn.setAttribute('aria-label', s.name);
  btn.innerHTML = `
    <div class="sound-circle">
      <i class="ti ${s.icon}" aria-hidden="true"></i>
    </div>
    <span class="sound-name">${s.name}</span>
  `;

  const LONG_PRESS_MS = 2000;
  const MOVE_CANCEL_PX = 10;
  let pressTimer = null;
  let longPressTriggered = false;
  let startX = 0, startY = 0;

  const clearPress = () => {
    clearTimeout(pressTimer);
    pressTimer = null;
  };

  btn.addEventListener('pointerdown', (e) => {
    longPressTriggered = false;
    startX = e.clientX;
    startY = e.clientY;
    pressTimer = setTimeout(() => {
      longPressTriggered = true;
      pressTimer = null;
      toggleFavorite(s.id);
      if (navigator.vibrate) navigator.vibrate(15);
    }, LONG_PRESS_MS);
  });

  btn.addEventListener('pointermove', (e) => {
    if (!pressTimer) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.sqrt(dx * dx + dy * dy) > MOVE_CANCEL_PX) clearPress();
  });

  btn.addEventListener('pointerup', clearPress);
  btn.addEventListener('pointerleave', clearPress);
  btn.addEventListener('pointercancel', clearPress);

  btn.addEventListener('click', () => {
    if (longPressTriggered) {
      longPressTriggered = false;
      return; // la presión larga ya gestionó el favorito, no reproducir/quitar sonido
    }
    toggleSound(s);
  });

  return btn;
}

// ── Construir slider de categorías + carrusel de páginas ──────────────────
function buildLibrary() {
  const slider = $('category-slider');
  const pagesContainer = $('category-pages');
  slider.innerHTML = '';
  pagesContainer.innerHTML = '';
  favoritesGridEl = null;

  const categories = getCategories();

  categories.forEach((cat, idx) => {
    // Pastilla de categoría
    const pill = document.createElement('button');
    pill.className = 'category-pill' + (idx === 0 ? ' active' : '');
    pill.type = 'button';
    pill.textContent = cat;
    pill.dataset.index = idx;
    pill.addEventListener('click', () => scrollToCategory(idx));
    slider.appendChild(pill);

    // Página del carrusel para esta categoría
    const page = document.createElement('div');
    page.className = 'category-page';
    page.dataset.index = idx;

    const grid = document.createElement('div');
    grid.className = 'sounds-grid';
    grid.dataset.category = cat;

    if (cat === 'Favoritos') {
      favoritesGridEl = grid;
    }

    const filtered = cat === 'Favoritos'
      ? sounds.filter(s => favorites.has(s.id))
      : sounds.filter(s => s.category === cat);

    if (cat === 'Favoritos' && filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state favorites-empty';
      empty.innerHTML = `
        <i class="ti ti-heart-off" aria-hidden="true"></i>
        <span>Mantén presionado un sonido para agregarlo aquí</span>
      `;
      grid.appendChild(empty);
    } else {
      filtered.forEach(s => grid.appendChild(createSoundButton(s)));
    }

    page.appendChild(grid);
    pagesContainer.appendChild(page);

    initCustomScrollbarFor(grid, page);
  });

  // Sincronizar la pastilla activa cuando el usuario desliza el carrusel manualmente
  pagesContainer.addEventListener('scroll', syncActivePillOnScroll, { passive: true });
}

// ── Ir a una categoría (por click en pastilla o programáticamente) ────────
function scrollToCategory(idx) {
  const pagesContainer = $('category-pages');
  const page = pagesContainer.querySelector(`.category-page[data-index="${idx}"]`);
  if (!page) return;
  pagesContainer.scrollTo({ left: page.offsetLeft, behavior: 'smooth' });
  setActivePill(idx);
}

let _scrollSyncRaf = null;
function syncActivePillOnScroll() {
  const pagesContainer = $('category-pages');
  cancelAnimationFrame(_scrollSyncRaf);
  _scrollSyncRaf = requestAnimationFrame(() => {
    const idx = Math.round(pagesContainer.scrollLeft / pagesContainer.clientWidth);
    setActivePill(idx);
  });
}

function setActivePill(idx) {
  document.querySelectorAll('.category-pill').forEach(p => {
    p.classList.toggle('active', parseInt(p.dataset.index, 10) === idx);
  });
  const activePill = document.querySelector(`.category-pill[data-index="${idx}"]`);
  if (activePill) {
    activePill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
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

// ── Animación de relámpago ────────────────────────────────────────────────
function lightningFlash() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  // Insertar dentro de hero-overlay para quedar bajo el rain-canvas y hero-content
  const overlay = hero.querySelector('.hero-overlay');
  const container = overlay || hero;

  const img = document.createElement('img');
  img.style.cssText = `
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 0;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0ms;
  `;
  container.insertBefore(img, container.firstChild);

  // Secuencia: trueno_uno → trueno_dos → trueno_uno → fade out
  // Duraciones (ms): cada frame visible + transición
  const frames = [
    { src: 'images/trueno_uno.jpg',  dur: 400  },
    { src: 'images/trueno_dos.jpg',  dur: 400  }, 
  ];

  let i = 0;

  function showFrame() {

    //esperar 2seg antes de mostrar el primer frame para que se vea el fade-in
   


    if (i >= frames.length) {
      // Fade out y eliminar
      img.style.transition = 'opacity 120ms ease-out';
      img.style.opacity = '0';
      setTimeout(() => img.remove(), 150);
      return;
    }
    img.src = frames[i].src;
    img.style.opacity = '1';
    const dur = frames[i].dur;
    i++;
    setTimeout(showFrame, dur);
  }

  setTimeout(showFrame, 1600);

 // showFrame();
}

// ── Reproducir el buffer una sola vez (sin loop) ──────────────────────────
function playOnce(s, flash) {
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

  // Animación de relámpago solo en la primera reproducción
  if (flash && s.id === 'trueno') lightningFlash();
}

// ── Programar la siguiente reproducción aleatoria ─────────────────────────
function scheduleRandom(s) {
  const st = state[s.id];
  if (!st.playing) return;

  const delay = pickRandomInterval() * 1000;

  st.randomTimeout = setTimeout(() => {
    if (!st.playing) return;
    playOnce(s, true);
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
    // Reproducción aleatoria: suena inmediatamente (con flash si aplica) y luego a intervalos random
    playOnce(s, true);
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
    if (s.id === 'lluvia') rain.start();
    if (s.id === 'buho' || s.id === 'buho2') owl.arrive();
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
  if (s.id === 'lluvia') rain.stop();
  if (s.id === 'buho' || s.id === 'buho2') {
    // Solo retirar si el otro búho tampoco está activo
    const otherOwl = s.id === 'buho' ? 'buho2' : 'buho';
    if (!state[otherOwl] || !state[otherOwl].playing) owl.leave();
  }
}

// ── Marcar círculo activo / inactivo ─────────────────────────────────────
// Un mismo sonido puede aparecer tanto en "Todos" como en su página de
// categoría, así que se actualizan todos los botones que lo representan.
function markActive(id, active) {
  document.querySelectorAll(`[data-sound-id="${id}"]`).forEach(btn => {
    btn.classList.toggle('active', active);
  });
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

  // El sonido recién activado aparece primero (izquierda)
  list.insertBefore(card, list.firstChild);
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

// ── Scrollbar "fantasma" para una página de la biblioteca ─────────────────
// Se instancia una vez por cada página del carrusel (una por categoría),
// ya que cada una tiene su propio grid con scroll vertical independiente.
function initCustomScrollbarFor(grid, wrap) {
  const thumb = document.createElement('div');
  thumb.className = 'custom-scrollbar-thumb';
  wrap.appendChild(thumb);

  let hideTimeout = null;

  function updateThumb() {
    const { scrollTop, scrollHeight, clientHeight } = grid;

    if (scrollHeight <= clientHeight) {
      thumb.classList.remove('visible');
      return;
    }

    const thumbHeight = Math.max((clientHeight / scrollHeight) * clientHeight, 28);
    const maxTop = clientHeight - thumbHeight;
    const thumbTop = (scrollTop / (scrollHeight - clientHeight)) * maxTop;

    thumb.style.height = `${thumbHeight}px`;
    thumb.style.top = `${thumbTop}px`;
  }

  function showThumb() {
    updateThumb();
    thumb.classList.add('visible');
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      thumb.classList.remove('visible');
    }, 900);
  }

  grid.addEventListener('scroll', showThumb, { passive: true });
  window.addEventListener('resize', updateThumb);
}

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildLibrary();
  updatePlayingCount();
  initRain();
  initOwl();
  initTimer();
  initMute();
});

// ── ANIMACIÓN DEL BÚHO ───────────────────────────────────────────────────
// Imágenes usadas:
//   buho-volando-alas-arriba.png  → sprite vuelo frame A
//   buho-volando-alas-abajo.png   → sprite vuelo frame B
//   buho-ojos-abiertos.png        → posado, ojos abiertos
//   buho-ojos-cerrados.png        → posado, ojos cerrados (parpadeo lento)
//
// Flujo: vuela derecha→izquierda hasta la banca → se posa → alterna ojos cada 5 s
//        al quitar el sonido, vuela hacia la derecha y desaparece

const owl = (() => {
  let el = null;           // <img> del búho
  let perchX = 0;          // posición X de la banca (% del ancho del hero)
  let perchY = 0;          // posición Y donde se posa
  let _flyInterval = null; // intervalo de aleteo durante vuelo
  let _blinkTimeout = null;// timeout de parpadeo posado
  let _phase = 'idle';     // 'idle' | 'flying-in' | 'perched' | 'flying-out'

  // Coordenadas exactas de la banca en el wallpaper original
  const IMG_W   = 2032;  // ancho original de wallpaper.jpg
  const IMG_H   = 1118;  // alto original de wallpaper.jpg
  const BENCH_X = 845;   // coordenada X de la banca en el original
  const BENCH_Y = 753;   // coordenada Y de la banca en el original
  const OWL_SIZE = 32;   // px, tamaño del sprite en pantalla

  function getHero() {
    return document.querySelector('.hero');
  }

  function createEl() {
    if (el) return;
    const hero = getHero();
    if (!hero) return;

    el = document.createElement('img');
    el.className = 'owl-sprite';
    el.style.cssText = `
      position: absolute;
      width: ${OWL_SIZE}px;
      height: ${OWL_SIZE}px;
      object-fit: contain;
      z-index: 0;
      pointer-events: none;
      image-rendering: pixelated;
      transition: opacity 0.3s ease;
      transform-origin: center center;
    `;
    el.src = 'buho-volando-alas-arriba.png';

    // Insertar directamente en .hero (fuera del overlay) para quedar sobre el rain-canvas
    hero.appendChild(el);
  }

  function removeEl() {
    if (el) {
      el.remove();
      el = null;
    }
  }

  /**
   * Replica exactamente la logica de CSS background-size:cover background-position:center
   * para mapear coordenadas del wallpaper original a pixeles en el hero.
   * cover: escala la imagen hasta que ambas dimensiones >= contenedor.
   * Escala = max(heroW/imgW, heroH/imgH). Luego centra.
   */
  function calcPerch() {
    const hero = getHero();
    if (!hero) return { x: 0, y: 0 };

    const heroW = hero.offsetWidth;
    const heroH = hero.offsetHeight;

    // Escala que aplica cover
    const scale = Math.max(heroW / IMG_W, heroH / IMG_H);

    // Imagen escalada
    const scaledW = IMG_W * scale;
    const scaledH = IMG_H * scale;

    // Offset de centrado (background-position: center)
    const offsetX = (heroW - scaledW) / 2;
    const offsetY = (heroH - scaledH) / 2;

    // Posicion en pantalla del punto de la banca
    const screenX = offsetX + BENCH_X * scale;
    const screenY = offsetY + BENCH_Y * scale;

    // Centrar sprite horizontalmente, alinear base al punto
    return {
      x: Math.round(screenX - OWL_SIZE / 2),
      y: Math.round(screenY - OWL_SIZE) + 1,
    };
  }

  // Ciclo de aleteo durante vuelo (alterna los dos frames)
  function startFlapCycle(intervalMs = 160) {
    let frame = 0;
    const frames = ['images/buho-volando-alas-arriba.png', 'images/buho-volando-alas-abajo.png'];
    stopFlapCycle();
    _flyInterval = setInterval(() => {
      if (!el) return;
      frame = (frame + 1) % 2;
      el.src = frames[frame];
    }, intervalMs);
  }

  function stopFlapCycle() {
    if (_flyInterval) { clearInterval(_flyInterval); _flyInterval = null; }
  }

  // Parpadeo lento en la banca
  function startBlinkCycle() {
    stopBlinkCycle();
    function blink() {
      if (!el || _phase !== 'perched') return;
      el.src = 'images/buho-ojos-cerrados.png';
      _blinkTimeout = setTimeout(() => {
        if (!el || _phase !== 'perched') return;
        el.src = 'images/buho-ojos-abiertos.png';
        _blinkTimeout = setTimeout(blink, 5000);
      }, 300); // ojos cerrados solo 300ms, luego abre y espera 5s
    }
    _blinkTimeout = setTimeout(blink, 5000); // primera vez espera 5s
  }

  function stopBlinkCycle() {
    if (_blinkTimeout) { clearTimeout(_blinkTimeout); _blinkTimeout = null; }
  }

  // Animación manual con requestAnimationFrame (sin CSS transition para control total)
  function animateFly({ fromX, fromY, toX, toY, duration, onDone, flip = false }) {
    if (!el) return;
    const start = performance.now();
    const dx = toX - fromX;
    const dy = toY - fromY;

    // Espejo horizontal según dirección
    el.style.transform = flip ? 'scaleX(-1)' : 'scaleX(1)';

    function step(now) {
      if (!el) return;
      const t = Math.min((now - start) / duration, 1);
      // Ease in-out suave
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      // Curva de vuelo leve: arco parabólico sutil
      const arc = Math.sin(t * Math.PI) * -20; // pico en el centro

      el.style.left = (fromX + dx * ease) + 'px';
      el.style.top  = (fromY + dy * ease + arc) + 'px';

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        onDone && onDone();
      }
    }
    requestAnimationFrame(step);
  }

  // ── API pública ──────────────────────────────────────────────────────────
  function arrive() {
    if (_phase === 'perched' || _phase === 'flying-in') return;

    _phase = 'flying-in';
    createEl();
    if (!el) return;

    const hero  = getHero();
    const perch = calcPerch();
    const startX = (hero ? hero.offsetWidth : 400) + 20; // fuera del borde derecho
    const startY = perch.y + 10;

    // Posición inicial: fuera de la pantalla, a la derecha
    el.style.left    = startX + 'px';
    el.style.top     = startY + 'px';
    el.style.opacity = '1';

    startFlapCycle(140);

    // Volar de derecha a izquierda hasta la banca
    animateFly({
      fromX:    startX,
      fromY:    startY,
      toX:      perch.x,
      toY:      perch.y,
      duration: 1800,
      flip:     true, // espejo para mirar a la izquierda durante vuelo
      onDone() {
        if (_phase !== 'flying-in') return;
        stopFlapCycle();
        _phase = 'perched';

        // Poner imagen posado
        el.style.transform = 'scaleX(1)'; // vuelve a mirar a la derecha
        el.src = 'images/buho-ojos-abiertos.png';
        startBlinkCycle();
      }
    });
  }

  function leave() {
    if (_phase === 'idle' || _phase === 'flying-out') return;

    _phase = 'flying-out';
    stopBlinkCycle();

    if (!el) return;

    const hero   = getHero();
    const perch  = calcPerch();
    const exitX  = (hero ? hero.offsetWidth : 400) + 20;
    const exitY  = perch.y - 20;

    el.style.transform = 'scaleX(1)'; // mirar a la derecha al salir
    startFlapCycle(130);

    animateFly({
      fromX:    perch.x,
      fromY:    perch.y,
      toX:      exitX,
      toY:      exitY,
      duration: 1400,
      flip:     false,
      onDone() {
        stopFlapCycle();
        _phase = 'idle';
        removeEl();
      }
    });
  }

  return { arrive, leave };
})();

// ── Animación de lluvia ───────────────────────────────────────────────────
// rain.start() / rain.stop() se llaman desde toggleSound / removeSound
// initOwl() no necesita setup adicional; el objeto owl es autocontenido.
function initOwl() { /* owl se inicializa al llamar owl.arrive() */ }

const rain = { running: false, _raf: null, fadeOpacity: 1, _fadeRaf: null };

function initRain() {
  const canvas = document.getElementById('rain-canvas');
  if (!canvas) return;
  const rainCtx = canvas.getContext('2d');

  let drops = [];

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
      drift:   speed * 0.18,
    };
  }

  function draw() {
    if (!rain.running && rain.fadeOpacity <= 0) {
      rainCtx.clearRect(0, 0, canvas.width, canvas.height);
      rain._raf = null;
      return;
    }

    rainCtx.clearRect(0, 0, canvas.width, canvas.height);

    drops.forEach(d => {
      rainCtx.beginPath();
      rainCtx.moveTo(d.x, d.y);
      rainCtx.lineTo(d.x + d.drift, d.y + d.len);
      rainCtx.strokeStyle = `rgba(174, 210, 255, ${d.opacity * rain.fadeOpacity})`;
      rainCtx.lineWidth   = d.width;
      rainCtx.lineCap     = 'round';
      rainCtx.stroke();

      d.y += d.speed;
      d.x += d.drift * 0.3;

      if (d.y > canvas.height + 20) {
        Object.assign(d, makeDroplet(false));
      }
    });

    rain._raf = requestAnimationFrame(draw);
  }

  rain.start = () => {
    if (rain.running) return;
    // Cancelar fade-out pendiente si el usuario reactiva rápido
    cancelAnimationFrame(rain._fadeRaf);
    rain.running = true;
    rain.fadeOpacity = 0;
    drops = Array.from({ length: drops.length || Math.floor((canvas.width / 480) * 80 + 40) }, () => makeDroplet(false));
    draw();

    // Fade-in suave en ~1500ms (simétrico al fade-out)
    const DURATION = 1500;
    const startTime = performance.now();

    function fadeIn(now) {
      if (!rain.running) return; // cancelado antes de terminar
      const progress = Math.min((now - startTime) / DURATION, 1);
      rain.fadeOpacity = progress;
      if (progress < 1) {
        rain._fadeRaf = requestAnimationFrame(fadeIn);
      } else {
        rain.fadeOpacity = 1;
        rain._fadeRaf = null;
      }
    }

    rain._fadeRaf = requestAnimationFrame(fadeIn);
  };

  rain.stop = () => {
    rain.running = false;
    // Fade-out suave en ~1500ms
    const DURATION = 1500;
    const start = performance.now();
    const startOpacity = rain.fadeOpacity;

    function fade(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / DURATION, 1);
      rain.fadeOpacity = startOpacity * (1 - progress);
      if (progress < 1) {
        rain._fadeRaf = requestAnimationFrame(fade);
      } else {
        rain.fadeOpacity = 0;
      }
    }

    rain._fadeRaf = requestAnimationFrame(fade);
  };

  resize();
  // No arrancamos draw() aquí — esperamos a que lluvia se active

  window.addEventListener('resize', () => {
    cancelAnimationFrame(rain._raf);
    rain._raf = null;
    resize();
    if (rain.running) draw();
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