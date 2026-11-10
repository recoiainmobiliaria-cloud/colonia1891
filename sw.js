// Guarda la app en la tablet para usarla sin internet
const V='recoia-colonia-v9';
const FILES=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png','tiles.json'];
self.addEventListener('install',e=>{e.waitUntil((async()=>{const c=await caches.open(V);await c.addAll(FILES);
  const list=await (await fetch('tiles.json',{cache:'no-store'})).json();
  for(let i=0;i<list.length;i+=40){await Promise.all(list.slice(i,i+40).map(u=>c.add(u).catch(()=>{})));}
  await self.skipWaiting();})());});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request).then(res=>{const cp=res.clone();caches.open(V).then(c=>c.put(e.request,cp));return res;}).catch(()=>caches.match('index.html'))));});
