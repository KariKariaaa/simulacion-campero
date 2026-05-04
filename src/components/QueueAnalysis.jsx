//QueueAnalysis.jsx
import { useState, useEffect } from 'react';
import {
  calculateQueueStatistics,
  calculateQueueStatisticsFromInputs,
  analyzeCapacity,
  simulateMMs,
  minutesToTime,
  durationToMinutes
} from '../utils/queueCalculations';

export default function QueueAnalysis({ data, onAnalysisParams }) {
  const [targetWaitTime, setTargetWaitTime] = useState('00:05:00');
  const [simulationServers, setSimulationServers] = useState(0);
  
  // Nuevos estados para inputs manuales
  const [lambdaInput, setLambdaInput] = useState('30.58');
  const [muInput, setMuInput] = useState('35.05');
  const [abandonoInput, setAbandonoInput] = useState('1.84');
  const [useManualInputs, setUseManualInputs] = useState(true);
  let tiempoMaximo = 0;
  let tiempoMinimo = 0; // Ejemplo de tiempo mínimo para análisis crítico

  if (!data || !Array.isArray(data) || data.length === 0) {
    //const minQueueTime = Math.min(...data.map(c => c.'Tiempo en Cola'));
    //const maxQueueTime = Math.max(...data.map(c => c.'Tiempo en Cola'));
    return (
      <div className="bg-red-50 p-8 rounded-3xl shadow-sm border border-red-200">
        <p className="text-red-700 font-semibold">Error: No hay datos para analizar</p>
      </div>
    );
  }else{
    tiempoMaximo = Math.max(...data.map(c => durationToMinutes(c['Tiempo en Cola'])));
    tiempoMinimo = Math.min(...data.map(c => durationToMinutes(c['Tiempo en Cola'])));
  }

  try {
    // Obtener total de clientes del archivo
    const totalCustomersFromFile = data.length;

    // Seleccionar función de cálculo según modo
    let statistics;
    if (useManualInputs) {
      const lambda = parseFloat(lambdaInput) || 30.58;
      const mu = parseFloat(muInput) || 35.05;
      const abandono = parseFloat(abandonoInput) || 1.84;
      
      statistics = calculateQueueStatisticsFromInputs(lambda, mu, abandono, totalCustomersFromFile);
    } else {
      statistics = calculateQueueStatistics(data);
    }
    
    // Usar useEffect para evitar llamadas infinitas
    useEffect(() => {
      if (onAnalysisParams && statistics) {
        onAnalysisParams({
          lambda: statistics.lambda,
          mu: statistics.mu,
          rho: statistics.rho,
          avgWaitTime: statistics.avgWaitTime,
          avgServiceTime: statistics.avgServiceTime,
          avgTimeInSystem: statistics.avgTimeInSystem,
          totalCustomers: statistics.totalCustomers
        });
      }
    }, [data, onAnalysisParams]);
    const analysis = analyzeCapacity(statistics, targetWaitTime);

    const hoursToMinutes = (h) => h * 60;
    
    let simulationStats = null;

    if (simulationServers > 0) {
      const totalServers = 1 + simulationServers;

      simulationStats = simulateMMs(
        statistics.lambda, // clientes/hora
        statistics.mu,     // clientes/hora
        totalServers
      );
    }

    if (statistics.totalCustomers === 0) {
      return (
        <div className="bg-yellow-50 p-8 rounded-3xl shadow-sm border border-yellow-200">
          <p className="text-yellow-700 font-semibold">
            Advertencia: No se encontraron datos válidos en el archivo. 
            Asegúrate de que el Excel contenga las columnas: Día, No. Registro, Hora Entrada, Hora Atendida, Hora Salida, Tiempo en Cola, Tiempo Total
          </p>
        </div>
      );
    }

  return (
    <div className="space-y-6">
      {/* Configurar Entrada Manual de Parámetros */}
      {/* Meta de Tiempo de Espera */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold mb-6" style={{ color: '#6c341e' }}>
          Configurar Meta
        </h2>
        
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Tiempo máximo en el sistema aceptable (HH:MM:SS)
            </label>
            <input
              type="text"
              value={targetWaitTime}
              onChange={(e) => setTargetWaitTime(e.target.value)}
              placeholder="00:05:00"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-2"
              style={{ focusBorderColor: '#fbd816' }}
            />
            <p className="text-xs text-gray-500 mt-2">
              Meta: {targetWaitTime} | Promedio actual: {minutesToTime(statistics.avgTimeInSystem)}
            </p>
          </div>
        </div>
      </div>

      {/* Análisis de Cumplimiento */}
        <div className="space-y-6 ">
          {/* Resumen de Métricas */}
          <div className="bg-white rounded-3xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#6c341e' }}>
              Resumen Simulación
            </h2>

            {/* Estado del Sistema */}
            <div className={`p-8 rounded-3xl shadow-sm border ${
              analysis.status === 'CUMPLE' ? 'border-green-200 bg-green-50' :
              analysis.status === 'CRÍTICO' ? 'border-yellow-200 bg-yellow-50' :
              'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2" style={{
                    color: analysis.status === 'CUMPLE' ? '#22c55e' :
                          analysis.status === 'CRÍTICO' ? '#f59e0b' : '#ef4444'
                  }}>
                    {analysis.status === 'CUMPLE' ? 'META CUMPLIDA' :
                    analysis.status === 'CRÍTICO' ? 'SITUACIÓN CRÍTICA' : 'META NO CUMPLIDA'}
                  </h3>
                  <p className="text-gray-700 font-semibold mb-2">{analysis.message}</p>
                  <p className="text-gray-600 text-sm">{analysis.recommendation}</p>
                </div>
              </div>
            </div>

            {/* Grid de métricas */}
            <div className="grid grid-cols-2 gap-4 mt-5">
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#fbd816' }}>
                <p className="text-xs uppercase" style={{ color: '#6c341e' }}>Total de Clientes</p>
                <p className="text-4xl font-bold" style={{ color: '#6c341e' }}>
                  {statistics.totalCustomers}
                </p>
              </div>

              <div className="p-4 rounded-xl" style={{ backgroundColor: '#f0f0f0' }}>
                <p className="text-xs uppercase" style={{ color: '#666' }}>Tasa Llegada (λ)</p>
                <p className="text-2xl font-bold" style={{ color: '#cb691c' }}>
                  {(statistics.lambda / 60).toFixed(3)} clientes/min
                </p>
                <p className="text-xl font-bold" style={{ color: '#6c341e' }}>
                  {statistics.lambda.toFixed(2)} clientes/hora
                </p>
              </div>

              <div className="p-4 rounded-xl" style={{ backgroundColor: '#f0f0f0' }}>
                <p className="text-xs uppercase" style={{ color: '#666' }}>Tasa Servicio (μ)</p>
                <p className="text-2xl font-bold" style={{ color: '#cb691c' }}>
                  {(statistics.mu / 60).toFixed(3)} clientes/min
                </p>
                <p className="text-xl font-bold" style={{ color: '#6c341e' }}>
                  {statistics.mu.toFixed(2)} clientes/hora
                </p>
              </div>

              <div className="p-4 rounded-xl" style={{ backgroundColor: '#f0f0f0' }}>
                <p className="text-xs uppercase" style={{ color: '#666' }}>Factor (ρ)</p>
                <p className="text-2xl font-bold" style={{ color: '#cb691c' }}>
                  {(statistics.rho * 100).toFixed(1)}%
                </p>
                <p className="text-xl font-bold" style={{ color: '#6c341e' }}>
                  {(statistics.rho).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Tiempos Promedio */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#f0f0f0' }}>
                <p className="text-xs uppercase" style={{ color: '#666' }}>Tiempo Promedio en Cola</p>
                <p className="text-xl font-bold" style={{ color: '#cb691c' }}>
                  {minutesToTime(statistics.avgWaitTime)}
                </p>
              </div>

              <div className="p-4 rounded-xl" style={{ backgroundColor: '#f0f0f0' }}>
                <p className="text-xs uppercase" style={{ color: '#666' }}>Tiempo Promedio de Servicio</p>
                <p className="text-xl font-bold" style={{ color: '#cb691c' }}>
                  {minutesToTime(statistics.avgServiceTime)}
                </p>
              </div>

              <div className="p-4 rounded-xl" style={{ backgroundColor: '#f0f0f0' }}>
                <p className="text-xs uppercase" style={{ color: '#666' }}>Tiempo Promedio en Sistema</p>
                <p className="text-xl font-bold" style={{ color: '#cb691c' }}>
                  {minutesToTime(statistics.avgTimeInSystem)}
                </p>
              </div>
            </div>

            {/* Grid de más estadísticas */}
            <div className="grid grid-cols-3 gap-4 mt-5">
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#f0f0f0' }}>
                <p className="text-xs uppercase" style={{ color: '#666' }}>Tiempo mínimo en cola</p>
                <p className="text-2xl font-bold" style={{ color: '#cb691c' }}>
                  {minutesToTime(tiempoMinimo)}
                </p>
              </div>

              <div className="p-4 rounded-xl" style={{ backgroundColor: '#f0f0f0' }}>
                <p className="text-xs uppercase" style={{ color: '#666' }}>Tiempo máximo en cola</p>
                <p className="text-2xl font-bold" style={{ color: '#cb691c' }}>
                  {minutesToTime(tiempoMaximo)}
                </p>
              </div>

              <div className="p-4 rounded-xl" style={{ backgroundColor: '#f0f0f0' }}>
                <p className="text-xs uppercase" style={{ color: '#666' }}>Porcentaje de abandono</p>
                <p className="text-2xl font-bold" style={{ color: '#cb691c' }}>
                  {statistics.abandonoPercentage ? statistics.abandonoPercentage.toFixed(2) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

      {/* Estado de Cumplimiento 
      <div className={`p-8 rounded-3xl shadow-sm border ${
        analysis.status === 'CUMPLE' ? 'border-green-200 bg-green-50' :
        analysis.status === 'CRÍTICO' ? 'border-yellow-200 bg-yellow-50' :
                </p>
              </div>
            </div>
          </div>
        </div>

      {/* Estado de Cumplimiento 
      <div className={`p-8 rounded-3xl shadow-sm border ${
        analysis.status === 'CUMPLE' ? 'border-green-200 bg-green-50' :
        analysis.status === 'CRÍTICO' ? 'border-yellow-200 bg-yellow-50' :
        'border-red-200 bg-red-50'
      }`}>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2" style={{
              color: analysis.status === 'CUMPLE' ? '#22c55e' :
                     analysis.status === 'CRÍTICO' ? '#f59e0b' : '#ef4444'
            }}>
              {analysis.status === 'CUMPLE' ? 'META CUMPLIDA' :
               analysis.status === 'CRÍTICO' ? 'SITUACIÓN CRÍTICA' : 'META NO CUMPLIDA'}
            </h3>
            <p className="text-gray-700 font-semibold mb-2">{analysis.message}</p>
            <p className="text-gray-600 text-sm">{analysis.recommendation}</p>
          </div>
        </div>
      </div>*/}

      {/* Métricas de Capacidad 
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">TASA DE LLEGADA</p>
          <p className="text-2xl font-bold" style={{ color: '#cb691c' }}>
            {statistics.lambda.toFixed(3)} clientes/min
          </p>
          <p className="text-xl font-bold" style={{ color: '#6c341e' }}>
            {statistics.lambda.toFixed(3) * 60} clientes/hora
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">TASA DE SERVICIO</p>
          <p className="text-2xl font-bold" style={{ color: '#cb691c' }}>
            {statistics.mu.toFixed(3)} clientes/min
          </p>
          <p className="text-xl font-bold" style={{ color: '#6c341e' }}>
            {statistics.mu.toFixed(3) * 60} clientes/hora
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">UTILIZACIÓN</p>
          <p className="text-2xl font-bold" style={{ color: '#cb691c' }}>
            {(statistics.rho * 100).toFixed(1)}%
          </p>
          <p className="text-xl font-bold" style={{ color: '#6c341e' }}>
            {(statistics.rho).toFixed(2)}
          </p>
        </div>
      </div>*/}

      {/* Estadísticas Principales 
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Total de Clientes</p>
          <p className="text-3xl font-bold" style={{ color: '#6c341e' }}>
            {statistics.totalCustomers}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Tiempo Promedio en Cola</p>
          <p className="text-3xl font-bold" style={{ color: '#cb691c' }}>
            {minutesToTime(statistics.avgWaitTime)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Tiempo Promedio de Servicio</p>
          <p className="text-3xl font-bold" style={{ color: '#6c341e' }}>
            {minutesToTime(statistics.avgServiceTime)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Tiempo Promedio en Sistema</p>
          <p className="text-3xl font-bold" style={{ color: '#cb691c' }}>
            {minutesToTime(statistics.avgTimeInSystem)}
          </p>
        </div>
      </div>*/}

      {/* Más Estadísticas 
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Tiempo Mínimo en Cola</p>
          <p className="text-2xl font-bold" style={{ color: '#6c341e' }}>
            {minutesToTime(statistics.minWaitTime)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Tiempo Máximo en Cola</p>
          <p className="text-2xl font-bold" style={{ color: '#cb691c' }}>
            {minutesToTime(statistics.maxWaitTime)}
          </p>
        </div>
      </div>*/}

      {/* Simulación con Servidores Adicionales */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold mb-6" style={{ color: '#6c341e' }}>
          Simulación: Agregar Servidores
        </h2>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Número de servidores adicionales a simular
          </label>
          <div className="flex gap-2">
            {[0, 1, 2, 3].map(num => (
              <button
                key={num}
                onClick={() => setSimulationServers(num)}
                className="px-6 py-2 rounded-full font-semibold transition border-2"
                style={{
                  backgroundColor: simulationServers === num ? '#fbd816' : 'white',
                  borderColor: '#fbd816',
                  color: simulationServers === num ? '#6c341e' : '#6c341e'
                }}
              >
                {num === 0 ? 'Actual' : `+${num}`}
              </button>
            ))}
          </div>
        </div>

        {simulationServers > 0 && simulationStats && (
        <div className="space-y-6">

          {/* COMPARACIÓN GENERAL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* ACTUAL */}
            <div className="bg-[#cb681c10] p-6 rounded-xl border border-[#cb691c]">
              <h4 className="font-bold mb-4">Situación Actual</h4>

              <p>λ: {(statistics.lambda / 60).toFixed(3)} clientes/min ({statistics.lambda.toFixed(2)} clientes/hora)</p>
              <p>μ: {(statistics.mu / 60).toFixed(3)} clientes/min ({statistics.mu.toFixed(2)} clientes/hora)</p>
              <p>ρ: {(statistics.rho * 100).toFixed(1)}%</p>

              <hr className="my-3 text-[#cb681c10]"/>

              <p>Espera: {minutesToTime(statistics.avgWaitTime)}</p>
              <p>Servicio: {minutesToTime(statistics.avgServiceTime)}</p>
              <p>Sistema: {minutesToTime(statistics.avgTimeInSystem)}</p>
            </div>

            {/* SIMULADO */}
            <div className="bg-[#fbd9160f] p-6 rounded-xl border border-[#fbd916]">
              <h4 className="font-bold mb-4">
                Con {simulationServers} servidor{simulationServers > 1 ? 'es' : ''} más
              </h4>

              <p>λ: {(simulationStats.lambda / 60).toFixed(3)} clientes/min ({simulationStats.lambda.toFixed(2)} clientes/hora)</p>
              <p>μ: {(simulationStats.mu / 60).toFixed(3)} clientes/min ({simulationStats.mu.toFixed(2)} clientes/hora)</p>
              <p>ρ: {(simulationStats.rho * 100).toFixed(1)}%</p>

              <hr className="my-3 text-[#fbd9160f]"/>

              <p>Espera: {minutesToTime(hoursToMinutes(simulationStats.Wq))}</p>
              <p>Servicio: {minutesToTime(hoursToMinutes(simulationStats.serviceTime))}</p>
              <p>Sistema: {minutesToTime(hoursToMinutes(simulationStats.W))}</p>
            </div>
          </div>

          {/* REDUCCIÓN */}
          <div className="bg-white p-4 rounded-xl border text-center">
            <p className="text-sm text-gray-600">Reducción del tiempo en cola</p>
            <p className="text-2xl font-bold">
              {(
                (statistics.avgWaitTime - hoursToMinutes(simulationStats.Wq)) 
                / statistics.avgWaitTime * 100
              ).toFixed(1)}%
            </p>
          </div>

        </div>
      )}
      </div>
    </div>
    );
  } catch (error) {
    console.error('Error in QueueAnalysis:', error);
    return (
      <div className="bg-red-50 p-8 rounded-3xl shadow-sm border border-red-200">
        <p className="text-red-700 font-semibold">
          Error al procesar los datos: {error.message}
        </p>
        <p className="text-red-600 text-sm mt-2">
          Asegúrate de que el archivo Excel tenga el formato correcto con las columnas: Día, No. Registro, Hora Entrada, Hora Atendida, Hora Salida, Tiempo en Cola, Tiempo Total
        </p>
      </div>
    );
  }
}