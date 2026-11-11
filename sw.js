// Guarda la app en la tablet para usarla sin internet y se actualiza sola.
// - El plano y las fotos se guardan en un depósito aparte ("mapa") que NO se borra al actualizar la app.
// - La página se pide a internet solo 2,5 s; si no hay buena señal abre al instante con lo guardado
//   y se actualiza por detrás. Al instalarse una versión nueva, la app se recarga sola.
const V='recoia-colonia-v11', MAP='recoia-mapa-1';
const CORE=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png','tiles.json'];
const esMapa=p=>/\/(tiles|img)\//.test(p);
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{
  const ks=await caches.keys(),old=ks.filter(k=>k!==V&&k!==MAP),m=await caches.open(MAP);
  for(const k of old){const c=await caches.open(k);   // pasar el plano ya descargado al depósito nuevo (no volver a bajarlo)
    for(const r of await c.keys())if(esMapa(new URL(r.url).pathname)&&!(await m.match(r))){const x=await c.match(r);if(x)await m.put(r,x);}
    await caches.delete(k);}
  await self.clients.claim();
  if(old.length){const cs=await self.clients.matchAll({type:'window'});cs.forEach(c=>{try{c.navigate(c.url);}catch(err){}});}
})());});
function timeout(p,ms){return new Promise((ok,no)=>{const t=setTimeout(()=>no(new Error('lento')),ms);p.then(r=>{clearTimeout(t);ok(r);},er=>{clearTimeout(t);no(er);});});}
async function avisar(d){(await self.clients.matchAll({type:'window'})).forEach(c=>c.postMessage(d));}
let bajando=null;
function precache(){if(!bajando)bajando=(async()=>{
  const m=await caches.open(MAP);
  let list;try{list=await (await timeout(fetch('tiles.json',{cache:'no-store'}),8000)).json();}
  catch(e){const x=await caches.match('tiles.json');if(!x){await avisar({t:'mapa',ok:0,total:0,sinRed:true});return;}list=await x.json();}
  const total=list.length,tengo=new Set((await m.keys()).map(r=>new URL(r.url).pathname));
  const base=new URL('./',self.registration.scope).pathname;
  let falta=list.filter(u=>!tengo.has(base+u));
  await avisar({t:'mapa',ok:total-falta.length,total});
  let ok=total-falta.length;
  for(let vuelta=0;vuelta<3&&falta.length;vuelta++){const fallo=[];
    for(let i=0;i<falta.length;i+=12){await Promise.all(falta.slice(i,i+12).map(async u=>{
      try{const r=await timeout(fetch(u),20000);if(!r.ok)throw 0;await m.put(u,r);ok++;}catch(e){fallo.push(u);}}));
      await avisar({t:'mapa',ok,total});}
    falta=fallo;}
  await avisar({t:'mapa',ok:total-falta.length,total,fin:true});
})().finally(()=>{bajando=null;});return bajando;}
self.addEventListener('message',e=>{if(e.data==='precache')e.waitUntil(precache());});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);if(u.origin!==location.origin)return;
  if(esMapa(u.pathname)){   // plano y fotos: siempre de lo guardado (instantáneo); si falta una pieza, pedirla sin quedarse colgado
    e.respondWith(caches.match(r,{ignoreSearch:true}).then(x=>x||timeout(fetch(r),4000).then(res=>{if(res.ok){const cp=res.clone();caches.open(MAP).then(c=>c.put(r,cp));}return res;})
      .catch(()=>new Response('',{status:504}))));return;}
  const red=fetch(r,{cache:'no-store'}).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp));}return res;});
  e.waitUntil(red.then(()=>{},()=>{}));   // aunque se abra con lo guardado, se sigue actualizando por detrás
  e.respondWith(timeout(red,2500).catch(()=>caches.match(r,{ignoreSearch:true}).then(x=>x||(r.mode==='navigate'?caches.match('index.html'):null)||red)));
});
