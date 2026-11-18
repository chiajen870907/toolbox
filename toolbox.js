(async () => {
  const PAGE_URL = 'https://cdn.jsdelivr.net/gh/chiajen870907/toolbox@main/web/toolbox.html';
  const platform = typeof $prefs !== 'undefined' ? 'qx' : 'surge';
  const storage = platform === 'qx' ? $prefs : {
    valueForKey: key => $persistentStore.read(key),
    setValueForKey: (value, key) => $persistentStore.write(value, key),
    removeValueForKey: key => $persistentStore.write(null, key)
  };
  async function fetchResource(url) {
    if (platform === 'qx') {
      return $task.fetch({url, method: 'GET', opts: {timeout: 8, redirection: false}});
    }
    return new Promise((resolve, reject) => {
      $httpClient.get({url, timeout: 8, 'auto-redirect': false}, (error, response, body) => {
        if (error) reject(error);
        else resolve({statusCode: response.status, body});
      });
    });
  }
  async function loadPage() {
    const key = 'qx_panel_web_v1';
    const cached = storage.valueForKey(key);
    try {
      const response = await fetchResource(PAGE_URL);
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
  function normalizeApp(raw,packageId,packageName,source,local){
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
    const pages = raw.pages === undefined ? [] : raw.pages;
    if (!Array.isArray(pages) || pages.length > 20 || pages.some(page =>
      !page || typeof page.id !== 'string' || !/^[a-zA-Z0-9_-]{1,60}$/.test(page.id) ||
      typeof page.name !== 'string' || !page.name.trim()) ||
      new Set(pages.map(page => page.id)).size !== pages.length) throw Error('模組頁面宣告格式不正確。');
    const cookie = raw.cookie === true;
    const task = raw.task === true;
    const manifestUrl = source;
    if ((pages.length || cookie || task) && !local && !isManifestUrl(manifestUrl)) {
      throw Error('含腳本的模組請選擇本機模組檔案，或使用 HTTPS 訂閱。');
    }
    return {id:raw.id,name:text(raw.name,100),description:text(raw.description||raw.desc,800),
      packageId:text(packageId,100),packageName:text(packageName,100),settings,
      pages:pages.map(page => ({id:page.id,name:text(page.name,100)})),cookie,task,
      source:isManifestUrl(manifestUrl) ? manifestUrl : undefined};
  }
  function normalize(input, source, local){
    if(!input||typeof input!=='object'||Array.isArray(input))throw Error('請選擇工具的 JSON 設定檔。');
    const apps=Array.isArray(input.apps)?input.apps:[input];
    if(!apps.length||apps.length>20)throw Error('一次可匯入 1 到 20 個工具。');
    const out=apps.map(a=>normalizeApp(a,input.id||a.id,input.name||a.name,source,local));
    if(new Set(out.map(a=>a.id)).size!==out.length)throw Error('檔案內有重複工具。');return out;
  }
  function normalizeImport(input) {
    if (!input?.localFiles) return normalize(input);
    const {manifest, localFiles} = input;
    if (!localFiles || typeof localFiles !== 'object' || Array.isArray(localFiles)) {
      throw Error('本機模組檔案格式不正確。');
    }
    const apps = normalize(manifest, undefined, true);
    if (apps.length !== 1) throw Error('一次只能匯入一個含腳本的本機模組。');
    const app = apps[0];
    const resources = {mode: 'local'};
    if (app.pages.length) {
      const script = localFiles['app.js'];
      if (typeof script !== 'string' || !script.trim() || script.length > 131072) {
        throw Error('請選擇不超過 128 KB 的 app.js。');
      }
      resources.script = script;
    }
    if (app.cookie) {
      const rewrite = localFiles['rewrite.conf'];
      const lines = typeof rewrite === 'string' && rewrite.length <= 16384
        ? rewrite.split(/\r?\n/).map(line => line.trim()).filter(Boolean) : [];
      const rule = /^\^\S+\s+url\s+script-request-header\s+modules\/[a-zA-Z0-9_-]+\/cookie\.js$/;
      const hostname = /^hostname\s*=\s*[a-zA-Z0-9.-]+$/;
      if (lines.length !== 2 || !lines.some(line => rule.test(line)) ||
          !lines.some(line => hostname.test(line))) {
        throw Error('本機 rewrite.conf 須指定登入主機和本機 cookie.js。');
      }
      resources.rewrite = lines.join('\n');
    }
    if (app.task) {
      const gallery = localFiles['tasks.json'];
      let config;
      try {
        if (typeof gallery === 'string' && gallery.length <= 16384) config = JSON.parse(gallery).task[0].config;
      } catch (_) {}
      if (typeof config !== 'string' ||
          !/^(?:[0-9*,/-]+ ){5}modules\/[a-zA-Z0-9_-]+\/task\.js, tag=[^,\r\n=]+, enabled=(?:true|false)$/.test(config)) {
        throw Error('本機 tasks.json 須指定排程和本機 task.js。');
      }
      resources.taskConfig = config;
    }
    return [{...app, resources}];
  }
  function registry() {
    const stored = read(REG, []);
    if (Array.isArray(stored)) return {apps: stored, subscriptions: []};
    if (Array.isArray(stored.apps) && Array.isArray(stored.subscriptions)) return stored;
    return {apps: [], subscriptions: []};
  }
  const modules = () => registry().apps;
  function saveRegistry(next) {
    write(REG, JSON.stringify(next));
  }
  function mergeApps(current, imported, removedIds = []) {
    const remaining = current.filter(app =>
      !removedIds.includes(app.id) && !imported.some(next => next.id === app.id));
    if (remaining.length + imported.length > 40) throw Error('最多可加入 40 個工具。');
    return [...remaining, ...imported];
  }
  function isManifestUrl(url) {
    return typeof url === 'string' && url.length <= 2048 &&
      /^https:\/\/(?:raw\.githubusercontent\.com|cdn\.jsdelivr\.net)\/[a-z0-9_./@%+-]+\.json$/i.test(url);
  }
  function moduleAsset(app, name) {
    return app.source.slice(0, app.source.lastIndexOf('/') + 1) + name;
  }
  async function loadSubscription(url) {
    if (!isManifestUrl(url)) {
      throw Error('請使用 GitHub Raw 或 jsDelivr 的 HTTPS JSON 連結。');
    }
    let response;
    try {
      response = await fetchResource(url);
    } catch (_) {
      throw Error('無法連到訂閱來源，請稍後重試。');
    }
    if (Number(response.statusCode) !== 200 || typeof response.body !== 'string' ||
        response.body.length > 524288) throw Error('訂閱無法讀取或大於 512 KB。');
    let manifest;
    try {
      manifest = JSON.parse(response.body);
    } catch (_) {
      throw Error('訂閱設定檔格式不正確。');
    }
    const apps = normalize(manifest, url);
    return {url, name: text(manifest.name, 100) || apps[0].name, apps};
  }
  function saveSubscription(current, source, previous) {
    const appIds = source.apps.map(app => app.id);
    const owned = current.subscriptions.filter(sub => sub.id !== previous?.id).flatMap(sub => sub.appIds);
    if (appIds.some(id => owned.includes(id))) throw Error('應用已由其他訂閱來源管理。');
    const subscription = {
      id: source.url, url: source.url, name: source.name, appIds,
      enabled: previous?.enabled ?? true, updatedAt: Date.now()
    };
    saveRegistry({
      apps: mergeApps(current.apps, source.apps, previous?.appIds),
      subscriptions: [...current.subscriptions.filter(sub => sub.id !== subscription.id), subscription]
    });
  }
  async function subscriptionAction(action, input) {
    const previewKey = 'qx_panel_subscription_preview';
    if (action === 'preview') {
      const source = await loadSubscription(input.url);
      const revision = Date.now().toString(36) + Math.random().toString(36).slice(2);
      write(previewKey, JSON.stringify({source, revision, expires: Date.now() + 600000}));
      return {...source, revision, apps: source.apps.map(app => ({
        id: app.id, name: app.name, fields: app.settings.length, pages: app.pages, cookie: app.cookie, task: app.task
      }))};
    }
    const current = registry();
    const sub = current.subscriptions.find(item => item.id === (input.id || input.url));
    if (action === 'add') {
      const preview = read(previewKey, {});
      if (preview.revision !== input.revision || preview.source?.url !== input.url ||
          preview.expires < Date.now()) throw Error('預覽已失效，請重新載入訂閱。');
      saveSubscription(current, preview.source, sub);
      storage.removeValueForKey(previewKey);
    } else {
      if (!sub) throw Error('找不到訂閱來源。');
      if (action === 'refresh') {
        const source = await loadSubscription(sub.url);
        const latest = registry();
        const existing = latest.subscriptions.find(item => item.id === sub.id);
        if (JSON.stringify(existing) !== JSON.stringify(sub)) {
          throw Error('訂閱已變更，請重新整理後再試。');
        }
        saveSubscription(latest, source, existing);
      } else if (action === 'toggle') {
        sub.enabled = input.enabled === true;
        saveRegistry(current);
      } else if (action === 'remove') {
        saveRegistry({
          apps: current.apps.filter(app => !sub.appIds.includes(app.id)),
          subscriptions: current.subscriptions.filter(item => item.id !== sub.id)
        });
      } else throw Error('無法完成此操作。');
    }
    return state();
  }
  function appById(id){const app=modules().find(a=>a.id===id);if(!app)throw Error('找不到這個工具，請重新整理。');return app}
  function commit(entries){const old=entries.map(([k])=>[k,storage.valueForKey(k)]);try{for(const [k,v] of entries)write(k,v)}catch(error){for(const [k,v] of old){if(v==null)storage.removeValueForKey(k);else storage.setValueForKey(v,k)}throw error}}
  function valueEntries(app,input,includeSecrets=true,changes=new Map()){
    if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!app.settings.some(f=>f.id===k&&!f.readonly)))throw Error('設定內容不正確。');
    const next=values(app);
    for(const f of app.settings){if(f.readonly||!own(input,f.id)||(!includeSecrets&&secret(f)))continue;const v=validateValue(f,input[f.id]);next[f.id]=v;const parts=keyParts(f.id);if(parts.length===1){changes.set(parts[0],typeof v==='object'?JSON.stringify(v):String(v));continue}let root;try{root=JSON.parse(changes.has(parts[0])?changes.get(parts[0]):storage.valueForKey(parts[0])||'{}')}catch(_){root={}}if(!root||typeof root!=='object'||Array.isArray(root))root={};let target=root;for(const part of parts.slice(1,-1)){if(!own(target,part)||!target[part]||typeof target[part]!=='object'||Array.isArray(target[part]))target[part]={};target=target[part]}target[parts[parts.length-1]]=v;changes.set(parts[0],JSON.stringify(root))}
    return [...changes];
  }
  function publicApp(app) {
    const current = values(app);
    const {resources, ...publicFields} = app;
    const settings = app.settings.map(f => ({
      ...f, value:secret(f)?'':current[f.id], sensitive:secret(f), hasSavedValue:secret(f)&&!!preference(f.id)
    }));
    const local = resources?.mode === 'local'
      ? {rewrite:resources.rewrite, taskConfig:resources.taskConfig} : undefined;
    return {...publicFields, local, settings};
  }
  function state() {
    const current = registry();
    const disabled = current.subscriptions.filter(sub => !sub.enabled).flatMap(sub => sub.appIds);
    return {
      apps: current.apps.map(app => ({...publicApp(app), disabled: disabled.includes(app.id)})),
      subscriptions: current.subscriptions,
      version: '1.0'
    };
  }
  const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[character]);

  async function serveModulePage(appId, pageId) {
    const current = registry();
    const app = current.apps.find(item => item.id === appId);
    const page = app?.pages?.find(item => item.id === pageId);
    if (!page || (app.resources?.mode !== 'local' && !isManifestUrl(app.source)) ||
        current.subscriptions.some(sub => !sub.enabled && sub.appIds.includes(appId))) {
      return reply('找不到模組頁面。', 'text/plain; charset=utf-8', 'HTTP/1.1 404 Not Found');
    }
    let script = app.resources?.script;
    if (app.resources?.mode !== 'local') {
      const resource = await fetchResource(moduleAsset(app, 'app.js'));
      if (Number(resource.statusCode) !== 200) throw Error('無法載入模組頁面。');
      script = resource.body;
    }
    if (typeof script !== 'string' || script.length > 131072) throw Error('無法載入模組頁面。');
    const latest = registry();
    if (latest.subscriptions.some(sub => !sub.enabled && sub.appIds.includes(appId)) ||
        !latest.apps.some(item => item.id === appId && item.source === app.source && item.resources?.script === app.resources?.script &&
          item.pages?.some(entry => entry.id === pageId))) {
      return reply('找不到模組頁面。', 'text/plain; charset=utf-8', 'HTTP/1.1 404 Not Found');
    }
    const published = read('qx_panel_page_' + appId + ':' + pageId, null);
    const source = app.resources?.mode === 'local' ? 'local' : app.source;
    const data = published?.source === source ? published.data : null;
    const frame = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;unsafe-inline&#39;; style-src &#39;unsafe-inline&#39;; img-src data:; base-uri &#39;none&#39;; form-action &#39;none&#39;">' +
      '<style>:root{color-scheme:light dark}body{font:16px system-ui;margin:0}main{max-width:44rem;margin:auto;padding:1rem}input{font:inherit;padding:.5rem;width:min(100%,20rem)}article{border-bottom:1px solid #8886;padding:1rem 0;display:flow-root}h2{font-size:1.1rem;margin:0}img{width:5rem;height:5rem;object-fit:cover;float:left;margin-right:.8rem;border-radius:.5rem}</style>' +
      '<main></main><script>window.toolboxData=' + safeJson(data) +
      ';const entry=document.createElement("script");entry.textContent=' + safeJson(script) +
      ';document.body.append(entry);</script>';
    const title = escapeHtml(page.name);
    const html = '<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + title + '</title><style>:root{color-scheme:light dark}body{margin:0;font:16px system-ui}header{padding:1rem}iframe{width:100%;height:calc(100dvh - 4rem);border:0;display:block}</style>' +
      '<header><a href="/#/app/' + encodeURIComponent(appId) + '">返回應用設定</a> · ' + title + '</header>' +
      '<iframe sandbox="allow-scripts" title="' + title + '" srcdoc="' + escapeHtml(frame) + '"></iframe></html>';
    return reply(html, 'text/html; charset=utf-8', 'HTTP/1.1 200 OK', {
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    });
  }
  try{
    const match=$request.url.match(/^(https?:\/\/[^/]+)(\/[^?#]*)?(?:\?([^#]*))?/);if(!match||match[1]!=='https://toolbox.com')throw Error('無法開啟此頁面。');const origin=match[1],path=match[2]||'/',query={};for(const part of(match[3]||'').split('&')){const i=part.indexOf('=');if(i>=0)query[decodeURIComponent(part.slice(0,i))]=decodeURIComponent(part.slice(i+1))}const method=String($request.method||'GET').toUpperCase();
    let token=storage.valueForKey('qx_panel_token');if(!token){token=Array.from({length:5},()=>Math.random().toString(36).slice(2)).join('');write('qx_panel_token',token)}
    const modulePage = /^\/app\/([a-zA-Z0-9_.-]{1,100})\/([a-zA-Z0-9_-]{1,60})$/.exec(path);
    if (method === 'GET' && path.startsWith('/app/')) {
      if (modulePage) return await serveModulePage(modulePage[1], modulePage[2]);
      return reply('找不到模組頁面。', 'text/plain; charset=utf-8', 'HTTP/1.1 404 Not Found');
    }
    if(method==='GET'&&path==='/api/state')return ok(state());
    if(method==='POST'&&path.startsWith('/api/')){
      const headers={};for(const k of Object.keys($request.headers||{}))headers[k.toLowerCase()]=$request.headers[k];if(headers['x-panel-token']!==token||(headers.origin&&headers.origin!==origin)||!/^application\/json\b/i.test(headers['content-type']||''))throw Error('頁面已過期，請重新整理。');if(typeof $request.body!=='string'||$request.body.length>524288)throw Error('檔案內容太大或格式不正確。');let input;try{input=JSON.parse($request.body)}catch(_){throw Error('請選擇有效的 JSON 檔案。')}
      if(path==='/api/modules/preview')return ok(normalizeImport(input).map(a=>({id:a.id,name:a.name,fields:a.settings.length,pages:a.pages,cookie:a.cookie,task:a.task,replacing:modules().some(x=>x.id===a.id)})));
      if (path.startsWith('/api/subscriptions/')) {
        return ok(await subscriptionAction(path.slice('/api/subscriptions/'.length), input));
      }
      if (path === '/api/modules/import') {
        const current = registry();
        const imported = normalizeImport(input);
        const owned = current.subscriptions.flatMap(sub => sub.appIds);
        if (imported.some(app => owned.includes(app.id))) throw Error('請從訂閱來源更新這個應用。');
        saveRegistry({...current, apps: mergeApps(current.apps, imported)});
        return ok(state());
      }
      if (path === '/api/modules/remove') {
        const current = registry();
        appById(input.id);
        if (current.subscriptions.some(sub => sub.appIds.includes(input.id))) {
          throw Error('請從訂閱來源移除這個應用。');
        }
        saveRegistry({...current, apps: current.apps.filter(app => app.id !== input.id)});
        return ok(state());
      }
      if(path==='/api/settings'){const app=appById(input.appId);commit(valueEntries(app,input.values));return ok(publicApp(app))}
      throw Error('無法完成此操作。');
    }
    if(path.startsWith('/api/'))throw Error('無法完成此操作。');
    if(method!=='GET')throw Error('無法完成此操作。');
    const html=(await loadPage()).replace('__QX_BOOT__',()=>safeJson({token,state:state(),platform}));return reply(html,'text/html; charset=utf-8','HTTP/1.1 200 OK',{'Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"});
  }catch(error){fail(typeof error.message==='string'&&!/JSON|Unexpected|undefined|SyntaxError/.test(error.message)?error.message:'暫時無法讀取，請重新整理。')}
})();
