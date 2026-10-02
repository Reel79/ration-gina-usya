/* Чистые расчёты, проверка данных и неизменяемый оригинал. */
(function (root) {
  'use strict';
  const clone = x => JSON.parse(JSON.stringify(x));
  const original = {id:'original',name:'Старшая №Первый',items:[
    {product:'beef',grams:225},{product:'buckwheat',grams:185},{product:'pumpkin',grams:110},
    {product:'broccoli',grams:55},{product:'spinach',grams:55},{product:'olive',grams:27}
  ]};
  original.items.forEach(Object.freeze); Object.freeze(original.items); Object.freeze(original);
  const defaults = () => ({version:2,days:7,dogs:[
    {id:'gina',name:'Джина',portion:1000,standard:1000,step:50,weight:null,targetWeight:null,neutered:true,goal:'maintain'},
    {id:'usya',name:'Уся',portion:200,standard:200,step:10,weight:null,targetWeight:null,neutered:true,goal:'maintain'}
  ],recipes:[],selected:'original',yields:{},grainSettings:{},customProducts:[],legacyHandled:false});
  const products = s => [...root.DogProducts,...s.customProducts].map(p => ({...p,...(s.grainSettings[p.id] || {})}));
  const product = (s,id) => products(s).find(p => p.id === id);
  const recipe = s => s.selected === 'original' ? original : s.recipes.find(r => r.id === s.selected) || original;
  const kcal = p => p.coefficient ? p.kcal/p.coefficient : p.kcal;
  const spoonCalories = p => p.spoonGrams * p.kcal / 100;
  const BACKUP_INTERVAL = 14 * 24 * 60 * 60 * 1000;
  const backupDue = (meta,now=Date.now()) => meta.backupEnabled!==false && now-(meta.lastBackupReminder||meta.startedAt||now)>=BACKUP_INTERVAL;
  const portionImpact = (dogs,beforeDensity,afterDensity,beforePortions=dogs.map(d=>d.portion)) => dogs.map((d,i)=>{
    const before=beforePortions[i]*beforeDensity/100,after=d.portion*afterDensity/100;
    return {before,after,percent:(after/before-1)*100,portion:beforePortions[i]*beforeDensity/afterDensity};
  });
  const fingerprint = r => JSON.stringify(r.items);
  const estimate = r => Math.max(10,Math.round(r.items.reduce((n,i) => n+i.grams,0)/10)*10);
  const yieldInfo = (s,r=recipe(s)) => {
    const saved=s.yields[r.id], changed=!!saved && saved.fingerprint!==fingerprint(r);
    return {value:saved && !changed ? saved.value : estimate(r),saved,changed,estimated:!saved||changed};
  };
  const calculate = (s,r=recipe(s),total=s.dogs.reduce((n,d)=>n+d.portion,0)*s.days) => {
    const y=yieldInfo(s,r).value, energy=r.items.reduce((n,i)=>n+i.grams*kcal(product(s,i.product))/100,0), batches=total/y;
    return {total,y,energy,batches,density:energy/y*100,rows:r.items.map(i=>{
      const p=product(s,i.product), grams=i.grams*batches;
      return {...i,p,grams,dry:p.coefficient ? grams/p.coefficient : null,spoons:p.spoonGrams ? grams/p.spoonGrams : null};
    }),dogCalories:s.dogs.map(d=>d.portion*energy/y)};
  };
  const blocked = name => /(?:^|[^а-яёa-z])(лук[а-яё]*|чесно[а-яё]*|виноград[а-яё]*|изюм[а-яё]*|авокадо|шоколад[а-яё]*|какао|ксилит[а-яё]*|макадами[а-яё]*|гриб[а-яё]*|соль|соли|солёный|соленый|специ[а-яё]*|кофе[а-яё]*|алкогол[а-яё]*|свинин[а-яё]*|свин[а-яё]*|дрожж[а-яё]*|кости|костей|кост[ьи]|onions?|garlic|grapes?|raisins?|chocolate|xylitol|pork)(?=$|[^а-яёa-z])/iu.test(name) || /сыр[а-яё]*\s+речн|рыб[а-яё]*\s+жир|подсолнечн|сливочн[а-яё]*\s+масл/iu.test(name);
  const replacement = (s,index,id,mode='weight') => {
    const r=clone(recipe(s)), item=r.items[index], old=product(s,item.product), next=product(s,id);
    if(!next||next.category!==old.category) throw Error('Выберите продукт той же категории.');
    const grams=mode==='calories' ? item.grams*kcal(old)/kcal(next) : item.grams;
    const protein=old.category==='meat' && Math.abs(grams/item.grams-1)>0.3;
    r.items[index]={product:id,grams};
    return {r,grams,protein};
  };
  const gentle = () => ({id:'gentle-preview',name:'Щадящий',items:[{product:'turkey',grams:225},{product:'rice',grams:185},{product:'pumpkin',grams:110},{product:'zucchini',grams:55},{product:'pumpkin',grams:55},{product:'olive',grams:13.5}]});
  const target = d => {
    const w=['lose','gain'].includes(d.goal)?d.targetWeight:d.weight;
    if(!w||d.goal==='gentle') return null;
    const rer=70*Math.pow(w,0.75),low=rer*(d.goal==='lose'?1:d.goal==='gain'?1.2:d.neutered?1.6:1.8);
    return {low,high:d.goal==='gain'?rer*1.4:low};
  };
  const positive = (n,max=1000000) => typeof n==='number'&&Number.isFinite(n)&&n>=0.01&&n<=max;
  function validate(data) {
    const fail = () => {throw Error('Файл не подходит: проверьте, что это экспорт «Рациона Джины и Уси», версия 2, с допустимыми числами и продуктами.');};
    if(!data||data.version!==2||!Number.isInteger(data.days)||data.days<1||data.days>60||!Array.isArray(data.dogs)||data.dogs.length!==2||!Array.isArray(data.recipes)||data.recipes.length>100||!Array.isArray(data.customProducts)||data.customProducts.length>300) fail();
    const base=defaults(),s=clone(base);s.days=data.days;s.legacyHandled=!!data.legacyHandled;
    data.dogs.forEach((d,i)=>{
      if(!d||d.id!==base.dogs[i].id||!positive(d.portion,10000)||!positive(d.standard,10000)||!['maintain','lose','gain','gentle'].includes(d.goal)||typeof d.neutered!=='boolean')fail();
      for(const key of ['weight','targetWeight'])if(d[key]!==null&&!positive(d[key],200))fail();
      s.dogs[i]={...base.dogs[i],portion:d.portion,standard:d.standard,weight:d.weight,targetWeight:d.targetWeight,neutered:d.neutered,goal:d.goal};
    });
    const ids=new Set(root.DogProducts.map(p=>p.id));
    for(const p of data.customProducts){
      if(!p||typeof p.id!=='string'||!/^custom-[a-z0-9-]+$/i.test(p.id)||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>100||blocked(p.name)||!Object.keys(root.DogCategories).includes(p.category)||!positive(p.kcal,1000)||typeof p.note!=='string'||p.note.length>2000)fail();
      if(p.category==='grain'&&!positive(p.coefficient,20))fail();
      if(p.category==='oil'&&!positive(p.spoonGrams,30))fail();
      ids.add(p.id);s.customProducts.push({id:p.id,name:p.name,category:p.category,kcal:p.kcal,note:p.note,benefit:'Свой продукт',tags:'',...(p.category==='grain'?{coefficient:p.coefficient}:{}),...(p.category==='oil'?{spoonGrams:p.spoonGrams}:{})});
    }
    const recipeIds=new Set(['original']);
    for(const r of data.recipes){
      if(!r||typeof r.id!=='string'||!/^recipe-[a-z0-9-]+$/i.test(r.id)||recipeIds.has(r.id)||typeof r.name!=='string'||!r.name.trim()||r.name.length>100||!Array.isArray(r.items)||r.items.length<1||r.items.length>30)fail();
      for(const i of r.items)if(!i||!ids.has(i.product)||!positive(i.grams,100000))fail();
      recipeIds.add(r.id);s.recipes.push({id:r.id,name:r.name,items:r.items.map(i=>({product:i.product,grams:i.grams}))});
    }
    if(!recipeIds.has(data.selected))fail();s.selected=data.selected;
    for(const [id,v] of Object.entries(data.yields||{})){
      if(!recipeIds.has(id)||!v||!positive(v.value,100000)||typeof v.date!=='string'||!/^\d{4}-\d{2}-\d{2}/.test(v.date)||typeof v.fingerprint!=='string'||v.fingerprint.length>10000)fail();
      s.yields[id]={value:v.value,date:v.date,fingerprint:v.fingerprint};
    }
    for(const [id,v] of Object.entries(data.grainSettings||{})){
      const p=product(s,id);if(!p||!p.coefficient||!v||!positive(v.coefficient,20)||!positive(v.kcal,1000))fail();
      s.grainSettings[id]={coefficient:v.coefficient,kcal:v.kcal};
    }
    if(data.replacementImpact!=null){
      const v=data.replacementImpact;
      if(!v||!recipeIds.has(v.recipeId)||typeof v.fingerprint!=='string'||v.fingerprint.length>10000||!positive(v.beforeDensity,100000)||!Array.isArray(v.beforePortions)||v.beforePortions.length!==2||!v.beforePortions.every(p=>positive(p,10000)))fail();
      s.replacementImpact={recipeId:v.recipeId,fingerprint:v.fingerprint,beforeDensity:v.beforeDensity,beforePortions:[...v.beforePortions]};
    }
    return s;
  }
  root.DogCore={clone,original,defaults,products,product,recipe,kcal,spoonCalories,backupDue,portionImpact,fingerprint,estimate,yieldInfo,calculate,blocked,replacement,gentle,target,validate,positive};
})(globalThis);
