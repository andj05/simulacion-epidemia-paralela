class SIRModel {
  constructor(size = 1000, config = {}) {
    this.size = size;
    this.grid = Array(size).fill(null).map(() => Array(size).fill(0));
    
    // Parámetros del modelo
    this.beta = config.beta || 0.3;      // Probabilidad de contagio
    this.gamma = config.gamma || 0.1;    // Probabilidad de recuperación
    this.delta = config.delta || 0.01;   // Probabilidad de muerte
    this.R0_radius = config.R0_radius || 1; // Radio de contacto
    
    // Estados: 0=Susceptible, 1=Infectado, 2=Recuperado, 3=Muerto
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
  }
  
  // Inicializar población con algunos infectados
  initialize(initialInfected = 10) {
    // Colocar infectados iniciales aleatoriamente
    for (let i = 0; i < initialInfected; i++) {
      const x = Math.floor(Math.random() * this.size);
      const y = Math.floor(Math.random() * this.size);
      this.grid[x][y] = this.INFECTED;
    }
    
    this.updateStats();
    this.saveHistory();
  }
  
  // Obtener vecinos en un radio (modelo de contacto)
  getNeighbors(x, y, radius = 1) {
    const neighbors = [];
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (dx === 0 && dy === 0) continue;
        
        const nx = x + dx;
        const ny = y + dy;
        
        // Condiciones de frontera periódicas
        if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
          neighbors.push({x: nx, y: ny});
        }
      }
    }
    return neighbors;
  }
  
  // Simular un día de la epidemia
  simulateDay() {
    const newGrid = this.grid.map(row => [...row]);
    let newInfections = 0;
    
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        const state = this.grid[x][y];
        
        if (state === this.SUSCEPTIBLE) {
          // Verificar si se infecta por vecinos
          const neighbors = this.getNeighbors(x, y, this.R0_radius);
          const infectedNeighbors = neighbors.filter(
            n => this.grid[n.x][n.y] === this.INFECTED
          ).length;
          
          // Probabilidad de infección aumenta con más vecinos infectados
          const infectionProb = 1 - Math.pow(1 - this.beta, infectedNeighbors);
          
          if (Math.random() < infectionProb) {
            newGrid[x][y] = this.INFECTED;
            newInfections++;
          }
        } 
        else if (state === this.INFECTED) {
          // Puede morir, recuperarse o seguir infectado
          const rand = Math.random();
          
          if (rand < this.delta) {
            newGrid[x][y] = this.DEAD;
          } else if (rand < this.delta + this.gamma) {
            newGrid[x][y] = this.RECOVERED;
          }
          // Si no, sigue infectado
        }
        // RECOVERED y DEAD no cambian
      }
    }
    
    this.grid = newGrid;
    this.stats.day++;
    this.stats.newInfections = newInfections;
    this.stats.cumulativeInfections += newInfections;
    this.updateStats();
    this.saveHistory();
  }
  
  // Actualizar estadísticas globales
  updateStats() {
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
  
  // Guardar historial para análisis
  saveHistory() {
    this.history.push({...this.stats});
  }
  
  // Calcular R0 efectivo (número reproductivo básico)
  calculateR0() {
    if (this.stats.cumulativeInfections === 0) return 0;
    
    // R0 aproximado = nuevas infecciones / infectados actuales
    const recentHistory = this.history.slice(-7); // Últimos 7 días
    if (recentHistory.length < 2) return 0;
    
    const totalNewInfections = recentHistory.reduce((sum, day) => sum + day.newInfections, 0);
    const avgInfected = recentHistory.reduce((sum, day) => sum + day.infected, 0) / recentHistory.length;
    
    return avgInfected > 0 ? totalNewInfections / avgInfected : 0;
  }
  
  // Ejecutar simulación completa
  run(days = 365, callback = null) {
    console.log(`Iniciando simulación secuencial por ${days} días...`);
    const startTime = Date.now();
    
    for (let day = 0; day < days; day++) {
      this.simulateDay();
      
      if (callback && day % 10 === 0) {
        callback(day, this.stats);
      }
      
      // Terminar si no hay más infectados
      if (this.stats.infected === 0 && day > 10) {
        console.log(`Epidemia terminó en el día ${day}`);
        break;
      }
    }
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`Simulación completada en ${duration.toFixed(2)} segundos`);
    
    return {
      duration,
      history: this.history,
      finalStats: this.stats,
      R0: this.calculateR0()
    };
  }
  
  // Exportar resultados a CSV
  exportToCSV() {
    const header = 'day,susceptible,infected,recovered,dead,newInfections,cumulativeInfections\n';
    const rows = this.history.map(h => 
      `${h.day},${h.susceptible},${h.infected},${h.recovered},${h.dead},${h.newInfections},${h.cumulativeInfections}`
    ).join('\n');
    
    return header + rows;
  }
}

module.exports = SIRModel;