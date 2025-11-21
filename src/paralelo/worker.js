const { parentPort } = require('worker_threads');

parentPort.on('message', (data) => {
  const {
    block, startRow, endRow, ghostStart, size,
    beta, gamma, delta, R0_radius,
    SUSCEPTIBLE, INFECTED, RECOVERED, DEAD
  } = data;
  
  const blockHeight = block.length;
  const updatedBlock = block.map(row => [...row]);
  let newInfections = 0;
  
  // Procesar solo las filas que pertenecen a este bloque (sin ghost cells)
  const localStart = startRow - ghostStart;
  const localEnd = endRow - ghostStart;
  
  for (let localX = localStart; localX < localEnd; localX++) {
    for (let y = 0; y < size; y++) {
      const state = block[localX][y];
      
      if (state === SUSCEPTIBLE) {
        // Contar vecinos infectados
        let infectedNeighbors = 0;
        
        for (let dx = -R0_radius; dx <= R0_radius; dx++) {
          for (let dy = -R0_radius; dy <= R0_radius; dy++) {
            if (dx === 0 && dy === 0) continue;
            
            const nx = localX + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < blockHeight && ny >= 0 && ny < size) {
              if (block[nx][ny] === INFECTED) {
                infectedNeighbors++;
              }
            }
          }
        }
        
        // Calcular probabilidad de infección
        const infectionProb = 1 - Math.pow(1 - beta, infectedNeighbors);
        
        if (Math.random() < infectionProb) {
          updatedBlock[localX][y] = INFECTED;
          newInfections++;
        }
      } 
      else if (state === INFECTED) {
        const rand = Math.random();
        
        if (rand < delta) {
          updatedBlock[localX][y] = DEAD;
        } else if (rand < delta + gamma) {
          updatedBlock[localX][y] = RECOVERED;
        }
      }
    }
  }
  
  // Enviar solo las filas actualizadas (sin ghost cells)
  const resultBlock = updatedBlock.slice(localStart, localEnd);
  
  parentPort.postMessage({
    updatedBlock: resultBlock,
    startRow,
    newInfections
  });
});