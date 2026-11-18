const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {gzipSync} = require('node:zlib');
const {packModule} = require('./pack-module.cjs');
const code = fs.readFileSync('toolbox.js', 'utf8');
const html = fs.readFileSync('web/toolbox.html', 'utf8');
new vm.Script(html.match(/<script>([\s\S]*)<\/script>/)[1]);
const readModuleArchive = vm.runInNewContext(
  html.slice(html.indexOf('async function readModuleArchive'), html.indexOf('function archiveModuleSheet')) +
    '\nreadModuleArchive',
  {DecompressionStream, TextDecoder}
);

async function verifyArchiveLimits() {
  await assert.rejects(readModuleArchive(new Blob(['wrong'])), /不支援的/);
  await assert.rejects(readModuleArchive(new Blob(['TOOLBOX1\ntruncated'])), /無法解壓縮/);
  const oversized = new Blob(['TOOLBOX1\n', gzipSync(Buffer.alloc(512 * 1024 + 1, 32))]);
  await assert.rejects(readModuleArchive(oversized), /解壓後超過/);
}


async function verify(qx) {
  const store = new Map();
  const write = (value, key) => (store.set(key, value), true);
  let offline = false;
  const url = 'https://raw.githubusercontent.com/example/toolbox/main/module.json';
  let manifest = {id:'remote',name:'Remote',settings:[{id:'remote_demo',type:'text',val:'default'}]};
  const appScript = 'document.querySelector("main").textContent = window.toolboxData[0].name;';
  const bodyFor = url => {
    if (url.endsWith('/app.js')) return appScript;
    if (url.endsWith('/web/toolbox.html')) return html;
    return JSON.stringify(manifest);
  };
  async function request(path, data) {
    let result;
    const context = {
      $request: {url: 'https://toolbox.com' + path, method: data ? 'POST' : 'GET',
        headers: {'Content-Type':'application/json','X-Panel-Token':store.get('qx_panel_token')},
        body: data ? JSON.stringify(data) : undefined},
      $done: value => result = value.response || value
    };
    if (qx) {
      context.$prefs = {valueForKey:k=>store.get(k),setValueForKey:write,removeValueForKey:k=>store.delete(k)};
      context.$task = {fetch: async ({url}) => {if (offline) throw Error(); return {statusCode:200, body:bodyFor(url)}}};
    } else {
      context.$persistentStore = {read:k=>store.get(k),write};
      context.$httpClient = {get: ({url},cb)=>cb(offline ? Error() : null,{status:200},bodyFor(url))};
    }
    await vm.runInNewContext(code, context);
    return result.body;
  }
  assert.match(await request('/'), /<title>Toolbox<\/title>/);
  offline = true;
  assert.match(await request('/'), /<title>Toolbox<\/title>/);
  offline = false;
  const app = {id:'example',name:'Example',settings:[{id:'demo',type:'text',val:'default'}]};
  assert(JSON.parse(await request('/api/modules/import',app)).ok);
  assert(JSON.parse(await request('/api/settings',{appId:'example',values:{demo:'saved'}})).ok);
  assert.equal(JSON.parse(await request('/api/state')).data.apps[0].settings[0].value,'saved');
  const api = async (path, input) => JSON.parse(await request('/api/subscriptions/' + path, input));
  assert.equal((await api('preview', {url:'https://toolbox.com/module.json'})).ok, false);
  const preview = await api('preview', {url});
  assert.equal(preview.data.apps[0].id, 'remote');
  assert.equal((await api('add', {url, revision:'wrong'})).ok, false);
  assert((await api('add', {url, revision:preview.data.revision})).ok);
  assert(JSON.parse(await request('/api/settings',{appId:'remote',values:{remote_demo:'saved'}})).ok);
  assert((await api('toggle', {id:url, enabled:false})).data.apps.find(a => a.id === 'remote').disabled);
  manifest = {};
  assert.equal((await api('refresh', {id:url})).ok, false);
  manifest = {id:'remote',name:'Updated',settings:[{id:'remote_demo',type:'text',val:'default'}]};
  const refreshed = (await api('refresh', {id:url})).data.apps.find(a => a.id === 'remote');
  assert.equal(refreshed.name, 'Updated');
  assert.equal(refreshed.settings[0].value, 'saved');
  assert.equal((await api('remove', {id:url})).data.apps.length, 1);
  const pageManifest = {
    id:'example.pages', name:'Example pages', settings:[],
    source:'https://raw.githubusercontent.com/example/toolbox/main/pages/module.json',
    pages:[{id:'records',name:'紀錄'}]
  };
  const appId = pageManifest.id;
  const pageUrl = '/app/' + appId + '/records';
  assert.match(await request(pageUrl), /找不到模組頁面/);
  manifest = pageManifest;
  const remote = await api('preview', {url});
  assert((await api('add', {url, revision:remote.data.revision})).ok);
  assert.match(await request(pageUrl), /sandbox="allow-scripts"/);
  assert((await api('remove', {id:url})).ok);
  assert.equal(JSON.parse(await request('/api/modules/import', pageManifest)).ok, false);

  const local = {
    manifest: {...pageManifest, cookie:true, task:true},
    localFiles: {
      'app.js':appScript,
      'rewrite.conf':String.raw`^https:\/\/example\.com/ url script-request-header modules/example/cookie.js` + '\nhostname = example.com',
      'tasks.json':JSON.stringify({task:[{config:'30 6 * * * modules/example/task.js, tag=Example, enabled=false'}]})
    }
  };
  const mixed = {...local, localFiles:{...local.localFiles,
    'tasks.json':JSON.stringify({task:[{config:'30 6 * * * https://example.com/task.js, tag=Example, enabled=false'}]})
  }};
  assert.equal(JSON.parse(await request('/api/modules/import', mixed)).ok, false);
  const archiveInput = await readModuleArchive(new Blob([packModule(local)]));
  assert(JSON.parse(await request('/api/modules/preview', archiveInput)).ok);
  const installed = JSON.parse(await request('/api/modules/import', archiveInput));
  assert.equal(installed.data.apps.find(app => app.id === appId).pages[0].id, 'records');
  store.set('qx_panel_page_' + appId + ':records', JSON.stringify({
    source: 'local', data: [{name:'紀錄測試'}]
  }));
  offline = true;
  const modulePage = await request(pageUrl);
  assert.match(modulePage, /sandbox="allow-scripts"/);
  assert.match(modulePage, /紀錄測試/);
  assert.doesNotMatch(modulePage, /qx_panel_token|X-Panel-Token/);
  assert.match(await request('/app/' + appId + '/undeclared'), /找不到模組頁面/);
  assert(JSON.parse(await request('/api/modules/remove', {id:appId})).ok);
  assert.match(await request(pageUrl), /找不到模組頁面/);
}

Promise.all([verify(true),verify(false),verifyArchiveLimits()]).then(()=>console.log('QX and Surge-style runtime checks passed')).catch(e=>{console.error(e);process.exitCode=1});
