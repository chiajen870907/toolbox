(async () => {
  const PAGE_URL = 'https://cdn.jsdelivr.net/gh/chiajen870907/toolbox@main/web/toolbox.html';
  const platform = typeof $prefs !== 'undefined' ? 'qx' : 'surge';
  const storage = platform === 'qx' ? $prefs : {
    valueForKey: key => $persistentStore.read(key),
    setValueForKey: (value, key) => $persistentStore.write(value, key),
    removeValueForKey: key => $persistentStore.write(null, key)
  };
  async function loadPage() {
    const key = 'qx_panel_web_v1';
    const cached = storage.valueForKey(key);
    try {
      const response = platform === 'qx'
        ? await $task.fetch({url: PAGE_URL, method: 'GET', opts: {timeout: 8}})
        : await new Promise((resolve, reject) => {
            $httpClient.get({url: PAGE_URL, timeout: 8}, (error, response, body) => {
              if (error) reject(error);
              else resolve({statusCode: response.status, body});
            });
          });
      const html = response.body;
      if (Number(response.statusCode) !== 200 || typeof html !== 'string' ||
          html.length > 524288 || !html.includes('<title>Toolbox</title>') ||
          html.split('__QX_BOOT__').length !== 2) throw Error('網頁格式不正確');
      storage.setValueForKey(html, key);
      return html;
    } catch (_) {
      if (cached) return cached;
      throw Error('無法下載 Toolbox 網頁，請確認網路後重新整理。');
    }
  }
  const REG='qx_panel_modules';
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  const read=(k,f)=>{try{const v=JSON.parse(storage.valueForKey(k)||'null');return v===null?f:v}catch(_){return f}};
  const write=(k,v)=>{if(!storage.setValueForKey(v,k))throw Error('無法儲存，請稍後再試。')};
  const reply=(body,type='application/json; charset=utf-8',status='HTTP/1.1 200 OK',extra={})=>{const response={status,headers:{'Content-Type':type,'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',...extra},body}; if(platform==='qx') $done(response); else $done({response:{...response,status:Number(status.split(' ')[1])}});};
  const ok=data=>reply(JSON.stringify({ok:true,data}));
  const fail=message=>reply(JSON.stringify({ok:false,message}),'application/json; charset=utf-8','HTTP/1.1 400 Bad Request');
  const safeJson=value=>JSON.stringify(value).replace(/</g,()=>String.fromCharCode(92)+'u003c').replace(new RegExp(String.fromCharCode(8232),'g'),()=>String.fromCharCode(92)+'u2028').replace(new RegExp(String.fromCharCode(8233),'g'),()=>String.fromCharCode(92)+'u2029');
  const boolean=v=>v===true||v===1||v==='true'||v==='1';
  const text=(v,max=200)=>typeof v==='string'?v.slice(0,max):'';
  function keyParts(id){
    if(typeof id!=='string'||id.length>180)throw Error('欄位識別碼不正確。');
    const parts=(id[0]==='@'?id.slice(1):id).split('.');
    if(parts.some(k=>!k||!/^[a-zA-Z0-9_-]+$/.test(k)||['__proto__','constructor','prototype'].includes(k))||/^(qx_panel_|chavy_boxjs_)/.test(parts[0]))throw Error('這個欄位名稱不能使用。');
    return id[0]==='@'?parts:[id];
  }
  const secret=field=>field.sensitive===true||/(cookie|token|password|secret|authorization|headers)/i.test(field.id);
  function preference(id){const parts=keyParts(id),raw=storage.valueForKey(parts[0]);if(parts.length===1)return raw;let v;try{v=JSON.parse(raw)}catch(_){return null}for(const part of parts.slice(1)){if(!v||typeof v!=='object'||!own(v,part))return null;v=v[part]}return v}
  const parseValue=(field,value)=>{if(value==null||value==='')return field.val;if(field.type==='boolean')return boolean(value);if(['number','slider'].includes(field.type))return Number(value);if(['selects','radios'].includes(field.type)){const item=field.items.find(i=>String(i.key)===String(value));return item?item.key:value}if(field.type==='checkboxes'){if(Array.isArray(value))return value;try{return JSON.parse(value)}catch(_){return []}}return value};
  const values=app=>Object.fromEntries(app.settings.map(f=>[f.id,parseValue(f,preference(f.id))]));
  function validateValue(f,v){
    if(f.type==='boolean'){if(typeof v!=='boolean')throw Error('請確認「'+f.name+'」的開關。')}
    else if(['number','slider'].includes(f.type)){if(typeof v!=='number'||!Number.isFinite(v)||(f.integer&&!Number.isInteger(v))||(f.min!=null&&v<f.min)||(f.max!=null&&v>f.max))throw Error('請確認「'+f.name+'」的數字。')}
    else if(['selects','radios'].includes(f.type)){if(!f.items.some(i=>i.key===v))throw Error('請確認「'+f.name+'」的選項。')}
    else if(f.type==='checkboxes'){if(!Array.isArray(v)||v.length>f.items.length||v.some(k=>!f.items.some(i=>i.key===k)))throw Error('請確認「'+f.name+'」的選項。')}
    else if(typeof v!=='string'||v.length>20000)throw Error('請確認「'+f.name+'」的內容。');
    return v;
  }
  function normalizeCondition(c,ids,depth=0){if(!c)return null;if(depth>4||typeof c!=='object'||Array.isArray(c))throw Error('欄位聯動設定不正確。');if(Array.isArray(c.all)){if(c.all.length>10)throw Error('欄位聯動設定過多。');return {all:c.all.map(x=>normalizeCondition(x,ids,depth+1))}}if(!ids.includes(c.id)||!['boolean','number','string'].includes(typeof c.value))throw Error('欄位聯動設定不正確。');return {id:c.id,value:c.value}}
  function normalizeApp(raw,packageId,packageName){
    if(!raw||typeof raw.id!=='string'||!/^[a-zA-Z0-9_.-]{1,100}$/.test(raw.id)||!raw.name||!Array.isArray(raw.settings)||raw.settings.length>100)throw Error('工具設定需要 id、name 與 settings。');
    const ids=raw.settings.map(f=>f.id);if(new Set(ids).size!==ids.length)throw Error('工具內有重複欄位。');
    const settings=raw.settings.map(f=>{
      keyParts(f.id);let type=f.type||'text';if(type==='modalSelects')type='selects';
      if(!['boolean','number','slider','text','textarea','selects','radios','checkboxes'].includes(type))throw Error('尚未支援「'+type+'」欄位。');
      const out={id:f.id,name:text(f.name,100)||f.id,type,desc:text(f.desc,500),section:text(f.section,80),readonly:f.readonly===true,sensitive:f.sensitive===true};
      if(['number','slider'].includes(type)){for(const k of ['min','max','step'])if(typeof f[k]==='number'&&Number.isFinite(f[k]))out[k]=f[k];out.integer=f.integer===true}
      if(['selects','radios','checkboxes'].includes(type)){if(!Array.isArray(f.items)||f.items.length>100)throw Error('選項欄位缺少 items。');out.items=f.items.map(i=>{if(!i||!['string','number'].includes(typeof i.key))throw Error('選項內容不正確。');return {key:i.key,label:text(i.label,100)||String(i.key)}})}
      const fallback=type==='boolean'?false:['number','slider'].includes(type)?0:type==='checkboxes'?[]:['selects','radios'].includes(type)?out.items[0]?.key:'';
      out.val=secret(out)?'':parseValue({...out,val:fallback},f.val===undefined?fallback:f.val);
      if(!secret(out))validateValue(out,out.val);
      out.showWhen=normalizeCondition(f.showWhen,ids);
      return out;
    });
    return {id:raw.id,name:text(raw.name,100),description:text(raw.description||raw.desc,800),packageId:text(packageId,100),packageName:text(packageName,100),settings};
  }
  function normalize(input){
    if(!input||typeof input!=='object'||Array.isArray(input))throw Error('請選擇工具的 JSON 設定檔。');
    const apps=Array.isArray(input.apps)?input.apps:[input];
    if(!apps.length||apps.length>20)throw Error('一次可匯入 1 到 20 個工具。');
    const out=apps.map(a=>normalizeApp(a,input.id||a.id,input.name||a.name));
    if(new Set(out.map(a=>a.id)).size!==out.length)throw Error('檔案內有重複工具。');return out;
  }
  const modules=()=>{const v=read(REG,[]);return Array.isArray(v)?v:[]};
  function appById(id){const app=modules().find(a=>a.id===id);if(!app)throw Error('找不到這個工具，請重新整理。');return app}
  function commit(entries){const old=entries.map(([k])=>[k,storage.valueForKey(k)]);try{for(const [k,v] of entries)write(k,v)}catch(error){for(const [k,v] of old){if(v==null)storage.removeValueForKey(k);else storage.setValueForKey(v,k)}throw error}}
  function valueEntries(app,input,includeSecrets=true,changes=new Map()){
    if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!app.settings.some(f=>f.id===k&&!f.readonly)))throw Error('設定內容不正確。');
    const next=values(app);
    for(const f of app.settings){if(f.readonly||!own(input,f.id)||(!includeSecrets&&secret(f)))continue;const v=validateValue(f,input[f.id]);next[f.id]=v;const parts=keyParts(f.id);if(parts.length===1){changes.set(parts[0],typeof v==='object'?JSON.stringify(v):String(v));continue}let root;try{root=JSON.parse(changes.has(parts[0])?changes.get(parts[0]):storage.valueForKey(parts[0])||'{}')}catch(_){root={}}if(!root||typeof root!=='object'||Array.isArray(root))root={};let target=root;for(const part of parts.slice(1,-1)){if(!own(target,part)||!target[part]||typeof target[part]!=='object'||Array.isArray(target[part]))target[part]={};target=target[part]}target[parts[parts.length-1]]=v;changes.set(parts[0],JSON.stringify(root))}
    return [...changes];
  }
  function publicApp(app){const current=values(app);return {...app,settings:app.settings.map(f=>({...f,value:secret(f)?'':current[f.id],sensitive:secret(f),hasSavedValue:secret(f)&&!!preference(f.id)}))}}
  const state=()=>({apps:modules().map(publicApp),version:'1.0'});
  try{
    const match=$request.url.match(/^(https?:\/\/[^/]+)(\/[^?#]*)?(?:\?([^#]*))?/);if(!match)throw Error('無法開啟此頁面。');const origin=match[1],path=match[2]||'/',query={};for(const part of(match[3]||'').split('&')){const i=part.indexOf('=');if(i>=0)query[decodeURIComponent(part.slice(0,i))]=decodeURIComponent(part.slice(i+1))}const method=String($request.method||'GET').toUpperCase();
    let token=storage.valueForKey('qx_panel_token');if(!token){token=Array.from({length:5},()=>Math.random().toString(36).slice(2)).join('');write('qx_panel_token',token)}
    if(method==='GET'&&path==='/api/state')return ok(state());
    if(method==='POST'&&path.startsWith('/api/')){
      const headers={};for(const k of Object.keys($request.headers||{}))headers[k.toLowerCase()]=$request.headers[k];if(headers['x-panel-token']!==token||(headers.origin&&headers.origin!==origin)||!/^application\/json\b/i.test(headers['content-type']||''))throw Error('頁面已過期，請重新整理。');if(typeof $request.body!=='string'||$request.body.length>524288)throw Error('檔案內容太大或格式不正確。');let input;try{input=JSON.parse($request.body)}catch(_){throw Error('請選擇有效的 JSON 檔案。')}
      if(path==='/api/modules/preview')return ok(normalize(input).map(a=>({id:a.id,name:a.name,fields:a.settings.length,replacing:modules().some(x=>x.id===a.id)})));
      if(path==='/api/modules/import'){const imported=normalize(input),list=modules().filter(a=>!imported.some(x=>x.id===a.id));if(list.length+imported.length>40)throw Error('最多可加入 40 個工具。');write(REG,JSON.stringify([...list,...imported]));return ok(state())}
      if(path==='/api/modules/remove'){appById(input.id);write(REG,JSON.stringify(modules().filter(a=>a.id!==input.id)));return ok(state())}
      if(path==='/api/settings'){const app=appById(input.appId);commit(valueEntries(app,input.values));return ok(publicApp(app))}
      throw Error('無法完成此操作。');
    }
    if(path.startsWith('/api/'))throw Error('無法完成此操作。');
    if(method!=='GET')throw Error('無法完成此操作。');
    const html=(await loadPage()).replace('__QX_BOOT__',()=>safeJson({token,state:state(),platform}));return reply(html,'text/html; charset=utf-8','HTTP/1.1 200 OK',{'Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"});
  }catch(error){fail(typeof error.message==='string'&&!/JSON|Unexpected|undefined|SyntaxError/.test(error.message)?error.message:'暫時無法讀取，請重新整理。')}
})();
