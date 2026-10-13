// Change CACHE after editing an application asset. Updates activate after old tabs close.
const PREFIX='little-life-lab-shell-';
const CACHE=PREFIX+'v1.0.0';
const ASSETS=['./','./index.html','./styles.css','./manifest.webmanifest','./js/app.js','./js/core.js','./js/db.js','./js/charts.js','./js/backup.js','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})()));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;const assetURLs=ASSETS.map(p=>new URL(p,self.registration.scope).href);if(event.request.mode==='navigate'&&url.href.startsWith(self.registration.scope)){event.respondWith(caches.open(CACHE).then(cache=>cache.match('./index.html')).then(hit=>hit||fetch(event.request)));return;}if(assetURLs.includes(url.href))event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request)).then(hit=>hit||fetch(event.request)));});
