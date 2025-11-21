const fs = require('fs');
const os = require('os');
const SIRModelParallel = require('./sir_model_parallel');

// Configuración de la simulación
// src/paralelo/main_parallel.js

const config = {
  size: 1000,
  days: 600,            // Mismos 600 días
  initialInfected: 50,
  beta: 0.18,           
  gamma: 0.08,
  delta: 0.002,
  R0_radius: 1
};

// Detectar número de cores disponibles
const numCores = os.cpus().length;
const numThreads = Math.min(4, numCores); // Usar máximo 4 threads por defecto

console.log('=== Simulación SIR Paralela ===');
console.log(`Grilla: ${config.size}x${config.size}`);
console.log(`Población: ${config.size * config.size} personas`);
console.log(`Días: ${config.days}`);
console.log(`CPU Cores disponibles: ${numCores}`);
console.log(`Threads a usar: ${numThreads}`);
console.log('');

// Crear modelo paralelo
const model = new SIRModelParallel(config.size, config, numThreads);
model.initialize(config.initialInfected);

// Callback para mostrar progreso
const progressCallback = (day, stats) => {
  console.log(`Día ${day}: S=${stats.susceptible}, I=${stats.infected}, R=${stats.recovered}, D=${stats.dead}`);
};

// Ejecutar simulación
async function runSimulation() {
  try {
    const results = await model.run(config.days, progressCallback);
    
    // Mostrar resultados finales
    console.log('\n=== Resultados Finales ===');
    console.log(`Duración: ${results.duration.toFixed(2)} segundos`);
    console.log(`R0 estimado: ${results.R0.toFixed(2)}`);
    console.log(`Total infectados: ${results.finalStats.cumulativeInfections}`);
    console.log(`Fallecidos: ${results.finalStats.dead}`);
    console.log(`Recuperados: ${results.finalStats.recovered}`);
    
    // Guardar resultados en CSV
    const csv = model.exportToCSV();
    fs.writeFileSync('data/resultados_paralelo.csv', csv);
    console.log('\nResultados guardados en data/resultados_paralelo.csv');
    
    // Guardar configuración y métricas
    const summary = {
      config: {
        ...config,
        numThreads
      },
      duration: results.duration,
      R0: results.R0,
      finalStats: results.finalStats,
      peakInfected: Math.max(...results.history.map(h => h.infected)),
      peakDay: results.history.findIndex(h => h.infected === Math.max(...results.history.map(h => h.infected)))
    };
    
    fs.writeFileSync('data/summary_paralelo.json', JSON.stringify(summary, null, 2));
    console.log('Resumen guardado en data/summary_paralelo.json');
    
    // Comparar con versión secuencial si existe
    if (fs.existsSync('data/summary_secuencial.json')) {
      const seqSummary = JSON.parse(fs.readFileSync('data/summary_secuencial.json', 'utf8'));
      const speedup = seqSummary.duration / results.duration;
      const efficiency = (speedup / numThreads) * 100;
      
      console.log('\n=== Comparación con Versión Secuencial ===');
      console.log(`Tiempo secuencial: ${seqSummary.duration.toFixed(2)}s`);
      console.log(`Tiempo paralelo: ${results.duration.toFixed(2)}s`);
      console.log(`Speed-up: ${speedup.toFixed(2)}x`);
      console.log(`Eficiencia: ${efficiency.toFixed(1)}%`);
      
      // Validar que los resultados son similares
      const infectedDiff = Math.abs(seqSummary.finalStats.cumulativeInfections - results.finalStats.cumulativeInfections);
      const diffPercent = (infectedDiff / seqSummary.finalStats.cumulativeInfections) * 100;
      
      console.log(`\nDiferencia en infectados: ${diffPercent.toFixed(2)}%`);
      
      if (diffPercent < 5) {
        console.log('✅ Validación exitosa: resultados son consistentes');
      } else {
        console.log('⚠️  Advertencia: diferencia significativa en resultados');
      }
    }
    
  } catch (error) {
    console.error('❌ Error en la simulación:', error);
    process.exit(1);
  }
}

runSimulation();