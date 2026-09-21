// Se ejecuta DENTRO de Electron para que el bytecode salga con la V8 exacta de Electron 28.
const path = require('path');
const bytenode = require('bytenode');

bytenode
  .compileFile({
    filename: path.join(__dirname, '..', 'electron', 'main.cjs'),
    output: path.join(__dirname, '..', 'electron', 'main.jsc'),
  })
  .then(() => {
    console.log('main.jsc compilado con el V8 de Electron.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error compilando main.jsc:', err);
    process.exit(1);
  });
