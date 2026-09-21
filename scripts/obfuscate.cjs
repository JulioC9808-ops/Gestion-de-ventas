// Ofusca el JS del renderer tras vite build. Config conservadora:
// no rompe React/Vite ni imports dinámicos. El preload NO se toca aquí.
const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const dir = path.join(__dirname, '..', 'dist', 'assets');
const config = {
  compact: true,
  target: 'browser',
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.8,
  splitStrings: true,
  splitStringsChunkLength: 8,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  selfDefending: false,
  renameGlobals: false,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
};

let count = 0;
for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith('.js')) continue;
  const full = path.join(dir, file);
  const out = JavaScriptObfuscator.obfuscate(fs.readFileSync(full, 'utf8'), config).getObfuscatedCode();
  fs.writeFileSync(full, out);
  count++;
  console.log('Ofuscado:', file);
}
console.log(`Listo: ${count} archivo(s) ofuscado(s).`);
