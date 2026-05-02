/**
 * Utilidades para generación de simulaciones de colas M/M/1
 */

// Genera tiempo entre llegadas usando distribución exponencial
export const generateExponentialTime = (lambda) => {
  return -Math.log(Math.random()) / lambda;
};

// Convierte minutos a formato HH:MM:SS
export const minutesToTimeString = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.round((minutes % 1) * 60);
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// Convierte minutos a formato MM:SS (para duraciones)
export const minutesToDurationString = (minutes) => {
  const mins = Math.floor(minutes);
  const secs = Math.round((minutes % 1) * 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// Convierte hora en formato HH:MM a minutos desde medianoche
export const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Simula un período de tiempo con parámetros del modelo M/M/1
 * @param {number} lambda - Tasa de llegada (clientes por hora)
 * @param {number} mu - Tasa de servicio (clientes por hora)
 * @param {number} startTimeMinutes - Minutos desde medianoche para inicio
 * @param {number} durationMinutes - Duración de la simulación en minutos
 * @param {number} abandonmentRate - Porcentaje de abandono (0-100)
 * @returns {array} Array de clientes simulados
 */
export const simulateQueuePeriod = (lambda, mu, startTimeMinutes, durationMinutes, abandonmentRate = 0) => {
  // Convertir de clientes/hora a clientes/minuto
  const lambdaPerMin = lambda / 60;
  const muPerMin = mu / 60;
  
  const arrivals = [];
  let currentTime = startTimeMinutes;
  let order = 1;
  const endTime = startTimeMinutes + durationMinutes;

  // Generar llegadas usando distribución exponencial
  while (currentTime < endTime) {
    const timeBetweenArrivals = generateExponentialTime(lambdaPerMin);
    currentTime += timeBetweenArrivals;

    if (currentTime < endTime) {
      arrivals.push({
        order: order++,
        arrivalTime: currentTime
      });
    }
  }

  // Simular servicio para cada cliente
  const simulatedClients = [];
  let serverBusyUntil = startTimeMinutes;

  arrivals.forEach(arrival => {
    const serviceTime = generateExponentialTime(muPerMin);
    const entryTime = arrival.arrivalTime;
    const startServiceTime = Math.max(serverBusyUntil, entryTime);
    const endServiceTime = startServiceTime + serviceTime;
    const queueTime = startServiceTime - entryTime;

    // Criterio de abandono basado en porcentaje y tiempo de espera
    // El abandono es más probable cuando el tiempo de espera es largo
    const abandonmentProbability = abandonmentRate / 100;
    const waitTimeFactor = Math.min(queueTime / 30, 1); // Normalizar a 30 minutos
    const finalAbandonmentProb = abandonmentProbability * (0.3 + 0.7 * waitTimeFactor);
    const abandoned = Math.random() < finalAbandonmentProb;

    simulatedClients.push({
      order: arrival.order,
      entryTime: minutesToTimeString(entryTime),
      attendedTime: minutesToTimeString(startServiceTime),
      exitTime: minutesToTimeString(endServiceTime),
      queueTime: parseFloat(queueTime.toFixed(2)),
      queueTimeFormatted: minutesToDurationString(queueTime),
      serviceTime: parseFloat(serviceTime.toFixed(2)),
      totalTime: parseFloat((queueTime + serviceTime).toFixed(2)),
      totalTimeFormatted: minutesToDurationString(queueTime + serviceTime),
      abandoned
    });

    // Si no abandonó, el servidor sigue ocupado hasta que termine el servicio
    if (!abandoned) {
      serverBusyUntil = endServiceTime;
    }
  });

  return simulatedClients;
};

/**
 * Calcula métricas de los clientes simulados
 * @param {array} simulatedClients - Array de clientes simulados
 * @param {number} lambda - Tasa de llegada original (para referencia)
 * @param {number} mu - Tasa de servicio original (para referencia)
 * @returns {object} Objeto con métricas calculadas
 */
export const calculateSimulationMetrics = (simulatedClients, lambda, mu) => {
  if (!simulatedClients || simulatedClients.length === 0) {
    return {
      totalClients: 0,
      completedClients: 0,
      abandonedClients: 0,
      avgQueueTime: 0,
      avgServiceTime: 0,
      avgTotalTime: 0
    };
  }

  const completedClients = simulatedClients.filter(c => !c.abandoned);
  const abandonedClients = simulatedClients.filter(c => c.abandoned);

  const avgQueueTime = completedClients.length > 0
    ? completedClients.reduce((sum, c) => sum + c.queueTime, 0) / completedClients.length
    : 0;

  const avgServiceTime = completedClients.length > 0
    ? completedClients.reduce((sum, c) => sum + c.serviceTime, 0) / completedClients.length
    : 0;

  const avgTotalTime = completedClients.length > 0
    ? completedClients.reduce((sum, c) => sum + c.totalTime, 0) / completedClients.length
    : 0;

  return {
    totalClients: simulatedClients.length,
    completedClients: completedClients.length,
    abandonedClients: abandonedClients.length,
    abandonmentRate: (abandonedClients.length / simulatedClients.length) * 100,
    avgQueueTime: parseFloat(avgQueueTime.toFixed(2)),
    avgServiceTime: parseFloat(avgServiceTime.toFixed(2)),
    avgTotalTime: parseFloat(avgTotalTime.toFixed(2)),
    lambda: lambda.toFixed(2),
    mu: mu.toFixed(2),
    rho: (lambda / mu).toFixed(2),
    utilization: ((lambda / mu) * 100).toFixed(1),
    isStable: lambda < mu
  };
};