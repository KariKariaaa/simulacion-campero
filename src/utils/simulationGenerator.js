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
 * Genera el número de clientes basado en probabilidades
 * @param {array} probabilities - Array de {customers, probability}
 * @returns {number} Número de clientes (1-5)
 */
export const generateCustomerCount = (probabilities) => {
  const random = Math.random();
  let cumulative = 0;
  
  for (const prob of probabilities) {
    cumulative += prob.probability;
    if (random <= cumulative) {
      return prob.customers;
    }
  }
  
  // Por defecto retornar 1 cliente
  return 1;
};

/**
 * Selecciona productos aleatorios basado en la cantidad de clientes
 * @param {number} numClients - Número de clientes en la orden
 * @param {array} products - Array de productos disponibles
 * @returns {array} Array de productos seleccionados
 */
export const assignProducts = (numClients, products) => {
  const selectedProducts = [];
  
  // Estrategia: asignar productos según tamaño del grupo
  // 1 persona: productos individuales (Menú Campero, Menú Camperito 6pc, etc.)
  // 2-3 personas: combos medianos (Menú Camperito 9pc, Combo Familiar 6-8pc)
  // 4-5 personas: banquetes grandes (Banquete 18-34pc, Combo Familiar 10-12pc)
  
  if (numClients === 1) {
    // Productos individuales o pequeños
    const individualProducts = products.filter(p => 
      p.nombre.includes('Menú Campero (2 pc)') ||
      p.nombre.includes('Menú Super Campero') ||
      p.nombre.includes('Menú Camperito 6 pc') ||
      p.nombre.includes('Menú Hamburguesa') ||
      p.nombre.includes('Menú Sandwich')
    );
    
    if (individualProducts.length > 0) {
      selectedProducts.push(individualProducts[Math.floor(Math.random() * individualProducts.length)]);
    } else {
      selectedProducts.push(products[Math.floor(Math.random() * products.length)]);
    }
  } else if (numClients <= 3) {
    // Combos medianos
    const mediumProducts = products.filter(p => 
      p.nombre.includes('Menú Camperito 9 pc') ||
      p.nombre.includes('Combo Familiar 6 pc') ||
      p.nombre.includes('Combo Familiar 8 pc') ||
      p.nombre.includes('Menú Alitas 6 pc') ||
      p.nombre.includes('Menú Alitas 9 pc') ||
      p.nombre.includes('Pizza')
    );
    
    if (mediumProducts.length > 0) {
      selectedProducts.push(mediumProducts[Math.floor(Math.random() * mediumProducts.length)]);
    } else {
      selectedProducts.push(products[Math.floor(Math.random() * products.length)]);
    }
  } else {
    // Banquetes grandes para 4-5 personas
    const largeProducts = products.filter(p => 
      p.nombre.includes('Banquete') ||
      p.nombre.includes('Combo Familiar 10 pc') ||
      p.nombre.includes('Combo Familiar 12 pc')
    );
    
    if (largeProducts.length > 0) {
      selectedProducts.push(largeProducts[Math.floor(Math.random() * largeProducts.length)]);
    } else {
      selectedProducts.push(products[Math.floor(Math.random() * products.length)]);
    }
    
    // Para 5 personas, podría agregar un producto adicional
    if (numClients === 5 && Math.random() > 0.5) {
      selectedProducts.push(products[Math.floor(Math.random() * products.length)]);
    }
  }
  
  return selectedProducts;
};

/**
 * Simula un período de tiempo con parámetros del modelo M/M/1
 * @param {number} lambda - Tasa de llegada (clientes por hora)
 * @param {number} mu - Tasa de servicio (clientes por hora)
 * @param {number} startTimeMinutes - Minutos desde medianoche para inicio
 * @param {number} durationMinutes - Duración de la simulación en minutos
 * @param {number} abandonmentRate - Porcentaje de abandono (0-100)
 * @param {array} customerProbabilities - Probabilidades de cantidad de clientes
 * @param {array} products - Array de productos disponibles
 * @returns {array} Array de clientes simulados
 */
export const simulateQueuePeriod = (
  lambda, 
  mu, 
  startTimeMinutes, 
  durationMinutes, 
  abandonmentRate = 0,
  customerProbabilities = null,
  products = null
) => {
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

    // Generar cantidad de clientes (personas) para esta orden
    const numClients = customerProbabilities 
      ? generateCustomerCount(customerProbabilities)
      : 1;

    // Asignar productos si están disponibles
    const assignedProducts = products 
      ? assignProducts(numClients, products)
      : [];

    // Calcular total de la orden
    const orderTotal = assignedProducts.reduce((sum, p) => sum + p.precio_venta, 0);
    const orderTotalCost = assignedProducts.reduce((sum, p) => sum + p.precio_costo, 0);

    // Criterio de abandono basado en porcentaje y tiempo de espera
    const abandonmentProbability = abandonmentRate / 100;
    const waitTimeFactor = Math.min(queueTime / 30, 1);
    const finalAbandonmentProb = abandonmentProbability * (0.3 + 0.7 * waitTimeFactor);
    const abandoned = Math.random() < finalAbandonmentProb;

    simulatedClients.push({
      order: arrival.order,
      numClients: numClients,
      products: assignedProducts,
      orderTotal: orderTotal,
      orderTotalCost: orderTotalCost,
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
 * Calcula los gastos operacionales basados en gastos fijos y variables
 * Convierte gastos mensuales a gastos por hora simulada
 * @param {array} expenses - Array de gastos con {nombre, tipo, monto}
 * @param {number} daysSimulated - Días simulados
 * @param {number} selectedHoursCount - Cantidad de horas seleccionadas por día
 * @returns {object} Objeto con desglose de gastos {fixedTotal, variableTotal, total, hourlyFixed, hourlyVariable}
 */
export const calculateExpenses = (expenses, daysSimulated, selectedHoursCount) => {
  if (!expenses || expenses.length === 0) {
    return {
      fixedTotal: 0,
      variableTotal: 0,
      total: 0,
      hourlyFixed: 0,
      hourlyVariable: 0,
      breakdown: []
    };
  }

  const WORKING_HOURS_PER_DAY = 13; // 8am to 9pm
  const SIMULATION_HOURS_RANGE = 3; // 1pm to 4pm

  // Separar gastos fijos y variables
  const fixedExpenses = expenses.filter(e => e.tipo === 'Fijo');
  const variableExpenses = expenses.filter(e => e.tipo === 'Variable');

  // Calcular gasto total de cada tipo
  const fixedTotalMonthly = fixedExpenses.reduce((sum, e) => sum + parseFloat(e.monto), 0);
  const variableTotalMonthly = variableExpenses.reduce((sum, e) => sum + parseFloat(e.monto), 0);

  // Convertir a gastos por hora: gasto mensual / 13 horas working day
  const fixedHourly = fixedTotalMonthly / WORKING_HOURS_PER_DAY;
  const variableHourly = variableTotalMonthly / WORKING_HOURS_PER_DAY;

  // Calcular gastos totales para la simulación
  // Formula: total de horas simuladas × gasto por hora
  const totalHoursSimulated = daysSimulated * selectedHoursCount;
  const fixedTotal = totalHoursSimulated * fixedHourly;
  const variableTotal = totalHoursSimulated * variableHourly;

  const breakdown = expenses.map(e => {
    const monthlyAmount = parseFloat(e.monto);
    const hourlyAmount = monthlyAmount / WORKING_HOURS_PER_DAY;
    const simulationAmount = totalHoursSimulated * hourlyAmount;
    return {
      nombre: e.nombre,
      tipo: e.tipo,
      montoMensual: parseFloat(monthlyAmount.toFixed(2)),
      montoPorHora: parseFloat(hourlyAmount.toFixed(2)),
      montoSimulacion: parseFloat(simulationAmount.toFixed(2))
    };
  });

  return {
    fixedTotal: parseFloat(fixedTotal.toFixed(2)),
    variableTotal: parseFloat(variableTotal.toFixed(2)),
    total: parseFloat((fixedTotal + variableTotal).toFixed(2)),
    hourlyFixed: parseFloat(fixedHourly.toFixed(2)),
    hourlyVariable: parseFloat(variableHourly.toFixed(2)),
    breakdown: breakdown
  };
};

/**
 * Calcula métricas de los clientes simulados
 * @param {array} simulatedClients - Array de clientes simulados
 * @param {number} lambda - Tasa de llegada original (para referencia)
 * @param {number} mu - Tasa de servicio original (para referencia)
 * @returns {object} Objeto con métricas calculadas
 */
export const calculateSimulationMetrics = (simulatedClients, horasTotales, expensesData = null) => {
  if (!simulatedClients || simulatedClients.length === 0) {
    return {};
  }

  const totalClients = simulatedClients.length;
  const completedClients = simulatedClients.filter(c => !c.abandoned);
  const abandonedClients = simulatedClients.filter(c => c.abandoned);

  //Calcular total de personas atendidas
  const totalPeople = simulatedClients.reduce((sum, c) => sum + c.numClients, 0);

  //Calcular ingresos totales (solo órdenes completadas)
  const totalRevenue = completedClients.reduce((sum, c) => sum + c.orderTotal, 0);
  const totalCost = completedClients.reduce((sum, c) => sum + c.orderTotalCost, 0);
  const avgOrderValue = completedClients.length > 0 ? totalRevenue / completedClients.length : 0;

  //Tiempo total de simulación (en minutos)
  const firstEntry = Math.min(...simulatedClients.map(c => timeToMinutes(c.entryTime)));
  const lastExit = Math.max(...simulatedClients.map(c => timeToMinutes(c.exitTime)));
  const totalTime = lastExit - firstEntry;

  //λ REAL (clientes por minuto)
  const lambdaReal = totalClients / horasTotales;

  //μ REAL (clientes atendidos por minuto)
  const totalServiceTime = completedClients.reduce((sum, c) => sum + c.serviceTime, 0);
  const muReal = completedClients.length / totalServiceTime;

  //ρ (utilización)
  const rho = lambdaReal / (muReal*60);

  //Promedios
  const avgQueueTime = completedClients.reduce((sum, c) => sum + c.queueTime, 0) / completedClients.length;
  const avgServiceTime = completedClients.reduce((sum, c) => sum + c.serviceTime, 0) / completedClients.length;
  const avgTotalTime = completedClients.reduce((sum, c) => sum + c.totalTime, 0) / completedClients.length;

  //Min y Max cola
  const minQueueTime = Math.min(...completedClients.map(c => c.queueTime));
  const maxQueueTime = Math.max(...completedClients.map(c => c.queueTime));

  // Calcular gastos operacionales
  const operationalExpenses = expensesData ? expensesData.total : 0;
  const totalExpenses = totalCost + operationalExpenses;
  const profit = totalRevenue - totalExpenses;

  return {
    totalClients: simulatedClients.length,
    totalPeople: totalPeople,
    completedClients: completedClients.length,
    abandonedClients: abandonedClients.length,

    abandonmentRate: (abandonedClients.length / totalClients) * 100,

    lambdaReal: parseFloat((lambdaReal).toFixed(2)), // por hora
    muReal: parseFloat((muReal * 60).toFixed(2)), // por hora
    rho: parseFloat(rho.toFixed(2)),
    utilization: parseFloat((rho * 100).toFixed(1)),

    avgQueueTime: minutesToDurationString(avgQueueTime),
    avgServiceTime: minutesToDurationString(avgServiceTime),
    avgTotalTime: minutesToDurationString(avgTotalTime),

    minQueueTime: minutesToDurationString(minQueueTime),
    maxQueueTime: minutesToDurationString(maxQueueTime),

    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    totalCost: parseFloat(totalCost.toFixed(2)),
    avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),

    // Nuevos campos para gastos operacionales
    operationalExpenses: parseFloat(operationalExpenses.toFixed(2)),
    totalExpenses: parseFloat(totalExpenses.toFixed(2)),
    profit: parseFloat(profit.toFixed(2)),
    
    isStable: rho < 1
  };
};
