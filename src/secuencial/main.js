const fs = require('fs');
const SIRModel = require('./sir_model');

// Configuración de la simulación

// Configuración "Endémica" (Tipo COVID-19 en RD)
const config = {
  size: 1000,           // 1 Millón de celdas (personas)
  days: 600,            // Aumentamos a 600 días para ver 2 años aprox
  initialInfected: 50,  // Empezamos con pocos para arranque lento
  
  // AJUSTE DE MODELO MATEMÁTICO:
  // Beta bajo + Gamma bajo = Epidemia lenta y larga
  beta: 0.18,           // Contagio moderado (antes 0.3)
  gamma: 0.08,          // Recuperación lenta (la gente dura más tiempo enferma)
  delta: 0.002,         // Mortalidad realista baja (0.2%)
  R0_radius: 1          
};

console.log('=== Simulación SIR Secuencial ===');
console.log(`Grilla: ${config.size}x${config.size}`);
console.log(`Población: ${config.size * config.size} personas`);
console.log(`Días: ${config.days}`);
console.log('');

// Crear modelo
const model = new SIRModel(config.size, config);
model.initialize(config.initialInfected);

// Callback para mostrar progreso
const progressCallback = (day, stats) => {
  console.log(`Día ${day}: S=${stats.susceptible}, I=${stats.infected}, R=${stats.recovered}, D=${stats.dead}`);
};

// Ejecutar simulación
const results = model.run(config.days, progressCallback);

// Mostrar resultados finales
console.log('\n=== Resultados Finales ===');
console.log(`Duración: ${results.duration.toFixed(2)} segundos`);
console.log(`R0 estimado: ${results.R0.toFixed(2)}`);
console.log(`Total infectados: ${results.finalStats.cumulativeInfections}`);
console.log(`Fallecidos: ${results.finalStats.dead}`);
console.log(`Recuperados: ${results.finalStats.recovered}`);

// Guardar resultados en CSV
const csv = model.exportToCSV();
fs.writeFileSync('data/resultados_secuencial.csv', csv);
console.log('\nResultados guardados en data/resultados_secuencial.csv');

// Guardar configuración y métricas
const summary = {
  config,
  duration: results.duration,
  R0: results.R0,
  finalStats: results.finalStats,
  peakInfected: Math.max(...results.history.map(h => h.infected)),
  peakDay: results.history.findIndex(h => h.infected === Math.max(...results.history.map(h => h.infected)))
};

fs.writeFileSync('data/summary_secuencial.json', JSON.stringify(summary, null, 2));
console.log('Resumen guardado en data/summary_secuencial.json');