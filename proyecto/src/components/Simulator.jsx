import { useState } from 'react'
import { durationToMinutes, minutesToTime, timeOfDayToMinutes } from '../utils/queueCalculations'

export default function Simulator({ analysisParams, originalData }) {
  // Tipo de simulación: 'hora', 'semana' o 'mes'
  const [simulationType, setSimulationType] = useState('hora')
  // Horas permitidas: '13-14', '14-15', '15-16'
  const [selectedHour, setSelectedHour] = useState('13-14')
  // Duración: 1 día, 1 semana o 1 mes
  const [duration, setDuration] = useState(1)
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulatedData, setSimulatedData] = useState(null)
  const [metrics, setMetrics] = useState(null)

  const allowedHours = [
    { label: '13:00 - 14:00', value: '13-14', start: 13, end: 14 },
    { label: '14:00 - 15:00', value: '14-15', start: 14, end: 15 },
    { label: '15:00 - 16:00', value: '15-16', start: 15, end: 16 }
  ]

  const getStartTime = () => {
    const [start] = selectedHour.split('-').map(Number)
    return `${String(start).padStart(2, '0')}:00`
  }

  const handleSimulate = async () => {
    if (!analysisParams) return
    
    setIsSimulating(true)
    
    // Simular con pequeño delay para que se vea la animación
    setTimeout(() => {
      try {
        const { lambda, mu, avgServiceTime } = analysisParams
        
        // Calcular número de días a simular
        let daysToSimulate = duration
        if (simulationType === 'semana') {
          daysToSimulate = duration * 7
        } else if (simulationType === 'mes') {
          daysToSimulate = duration * 30
        }
        
        // Obtener las horas permitidas
        const hourConfig = allowedHours.find(h => h.value === selectedHour)
        const startHour = hourConfig.start
        const startTimeMinutes = startHour * 60 // En minutos desde medianoche
        const simulationDurationPerDay = 60 // 1 hora de simulación por día

        // Simular para cada día
        let allSimulated = []
        let dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
        
        for (let dayIdx = 0; dayIdx < daysToSimulate; dayIdx++) {
          const dayName = dayNames[dayIdx % 7]
          const endTimeMinutes = startTimeMinutes + simulationDurationPerDay

          // Generar llegadas usando distribución de Poisson para este día
          const arrivals = []
          let currentTime = startTimeMinutes
          let order = 1

          while (currentTime < endTimeMinutes) {
            // Tiempo entre llegadas ~ Exponencial (parámetro lambda en clientes/minuto)
            const timeBetweenArrivals = -Math.log(Math.random()) / lambda
            currentTime += timeBetweenArrivals

            if (currentTime < endTimeMinutes) {
              arrivals.push({
                order: order++,
                arrivalTime: currentTime
              })
            }
          }

          // Simular servicio para cada cliente
          let serverBusyUntil = startTimeMinutes

          arrivals.forEach(arrival => {
            // Tiempo de servicio ~ Exponencial (parámetro mu en clientes/minuto)
            const serviceTime = -Math.log(Math.random()) / mu

            const entryTime = arrival.arrivalTime
            const startServiceTime = Math.max(serverBusyUntil, entryTime)
            const endServiceTime = startServiceTime + serviceTime
            const queueTime = startServiceTime - entryTime

            // Marcar como abandono si la espera es muy larga (> 30 minutos)
            const abandoned = queueTime > 30

            allSimulated.push({
              day: dayName,
              dayNumber: dayIdx + 1,
              order: arrival.order,
              entryTime: convertMinutesToTimeString(entryTime),
              attendedTime: convertMinutesToTimeString(startServiceTime),
              exitTime: convertMinutesToTimeString(endServiceTime),
              queueTime: parseFloat(queueTime.toFixed(2)),
              serviceTime: parseFloat(serviceTime.toFixed(2)),
              totalTime: parseFloat((queueTime + serviceTime).toFixed(2)),
              abandoned
            })

            serverBusyUntil = endServiceTime
          })
        }

        setSimulatedData(allSimulated)

        // Calcular métricas
        const completedClients = allSimulated.filter(s => !s.abandoned).length
        const abandonedClients = allSimulated.filter(s => s.abandoned).length
        const avgQueueTime = completedClients > 0
          ? allSimulated.reduce((sum, s) => sum + s.queueTime, 0) / completedClients
          : 0
        const avgTotalTime = completedClients > 0
          ? allSimulated.reduce((sum, s) => sum + s.totalTime, 0) / completedClients
          : 0

        const calcMetrics = {
          lambda: (lambda * 60).toFixed(2),
          mu: (mu * 60).toFixed(2),
          rho: (lambda / mu).toFixed(2),
          totalRecords: allSimulated.length,
          completedClients,
          abandonedClients,
          abandonmentPercentage: allSimulated.length > 0
            ? ((abandonedClients / allSimulated.length) * 100).toFixed(1)
            : 0,
          utilization: ((lambda / mu) * 100).toFixed(1),
          isStable: lambda < mu,
          avgQueueTime: parseFloat(avgQueueTime.toFixed(2)),
          avgServiceTime: parseFloat(avgServiceTime.toFixed(2)),
          avgTotalTime: parseFloat(avgTotalTime.toFixed(2)),
          daysSimulated: daysToSimulate,
          hoursPerDay: simulationDurationPerDay / 60,
          totalHoursSimulated: (daysToSimulate * simulationDurationPerDay) / 60
        }

        setMetrics(calcMetrics)
      } catch (error) {
        console.error('Error en simulación:', error)
      }
      
      setIsSimulating(false)
    }, 500)
  }

  const convertMinutesToTimeString = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.floor(minutes % 60)
    const secs = Math.round((minutes % 1) * 60)
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
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

  if (!analysisParams) {
    return (
      <div className="bg-yellow-50 p-8 rounded-3xl shadow-sm border border-yellow-200">
        <p className="text-yellow-700 font-semibold">
          Por favor, carga datos en la sección "Análisis de Datos" primero.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Controles de Simulación */}
      <div className="bg-white rounded-3xl p-8 shadow-lg">
        <h2 className="text-2xl font-bold mb-6" style={{ color: '#6c341e' }}>
          Simulador de Sistemas
        </h2>

        <div className="space-y-6">
          {/* Selector de Hora Permitida */}
          <div>
            <label className="block font-semibold mb-3" style={{ color: '#6c341e' }}>
              Seleccionar Hora (Horario de Observación)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {allowedHours.map(hour => (
                <button
                  key={hour.value}
                  onClick={() => setSelectedHour(hour.value)}
                  className="py-3 px-4 rounded-xl font-semibold transition"
                  style={{
                    backgroundColor: selectedHour === hour.value ? '#6c341e' : '#f0f0f0',
                    color: selectedHour === hour.value ? '#fbd816' : '#6c341e',
                    borderWidth: selectedHour === hour.value ? '2px' : '0px',
                    borderColor: '#cb691c',
                  }}
                >
                  {hour.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Estas son las horas en las que se realizaron las observaciones
            </p>
          </div>

          {/* Selector de Tipo de Simulación */}
          <div>
            <label className="block font-semibold mb-3" style={{ color: '#6c341e' }}>
              Tipo de Simulación
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'hora', label: 'Por Hora' },
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
              Duración de la Simulación
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
                      {h} hora{h > 1 ? 's' : ''}
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

          {/* Resumen de la Simulación */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: '#fef8e8' }}>
            <p className="text-sm font-semibold" style={{ color: '#6c341e' }}>
              Resumen: Simularás {
                simulationType === 'hora' 
                  ? `${duration} hora${duration > 1 ? 's' : ''} (${duration * 60} minutos)`
                  : simulationType === 'semana'
                    ? `${duration} semana${duration > 1 ? 's' : ''} (${duration * 7} días × 1 hora)`
                    : `${duration} mes${duration > 1 ? 'es' : ''} (${duration * 30} días × 1 hora)`
              } de 
              {selectedHour.split('-')[0]}:00 a {selectedHour.split('-')[1]}:00
            </p>
          </div>

          {/* Botón Simular */}
          <div className="pt-4">
            <button
              onClick={handleSimulate}
              disabled={isSimulating || !analysisParams}
              className="w-full py-3 px-6 rounded-2xl font-bold text-lg transition transform hover:scale-105 active:scale-95"
              style={{
                backgroundColor: '#cb691c',
                color: '#fbd816',
                opacity: isSimulating || !analysisParams ? 0.7 : 1,
              }}
            >
              {isSimulating ? 'Simulando...' : 'Iniciar Simulación'}
            </button>
          </div>
        </div>
      </div>

      {/* Resultados */}
      {metrics && (
        <div className="space-y-6">
          {/* Resumen de Métricas */}
          <div className="bg-white rounded-3xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#6c341e' }}>
              Resumen de Simulación
            </h2>

            {/* Estado del Sistema */}
            <div
              className="p-4 rounded-2xl border-2 mb-6"
              style={{
                backgroundColor: metrics.isStable ? '#f1f8f6' : '#fdeaea',
                borderColor: getStatusColor(metrics.isStable),
              }}
            >
              <p
                className="font-bold text-lg"
                style={{ color: getStatusColor(metrics.isStable) }}
              >
                {getStatusMessage(metrics.isStable, parseFloat(metrics.rho))}
              </p>
              <p style={{ color: '#333', marginTop: '8px' }}>
                Factor de utilización (ρ): {metrics.rho} ({metrics.utilization}%)
              </p>
              {metrics.daysSimulated && (
                <p style={{ color: '#666', marginTop: '4px', fontSize: '0.9rem' }}>
                  Período de observación: {metrics.daysSimulated} día{metrics.daysSimulated > 1 ? 's' : ''} × {metrics.hoursPerDay} hora{metrics.hoursPerDay > 1 ? 's' : ''} = {metrics.totalHoursSimulated} horas
                </p>
              )}
            </div>

            {/* Grid de métricas principales */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#fbd816' }}>
                <p className="text-xs" style={{ color: '#6c341e' }}>Total de Clientes</p>
                <p className="text-2xl font-bold" style={{ color: '#6c341e' }}>
                  {metrics.totalRecords}
                </p>
              </div>

              <div className="p-4 rounded-xl" style={{ backgroundColor: '#f0f0f0' }}>
                <p className="text-xs" style={{ color: '#666' }}>Clientes Completados</p>
                <p className="text-2xl font-bold" style={{ color: '#cb691c' }}>
                  {metrics.completedClients}
                </p>
              </div>

              <div className="p-4 rounded-xl" style={{ backgroundColor: '#f0f0f0' }}>
                <p className="text-xs" style={{ color: '#666' }}>Abandonos</p>
                <p className="text-2xl font-bold" style={{ color: '#f44336' }}>
                  {metrics.abandonedClients} ({metrics.abandonmentPercentage}%)
                </p>
              </div>

              <div className="p-4 rounded-xl" style={{ backgroundColor: '#f0f0f0' }}>
                <p className="text-xs" style={{ color: '#666' }}>Utilización</p>
                <p className="text-2xl font-bold" style={{ color: metrics.isStable ? '#cb691c' : '#f44336' }}>
                  {metrics.utilization}%
                </p>
              </div>
            </div>

            {/* Parámetros del Modelo M/M/1 */}
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-3" style={{ color: '#6c341e' }}>
                Parámetros del Modelo M/M/1
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#f0f0f0' }}>
                  <p className="text-xs" style={{ color: '#666' }}>Tasa de Llegada (λ)</p>
                  <p className="text-xl font-bold" style={{ color: '#cb691c' }}>
                    {metrics.lambda} clientes/hora
                  </p>
                </div>

                <div className="p-4 rounded-xl" style={{ backgroundColor: '#f0f0f0' }}>
                  <p className="text-xs" style={{ color: '#666' }}>Tasa de Servicio (μ)</p>
                  <p className="text-xl font-bold" style={{ color: '#cb691c' }}>
                    {metrics.mu} clientes/hora
                  </p>
                </div>
              </div>
            </div>

            {/* Tiempos Promedio */}
            <div>
              <h3 className="font-bold text-lg mb-3" style={{ color: '#6c341e' }}>
                Tiempos Promedio
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#f0f0f0' }}>
                  <p className="text-xs" style={{ color: '#666' }}>Espera en Cola (Wq)</p>
                  <p className="text-xl font-bold" style={{ color: '#cb691c' }}>
                    {metrics.avgQueueTime} min
                  </p>
                </div>

                <div className="p-4 rounded-xl" style={{ backgroundColor: '#f0f0f0' }}>
                  <p className="text-xs" style={{ color: '#666' }}>Tiempo de Servicio</p>
                  <p className="text-xl font-bold" style={{ color: '#cb691c' }}>
                    {metrics.avgServiceTime} min
                  </p>
                </div>

                <div className="p-4 rounded-xl" style={{ backgroundColor: '#f0f0f0' }}>
                  <p className="text-xs" style={{ color: '#666' }}>Tiempo Total (W)</p>
                  <p className="text-xl font-bold" style={{ color: '#cb691c' }}>
                    {metrics.avgTotalTime} min
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Datos Simulados */}
          <div className="bg-white rounded-3xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#6c341e' }}>
              Datos Simulados ({simulatedData.length} registros)
            </h2>

            <div className="overflow-x-auto" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table className="w-full border-collapse">
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr style={{ backgroundColor: '#6c341e' }}>
                    <th className="px-4 py-3 text-left text-white font-semibold">Día</th>
                    <th className="px-4 py-3 text-center text-white font-semibold">Orden</th>
                    <th className="px-4 py-3 text-center text-white font-semibold">Hora Entrada</th>
                    <th className="px-4 py-3 text-center text-white font-semibold">Hora Atendida</th>
                    <th className="px-4 py-3 text-center text-white font-semibold">Hora Salida</th>
                    <th className="px-4 py-3 text-center text-white font-semibold">Tiempo en Cola</th>
                    <th className="px-4 py-3 text-center text-white font-semibold">Tiempo de Servicio</th>
                    <th className="px-4 py-3 text-center text-white font-semibold">Tiempo Total</th>
                    <th className="px-4 py-3 text-center text-white font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {simulatedData.slice(0, 250).map((row, idx) => (
                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#f9f9f9' : '#fff', borderBottom: '1px solid #eee' }}>
                      <td className="px-4 py-3" style={{ color: '#6c341e', fontWeight: 500 }}>
                        {row.day}
                      </td>
                      <td className="px-4 py-3 text-center" style={{ color: '#666' }}>
                        {row.order}
                      </td>
                      <td className="px-4 py-3 text-center" style={{ color: '#666' }}>
                        {row.entryTime}
                      </td>
                      <td className="px-4 py-3 text-center" style={{ color: '#666' }}>
                        {row.attendedTime || '-'}
                      </td>
                      <td className="px-4 py-3 text-center" style={{ color: '#666' }}>
                        {row.exitTime || '-'}
                      </td>
                      <td className="px-4 py-3 text-center" style={{ color: '#cb691c', fontWeight: 500 }}>
                        {row.queueTime ? `${row.queueTime} min` : '-'}
                      </td>
                      <td className="px-4 py-3 text-center" style={{ color: '#cb691c', fontWeight: 500 }}>
                        {row.serviceTime ? `${row.serviceTime} min` : '-'}
                      </td>
                      <td className="px-4 py-3 text-center" style={{ color: '#cb691c', fontWeight: 500 }}>
                        {row.totalTime ? `${row.totalTime} min` : '-'}
                      </td>
                      <td className="px-4 py-3 text-center" style={{ color: row.abandoned ? '#c62828' : '#2e7d32', fontWeight: 500 }}>
                        <span
                          className="px-2 py-1 rounded-full text-sm font-semibold"
                          style={{
                            backgroundColor: row.abandoned ? '#ffebee' : '#e8f5e9',
                            color: row.abandoned ? '#c62828' : '#2e7d32',
                          }}
                        >
                          {row.abandoned ? 'Abandono' : 'Completado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {simulatedData.length > 250 && (
                <div className="p-4 text-center text-sm" style={{ color: '#666', backgroundColor: '#f5f5f5' }}>
                  Mostrando 250 de {simulatedData.length} registros
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}