const fs = require('fs');
const SIRModel = require('../secuencial/sir_model');
const SIRModelParallel = require('./sir_model_parallel');

const config = {
  size: 1000,
  days: 100, // Reducido para pruebas más rápidas
  initialInfected: 100,
  beta: 0.3,
  gamma: 0.1,
  delta: 0.01,
  R0_radius: 1
};

const threads = [1, 2, 4, 8];
const results = [];

async function runScalingTest() {
  console.log('=== Strong Scaling Test ===\n');
  
  // Versión secuencial (baseline)
  console.log('Ejecutando versión secuencial...');
  const seqModel = new SIRModel(config.size, config);
  seqModel.initialize(config.initialInfected);
  const seqResult = seqModel.run(config.days);
  
  results.push({
    threads: 1,
    type: 'secuencial',
    duration: seqResult.duration,
    speedup: 1.0,
    efficiency: 1.0
  });
  
  console.log(`Tiempo secuencial: ${seqResult.duration.toFixed(2)}s\n`);
  
  // Versiones paralelas
  for (const numThreads of threads) {
    console.log(`Ejecutando con ${numThreads} threads...`);
    
    const parallelModel = new SIRModelParallel(config.size, config, numThreads);
    parallelModel.initialize(config.initialInfected);
    const parallelResult = await parallelModel.run(config.days);
    
    const speedup = seqResult.duration / parallelResult.duration;
    const efficiency = speedup / numThreads;
    
    results.push({
      threads: numThreads,
      type: 'paralelo',
      duration: parallelResult.duration,
      speedup: speedup,
      efficiency: efficiency
    });
    
    console.log(`Tiempo: ${parallelResult.duration.toFixed(2)}s`);
    console.log(`Speed-up: ${speedup.toFixed(2)}x`);
    console.log(`Eficiencia: ${(efficiency * 100).toFixed(1)}%\n`);
  }
  
  // Guardar resultados en CSV
  const csvHeader = 'threads,type,duration,speedup,efficiency\n';
  const csvRows = results.map(r => 
    `${r.threads},${r.type},${r.duration.toFixed(4)},${r.speedup.toFixed(4)},${r.efficiency.toFixed(4)}`
  ).join('\n');
  
  fs.writeFileSync('data/tiempos_scaling.csv', csvHeader + csvRows);
  console.log('Resultados guardados en data/tiempos_scaling.csv');
  
  // Guardar resumen JSON
  fs.writeFileSync('data/scaling_results.json', JSON.stringify(results, null, 2));
  
  // Mostrar tabla de resultados
  console.log('\n=== Resumen de Resultados ===');
  console.table(results);
}

runScalingTest().catch(console.error);