// Build protegido completo: build+ofuscación → bytecode → stub temporal → electron-builder.
// El main.cjs original NUNCA queda guardado: se restaura al terminar (incluso si falla).
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const mainCjs = path.join(root, 'electron', 'main.cjs');
const backupCjs = path.join(root, 'electron', 'main.dev.cjs');

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  if (r.status !== 0) throw new Error(`Falló: ${cmd} ${args.join(' ')}`);
}

try {
  run('npm', ['run', 'build:protected']);                          // Capa 2
  run('npx', ['electron', 'scripts/compile-in-electron.cjs']);     // Capa 3
  fs.copyFileSync(mainCjs, backupCjs);
  fs.writeFileSync(mainCjs, "require('bytenode');\nrequire('./main.jsc');\n");
  run('npx', ['electron-builder', '--win', 'nsis', '--publish', 'never']); // Capas 1+4 vía afterPack
} finally {
  if (fs.existsSync(backupCjs)) {
    fs.copyFileSync(backupCjs, mainCjs);
    fs.unlinkSync(backupCjs);
    console.log('main.cjs original restaurado.');
  }
}
