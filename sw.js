/* Версия генерируется tools/build.py из содержимого файлов. */
importScripts('./version.js');
const CACHE='dog-food-'+APP_VERSION;
const ASSETS=['./','./index.html','./style.css','./version.js','./products.js','./core.js','./app.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
const assetUrls=new Set(ASSETS.map(asset=>new URL(asset,self.registration.scope).href));
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(asset=>new Request(new URL(asset,self.registration.scope),{cache:'reload'})))));
});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('dog-food-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
  // Одна версия HTML и скриптов до явного нажатия «Обновить».
  if(event.request.mode==='navigate'){
    event.respondWith(caches.open(CACHE).then(cache=>cache.match(new URL('./index.html',self.registration.scope))).then(cached=>cached||fetch(event.request)));
  }else if(assetUrls.has(url.href)){
    event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request)).then(cached=>cached||fetch(event.request)));
  }
});
