// ── Catálogo de sonidos ───────────────────────────────────────────────────
// loop: true  → reproducción continua en bucle
// loop: false → reproducción aleatoria (suena al activar, luego a intervalos random)
// category: agrupa el sonido dentro del slider de categorías de la biblioteca
export const sounds = [

  { id: 'lluvia',  name: 'Lluvia',   icon: 'fa-solid fa-cloud-rain',    file: 'audios/lluvia-suave.wav',  loop: true,  category: 'Lluvia' },
  { id: 'sound_rain_light',  name: 'Lluvia suave',   icon: 'fa-solid fa-cloud-showers-heavy',    file: 'audios/sound_rain_light.ogg',  loop: true,  category: 'Lluvia' },
  { id: 'sound_rain_heavy',  name: 'Lluvia Fuerte',   icon: 'fa-solid fa-cloud-bolt',    file: 'audios/sound_rain_heavy.ogg',  loop: true,  category: 'Lluvia' },

  { id: 'sound_rain_leaves',  name: 'Lluvia sobre Hojas',   icon: 'fa-solid fa-cloud-showers-water',    file: 'audios/sound_rain_leaves.ogg',  loop: true,  category: 'Lluvia' },
  { id: 'sound_rain_metallic_sheets',  name: 'Lluvia sobre laminas de metal',   icon: 'fa-solid fa-cloud-showers-water',    file: 'audios/sound_rain_metallic_sheets.ogg',  loop: true,  category: 'Lluvia' },
  { id: 'sound_rain_roof',  name: 'Lluvia sobre techo',   icon: 'fa-solid fa-cloud-showers-water',    file: 'audios/sound_rain_roof.ogg',  loop: true,  category: 'Lluvia' },
  { id: 'sound_rain_tent',  name: 'Lluvia sobre carpa',   icon: 'fa-solid fa-cloud-showers-water',    file: 'audios/sound_rain_tent.ogg',  loop: true,  category: 'Lluvia' },
  { id: 'sound_rain_umbrella',  name: 'Lluvia sobre sombrilla',   icon: 'fa-solid fa-umbrella',    file: 'audios/sound_rain_umbrella.ogg',  loop: true,  category: 'Lluvia' },
  { id: 'sound_rain_window',  name: 'Lluvia sobre ventana',   icon: 'fa-solid fa-cloud-showers-water',    file: 'audios/sound_rain_window.ogg',  loop: true,  category: 'Lluvia' },
  { id: 'sound_rain_windshield',  name: 'Lluvia sobre parabrisas',   icon: 'fa-solid fa-cloud-showers-water',    file: 'audios/sound_rain_windshield.ogg',  loop: true,  category: 'Lluvia' },


  { id: 'viento',  name: 'Viento',   icon: 'fa-solid fa-wind',  file: 'audios/viento-suave.wav',  loop: true,  category: 'Naturaleza' },
  { id: 'sound_wind_polar',  name: 'Viento Polar',   icon: 'fa-solid fa-wind',  file: 'audios/sound_wind_polar.ogg',  loop: true,  category: 'Naturaleza' },
  { id: 'trueno',  name: 'Trueno',   icon: 'fa-solid fa-bolt',          file: 'audios/trueno2.wav',       loop: false, category: 'Naturaleza' },
  { id: 'olas',    name: 'Olas',     icon: 'fa-solid fa-water',         file: 'audios/olas.ogg',          loop: true,  category: 'Naturaleza' },
  { id: 'sound_waves_light',    name: 'Lago',     icon: 'fa-solid fa-water',    file: 'audios/sound_waves_light.ogg',  loop: true,  category: 'Naturaleza' },
  { id: 'fogata',  name: 'Fogata',   icon: 'fa-solid fa-fire',          file: 'audios/fogata.mp3',        loop: true,  category: 'Naturaleza' },
  { id: 'bosque',  name: 'Bosque',   icon: 'fa-solid fa-tree',          file: 'audios/forest.mp3',        loop: true,  category: 'Naturaleza' },
  { id: 'rio',     name: 'Río',      icon: 'fa-solid fa-droplet',       file: 'audios/river.mp3',         loop: true,  category: 'Naturaleza' },


  { id: 'buho',    name: 'Búho',     icon: 'fa-solid fa-feather',       file: 'audios/buho.mp3',          loop: false, category: 'Animales' },
  { id: 'buho2',   name: 'Búho 2',   icon: 'fa-solid fa-feather',       file: 'audios/buho2.mp3',         loop: false, category: 'Animales' },
  { id: 'lobo',    name: 'Lobo',     icon: 'fa-solid fa-dog',           file: 'audios/wolf.mp3',          loop: false, category: 'Animales' },
  { id: 'sound_birds',    name: 'Aves',     icon: 'fa-solid fa-dove',           file: 'audios/sound_birds.ogg',          loop: true , category: 'Animales' },
  { id: 'sound_birds_2',    name: 'Aves 2',     icon: 'fa-solid fa-dove',           file: 'audios/sound_birds_2.ogg',          loop: true, category: 'Animales' },
  { id: 'sound_birds_3',    name: 'Aves 3',     icon: 'fa-solid fa-dove',           file: 'audios/sound_birds_3.ogg',          loop: true, category: 'Animales' },
  { id: 'sound_cuckoo',    name: 'Cucutá',     icon: 'fa-solid fa-crow',           file: 'audios/sound_cuckoo.ogg',          loop: false, category: 'Animales' },
  { id: 'sound_seagull',    name: 'Gaviotas',     icon: 'fa-solid fa-crow',           file: 'audios/sound_seagulls.ogg',          loop: true, category: 'Animales' },
  { id: 'sound_crickets',    name: 'Grillos',     icon: 'fa-solid fa-locust',           file: 'audios/sound_crickets.ogg',          loop: true, category: 'Animales' },
  { id: 'sound_cicadas',    name: 'Cigarras',     icon: 'fa-solid fa-bugs',           file: 'audios/sound_cicadas.ogg',          loop: false, category: 'Animales' },
  { id: 'sound_frogs',    name: 'Ranas',     icon: 'fa-solid fa-frog',           file: 'audios/sound_frogs.ogg',          loop: true, category: 'Animales' },
  { id: 'sound_cat_purring',    name: 'Ronroneo de gato',     icon: 'fa-solid fa-cat',           file: 'audios/sound_cat_purring.ogg',          loop: true, category: 'Animales' },


  { id: 'sound_melody_calm',  name: 'Calma',   icon: 'fa-solid fa-wave-square',    file: 'audios/sound_melody_calm.ogg',  loop: true,  category: 'Melodías' },
  { id: 'sound_melody_galaxy',  name: 'Galaxia',   icon: 'fa-solid fa-star',    file: 'audios/sound_melody_galaxy.ogg',  loop: true,  category: 'Melodías' },
  { id: 'sound_melody_home',  name: 'Hogar',   icon: 'fa-solid fa-house',    file: 'audios/sound_melody_home.ogg',  loop: true,  category: 'Melodías' },
  { id: 'sound_melody_infinity',  name: 'Infinito',   icon: 'fa-solid fa-infinity',    file: 'audios/sound_melody_infinity.ogg',  loop: true,  category: 'Melodías' },
  { id: 'sound_melody_serenity',  name: 'Serenidad',   icon: 'fa-solid fa-moon',    file: 'audios/sound_melody_serenity.ogg',  loop: true,  category: 'Melodías' },
  { id: 'sound_melody_universe',  name: 'Universo',   icon: 'fa-brands fa-react',    file: 'audios/sound_melody_universe.ogg',  loop: true,  category: 'Melodías' },
  { id: 'universe2',    name: 'Universo 2',     icon: 'fa-brands fa-react',         file: 'audios/universe.mp3',           loop: true, category: 'Melodías' },


  { id: 'sound_airplane_interior',    name: 'Avión',     icon: 'fa-solid fa-plane',         file: 'audios/sound_airplane_interior.ogg',           loop: true, category: 'Ciudad' },
  { id: 'sound_car_interior',    name: 'Automovil',     icon: 'fa-solid fa-car',         file: 'audios/sound_car_interior.ogg',           loop: true, category: 'Ciudad' },
  { id: 'sound_train_interior',    name: 'Tren',     icon: 'fa-solid fa-train',         file: 'audios/sound_train_interior.ogg',           loop: true, category: 'Ciudad' },
  { id: 'sound_train_station',    name: 'Estación de tren',     icon: 'fa-solid fa-train',         file: 'audios/sound_train_station.ogg',           loop: true, category: 'Ciudad' },

  
  { id: 'sound_brown_noise',    name: 'Ruido de marrón',     icon: 'fa-solid fa-wave-square',         file: 'audios/sound_brown_noise.ogg',           loop: true, category: 'Otros' },
  { id: 'sound_pink_noise',    name: 'Ruido rosa',     icon: 'fa-solid fa-wave-square',         file: 'audios/sound_pink_noise.ogg',           loop: true, category: 'Otros' },
  { id: 'sound_green_noise',    name: 'Ruido verde',     icon: 'fa-solid fa-wave-square',         file: 'audios/sound_green_noise.ogg',           loop: true, category: 'Otros' },
  { id: 'sound_white_noise',    name: 'Ruido blanco',     icon: 'fa-solid fa-wave-square',         file: 'audios/sound_white_noise.ogg',           loop: true, category: 'Otros' },




]