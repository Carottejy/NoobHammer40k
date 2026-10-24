/* Charge la vraie base Wahapedia sous Node (sans navigateur) pour les tests et l'exemple d'export. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
global.window = global; global.APP_VERSION = 'test';
global.document = {
  head: { appendChild(s) { const f = path.join(root, s.src.split('?')[0]); try { vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f }); setImmediate(() => s.onload && s.onload()); } catch (e) { setImmediate(() => s.onerror && s.onerror(e)); } } },
  createElement() { return {}; }
};
vm.runInThisContext(fs.readFileSync(path.join(root, 'wahapedia.js'), 'utf8'), { filename: 'wahapedia.js' });
const W = global.window.Wahap;
module.exports = { Wahap: W, root };
