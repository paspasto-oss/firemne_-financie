const CACHE = 'financie-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});
self.addEventListener('fetch', e=>{
  const req = e.request;
  e.respondWith(
    caches.match(req).then(res=> res || fetch(req).then(net=>{
      // Cacheujeme iba same-origin; CDN pre XLSX pôjde z webu, čo je OK.
      if(req.method==='GET' && req.url.startsWith(self.location.origin)){
        const copy = net.clone();
        caches.open(CACHE).then(c=>c.put(req, copy));
      }
      return net;
    }).catch(()=>caches.match('./index.html')))
  );
});
