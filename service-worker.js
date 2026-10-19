/* ==========================================================================
   SERVICE WORKER — hace la app instalable, la deja abrir sin conexión y
   permite que las apps ya instaladas se actualicen solas.
   • páginas, CSS y JS: primero la red, así los cambios se ven apenas se abre la
     app; la copia guardada solo se usa sin conexión o con la red muy lenta
   • imágenes y los iconos del CDN (Font Awesome): se sirven de la copia guardada
     y se refrescan en segundo plano
   • audios y todo lo demás: los maneja el navegador

   VERSIONES (cómo llegan los cambios a quien ya tiene la app instalada)
   • Basta con subir los archivos: la próxima vez que se abra la app con conexión
     ya carga lo nuevo.
   • Sube CACHE (v1 → v2 → v3…) para que además se actualicen las apps que están
     abiertas, y siempre que renombres o elimines archivos. El navegador nota que
     este archivo cambió, instala la versión nueva, borra las copias viejas y la
     app se recarga sola (ver initUpdates en app.js).
   ========================================================================== */
const CACHE = "sleepbetter-v1";

// Font Awesome: si cambias su versión en index.html, cámbiala aquí también
const FA = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/";
const SHELL = [
  "./", "index.html", "styles.css", "app.js", "sounds.js", "manifest.json",
  "images/icon192.png", "images/icon512.png", "images/wallpaper.jpg",
  // sprites del búho
  "images/buho-ojos-abiertos.png", "images/buho-ojos-cerrados.png",
  "images/buho-volando-alas-abajo.png", "images/buho-volando-alas-arriba.png",
  // iconos de toda la app y sus tipografías
  FA + "css/all.min.css", FA + "webfonts/fa-solid-900.woff2",
  FA + "webfonts/fa-regular-400.woff2", FA + "webfonts/fa-brands-400.woff2",
];
const CDN_HOSTS = ["cdnjs.cloudflare.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // "reload": trae cada archivo del servidor y no de la caché HTTP, para que la copia guardada sea la versión nueva
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(new Request(url, { cache: "reload" })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// opaque = la hoja de estilos del CDN pedida sin CORS; su estado queda oculto pero es seguro guardarla
const keep = (cache, req, res) => {
  if (res.status === 200 || res.type === "opaque") cache.put(req, res.clone()).catch(() => {});
  return res;
};

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  // "no-cache": se pregunta al servidor en cada carga. Los archivos de la app no llevan hash en el nombre (app.js, styles.css…),
  // así que sin esto el navegador podría mostrar primero la copia de su caché HTTP y los cambios tardarían en verse
  const fresh = fetch(req, { cache: "no-cache" }).then((res) => keep(cache, req, res));
  fresh.catch(() => {}); // la copia de abajo puede responder primero; que este rechazo no quede sin manejar
  const tooSlow = new Promise((_, giveUp) => setTimeout(giveUp, 4000));
  try {
    return await Promise.race([fresh, tooSlow]);
  } catch {
    const nav = req.mode === "navigate"; // ignora parámetros tipo ?utm=… para que la página guardada igual abra
    return (await cache.match(req, { ignoreSearch: nav })) || (nav && (await cache.match("./"))) || fresh;
  }
}

async function savedFirst(req) {
  const cache = await caches.open(CACHE);
  const saved = await cache.match(req);
  const fresh = fetch(req).then((res) => keep(cache, req, res));
  fresh.catch(() => {});
  return saved || fresh;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || req.headers.has("range")) return; // la caché no puede guardar respuestas parciales
  const url = new URL(req.url);
  if (CDN_HOSTS.includes(url.hostname)) return e.respondWith(savedFirst(req));
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes("/audios/")) return; // pesan ~80 MB: se los dejamos al navegador
  e.respondWith(req.destination === "image" ? savedFirst(req) : networkFirst(req));
});
