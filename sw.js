// Guarda la app en la tablet para usarla sin internet y se actualiza sola.
// La página se pide primero a internet (si hay señal) para traer siempre la versión nueva;
// el mapa y las fotos salen de lo guardado. Al instalarse una versión nueva, la app se recarga sola.
const V='recoia-colonia-v10';
const CORE=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png','tiles.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{
  const ks=await caches.keys(),old=ks.filter(k=>k!==V);
  await Promise.all(old.map(k=>caches.delete(k)));
  await self.clients.claim();
  if(old.length){const cs=await self.clients.matchAll({type:'window'});cs.forEach(c=>{try{c.navigate(c.url);}catch(err){}});}
})());});
async function precache(){for(const k of await caches.keys())if(k!==V)await caches.delete(k);const c=await caches.open(V);
  const list=await (await fetch('tiles.json',{cache:'no-store'})).json();
  for(let i=0;i<list.length;i+=30){await Promise.all(list.slice(i,i+30).map(async u=>{if(!(await c.match(u)))await c.add(u).catch(()=>{});}));}}
self.addEventListener('message',e=>{if(e.data==='precache')e.waitUntil(precache());});
function timeout(p,ms){return new Promise((ok,no)=>{const t=setTimeout(()=>no(new Error('lento')),ms);p.then(r=>{clearTimeout(t);ok(r);},er=>{clearTimeout(t);no(er);});});}
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);if(u.origin!==location.origin)return;
  const page=r.mode==='navigate'||/(\/|index\.html|tiles\.json|manifest\.webmanifest)$/.test(u.pathname);
  if(page){e.respondWith(timeout(fetch(r,{cache:'no-store'}),5000).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp));}return res;})
    .catch(()=>caches.match(r,{ignoreSearch:true}).then(x=>x||caches.match('index.html'))));return;}
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(x=>x||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp));}return res;})));
});
