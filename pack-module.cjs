const fs = require('node:fs');
const {gzipSync} = require('node:zlib');

const header = Buffer.from('TOOLBOX1\n', 'ascii');
const limit = 512 * 1024;

function packModule(moduleInput) {
  const payload = Buffer.from(JSON.stringify(moduleInput), 'utf8');
  if (payload.length > limit) throw Error('模組解壓後超過 512 KB');
  const archive = Buffer.concat([header, gzipSync(payload)]);
  if (archive.length > limit) throw Error('模組壓縮檔超過 512 KB');
  return archive;
}

if (require.main === module) {
  const [input, output] = process.argv.slice(2);
  try {
    if (!input || !output?.endsWith('.toolbox')) {
      throw Error('用法：node pack-module.cjs <模組 JSON> <輸出.toolbox>');
    }
    if (fs.statSync(input).size > limit) throw Error('模組 JSON 超過 512 KB');
    const manifest = JSON.parse(fs.readFileSync(input, 'utf8'));
    fs.writeFileSync(output, packModule(manifest), {flag: 'wx'});
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {packModule};
