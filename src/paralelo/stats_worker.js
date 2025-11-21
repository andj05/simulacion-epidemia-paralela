const { parentPort } = require('worker_threads');

parentPort.on('message', (data) => {
  const {
    block, startRow, endRow, ghostStart,
    SUSCEPTIBLE, INFECTED, RECOVERED, DEAD
  } = data;
  
  let susceptible = 0, infected = 0, recovered = 0, dead = 0;
  
  // Contar solo las filas que pertenecen a este bloque
  const localStart = startRow - ghostStart;
  const localEnd = endRow - ghostStart;
  
  for (let i = localStart; i < localEnd; i++) {
    for (let j = 0; j < block[i].length; j++) {
      const state = block[i][j];
      
      if (state === SUSCEPTIBLE) susceptible++;
      else if (state === INFECTED) infected++;
      else if (state === RECOVERED) recovered++;
      else if (state === DEAD) dead++;
    }
  }
  
  parentPort.postMessage({
    susceptible,
    infected,
    recovered,
    dead
  });
});