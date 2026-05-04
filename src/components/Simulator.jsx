import { useState } from 'react'
import { 
  simulateQueuePeriod, 
  calculateSimulationMetrics, 
  timeToMinutes 
} from '../utils/simulationGenerator'
import { SupabaseClient } from '@supabase/supabase-js'

export default function Simulator({ analysisParams, originalData, products }) {
  // Configuración de simulación
  const [selectedHours, setSelectedHours] = useState(['13-14'])
  const [simulationType, setSimulationType] = useState('hora')
  const [duration, setDuration] = useState(1)
  const [isSimulating, setIsSimulating] = useState(false)
  
  // Resultados de 3 simulaciones
  const [simulation1, setSimulation1] = useState(null)
  const [simulation2, setSimulation2] = useState(null)
  const [simulation3, setSimulation3] = useState(null)
  const [metrics1, setMetrics1] = useState(null)
  const [metrics2, setMetrics2] = useState(null)
  const [metrics3, setMetrics3] = useState(null)

  // Probabilidades de clientes por hora
  const customerProbabilities = {
    '13-14': [
      { customers: 1, probability: 0.2544 },
      { customers: 2, probability: 0.1494 },
      { customers: 3, probability: 0.0552 },
      { customers: 4, probability: 0.0215 },
      { customers: 5, probability: 0.0000 }
    ],
    '14-15': [
      { customers: 1, probability: 0.1467 },
      { customers: 2, probability: 0.0920 },
      { customers: 3, probability: 0.0444 },
      { customers: 4, probability: 0.0175 },
      { customers: 5, probability: 0.0023 }
    ],
    '15-16': [
      { customers: 1, probability: 0.1211 },
      { customers: 2, probability: 0.0633 },
      { customers: 3, probability: 0.0552 },
      { customers: 4, probability: 0.0054 },
      { customers: 5, probability: 0.0023 }
    ]
  };

  // Productos disponibles
  const productList = products;

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

        const horasTotales = daysToSimulate * selectedHours.length

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

              // Obtener probabilidades de clientes para esta hora
              const hourProbabilities = customerProbabilities[hourValue]

              // Simular este período usando las tasas específicas de esa hora
              const periodClients = simulateQueuePeriod(
                hourConfig.lambda,
                hourConfig.mu,
                startTimeMinutes,
                durationMinutes,
                hourConfig.abandonment,
                hourProbabilities,
                products,
              )

              // Agregar información de día y hora
              periodClients.forEach((client) => {
                allClients.push({
                  ...client,
                  day: dayName,
                  dayNumber: dayIdx + 1,
                  hourPeriod: hourConfig.label,
                  globalOrder: globalOrder++,
                  order: client.order
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
        const met1 = calculateSimulationMetrics(sim1Data, horasTotales)
        const met2 = calculateSimulationMetrics(sim2Data, horasTotales)
        const met3 = calculateSimulationMetrics(sim3Data, horasTotales)

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
          {/* Selector de Horas */}
          <div>
            <label className="block font-semibold mb-3" style={{ color: '#6c341e' }}>
              Seleccionar Horas a Simular
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
              Seleccionadas: {selectedHours.length} hora(s)
            </p>
          </div>

          {/* Selector de Tipo */}
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
                <> durante {selectedHours.length} hora{selectedHours.length > 1 ? 's' : ''} ({
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
              {[
                { metrics: metrics1, title: 'Simulación #1', color: '#cb691c' },
                { metrics: metrics2, title: 'Simulación #2', color: '#6c341e' },
                { metrics: metrics3, title: 'Simulación #3', color: '#fbd816' }
              ].map((sim, idx) => (
                <div key={idx} className="border-2 rounded-2xl p-6" style={{ borderColor: sim.color }}>
                  <h3 className="text-xl font-bold mb-4" style={{ color: sim.color }}>
                    {sim.title}
                  </h3>

                  <div
                    className="p-4 rounded-xl mb-4"
                    style={{
                      backgroundColor: sim.metrics.isStable ? '#f1f8f6' : '#fdeaea',
                    }}
                  >
                    <p className="font-bold text-sm" style={{ color: getStatusColor(sim.metrics.isStable) }}>
                      {getStatusMessage(sim.metrics.isStable, parseFloat(sim.metrics.rho))}
                    </p>
                    <p className="text-xs mt-2" style={{ color: '#333' }}>
                      ρ = {(sim.metrics.rho * 100).toFixed(1)}% (λ = {sim.metrics.lambdaReal} clientes/hora, μ = {sim.metrics.muReal} clientes/hora)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#fef8e8' }}>
                      <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Órdenes</span>
                      <span className="text-lg font-bold" style={{ color: '#cb691c' }}>{sim.metrics.totalClients}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                      <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Personas</span>
                      <span className="text-sm font-bold" style={{ color: '#4caf50' }}>{sim.metrics.totalPeople}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                      <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Abandonos</span>
                      <span className="text-sm font-bold" style={{ color: '#f44336' }}>
                        {sim.metrics.abandonedClients} ({sim.metrics.abandonmentRate.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                      <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>T. Cola</span>
                      <span className="text-sm font-bold" style={{ color: '#cb691c' }}>{sim.metrics.avgQueueTime} min</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                      <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Ingresos</span>
                      <span className="text-sm font-bold" style={{ color: '#4caf50' }}>Q{(sim.metrics.totalRevenue).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                      <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Costos (Productos)</span>
                      <span className="text-sm font-bold" style={{ color: '#f44336' }}>Q{(sim.metrics.totalCost)}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                      <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Tasa de llegada</span>
                      <span className="text-sm font-bold" style={{ color: '#cb691c' }}>{(sim.metrics.lambdaReal)} clientes/hora</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                      <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Tasa de servicio</span>
                      <span className="text-sm font-bold" style={{ color: '#cb691c' }}>{(sim.metrics.muReal)} clientes/hora</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                      <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Tiempo Promedio en Cola</span>
                      <span className="text-sm font-bold" style={{ color: '#cb691c' }}>{(sim.metrics.avgQueueTime)} min</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                      <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Tiempo Promedio de Servicio</span>
                      <span className="text-sm font-bold" style={{ color: '#cb691c' }}>{(sim.metrics.avgServiceTime)} min</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                      <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Tiempo Promedio en Sistema</span>
                      <span className="text-sm font-bold" style={{ color: '#cb691c' }}>{(sim.metrics.avgTotalTime)} min</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                      <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Tiempo Mínimo en Cola</span>
                      <span className="text-sm font-bold" style={{ color: '#cb691c' }}>{(sim.metrics.minQueueTime)} min</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                      <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Tiempo Máximo en Cola</span>
                      <span className="text-sm font-bold" style={{ color: '#cb691c' }}>{(sim.metrics.maxQueueTime)} min</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Promedios */}
            <div className="mt-6 p-6 rounded-2xl" style={{ backgroundColor: '#fef8e8', borderLeft: '4px solid #fbd816' }}>
              <h3 className="font-bold text-lg mb-4" style={{ color: '#6c341e' }}>
                Promedios de las 3 Simulaciones
              </h3>
              <div className="grid grid-cols-5 gap-4">
                <div>
                  <p className="text-sm" style={{ color: '#666' }}>Órdenes:</p>
                  <p className="text-xl font-bold" style={{ color: '#cb691c' }}>
                    {Math.round((metrics1.totalClients + metrics2.totalClients + metrics3.totalClients) / 3)}
                  </p>
                </div>
                <div>
                  <p className="text-sm" style={{ color: '#666' }}>Personas:</p>
                  <p className="text-xl font-bold" style={{ color: '#4caf50' }}>
                    {Math.round((metrics1.totalPeople + metrics2.totalPeople + metrics3.totalPeople) / 3)}
                  </p>
                </div>
                <div>
                  <p className="text-sm" style={{ color: '#666' }}>Abandonos:</p>
                  <p className="text-xl font-bold" style={{ color: '#f44336' }}>
                    {Math.round((metrics1.abandonedClients + metrics2.abandonedClients + metrics3.abandonedClients) / 3)}
                  </p>
                </div>
                <div>
                  <p className="text-sm" style={{ color: '#666' }}>Ingresos:</p>
                  <p className="text-xl font-bold" style={{ color: '#4caf50' }}>
                    Q{((metrics1.totalRevenue + metrics2.totalRevenue + metrics3.totalRevenue) / 3).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Info del período */}
            <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: '#f0f0f0' }}>
              <p className="text-sm" style={{ color: '#666' }}>
                Período: <strong>{metrics1.daysSimulated} día(s)</strong> × <strong>{metrics1.hoursPerDay} hora(s)</strong> = <strong>{metrics1.totalHoursSimulated} horas totales</strong>
              </p>
              <p className="text-sm mt-2" style={{ color: '#666' }}>
                Horas: {metrics1.selectedPeriods}
              </p>
            </div>
          </div>

          {/* Tablas de datos */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { data: simulation1, title: 'Simulación #1', color: '#cb691c' },
              { data: simulation2, title: 'Simulación #2', color: '#6c341e' },
              { data: simulation3, title: 'Simulación #3', color: '#fbd816' }
            ].map((sim, idx) => (
              <div key={idx} className="bg-white rounded-3xl p-4 shadow-lg">
                <h3 className="text-lg font-bold mb-3" style={{ color: sim.color }}>
                  {sim.title} ({sim.data.length})
                </h3>
                <div className="overflow-auto" style={{ maxHeight: '500px' }}>
                  <table className="w-full border-collapse text-xs">
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr style={{ backgroundColor: sim.color }}>
                        <th className="px-1 py-2 text-left" style={{ fontSize: '9px', color: idx === 2 ? '#6c341e' : '#fff' }}>Día</th>
                        <th className="px-1 py-2 text-center" style={{ fontSize: '9px', color: idx === 2 ? '#6c341e' : '#fff' }}>No.</th>
                        <th className="px-1 py-2 text-center" style={{ fontSize: '9px', color: idx === 2 ? '#6c341e' : '#fff' }}>Clients</th>
                        <th className="px-1 py-2 text-center" style={{ fontSize: '9px', color: idx === 2 ? '#6c341e' : '#fff' }}>Entrada</th>
                        <th className="px-1 py-2 text-center" style={{ fontSize: '9px', color: idx === 2 ? '#6c341e' : '#fff' }}>Atendida</th>
                        <th className="px-1 py-2 text-center" style={{ fontSize: '9px', color: idx === 2 ? '#6c341e' : '#fff' }}>Salida</th>
                        <th className="px-1 py-2 text-center" style={{ fontSize: '9px', color: idx === 2 ? '#6c341e' : '#fff' }}>Cola</th>
                        <th className="px-1 py-2 text-center" style={{ fontSize: '9px', color: idx === 2 ? '#6c341e' : '#fff' }}>Total</th>
                        <th className="px-1 py-2 text-center" style={{ fontSize: '9px', color: idx === 2 ? '#6c341e' : '#fff' }}>Producto</th>
                        <th className="px-1 py-2 text-center" style={{ fontSize: '9px', color: idx === 2 ? '#6c341e' : '#fff' }}>Costo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sim.data.map((row, rowIdx) => (
                        <tr key={rowIdx} style={{ backgroundColor: rowIdx % 2 === 0 ? '#f9f9f9' : '#fff' }}>
                          <td className="px-1 py-1" style={{ fontSize: '9px', color: '#6c341e' }}>{row.day}</td>
                          <td className="px-1 py-1 text-center" style={{ fontSize: '9px', color: '#666' }}>{row.order}</td>
                          <td className="px-1 py-1 text-center font-bold" style={{ fontSize: '9px', color: '#4caf50' }}>{row.numClients}</td>
                          <td className="px-1 py-1 text-center" style={{ fontSize: '9px', color: '#666' }}>{row.entryTime}</td>
                          <td className="px-1 py-1 text-center" style={{ fontSize: '9px', color: '#666' }}>{row.attendedTime}</td>
                          <td className="px-1 py-1 text-center" style={{ fontSize: '9px', color: '#666' }}>{row.exitTime}</td>
                          <td className="px-1 py-1 text-center font-semibold" style={{ fontSize: '9px', color: '#cb691c' }}>
                            {row.queueTimeFormatted}
                          </td>
                          <td className="px-1 py-1 text-center font-semibold" style={{ fontSize: '9px', color: '#6c341e' }}>
                            {row.totalTimeFormatted}
                          </td>
                          <td className="px-1 py-1 text-center" style={{ fontSize: '9px', color: '#cb691c' }}>
                            {row.products.map((p, i) => (
                              <div key={i}>{p.nombre}</div>
                            ))}
                          </td>
                          <td className="px-1 py-1 text-center" style={{ fontSize: '9px', color: '#6c341e' }}>Q{row.orderTotal}.00</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Productos */}
      <div className="space-y-6">
        {/* Tablas de datos */}
          <div className="grid grid-cols-1 gap-4">
            {[
              { data: productList, title: 'Productos', color: '#cb691c' }
            ].map((sim, idx) => (
              <div key={idx} className="bg-white rounded-3xl p-4 shadow-lg">
                <h3 className="text-lg font-bold mb-3 bg-white" style={{ color: '#6c341e' }}>
                  Productos de Pollo Campero
                </h3>
                <div className="overflow-auto" style={{ maxHeight: '500px' }}>
                  <table className="w-full border-collapse text-xs">
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr style={{ backgroundColor: '#6c341e' }}>
                        <th className="px-1 py-2 text-left" style={{ fontSize: '9px', color: idx === 2 ? '#6c341e' : '#fff' }}>No.</th>
                        <th className="px-1 py-2 text-center" style={{ fontSize: '9px', color: idx === 2 ? '#6c341e' : '#fff' }}>Nombre</th>
                        <th className="px-1 py-2 text-center" style={{ fontSize: '9px', color: idx === 2 ? '#6c341e' : '#fff' }}>Precio de Venta</th>
                        <th className="px-1 py-2 text-center" style={{ fontSize: '9px', color: idx === 2 ? '#6c341e' : '#fff' }}>Precio de Costo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sim.data.map((row, rowIdx) => (
                        <tr key={rowIdx} style={{ backgroundColor: rowIdx % 2 === 0 ? '#f9f9f9' : '#fff' }}>
                          <td className="px-1 py-1" style={{ fontSize: '9px', color: '#6c341e' }}>{row.idProductos + 1}</td>
                          <td className="px-1 py-1 text-center" style={{ fontSize: '9px', color: '#666' }}>{row.nombre}</td>
                          <td className="px-1 py-1 text-center font-bold" style={{ fontSize: '9px', color: '#4caf50' }}>Q{(row.precio_venta).toFixed(2)}</td>
                          <td className="px-1 py-1 text-center" style={{ fontSize: '9px', color: '#666' }}>Q{row.precio_costo.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
      </div>
    </div>
  )
}