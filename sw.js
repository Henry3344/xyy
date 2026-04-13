const CACHE = 'survival-english-v27';
const FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './sw.js',
  './js/showcard-words-data.js',
  './js/showcard-overrides.js',
  './js/phonetic-lexicon.js',
  './js/showcard.js',
  './js/phone-scripts.js',
  './js/banner-copy.js',
  './js/site-core.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
