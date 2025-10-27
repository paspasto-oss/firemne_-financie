const CACHE = 'fin-pwa-v1';
const PRECACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(PRECACHE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))) .then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e=>{
  const req = e.request;
  const isHTML = req.headers.get('accept')?.includes('text/html');
  if (isHTML) {
    e.respondWith(
      fetch(req).then(res=>{ caches.open(CACHE).then(c=>c.put(req,res.clone())); return res; })
                .catch(()=>caches.match(req))
    );
  } else {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res=>{
        if (req.method==='GET' && res.status===200) caches.open(CACHE).then(c=>c.put(req,res.clone()));
        return res;
      }))
    );
  }
});
