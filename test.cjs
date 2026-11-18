const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync('toolbox.js', 'utf8');
const html = fs.readFileSync('web/toolbox.html', 'utf8');
new vm.Script(html.match(/<script>([\s\S]*)<\/script>/)[1]);

async function verify(qx) {
  const store = new Map();
  const write = (value, key) => (store.set(key, value), true);
  let offline = false;
  async function request(path, data) {
    let result;
    const context = {
      $request: {url: 'https://toolbox.test' + path, method: data ? 'POST' : 'GET',
        headers: {'Content-Type':'application/json','X-Panel-Token':store.get('qx_panel_token')},
        body: data ? JSON.stringify(data) : undefined},
      $done: value => result = value.response || value
    };
    if (qx) {
      context.$prefs = {valueForKey:k=>store.get(k),setValueForKey:write,removeValueForKey:k=>store.delete(k)};
      context.$task = {fetch: async () => {if (offline) throw Error(); return {statusCode:200, body:html}}};
    } else {
      context.$persistentStore = {read:k=>store.get(k),write};
      context.$httpClient = {get: (_,cb)=>cb(offline ? Error() : null,{status:200},html)};
    }
    await vm.runInNewContext(code, context);
    return result.body;
  }
  assert.match(await request('/'), /<title>Toolbox<\/title>/);
  offline = true;
  assert.match(await request('/'), /<title>Toolbox<\/title>/);
  const app = {id:'example',name:'Example',settings:[{id:'demo',type:'text',val:'default'}]};
  assert(JSON.parse(await request('/api/modules/import',app)).ok);
  assert(JSON.parse(await request('/api/settings',{appId:'example',values:{demo:'saved'}})).ok);
  assert.equal(JSON.parse(await request('/api/state')).data.apps[0].settings[0].value,'saved');
}

Promise.all([verify(true),verify(false)]).then(()=>console.log('QX and Surge-style runtime checks passed')).catch(e=>{console.error(e);process.exitCode=1});
