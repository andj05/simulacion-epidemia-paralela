const { Worker } = require('worker_threads');
const path = require('path');

class SIRModelParallel {
  constructor(size = 1000, config = {}, numThreads = 4) {
    this.size = size;
    this.numThreads = numThreads;
    this.grid = Array(size).fill(null).map(() => Array(size).fill(0));
    
    // Parámetros del modelo
    this.beta = config.beta || 0.3;
    this.gamma = config.gamma || 0.1;
    this.delta = config.delta || 0.01;
    this.R0_radius = config.R0_radius || 1;
    
    // Estados
    this.SUSCEPTIBLE = 0;
    this.INFECTED = 1;
    this.RECOVERED = 2;
    this.DEAD = 3;
    
    // Estadísticas
    this.stats = {
      day: 0,
      susceptible: size * size,
      infected: 0,
      recovered: 0,
      dead: 0,
      newInfections: 0,
      cumulativeInfections: 0
    };
    
    this.history = [];
    
    // Dividir grilla en bloques para workers
    this.blockSize = Math.ceil(size / numThreads);
  }
  
  initialize(initialInfected = 10) {
    for (let i = 0; i < initialInfected; i++) {
      const x = Math.floor(Math.random() * this.size);
      const y = Math.floor(Math.random() * this.size);
      this.grid[x][y] = this.INFECTED;
    }
    
    // Contar estadísticas iniciales de forma simple
    this.updateStatsSync();
    this.saveHistory();
  }
  
  // Método síncrono para estadísticas (para inicialización)
  updateStatsSync() {
    let s = 0, i = 0, r = 0, d = 0;
    
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        const state = this.grid[x][y];
        if (state === this.SUSCEPTIBLE) s++;
        else if (state === this.INFECTED) i++;
        else if (state === this.RECOVERED) r++;
        else if (state === this.DEAD) d++;
      }
    }
    
    this.stats.susceptible = s;
    this.stats.infected = i;
    this.stats.recovered = r;
    this.stats.dead = d;
  }
  
  // Dividir grilla en bloques con ghost cells (células fantasma para bordes)
  getBlockWithGhostCells(blockIndex) {
    const startRow = blockIndex * this.blockSize;
    const endRow = Math.min(startRow + this.blockSize, this.size);
    
    // Incluir ghost cells: una fila arriba y una abajo
    const ghostStart = Math.max(0, startRow - this.R0_radius);
    const ghostEnd = Math.min(this.size, endRow + this.R0_radius);
    
    const block = [];
    for (let i = ghostStart; i < ghostEnd; i++) {
      block.push([...this.grid[i]]);
    }
    
    return {
      block,
      startRow,
      endRow,
      ghostStart,
      ghostEnd
    };
  }
  
  // Simular un día en paralelo
  async simulateDayParallel() {
    const promises = [];
    const workerResults = [];
    
    for (let i = 0; i < this.numThreads; i++) {
      const blockData = this.getBlockWithGhostCells(i);
      
      const promise = new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, 'worker.js'));
        
        worker.postMessage({
          block: blockData.block,
          startRow: blockData.startRow,
          endRow: blockData.endRow,
          ghostStart: blockData.ghostStart,
          size: this.size,
          beta: this.beta,
          gamma: this.gamma,
          delta: this.delta,
          R0_radius: this.R0_radius,
          SUSCEPTIBLE: this.SUSCEPTIBLE,
          INFECTED: this.INFECTED,
          RECOVERED: this.RECOVERED,
          DEAD: this.DEAD
        });
        
        worker.on('message', (result) => {
          workerResults[i] = result;
          worker.terminate();
          resolve();
        });
        
        worker.on('error', reject);
      });
      
      promises.push(promise);
    }
    
    // Esperar a que todos los workers terminen
    await Promise.all(promises);
    
    // Combinar resultados de todos los bloques
    this.mergeResults(workerResults);
  }
  
  // Combinar resultados de workers
  mergeResults(workerResults) {
    let totalNewInfections = 0;
    
    workerResults.forEach(result => {
      // Actualizar grilla
      for (let i = 0; i < result.updatedBlock.length; i++) {
        const globalRow = result.startRow + i;
        if (globalRow < this.size) {
          this.grid[globalRow] = result.updatedBlock[i];
        }
      }
      
      totalNewInfections += result.newInfections;
    });
    
    this.stats.day++;
    this.stats.newInfections = totalNewInfections;
    this.stats.cumulativeInfections += totalNewInfections;
  }
  
  // Reducción paralela de estadísticas globales
  async updateStatsParallel() {
    const promises = [];
    const statsResults = [];
    
    for (let i = 0; i < this.numThreads; i++) {
      const blockData = this.getBlockWithGhostCells(i);
      
      const promise = new Promise((resolve) => {
        const worker = new Worker(path.join(__dirname, 'stats_worker.js'));
        
        worker.postMessage({
          block: blockData.block,
          startRow: blockData.startRow,
          endRow: blockData.endRow,
          ghostStart: blockData.ghostStart,
          SUSCEPTIBLE: this.SUSCEPTIBLE,
          INFECTED: this.INFECTED,
          RECOVERED: this.RECOVERED,
          DEAD: this.DEAD
        });
        
        worker.on('message', (result) => {
          statsResults[i] = result;
          worker.terminate();
          resolve();
        });
      });
      
      promises.push(promise);
    }
    
    await Promise.all(promises);
    
    // Sumar estadísticas de todos los bloques
    this.stats.susceptible = statsResults.reduce((sum, s) => sum + s.susceptible, 0);
    this.stats.infected = statsResults.reduce((sum, s) => sum + s.infected, 0);
    this.stats.recovered = statsResults.reduce((sum, s) => sum + s.recovered, 0);
    this.stats.dead = statsResults.reduce((sum, s) => sum + s.dead, 0);
  }
  
  saveHistory() {
    this.history.push({...this.stats});
  }
  
  calculateR0() {
    if (this.stats.cumulativeInfections === 0) return 0;
    
    const recentHistory = this.history.slice(-7);
    if (recentHistory.length < 2) return 0;
    
    const totalNewInfections = recentHistory.reduce((sum, day) => sum + day.newInfections, 0);
    const avgInfected = recentHistory.reduce((sum, day) => sum + day.infected, 0) / recentHistory.length;
    
    return avgInfected > 0 ? totalNewInfections / avgInfected : 0;
  }
  
  async run(days = 365, callback = null) {
    console.log(`Iniciando simulación paralela con ${this.numThreads} threads por ${days} días...`);
    const startTime = Date.now();
    
    for (let day = 0; day < days; day++) {
      await this.simulateDayParallel();
      await this.updateStatsParallel();
      this.saveHistory();
      
      if (callback && day % 10 === 0) {
        callback(day, this.stats);
      }
      
      if (this.stats.infected === 0 && day > 10) {
        console.log(`Epidemia terminó en el día ${day}`);
        break;
      }
    }
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`Simulación paralela completada en ${duration.toFixed(2)} segundos`);
    
    return {
      duration,
      history: this.history,
      finalStats: this.stats,
      R0: this.calculateR0()
    };
  }
  
  exportToCSV() {
    const header = 'day,susceptible,infected,recovered,dead,newInfections,cumulativeInfections\n';
    const rows = this.history.map(h => 
      `${h.day},${h.susceptible},${h.infected},${h.recovered},${h.dead},${h.newInfections},${h.cumulativeInfections}`
    ).join('\n');
    
    return header + rows;
  }
}

module.exports = SIRModelParallel;