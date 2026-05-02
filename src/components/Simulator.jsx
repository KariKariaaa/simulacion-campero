import { useState } from 'react'
import { 
  simulateQueuePeriod, 
  calculateSimulationMetrics, 
  timeToMinutes 
} from '../utils/simulationGenerator'

export default function Simulator({ analysisParams, originalData }) {
  // Configuración de simulación
  const [selectedHours, setSelectedHours] = useState(['13-14']) // Array de horas seleccionadas
  const [simulationType, setSimulationType] = useState('hora') // 'hora', 'semana', 'mes'
  const [duration, setDuration] = useState(1)
  const [isSimulating, setIsSimulating] = useState(false)
  
  // Resultados de 3 simulaciones
  const [simulation1, setSimulation1] = useState(null)
  const [simulation2, setSimulation2] = useState(null)
  const [simulation3, setSimulation3] = useState(null)
  const [metrics1, setMetrics1] = useState(null)
  const [metrics2, setMetrics2] = useState(null)
  const [metrics3, setMetrics3] = useState(null)

  // Tasas específicas por hora
  const hourlyRates = {
    '13-14': { lambda: 43.25, mu: 44.86, abandonment: 4.10, label: '13:00 - 14:00', startHour: 13 },
    '14-15': { lambda: 28.88, mu: 35.29, abandonment: 0.91, label: '14:00 - 15:00', startHour: 14 },
    '15-16': { lambda: 30.58, mu: 25.00, abandonment: 0.51, label: '15:00 - 16:00', startHour: 15 }
  };

  const availableHours = [
    { value: '13-14', ...hourlyRates['13-14'] },
    { value: '14-15', ...hourlyRates['14-15'] },
    { value: '15-16', ...hourlyRates['15-16'] }
  ];

  const toggleHour = (hourValue) => {
    setSelectedHours(prev => {
      if (prev.includes(hourValue)) {
        return prev.filter(h => h !== hourValue)
      } else {
        return [...prev, hourValue].sort()
      }
    })
  }

  const handleSimulate = async () => {
    if (selectedHours.length === 0) return
    
    setIsSimulating(true)
    
    setTimeout(() => {
      try {
        // Calcular días a simular
        let daysToSimulate = duration
        if (simulationType === 'semana') {
          daysToSimulate = duration * 7
        } else if (simulationType === 'mes') {
          daysToSimulate = duration * 30
        }

        // Función para generar una simulación completa
        const generateSimulation = () => {
          let allClients = []
          const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
          let globalOrder = 1

          for (let dayIdx = 0; dayIdx < daysToSimulate; dayIdx++) {
            const dayName = dayNames[dayIdx % 7]

            // Para cada hora seleccionada
            selectedHours.forEach(hourValue => {
              const hourConfig = hourlyRates[hourValue]
              const startTimeMinutes = hourConfig.startHour * 60
              const durationMinutes = 60

              // Simular este período usando las tasas específicas de esa hora
              const periodClients = simulateQueuePeriod(
                hourConfig.lambda,
                hourConfig.mu,
                startTimeMinutes,
                durationMinutes,
                hourConfig.abandonment
              )

              // Agregar información de día y hora
              periodClients.forEach((client) => {
                allClients.push({
                  ...client,
                  day: dayName,
                  dayNumber: dayIdx + 1,
                  hourPeriod: hourConfig.label,
                  globalOrder: globalOrder++,
                  order: client.order // orden dentro de la hora
                })
              })
            })
          }

          return allClients
        }

        // Generar 3 simulaciones independientes
        const sim1Data = generateSimulation()
        const sim2Data = generateSimulation()
        const sim3Data = generateSimulation()

        setSimulation1(sim1Data)
        setSimulation2(sim2Data)
        setSimulation3(sim3Data)

        // Calcular métricas promedio de las horas seleccionadas
        const avgLambda = selectedHours.reduce((sum, h) => sum + hourlyRates[h].lambda, 0) / selectedHours.length
        const avgMu = selectedHours.reduce((sum, h) => sum + hourlyRates[h].mu, 0) / selectedHours.length

        // Calcular métricas para las 3 simulaciones
        const met1 = calculateSimulationMetrics(sim1Data, avgLambda, avgMu)
        const met2 = calculateSimulationMetrics(sim2Data, avgLambda, avgMu)
        const met3 = calculateSimulationMetrics(sim3Data, avgLambda, avgMu)

        // Agregar info adicional a cada métrica
        met1.daysSimulated = daysToSimulate
        met1.hoursPerDay = selectedHours.length
        met1.totalHoursSimulated = daysToSimulate * selectedHours.length
        met1.selectedPeriods = selectedHours.map(h => hourlyRates[h].label).join(', ')

        met2.daysSimulated = daysToSimulate
        met2.hoursPerDay = selectedHours.length
        met2.totalHoursSimulated = daysToSimulate * selectedHours.length
        met2.selectedPeriods = selectedHours.map(h => hourlyRates[h].label).join(', ')

        met3.daysSimulated = daysToSimulate
        met3.hoursPerDay = selectedHours.length
        met3.totalHoursSimulated = daysToSimulate * selectedHours.length
        met3.selectedPeriods = selectedHours.map(h => hourlyRates[h].label).join(', ')

        setMetrics1(met1)
        setMetrics2(met2)
        setMetrics3(met3)

      } catch (error) {
        console.error('Error en simulación:', error)
      }
      
      setIsSimulating(false)
    }, 500)
  }

  const getStatusColor = (stable) => {
    return stable ? '#4caf50' : '#f44336'
  }

  const getStatusMessage = (stable, rho) => {
    if (!stable) return 'Sistema Inestable (λ ≥ μ)'
    if (rho > 0.9) return 'Sistema Estable - Alta Utilización'
    if (rho > 0.7) return 'Sistema Estable - Utilización Moderada'
    return 'Sistema Estable - Baja Utilización'
  }

  return (
    <div className="w-full space-y-6">
      {/* Controles de Simulación */}
      <div className="bg-white rounded-3xl p-8 shadow-lg">
        <h2 className="text-2xl font-bold mb-6" style={{ color: '#6c341e' }}>
          Simulador de Sistemas M/M/1
        </h2>

        {/* Información de tasas por hora */}
        <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: '#f0f0f0' }}>
          <h3 className="font-bold mb-3" style={{ color: '#6c341e' }}>Tasas por Hora:</h3>
          <div className="grid grid-cols-3 gap-3 text-xs">
            {availableHours.map(hour => (
              <div key={hour.value} className="p-3 rounded-lg" style={{ backgroundColor: '#fff' }}>
                <p className="font-bold" style={{ color: '#cb691c' }}>{hour.label}</p>
                <p style={{ color: '#666' }}>λ: {hour.lambda} clientes/hora</p>
                <p style={{ color: '#666' }}>μ: {hour.mu} clientes/hora</p>
                <p style={{ color: '#666' }}>Abandono: {hour.abandonment}%</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {/* Selector de Horas (Multi-selección) */}
          <div>
            <label className="block font-semibold mb-3" style={{ color: '#6c341e' }}>
              Seleccionar Horas a Simular (Puedes elegir 1, 2 o 3 horas)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {availableHours.map(hour => (
                <button
                  key={hour.value}
                  onClick={() => toggleHour(hour.value)}
                  className="py-3 px-4 rounded-xl font-semibold transition transform hover:scale-105"
                  style={{
                    backgroundColor: selectedHours.includes(hour.value) ? '#6c341e' : '#f0f0f0',
                    color: selectedHours.includes(hour.value) ? '#fbd816' : '#6c341e',
                    borderWidth: selectedHours.includes(hour.value) ? '2px' : '0px',
                    borderColor: '#cb691c',
                    boxShadow: selectedHours.includes(hour.value) ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  {hour.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Seleccionadas: {selectedHours.length > 0 ? selectedHours.length + ' hora(s)' : 'Ninguna'}
            </p>
          </div>

          {/* Selector de Tipo de Simulación */}
          <div>
            <label className="block font-semibold mb-3" style={{ color: '#6c341e' }}>
              Tipo de Simulación
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'hora', label: 'Por Día' },
                { value: 'semana', label: 'Por Semana' },
                { value: 'mes', label: 'Por Mes' }
              ].map(type => (
                <button
                  key={type.value}
                  onClick={() => {
                    setSimulationType(type.value)
                    setDuration(1)
                  }}
                  className="py-3 px-4 rounded-xl font-semibold transition"
                  style={{
                    backgroundColor: simulationType === type.value ? '#6c341e' : '#f0f0f0',
                    color: simulationType === type.value ? '#fbd816' : '#6c341e',
                    borderWidth: simulationType === type.value ? '2px' : '0px',
                    borderColor: '#cb691c',
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Selector de Duración */}
          <div>
            <label className="block font-semibold mb-3" style={{ color: '#6c341e' }}>
              Duración
            </label>
            <div className="grid grid-cols-3 gap-3">
              {simulationType === 'hora' 
                ? [1, 2, 3].map(h => (
                    <button
                      key={h}
                      onClick={() => setDuration(h)}
                      className="py-2 px-4 rounded-xl font-semibold transition"
                      style={{
                        backgroundColor: duration === h ? '#6c341e' : '#f0f0f0',
                        color: duration === h ? '#fbd816' : '#6c341e',
                        borderWidth: duration === h ? '2px' : '0px',
                        borderColor: '#cb691c',
                      }}
                    >
                      {h} día{h > 1 ? 's' : ''}
                    </button>
                  ))
                : simulationType === 'semana'
                  ? [1, 2, 4].map(w => (
                      <button
                        key={w}
                        onClick={() => setDuration(w)}
                        className="py-2 px-4 rounded-xl font-semibold transition"
                        style={{
                          backgroundColor: duration === w ? '#6c341e' : '#f0f0f0',
                          color: duration === w ? '#fbd816' : '#6c341e',
                          borderWidth: duration === w ? '2px' : '0px',
                          borderColor: '#cb691c',
                        }}
                      >
                        {w} semana{w > 1 ? 's' : ''}
                      </button>
                    ))
                  : [1, 2, 3].map(m => (
                      <button
                        key={m}
                        onClick={() => setDuration(m)}
                        className="py-2 px-4 rounded-xl font-semibold transition"
                        style={{
                          backgroundColor: duration === m ? '#6c341e' : '#f0f0f0',
                          color: duration === m ? '#fbd816' : '#6c341e',
                          borderWidth: duration === m ? '2px' : '0px',
                          borderColor: '#cb691c',
                        }}
                      >
                        {m} mes{m > 1 ? 'es' : ''}
                      </button>
                    ))
              }
            </div>
          </div>

          {/* Resumen */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: '#fef8e8', borderLeft: '4px solid #cb691c' }}>
            <p className="text-sm font-semibold" style={{ color: '#6c341e' }}>
              Resumen: Se generarán <strong>3 simulaciones independientes</strong> de {
                simulationType === 'hora' 
                  ? `${duration} día${duration > 1 ? 's' : ''}`
                  : simulationType === 'semana'
                    ? `${duration} semana${duration > 1 ? 's' : ''} (${duration * 7} días)`
                    : `${duration} mes${duration > 1 ? 'es' : ''} (${duration * 30} días)`
              }
              {selectedHours.length > 0 && (
                <> durante {selectedHours.length} hora{selectedHours.length > 1 ? 's' : ''} diaria{selectedHours.length > 1 ? 's' : ''} ({
                  selectedHours.map(h => hourlyRates[h].label).join(', ')
                })</>
              )}
            </p>
          </div>

          {/* Botón Simular */}
          <button
            onClick={handleSimulate}
            disabled={isSimulating || selectedHours.length === 0}
            className="w-full py-4 px-6 rounded-2xl font-bold text-lg transition transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: '#cb691c',
              color: '#fbd816',
              boxShadow: '0 4px 12px rgba(203, 105, 28, 0.3)'
            }}
          >
            {isSimulating ? 'Generando simulaciones...' : 'Iniciar Simulación Triple'}
          </button>
        </div>
      </div>

      {/* Comparación de Resultados */}
      {metrics1 && metrics2 && metrics3 && (
        <div className="space-y-6">
          {/* Comparación de Métricas */}
          <div className="bg-white rounded-3xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#6c341e' }}>
              Comparación de las 3 Simulaciones
            </h2>

            <div className="grid grid-cols-3 gap-6">
              {/* Simulación 1 */}
              <div className="border-2 rounded-2xl p-6" style={{ borderColor: '#cb691c' }}>
                <h3 className="text-xl font-bold mb-4" style={{ color: '#cb691c' }}>
                  Simulación #1
                </h3>

                {/* Estado */}
                <div
                  className="p-4 rounded-xl mb-4"
                  style={{
                    backgroundColor: metrics1.isStable ? '#f1f8f6' : '#fdeaea',
                    borderLeft: `4px solid ${getStatusColor(metrics1.isStable)}`,
                  }}
                >
                  <p className="font-bold text-sm" style={{ color: getStatusColor(metrics1.isStable) }}>
                    {getStatusMessage(metrics1.isStable, parseFloat(metrics1.rho))}
                  </p>
                  <p className="text-xs mt-2" style={{ color: '#333' }}>
                    ρ = {metrics1.rho} ({metrics1.utilization}%)
                  </p>
                </div>

                {/* Métricas clave */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#fef8e8' }}>
                    <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Total</span>
                    <span className="text-lg font-bold" style={{ color: '#cb691c' }}>{metrics1.totalClients}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                    <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Completados</span>
                    <span className="text-sm font-bold" style={{ color: '#4caf50' }}>{metrics1.completedClients}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                    <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Abandonos</span>
                    <span className="text-sm font-bold" style={{ color: '#f44336' }}>
                      {metrics1.abandonedClients} ({metrics1.abandonmentRate.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                    <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>T. Cola</span>
                    <span className="text-sm font-bold" style={{ color: '#cb691c' }}>{metrics1.avgQueueTime} min</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                    <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>T. Total</span>
                    <span className="text-sm font-bold" style={{ color: '#cb691c' }}>{metrics1.avgTotalTime} min</span>
                  </div>
                </div>
              </div>

              {/* Simulación 2 */}
              <div className="border-2 rounded-2xl p-6" style={{ borderColor: '#6c341e' }}>
                <h3 className="text-xl font-bold mb-4" style={{ color: '#6c341e' }}>
                  Simulación #2
                </h3>

                <div
                  className="p-4 rounded-xl mb-4"
                  style={{
                    backgroundColor: metrics2.isStable ? '#f1f8f6' : '#fdeaea',
                    borderLeft: `4px solid ${getStatusColor(metrics2.isStable)}`,
                  }}
                >
                  <p className="font-bold text-sm" style={{ color: getStatusColor(metrics2.isStable) }}>
                    {getStatusMessage(metrics2.isStable, parseFloat(metrics2.rho))}
                  </p>
                  <p className="text-xs mt-2" style={{ color: '#333' }}>
                    ρ = {metrics2.rho} ({metrics2.utilization}%)
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#fef8e8' }}>
                    <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Total</span>
                    <span className="text-lg font-bold" style={{ color: '#cb691c' }}>{metrics2.totalClients}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                    <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Completados</span>
                    <span className="text-sm font-bold" style={{ color: '#4caf50' }}>{metrics2.completedClients}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                    <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Abandonos</span>
                    <span className="text-sm font-bold" style={{ color: '#f44336' }}>
                      {metrics2.abandonedClients} ({metrics2.abandonmentRate.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                    <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>T. Cola</span>
                    <span className="text-sm font-bold" style={{ color: '#cb691c' }}>{metrics2.avgQueueTime} min</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                    <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>T. Total</span>
                    <span className="text-sm font-bold" style={{ color: '#cb691c' }}>{metrics2.avgTotalTime} min</span>
                  </div>
                </div>
              </div>

              {/* Simulación 3 */}
              <div className="border-2 rounded-2xl p-6" style={{ borderColor: '#fbd816' }}>
                <h3 className="text-xl font-bold mb-4" style={{ color: '#6c341e' }}>
                  Simulación #3
                </h3>

                <div
                  className="p-4 rounded-xl mb-4"
                  style={{
                    backgroundColor: metrics3.isStable ? '#f1f8f6' : '#fdeaea',
                    borderLeft: `4px solid ${getStatusColor(metrics3.isStable)}`,
                  }}
                >
                  <p className="font-bold text-sm" style={{ color: getStatusColor(metrics3.isStable) }}>
                    {getStatusMessage(metrics3.isStable, parseFloat(metrics3.rho))}
                  </p>
                  <p className="text-xs mt-2" style={{ color: '#333' }}>
                    ρ = {metrics3.rho} ({metrics3.utilization}%)
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#fef8e8' }}>
                    <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Total</span>
                    <span className="text-lg font-bold" style={{ color: '#cb691c' }}>{metrics3.totalClients}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                    <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Completados</span>
                    <span className="text-sm font-bold" style={{ color: '#4caf50' }}>{metrics3.completedClients}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                    <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Abandonos</span>
                    <span className="text-sm font-bold" style={{ color: '#f44336' }}>
                      {metrics3.abandonedClients} ({metrics3.abandonmentRate.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                    <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>T. Cola</span>
                    <span className="text-sm font-bold" style={{ color: '#cb691c' }}>{metrics3.avgQueueTime} min</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                    <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>T. Total</span>
                    <span className="text-sm font-bold" style={{ color: '#cb691c' }}>{metrics3.avgTotalTime} min</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Promedios de las 3 simulaciones */}
            <div className="mt-6 p-6 rounded-2xl" style={{ backgroundColor: '#fef8e8', borderLeft: '4px solid #fbd816' }}>
              <h3 className="font-bold text-lg mb-4" style={{ color: '#6c341e' }}>
                Promedios de las 3 Simulaciones
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm" style={{ color: '#666' }}>Total Clientes Promedio:</p>
                  <p className="text-xl font-bold" style={{ color: '#cb691c' }}>
                    {Math.round((metrics1.totalClients + metrics2.totalClients + metrics3.totalClients) / 3)}
                  </p>
                </div>
                <div>
                  <p className="text-sm" style={{ color: '#666' }}>Tiempo Cola Promedio:</p>
                  <p className="text-xl font-bold" style={{ color: '#cb691c' }}>
                    {((metrics1.avgQueueTime + metrics2.avgQueueTime + metrics3.avgQueueTime) / 3).toFixed(2)} min
                  </p>
                </div>
                <div>
                  <p className="text-sm" style={{ color: '#666' }}>Abandonos Promedio:</p>
                  <p className="text-xl font-bold" style={{ color: '#f44336' }}>
                    {Math.round((metrics1.abandonedClients + metrics2.abandonedClients + metrics3.abandonedClients) / 3)} 
                    ({((metrics1.abandonmentRate + metrics2.abandonmentRate + metrics3.abandonmentRate) / 3).toFixed(1)}%)
                  </p>
                </div>
                <div>
                  <p className="text-sm" style={{ color: '#666' }}>Tiempo Total Promedio:</p>
                  <p className="text-xl font-bold" style={{ color: '#cb691c' }}>
                    {((metrics1.avgTotalTime + metrics2.avgTotalTime + metrics3.avgTotalTime) / 3).toFixed(2)} min
                  </p>
                </div>
              </div>
            </div>

            {/* Info del período */}
            <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: '#f0f0f0' }}>
              <p className="text-sm" style={{ color: '#666' }}>
                Período simulado: <strong>{metrics1.daysSimulated} día(s)</strong> × <strong>{metrics1.hoursPerDay} hora(s)</strong> = <strong>{metrics1.totalHoursSimulated} horas totales</strong>
              </p>
              <p className="text-sm mt-2" style={{ color: '#666' }}>
                Horas: {metrics1.selectedPeriods}
              </p>
            </div>
          </div>

          {/* Tablas de datos lado a lado */}
          <div className="grid grid-cols-3 gap-4">
            {/* Tabla Simulación 1 */}
            <div className="bg-white rounded-3xl p-4 shadow-lg">
              <h3 className="text-lg font-bold mb-3" style={{ color: '#cb691c' }}>
                Simulación #1 ({simulation1.length})
              </h3>
              <div className="overflow-auto" style={{ maxHeight: '500px' }}>
                <table className="w-full border-collapse text-xs">
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr style={{ backgroundColor: '#cb691c' }}>
                      <th className="px-1 py-2 text-left text-white" style={{ fontSize: '10px' }}>Día</th>
                      <th className="px-1 py-2 text-center text-white" style={{ fontSize: '10px' }}>No.</th>
                      <th className="px-1 py-2 text-center text-white" style={{ fontSize: '10px' }}>Entrada</th>
                      <th className="px-1 py-2 text-center text-white" style={{ fontSize: '10px' }}>Atendida</th>
                      <th className="px-1 py-2 text-center text-white" style={{ fontSize: '10px' }}>Salida</th>
                      <th className="px-1 py-2 text-center text-white" style={{ fontSize: '10px' }}>Cola</th>
                      <th className="px-1 py-2 text-center text-white" style={{ fontSize: '10px' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulation1.map((row, idx) => (
                      <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#f9f9f9' : '#fff' }}>
                        <td className="px-1 py-1" style={{ fontSize: '10px', color: '#6c341e' }}>{row.day}</td>
                        <td className="px-1 py-1 text-center" style={{ fontSize: '10px', color: '#666' }}>{row.order}</td>
                        <td className="px-1 py-1 text-center" style={{ fontSize: '10px', color: '#666' }}>{row.entryTime}</td>
                        <td className="px-1 py-1 text-center" style={{ fontSize: '10px', color: '#666' }}>{row.attendedTime}</td>
                        <td className="px-1 py-1 text-center" style={{ fontSize: '10px', color: '#666' }}>{row.exitTime}</td>
                        <td className="px-1 py-1 text-center font-semibold" style={{ fontSize: '10px', color: '#cb691c' }}>
                          {row.queueTimeFormatted}
                        </td>
                        <td className="px-1 py-1 text-center font-semibold" style={{ fontSize: '10px', color: '#6c341e' }}>
                          {row.totalTimeFormatted}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabla Simulación 2 */}
            <div className="bg-white rounded-3xl p-4 shadow-lg">
              <h3 className="text-lg font-bold mb-3" style={{ color: '#6c341e' }}>
                Simulación #2 ({simulation2.length})
              </h3>
              <div className="overflow-auto" style={{ maxHeight: '500px' }}>
                <table className="w-full border-collapse text-xs">
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr style={{ backgroundColor: '#6c341e' }}>
                      <th className="px-1 py-2 text-left text-white" style={{ fontSize: '10px' }}>Día</th>
                      <th className="px-1 py-2 text-center text-white" style={{ fontSize: '10px' }}>No.</th>
                      <th className="px-1 py-2 text-center text-white" style={{ fontSize: '10px' }}>Entrada</th>
                      <th className="px-1 py-2 text-center text-white" style={{ fontSize: '10px' }}>Atendida</th>
                      <th className="px-1 py-2 text-center text-white" style={{ fontSize: '10px' }}>Salida</th>
                      <th className="px-1 py-2 text-center text-white" style={{ fontSize: '10px' }}>Cola</th>
                      <th className="px-1 py-2 text-center text-white" style={{ fontSize: '10px' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulation2.map((row, idx) => (
                      <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#f9f9f9' : '#fff' }}>
                        <td className="px-1 py-1" style={{ fontSize: '10px', color: '#6c341e' }}>{row.day}</td>
                        <td className="px-1 py-1 text-center" style={{ fontSize: '10px', color: '#666' }}>{row.order}</td>
                        <td className="px-1 py-1 text-center" style={{ fontSize: '10px', color: '#666' }}>{row.entryTime}</td>
                        <td className="px-1 py-1 text-center" style={{ fontSize: '10px', color: '#666' }}>{row.attendedTime}</td>
                        <td className="px-1 py-1 text-center" style={{ fontSize: '10px', color: '#666' }}>{row.exitTime}</td>
                        <td className="px-1 py-1 text-center font-semibold" style={{ fontSize: '10px', color: '#cb691c' }}>
                          {row.queueTimeFormatted}
                        </td>
                        <td className="px-1 py-1 text-center font-semibold" style={{ fontSize: '10px', color: '#6c341e' }}>
                          {row.totalTimeFormatted}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabla Simulación 3 */}
            <div className="bg-white rounded-3xl p-4 shadow-lg">
              <h3 className="text-lg font-bold mb-3" style={{ color: '#6c341e' }}>
                Simulación #3 ({simulation3.length})
              </h3>
              <div className="overflow-auto" style={{ maxHeight: '500px' }}>
                <table className="w-full border-collapse text-xs">
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr style={{ backgroundColor: '#fbd816' }}>
                      <th className="px-1 py-2 text-left" style={{ fontSize: '10px', color: '#6c341e' }}>Día</th>
                      <th className="px-1 py-2 text-center" style={{ fontSize: '10px', color: '#6c341e' }}>No.</th>
                      <th className="px-1 py-2 text-center" style={{ fontSize: '10px', color: '#6c341e' }}>Entrada</th>
                      <th className="px-1 py-2 text-center" style={{ fontSize: '10px', color: '#6c341e' }}>Atendida</th>
                      <th className="px-1 py-2 text-center" style={{ fontSize: '10px', color: '#6c341e' }}>Salida</th>
                      <th className="px-1 py-2 text-center" style={{ fontSize: '10px', color: '#6c341e' }}>Cola</th>
                      <th className="px-1 py-2 text-center" style={{ fontSize: '10px', color: '#6c341e' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulation3.map((row, idx) => (
                      <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#f9f9f9' : '#fff' }}>
                        <td className="px-1 py-1" style={{ fontSize: '10px', color: '#6c341e' }}>{row.day}</td>
                        <td className="px-1 py-1 text-center" style={{ fontSize: '10px', color: '#666' }}>{row.order}</td>
                        <td className="px-1 py-1 text-center" style={{ fontSize: '10px', color: '#666' }}>{row.entryTime}</td>
                        <td className="px-1 py-1 text-center" style={{ fontSize: '10px', color: '#666' }}>{row.attendedTime}</td>
                        <td className="px-1 py-1 text-center" style={{ fontSize: '10px', color: '#666' }}>{row.exitTime}</td>
                        <td className="px-1 py-1 text-center font-semibold" style={{ fontSize: '10px', color: '#cb691c' }}>
                          {row.queueTimeFormatted}
                        </td>
                        <td className="px-1 py-1 text-center font-semibold" style={{ fontSize: '10px', color: '#6c341e' }}>
                          {row.totalTimeFormatted}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}