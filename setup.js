// setup.js - Script para crear carpetas necesarias
const fs = require('fs');
const path = require('path');

const directories = [
  'src',
  'src/secuencial',
  'src/paralelo',
  'src/utils',
  'data',
  'resultados',
  'resultados/graficas',
  'resultados/animaciones'
];

console.log('🚀 Configurando estructura de carpetas...\n');

directories.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✓ Creada: ${dir}`);
  } else {
    console.log(`✓ Ya existe: ${dir}`);
  }
});

console.log('\n✅ ¡Setup completado! Las carpetas están listas.\n');