// utils/queueCalculations.js

// Convertir formato de duración (MM:SS o HH:MM:SS) a minutos
export const durationToMinutes = (timeStr) => {
  if (timeStr === null || timeStr === undefined || timeStr === '') return 0;
  
  // Si es un número, asumimos que ya está en minutos
  if (typeof timeStr === 'number') {
    return timeStr * 1440; // convertir días → minutos
  }
  
  // Convertir a string y limpiar espacios
  const str = String(timeStr).trim();
  if (!str) return 0;
  
  // Si contiene ":", es formato de tiempo
  if (str.includes(':')) {
    const parts = str.split(':');
    
    if (parts.length === 2) {
      // Formato MM:SS
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return minutes + seconds / 60;
    } else if (parts.length === 3) {
      // Formato HH:MM:SS - interpretar como duración
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseInt(parts[2]) || 0;
      return hours * 60 + minutes + seconds / 60;
    }
  }
  
  // Si no contiene ":", intentar parsear como número
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

// Convertir hora del día (HH:MM:SS) a minutos desde medianoche
export const timeOfDayToMinutes = (timeStr) => {
  if (!timeStr && timeStr !== 0) return 0;

  if (typeof timeStr === 'number') {
    return timeStr * 1440; // días → minutos
  }

  const str = String(timeStr).trim();
  if (!str.includes(':')) return 0;

  const parts = str.split(':');
  const hours = parseInt(parts[0]) || 0;
  const minutes = parseInt(parts[1]) || 0;
  const seconds = parseInt(parts[2]) || 0;

  return hours * 60 + minutes + seconds / 60;
};


// Calcular diferencia entre dos horas del día
export const timeDifference = (endTime, startTime) => {
  const end = timeOfDayToMinutes(endTime);
  const start = timeOfDayToMinutes(startTime);
  
  let diff = end - start;
  // Si la diferencia es negativa, asumimos que cruzó medianoche
  if (diff < 0) diff += 24 * 60;
  
  return diff;
};

// Convertir minutos a formato HH:MM:SS
export const minutesToTime = (minutes) => {
  if (minutes === 0 || isNaN(minutes)) return '00:00:00';
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.round((minutes % 1) * 60);
  
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// Convertir minutos a formato MM:SS (para duraciones cortas)
export const minutesToShortTime = (minutes) => {
  if (minutes === 0 || isNaN(minutes)) return '00:00';
  
  const mins = Math.floor(minutes);
  const secs = Math.round((minutes % 1) * 60);
  
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// Formatear cualquier valor de tiempo para mostrar
export const formatTimeValue = (value) => {
  if (!value) return '00:00:00';
  
  // Si ya es string con formato de tiempo, devolverlo
  if (typeof value === 'string' && value.includes(':')) {
    const parts = value.split(':');
    if (parts.length === 2) {
      // MM:SS -> agregar horas
      return `00:${value}`;
    }
    return value; // Ya está en formato HH:MM:SS
  }
  
  // Si es número (minutos decimales), convertir
  if (typeof value === 'number') {
    return minutesToTime(value);
  }
  
  return String(value);
};

// Calcular estadísticas de la cola
export const calculateQueueStatistics = (data) => {
  if (!data || data.length === 0) {
    return {
      totalCustomers: 0,
      avgWaitTime: 0,
      avgServiceTime: 0,
      avgTimeInSystem: 0,
      maxWaitTime: 0,
      minWaitTime: 0,
      serverUtilization: 0,
      days: {}
    };
  }

  let totalWaitTime = 0;
  let totalServiceTime = 0;
  let totalTimeInSystem = 0;
  let maxWaitTime = 0;
  let minWaitTime = Infinity;
  const dayStats = {};
  let validRows = 0;

  data.forEach(row => {
    try {
      // Usar las columnas que ya vienen calculadas en el Excel
      const waitTime = durationToMinutes(row['Tiempo en Cola']) || 0;
      const totalTime = durationToMinutes(row['Tiempo Total']) || 0;
      
      // Calcular tiempo de servicio: Total - Espera
      const serviceTime = Math.max(0, totalTime - waitTime);
      
      // También podemos calcularlo desde las horas si es necesario
      // const serviceTime = timeDifference(row['Hora Salida'], row['Hora Atendida']);

      // Validar que sean números válidos
      if (isNaN(waitTime) || isNaN(serviceTime) || isNaN(totalTime)) {
        return;
      }

      totalWaitTime += waitTime;
      totalServiceTime += serviceTime;
      totalTimeInSystem += totalTime;

      maxWaitTime = Math.max(maxWaitTime, waitTime);
      minWaitTime = Math.min(minWaitTime, waitTime);
      validRows++;

      // Por día
      const day = row['Día'] || 'Sin especificar';
      if (!dayStats[day]) {
        dayStats[day] = {
          count: 0,
          totalWait: 0,
          totalService: 0,
          totalSystem: 0,
          maxWait: 0,
          minWait: Infinity
        };
      }
      dayStats[day].count++;
      dayStats[day].totalWait += waitTime;
      dayStats[day].totalService += serviceTime;
      dayStats[day].totalSystem += totalTime;
      dayStats[day].maxWait = Math.max(dayStats[day].maxWait, waitTime);
      dayStats[day].minWait = Math.min(dayStats[day].minWait, waitTime);
    } catch (error) {
      console.warn('Error processing row:', error);
    }
  });

  if (validRows === 0) {
    return {
      totalCustomers: 0,
      avgWaitTime: 0,
      avgServiceTime: 0,
      avgTimeInSystem: 0,
      maxWaitTime: 0,
      minWaitTime: 0,
      customersWithinTarget: 0,
      performanceRate: 0,
      days: {}
    };
  }

  const avgWaitTime = totalWaitTime / validRows;
  const avgServiceTime = totalServiceTime / validRows;
  const avgTimeInSystem = totalTimeInSystem / validRows;

  // Calidad de servicio: % de clientes que esperan menos de X minutos
  let customersWithinTarget = 0;
  data.forEach(row => {
    try {
      const waitTime = durationToMinutes(row['Tiempo en Cola']) || 0;
      if (waitTime <= avgWaitTime * 0.8) {
        customersWithinTarget++;
      }
    } catch (error) {
      // Skip
    }
  });


  // Calcular tiempo total observado
  const firstArrival = Math.min(
    ...data.map(row => timeOfDayToMinutes(row['Hora Entrada']))
  );

  const lastDeparture = Math.max(
    ...data.map(row => timeOfDayToMinutes(row['Hora Salida']))
  );

  const totalTimeObserved = Math.max(1, lastDeparture - firstArrival);

  // λ (clientes por minuto)
  const lambda = validRows / totalTimeObserved;

  // μ (clientes por minuto)
  const mu = avgServiceTime > 0 ? 1 / avgServiceTime : 0;

  // ρ (utilización)
  const rho = mu > 0 ? lambda / mu : 0;

  return {
    totalCustomers: validRows,
    avgWaitTime: isNaN(avgWaitTime) ? 0 : avgWaitTime,
    avgServiceTime: isNaN(avgServiceTime) ? 0 : avgServiceTime,
    avgTimeInSystem: isNaN(avgTimeInSystem) ? 0 : avgTimeInSystem,
    maxWaitTime: maxWaitTime === 0 ? 0 : maxWaitTime,
    minWaitTime: minWaitTime === Infinity ? 0 : minWaitTime,
    customersWithinTarget,
    performanceRate: ((customersWithinTarget / validRows) * 100).toFixed(2),
    days: dayStats,
    lambda,
    mu,
    rho
  };

};

// Determinar si se necesita más servidor
export const analyzeCapacity = (statistics, targetWaitTime) => {
  const avgSystem = statistics.avgTimeInSystem;
  const targetMinutes = durationToMinutes(targetWaitTime) || 5; // Default 5 minutos
  
  // Validar valores
  if (!isFinite(avgSystem) || isNaN(avgSystem) || avgSystem < 0) {
    return {
      status: 'DATOS_INSUFICIENTES',
      message: 'No hay datos suficientes para el análisis',
      recommendation: 'Carga un archivo Excel válido con datos de colas.',
      needsMoreServers: false
    };
  }

  if (avgSystem <= targetMinutes) {
    return {
      status: 'CUMPLE',
      message: `La meta se cumple. Tiempo promedio en el sistema: ${minutesToTime(avgSystem)}`,
      recommendation: 'El sistema actual es suficiente.',
      needsMoreServers: false
    };
  } else if (avgSystem <= targetMinutes * 1.5) {
    return {
      status: 'CRÍTICO',
      message: `Tiempo en el sistema muy cercano a la meta. Actual: ${minutesToTime(avgSystem)}. Meta: ${minutesToTime(targetMinutes)}`,
      recommendation: 'Considere aumentar servidores en horas pico.',
      needsMoreServers: true
    };
  } else {
    return {
      status: 'NO CUMPLE',
      message: `Meta no cumplida. Actual: ${minutesToTime(avgSystem)}. Meta: ${minutesToTime(targetMinutes)}`,
      recommendation: 'Se recomienda agregar al menos 1 servidor adicional.',
      needsMoreServers: true
    };
  }
};

// Calcular estadísticas basadas en Lambda, Mu y porcentaje de abandono (INPUT DEL USUARIO)
export const calculateQueueStatisticsFromInputs = (
  lambdaPerHour,      // Tasa de llegada en clientes/hora
  muPerHour,          // Tasa de servicio en clientes/hora
  abandonoPercentage, // Porcentaje de abandono
  totalCustomers      // Número total de clientes del archivo
) => {
  // Convertir de clientes/hora a clientes/minuto
  const lambda = lambdaPerHour / 60;
  const mu = muPerHour / 60;

  // Validar valores
  if (lambda <= 0 || mu <= 0 || lambda >= mu) {
    return {
      totalCustomers,
      lambda: lambdaPerHour,
      mu: muPerHour,
      rho: lambda / mu,
      abandonoPercentage,
      avgWaitTime: 0,
      avgServiceTime: 0,
      avgTimeInSystem: 0,
      error: 'Lambda debe ser menor que Mu'
    };
  }

  // Calcular ρ (factor de utilización)
  const rho = lambda / mu;

  // Tiempo promedio de servicio en minutos
  const avgServiceTime = 1 / mu;

  // Fórmulas de teoría de colas M/M/1
  // Wq = λ / (μ(μ - λ)) - Tiempo promedio en cola
  const avgWaitTime = lambda / (mu * (mu - lambda));

  // W = Wq + 1/μ - Tiempo promedio en sistema
  const avgTimeInSystem = avgWaitTime + avgServiceTime;

  return {
    totalCustomers,
    lambda: lambdaPerHour,
    mu: muPerHour,
    rho,
    abandonoPercentage,
    avgWaitTime: avgWaitTime,
    avgServiceTime: avgServiceTime,
    avgTimeInSystem: avgTimeInSystem,
    maxWaitTime: 0,    // No se puede calcular sin datos
    minWaitTime: 0,    // No se puede calcular sin datos
    days: {}
  };
};

// Factorial simple
const factorial = (n) => {
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
};

// Modelo M/M/s real
export const simulateMMs = (lambdaPerHour, muPerHour, servers) => {
  const lambda = lambdaPerHour; // clientes/hora
  const mu = muPerHour;

  const rho = lambda / (servers * mu);

  if (rho >= 1) {
    return {
      stable: false,
      message: 'Sistema inestable (ρ ≥ 1)'
    };
  }

  const a = lambda / mu;

  // Calcular P0
  let sum = 0;
  for (let n = 0; n < servers; n++) {
    sum += Math.pow(a, n) / factorial(n);
  }

  const lastTerm =
    (Math.pow(a, servers) / factorial(servers)) * (1 / (1 - rho));

  const P0 = 1 / (sum + lastTerm);

  // Lq
  const Lq =
    (P0 * Math.pow(a, servers) * rho) /
    (factorial(servers) * Math.pow(1 - rho, 2));

  // Wq (horas)
  const Wq = Lq / lambda;

  // W (horas)
  const W = Wq + (1 / mu);

  return {
    stable: true,
    lambda,
    mu,
    servers,
    rho,
    Lq,
    Wq, // horas
    W,  // horas
    serviceTime: 1 / mu // horas
  };
};


// Simular con servidores adicionales (modelo simplificado)
/*
export const simulateWithAdditionalServers = (data, additionalServers = 1) => {
  if (!data || data.length === 0 || additionalServers <= 0) {
    return calculateQueueStatistics(data);
  }

  try {
    // Simulación simplificada: reducir tiempos de espera proporcionalmente
    // Con más servidores, la espera se reduce significativamente
    const reductionFactor = Math.max(0.3, 1 - (additionalServers / (additionalServers + 1)) * 0.6);
    
    const simulatedData = data.map(row => {
      try {
        const waitTimeMinutes = durationToMinutes(row['Tiempo en Cola']) || 0;
        const reducedWaitTime = waitTimeMinutes * reductionFactor;
        
        const totalTimeMinutes = durationToMinutes(row['Tiempo Total']) || 0;
        const serviceTimeMinutes = totalTimeMinutes - waitTimeMinutes;
        const newTotalTime = reducedWaitTime + serviceTimeMinutes;
        
        return {
          ...row,
          'Tiempo en Cola': minutesToShortTime(Math.max(0, reducedWaitTime)),
          'Tiempo Total': minutesToShortTime(Math.max(0, newTotalTime))
        };
      } catch (error) {
        return row;
      }
    });

    return calculateQueueStatistics(simulatedData);
  } catch (error) {
    console.error('Error in simulation:', error);
    return calculateQueueStatistics(data);
  }
};*/

