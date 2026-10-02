/* Run: node tests/sw.test.js. Test the actual worker under two scopes. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
async function verify(scope){
  const events={},stores=new Map(),deleted=[];let claimed=0,skipped=0,network=0;
  const caches={open:async key=>{if(!stores.has(key))stores.set(key,new Map());const data=stores.get(key);return {addAll:async requests=>{requests.forEach(r=>data.set(r.url,{url:r.url,version:'test-version'}));},match:async request=>data.get(String(request.url||request))};},keys:async()=>[...stores.keys()],delete:async key=>{deleted.push(key);return stores.delete(key);}};
  stores.set('dog-food-old',new Map());stores.set('unrelated-cache',new Map());
  const self={location:{origin:new URL(scope).origin},registration:{scope},clients:{claim:async()=>claimed++},skipWaiting:()=>skipped++,addEventListener:(name,fn)=>events[name]=fn};
  const context=vm.createContext({self,caches,URL,Request,importScripts:()=>vm.runInContext("const APP_VERSION='test-version';",context),fetch:async()=>{network++;throw Error('offline');}});
  vm.runInContext(fs.readFileSync(require.resolve('../sw.js'),'utf8'),context);
  let pending;events.install({waitUntil:p=>pending=p});await pending;assert.equal(skipped,0);
  events.message({data:{type:'IGNORED'}});assert.equal(skipped,0);
  events.message({data:{type:'SKIP_WAITING'}});assert.equal(skipped,1);
  events.activate({waitUntil:p=>pending=p});await pending;assert.equal(claimed,1);assert.deepEqual(deleted,['dog-food-old']);assert(stores.has('unrelated-cache'));
  async function fetchPage(url,mode){let result;events.fetch({request:{url,mode,method:'GET'},respondWith:p=>result=p});return result&&await result;}
  assert.equal((await fetchPage(scope+'?install=1','navigate')).url,scope+'index.html');
  assert.equal((await fetchPage(scope+'?source=homescreen','navigate')).version,'test-version');
  for(const asset of ['style.css','version.js','products.js','core.js','app.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'])assert.equal((await fetchPage(scope+asset,'cors')).url,scope+asset);
  assert.equal(await fetchPage('https://other.example/app.js','cors'),undefined);
  assert.equal(await fetchPage(new URL('/outside.js',scope).href,'cors'),undefined);
  assert.equal(network,0);
  console.log('PASS offline assets, navigation, update message and cache cleanup: '+scope);
}
(async()=>{await verify('http://localhost:8765/');await verify('http://localhost:8766/ration-gina-usya/');})().catch(error=>{console.error(error);process.exitCode=1;});
