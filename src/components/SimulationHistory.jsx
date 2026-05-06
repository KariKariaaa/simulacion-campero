import { useState, useEffect, useRef } from 'react'
import { useReactToPrint } from "react-to-print";
import { supabase } from '../supabaseClient'

export default function SimulationHistory() {
  const currentPrintRef = useRef(null);
  const printRefs = useRef({});
  const printRef = useRef(null);
  const [simulations, setSimulations] = useState([])
  const [selectedSimId, setSelectedSimId] = useState(null)
  const [selectedScenario, setSelectedScenario] = useState(1)
  const [scenarios, setScenarios] = useState({
    1: [],
    2: [],
    3: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [simDetails, setSimDetails] = useState(null)
  const [productos, setProductos] = useState([])
  const [expenses, setExpenses] = useState([])
  const [metrics1, setMetrics1] = useState(null)
  const [metrics2, setMetrics2] = useState(null)
  const [metrics3, setMetrics3] = useState(null)

  // Cargar lista de simulaciones
  useEffect(() => {
    fetchSimulations()
    fetchProductos()
    fetchExpenses()
  }, [])

  const fetchProductos = async () => {
    try {
      const { data, error: dbError } = await supabase
        .from('tbProductos')
        .select('*')

      if (dbError) throw dbError
      setProductos(data || [])
    } catch (err) {
      console.error('Error al cargar productos:', err)
    }
  }

  const fetchExpenses = async () => {
    try {
      const { data, error: dbError } = await supabase
        .from('tbGastos')
        .select('*')

      if (dbError) throw dbError
      setExpenses(data || [])
    } catch (err) {
      console.error('Error al cargar gastos:', err)
    }
  }

  const fetchSimulations = async () => {
    try {
      setLoading(true)
      const { data, error: dbError } = await supabase
        .from('tbSimulacion')
        .select('*')
        .order('fecha', { ascending: false })

      if (dbError) throw dbError
      setSimulations(data || [])
      if (data && data.length > 0) {
        setSelectedSimId(data[0].idSimulacion)
      }
    } catch (err) {
      setError('Error al cargar simulaciones: ' + err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Cargar escenarios cuando se selecciona una simulación
  useEffect(() => {
    if (selectedSimId) {
      fetchScenarios(selectedSimId)
      // Obtener detalles de la simulación
      const sim = simulations.find(s => s.idSimulacion === selectedSimId)
      setSimDetails(sim)
    }
  }, [selectedSimId, productos, expenses])


  const fetchScenarios = async (idSim) => {
    try {
      setLoading(true)

      const tables = ['tbEscenario1', 'tbEscenario2', 'tbEscenario3']

      const newScenarios = {
        1: [],
        2: [],
        3: []
      }

      for (let i = 0; i < tables.length; i++) {
        const rows = await fetchAllRows(tables[i], idSim)
        newScenarios[i + 1] = rows
      }

      setScenarios(newScenarios)
      setSelectedScenario(1)
      setError('')

      // Calcular métricas para cada escenario
      const sim = simulations.find(s => s.idSimulacion === idSim)
      const totalHours = sim ? sim.horas : 0

      const met1 = calculateScenarioMetrics(newScenarios[1].map(formatData), totalHours)
      const met2 = calculateScenarioMetrics(newScenarios[2].map(formatData), totalHours)
      const met3 = calculateScenarioMetrics(newScenarios[3].map(formatData), totalHours)

      setMetrics1(met1)
      setMetrics2(met2)
      setMetrics3(met3)

    } catch (err) {
      setError('Error al cargar escenarios: ' + err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllRows = async (tableName, idSim) => {
    const pageSize = 1000
    let from = 0
    let to = pageSize - 1
    let allRows = []
    let hasMore = true

    while (hasMore) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('idSimulacion', idSim)
        .range(from, to)

      if (error) throw error

      allRows = [...allRows, ...(data || [])]

      if (!data || data.length < pageSize) {
        hasMore = false
      } else {
        from += pageSize
        to += pageSize
      }
    }

    return allRows
  }


  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0
    const parts = timeStr.split(':')
    const hours = parseInt(parts[0]) || 0
    const minutes = parseInt(parts[1]) || 0
    const seconds = parseInt(parts[2]) || 0
    return hours * 60 + minutes + seconds / 60
  }

  const minutesToTimeFormat = (minutes) => {
    if (minutes === 0 || isNaN(minutes)) return '00:00'
    const mins = Math.floor(minutes)
    const secs = Math.round((minutes % 1) * 60)
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const formatData = (dbRow) => {
    const queueMinutes = timeToMinutes(dbRow.cola)
    const totalMinutes = timeToMinutes(dbRow.total)

    return {
      day: dbRow.dia,
      order: dbRow.no_orden,
      numClients: dbRow.no_clientes,
      entryTime: dbRow.entrada || '',
      attendedTime: dbRow.atendida || '',
      exitTime: dbRow.salida || '',
      queueTimeFormatted: minutesToTimeFormat(queueMinutes),
      totalTimeFormatted: minutesToTimeFormat(totalMinutes),
      queueTime: queueMinutes,
      totalTime: totalMinutes,
      products: dbRow.producto ? [{ nombre: dbRow.producto }] : [],
      orderTotal: dbRow.costo ? dbRow.costo : 0,
      orderTotalCost: 0 // Se calculará buscando los productos
    }
  }

  // Buscar el costo de un producto por nombre
  const findProductCost = (productName) => {
    if (!productName) return 0
    const product = productos.find(p => productName.includes(p.nombre))
    return product ? product.precio_costo : 0
  }

  // Calcular métricas para un escenario
  const calculateScenarioMetrics = (scenarioData, totalHoursSimulated) => {
    if (!scenarioData || scenarioData.length === 0) {
      return {
        totalClients: 0,
        totalPeople: 0,
        completedClients: 0,
        abandonedClients: 0,
        abandonmentRate: 0,
        lambdaReal: 0,
        muReal: 0,
        rho: 0,
        utilization: 0,
        avgQueueTime: '00:00',
        avgServiceTime: '00:00',
        avgTotalTime: '00:00',
        minQueueTime: '00:00',
        maxQueueTime: '00:00',
        totalRevenue: 0,
        totalCost: 0,
        avgOrderValue: 0,
        operationalExpenses: 0,
        totalExpenses: 0,
        profit: 0,
        isStable: false
      }
    }

    const totalClients = scenarioData.length
    const completedClients = scenarioData
    const abandonedClients = [] // Los datos históricos ya están filtrados

    // Calcular total de personas
    const totalPeople = scenarioData.reduce((sum, c) => sum + c.numClients, 0)

    // Calcular ingresos (costo = precio venta)
    const totalRevenue = scenarioData.reduce((sum, c) => sum + c.orderTotal, 0)

    // Calcular costos (buscar costo unitario de cada producto)
    const totalCost = scenarioData.reduce((sum, c) => {
      const productName = c.products && c.products[0] ? c.products[0].nombre : ''
      const unitCost = findProductCost(productName)
      return sum + unitCost
    }, 0)

    const avgOrderValue = totalClients > 0 ? totalRevenue / totalClients : 0

    // Tiempo total de simulación (en minutos)
    const firstEntry = Math.min(...scenarioData.map(c => c.queueTime + c.totalTime - c.queueTime))
    const lastExit = Math.max(...scenarioData.map(c => c.totalTime))
    const totalTime = Math.max(1, lastExit - firstEntry)

    // λ REAL (clientes por minuto)
    const lambdaRealPerHour = totalClients / (totalHoursSimulated || 1)

    // Calcular tiempos de servicio y espera en minutos
    const avgQueueTimeMinutes = scenarioData.reduce((sum, c) => sum + c.queueTime, 0) / totalClients
    const avgServiceTimeMinutes = scenarioData.reduce((sum, c) => sum + (c.totalTime - c.queueTime), 0) / totalClients

    // μ REAL (clientes por hora)
    const muRealPerHour = avgServiceTimeMinutes > 0 ? 60 / avgServiceTimeMinutes : 0

    // ρ (utilización)
    const rho = muRealPerHour > 0 ? lambdaRealPerHour / muRealPerHour : 0

    // Promedios
    const avgQueueTime = avgQueueTimeMinutes
    const avgServiceTime = avgServiceTimeMinutes
    const avgTotalTime = scenarioData.reduce((sum, c) => sum + c.totalTime, 0) / totalClients

    // Min y Max cola
    const minQueueTime = Math.min(...scenarioData.map(c => c.queueTime))
    const maxQueueTime = Math.max(...scenarioData.map(c => c.queueTime))

    // Calcular gastos operacionales
    const operationalExpenses = calculateOperationalExpenses(totalHoursSimulated)

    const totalExpenses = totalCost + operationalExpenses
    const profit = totalRevenue - totalExpenses

    return {
      totalClients: totalClients,
      totalPeople: totalPeople,
      completedClients: totalClients,
      abandonedClients: 0,
      abandonmentRate: 0,
      lambdaReal: parseFloat(lambdaRealPerHour.toFixed(2)),
      muReal: parseFloat(muRealPerHour.toFixed(2)),
      rho: parseFloat(rho.toFixed(2)),
      utilization: parseFloat((rho * 100).toFixed(1)),
      avgQueueTime: minutesToTimeFormat(avgQueueTime),
      avgServiceTime: minutesToTimeFormat(avgServiceTime),
      avgTotalTime: minutesToTimeFormat(avgTotalTime),
      minQueueTime: minutesToTimeFormat(minQueueTime),
      maxQueueTime: minutesToTimeFormat(maxQueueTime),
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
      operationalExpenses: parseFloat(operationalExpenses.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      profit: parseFloat(profit.toFixed(2)),
      isStable: rho < 1
    }
  }

  // Calcular gastos operacionales basados en horas simuladas
  const calculateOperationalExpenses = (hoursSimulated) => {
    if (!expenses || expenses.length === 0) return 0

    const WORKING_HOURS_PER_DAY = 13

    const fixedExpenses = expenses.filter(e => e.tipo === 'Fijo')
    const variableExpenses = expenses.filter(e => e.tipo === 'Variable')

    const fixedTotalMonthly = fixedExpenses.reduce((sum, e) => sum + parseFloat(e.monto), 0)
    const variableTotalMonthly = variableExpenses.reduce((sum, e) => sum + parseFloat(e.monto), 0)

    const fixedHourly = fixedTotalMonthly / WORKING_HOURS_PER_DAY
    const variableHourly = variableTotalMonthly / WORKING_HOURS_PER_DAY

    const fixedTotal = (hoursSimulated || 0) * fixedHourly
    const variableTotal = (hoursSimulated || 0) * variableHourly

    return fixedTotal + variableTotal
  }

  const getStatusColor = (stable) => {
    return stable ? '#27ae60' : '#e74c3c'
  }

  const getStatusMessage = (stable, rho) => {
    if (stable) {
      return `✓ Sistema Estable (ρ = ${(rho * 100).toFixed(1)}%)`
    } else {
      return `✗ Sistema Inestable (ρ = ${(rho * 100).toFixed(1)}%)`
    }
  }

  // Crear breakdown de gastos
  const getExpensesBreakdown = () => {
    if (!expenses || expenses.length === 0) return []

    const WORKING_HOURS_PER_DAY = 13
    const totalHours = simDetails ? simDetails.horas : 0

    return expenses.map(e => {
      const monthlyAmount = parseFloat(e.monto)
      const hourlyAmount = monthlyAmount / WORKING_HOURS_PER_DAY
      const simulationAmount = hourlyAmount * totalHours

      return {
        nombre: e.nombre,
        tipo: e.tipo,
        montoMensual: monthlyAmount,
        montoPorHora: hourlyAmount,
        montoSimulacion: simulationAmount
      }
    })
  }

  const documentTitle = simDetails
  ? `${simDetails.tipoSimulacion} - ${simDetails.duracion} - ${simDetails.horas}h - ${new Date(simDetails.fecha).toLocaleDateString('es-ES')}`
  : 'Historial de Simulación';

  const generatePDF = useReactToPrint({
    contentRef: printRef,
    documentTitle,
    pageStyle: `
    @page {
        margin: 5mm;
    }
    * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
  `,
  });

const generateTablePDF = useReactToPrint({
  contentRef: currentPrintRef,
  documentTitle: simDetails
    ? `Escenario ${selectedScenario} - ${documentTitle}`
    : 'Escenario PDF',
  pageStyle: `
    @page {
        margin: 10mm;
    }
    button {
        display: none !important;
    }
    div[style*="max-height"] {
        max-height: none !important;
        overflow: visible !important;
        height: auto !important;
    }
    table {
        table-layout: auto !important;
        width: 100% !important;
    }
    * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
  `,
});

  const currentScenarioData = scenarios[selectedScenario].map(formatData)

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-8 shadow-lg">
        <h2 className="text-2xl font-bold mb-6" style={{ color: '#6c341e' }}>
          Historial de Simulaciones
        </h2>

        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200">
            <p className="text-red-700 font-semibold">{error}</p>
          </div>
        )}

        {loading && <p className="text-gray-600">Cargando...</p>}

        {simulations.length === 0 && !loading ? (
          <p className="text-gray-600 text-center py-8">
            No hay simulaciones guardadas. Crea una nueva simulación para verla en el historial.
          </p>
        ) : (
          <div className="space-y-6">
            {/* Selector de Simulación */}
            <div>
              <label className="block font-semibold mb-3" style={{ color: '#6c341e' }}>
                Seleccionar Simulación
              </label>
              <select
                value={selectedSimId || ''}
                onChange={(e) => setSelectedSimId(parseInt(e.target.value))}
                className="w-full p-3 rounded-xl border-2"
                style={{ borderColor: '#6c341e', color: '#6c341e' }}
              >
                {simulations.map((sim) => (
                  <option key={sim.idSimulacion} value={sim.idSimulacion}>
                    {sim.tipoSimulacion} ({sim.duracion}) - {sim.horas} horas - {new Date(sim.fecha).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </option>
                ))}
              </select>
            </div>

            {/* Detalles de la Simulación */}
            {simDetails && (
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#fef8e8', borderLeft: '4px solid #cb691c' }}>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p style={{ color: '#666' }}>Tipo:</p>
                    <p style={{ color: '#6c341e' }} className="font-bold">
                      {simDetails.tipoSimulacion}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: '#666' }}>Duración:</p>
                    <p style={{ color: '#6c341e' }} className="font-bold">
                      {simDetails.duracion}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: '#666' }}>Horas Simuladas:</p>
                    <p style={{ color: '#6c341e' }} className="font-bold">
                      {simDetails.horas}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: '#666' }}>Fecha:</p>
                    <p style={{ color: '#6c341e' }} className="font-bold">
                      {new Date(simDetails.fecha).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>
              </div>
            )}


            {/* Comparación de Métricas */}
            {metrics1 && metrics2 && metrics3 && (
              <div className="bg-white rounded-3xl p-8 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <h2 className="text-2xl font-bold mb-6" style={{ color: '#6c341e' }}>
                  Comparación de los 3 Escenarios
                </h2>
                <button
                  onClick={generatePDF}
                  className="print:hidden py-2 px-5 rounded-2xl font-bold text-sm transition transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: '#cb691c',
                    color: '#fbd816',
                    boxShadow: '0 4px 12px rgba(203, 105, 28, 0.3)'
                  }}
                >
                  Descargar PDF
                </button>
                </div>

                <div ref={printRef}>
                {/* Encabezado: oculto en pantalla, visible solo en PDF */}
                {simDetails && (
                  <div 
                    className="hidden print:block"
                    style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '2px solid #6c341e' }}
                  >
                    <p style={{ margin: 0, color: '#666' }}>
                      Reporte de Simulación {new Date(simDetails.fecha).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { metrics: metrics1, title: 'Escenario #1', color: '#cb691c' },
                    { metrics: metrics2, title: 'Escenario #2', color: '#6c341e' },
                    { metrics: metrics3, title: 'Escenario #3', color: '#fbd816' }
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
                          <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Ingresos</span>
                          <span className="text-sm font-bold" style={{ color: '#4caf50' }}>Q{(sim.metrics.totalRevenue).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                          <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Costos (Productos)</span>
                          <span className="text-sm font-bold" style={{ color: '#f44336' }}>Q{(sim.metrics.totalCost).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#fef0e8' }}>
                          <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Gastos Operacionales</span>
                          <span className="text-sm font-bold" style={{ color: '#d97706' }}>Q{(sim.metrics.operationalExpenses).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f5e6d3' }}>
                          <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Gastos Totales</span>
                          <span className="text-sm font-bold" style={{ color: '#dc2626' }}>Q{(sim.metrics.totalExpenses).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: sim.metrics.profit >= 0 ? '#f0fdf4' : '#fef2f2' }}>
                          <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Ganancia Neta</span>
                          <span className="text-sm font-bold" style={{ color: sim.metrics.profit >= 0 ? '#16a34a' : '#dc2626' }}>Q{(sim.metrics.profit).toFixed(2)}</span>
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
                          <span className="text-sm font-bold" style={{ color: '#cb691c' }}>{(sim.metrics.avgQueueTime)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                          <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Tiempo Promedio de Servicio</span>
                          <span className="text-sm font-bold" style={{ color: '#cb691c' }}>{(sim.metrics.avgServiceTime)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                          <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Tiempo Promedio en Sistema</span>
                          <span className="text-sm font-bold" style={{ color: '#cb691c' }}>{(sim.metrics.avgTotalTime)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                          <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Tiempo Mínimo en Cola</span>
                          <span className="text-sm font-bold" style={{ color: '#cb691c' }}>{(sim.metrics.minQueueTime)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
                          <span className="text-xs font-semibold" style={{ color: '#6c341e' }}>Tiempo Máximo en Cola</span>
                          <span className="text-sm font-bold" style={{ color: '#cb691c' }}>{(sim.metrics.maxQueueTime)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Promedios */}
                <div className="mt-6 p-6 rounded-2xl" style={{ backgroundColor: '#fef8e8', borderLeft: '4px solid #fbd816' }}>
                  <h3 className="font-bold text-lg mb-4" style={{ color: '#6c341e' }}>
                    Promedios de los 3 Escenarios
                  </h3>
                  <div className="grid grid-cols-6 gap-4">
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
                      <p className="text-sm" style={{ color: '#666' }}>Ingresos:</p>
                      <p className="text-xl font-bold" style={{ color: '#4caf50' }}>
                        Q{((metrics1.totalRevenue + metrics2.totalRevenue + metrics3.totalRevenue) / 3).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm" style={{ color: '#666' }}>Costos Op.:</p>
                      <p className="text-xl font-bold" style={{ color: '#d97706' }}>
                        Q{((metrics1.totalCost + metrics2.totalCost + metrics3.totalCost) / 3).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm" style={{ color: '#666' }}>Gastos Op.:</p>
                      <p className="text-xl font-bold" style={{ color: '#d97706' }}>
                        Q{((metrics1.operationalExpenses + metrics2.operationalExpenses + metrics3.operationalExpenses) / 3).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm" style={{ color: '#666' }}>Ganancia Neta:</p>
                      <p className="text-xl font-bold" style={{ color: ((metrics1.profit + metrics2.profit + metrics3.profit) / 3) >= 0 ? '#16a34a' : '#dc2626' }}>
                        Q{((metrics1.profit + metrics2.profit + metrics3.profit) / 3).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Info del período */}
                <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: '#f0f0f0' }}>
                  <p className="text-sm" style={{ color: '#666' }}>
                    Período: <strong>{simDetails?.tipoSimulacion}</strong> - Duración: <strong>{simDetails?.duracion}</strong> - Horas totales simuladas: <strong>{simDetails?.horas} horas</strong>
                  </p>
                </div>

                {/* Desglose de Gastos */}
                {expenses && expenses.length > 0 && (
                  <div className="mt-6 bg-white rounded-2xl p-6 shadow-lg border-l-4" style={{ borderLeftColor: '#d97706' }}>
                    <h3 className="font-bold text-lg mb-4" style={{ color: '#6c341e' }}>
                      Desglose de Gastos Operacionales
                    </h3>
                    <div className="overflow-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr style={{ backgroundColor: '#fef3e8' }}>
                            <th className="px-4 py-2 text-left" style={{ color: '#6c341e' }}>Gasto</th>
                            <th className="px-4 py-2 text-center" style={{ color: '#6c341e' }}>Tipo</th>
                            <th className="px-4 py-2 text-right" style={{ color: '#6c341e' }}>Monto Mensual</th>
                            <th className="px-4 py-2 text-right" style={{ color: '#6c341e' }}>Por Hora</th>
                            <th className="px-4 py-2 text-right" style={{ color: '#6c341e' }}>En Simulación</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getExpensesBreakdown().map((expense, idx) => (
                            <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fafaf9' : '#fff' }}>
                              <td className="px-4 py-2" style={{ color: '#333' }}>{expense.nombre}</td>
                              <td className="px-4 py-2 text-center" style={{ color: '#6c341e', fontWeight: 'bold' }}>
                                <span style={{
                                  backgroundColor: expense.tipo === 'Fijo' ? '#dbeafe' : '#fef3e8',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px'
                                }}>
                                  {expense.tipo}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right" style={{ color: '#666' }}>Q{expense.montoMensual.toFixed(2)}</td>
                              <td className="px-4 py-2 text-right" style={{ color: '#d97706' }}>Q{expense.montoPorHora.toFixed(2)}</td>
                              <td className="px-4 py-2 text-right font-bold" style={{ color: '#dc2626' }}>Q{expense.montoSimulacion.toFixed(2)}</td>
                            </tr>
                          ))}
                          <tr style={{ backgroundColor: '#fef3e8', fontWeight: 'bold' }}>
                            <td colSpan="2" className="px-4 py-2" style={{ color: '#6c341e' }}>TOTAL GASTOS</td>
                            <td className="px-4 py-2 text-right" style={{ color: '#6c341e' }}>-</td>
                            <td className="px-4 py-2 text-right" style={{ color: '#d97706' }}>
                              Q{getExpensesBreakdown().reduce((sum, e) => sum + e.montoPorHora, 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-right font-bold" style={{ color: '#dc2626' }}>
                              Q{getExpensesBreakdown().reduce((sum, e) => sum + e.montoSimulacion, 0).toFixed(2)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                </div>
              </div>
            )}

            {/* Selector de Escenarios */}
            <div>
              <label className="block font-semibold mb-3" style={{ color: '#6c341e' }}>
                Ver Escenario
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((num) => (
                  <button
                    key={num}
                    onClick={() => setSelectedScenario(num)}
                    className="py-3 px-4 rounded-xl font-semibold transition"
                    style={{
                      backgroundColor: selectedScenario === num ? '#6c341e' : '#f0f0f0',
                      color: selectedScenario === num ? '#fbd816' : '#6c341e',
                      borderWidth: selectedScenario === num ? '2px' : '0px',
                      borderColor: '#cb691c'
                    }}
                  >
                    Escenario {num}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Tabla del Escenario Seleccionado */}
            {currentScenarioData.length > 0 ? (
              <div ref={currentPrintRef} className="bg-white rounded-3xl p-4 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <h3
                    className="text-lg font-bold"
                    style={{ color: selectedScenario === 1 ? '#cb691c' : selectedScenario === 2 ? '#6c341e' : '#fbd816' }}
                  >
                    Escenario {selectedScenario} ({currentScenarioData.length} registros ) | {documentTitle}
                  </h3>
                  <button
                    onClick={generateTablePDF}
                    className="print:hidden py-3 px-5 rounded-2xl font-bold text-sm transition transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: '#6c341e',
                      color: '#fbd816',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
                    }}
                  >
                    Descargar tabla PDF
                  </button>
                </div>
                <div style={{ maxHeight: '600px', overflow:'auto' }}> {/*className="overflow-auto" style={{ maxHeight: '600px' }}*/}
                  <table  className="w-full border-collapse text-xs">
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr
                        style={{
                          backgroundColor: selectedScenario === 1 ? '#cb691c' : selectedScenario === 2 ? '#6c341e' : '#fbd816'
                        }}
                      >
                        <th
                          className="px-1 py-2 text-left"
                          style={{
                            fontSize: '9px',
                            color: selectedScenario === 3 ? '#6c341e' : '#fff'
                          }}
                        >
                          Día
                        </th>
                        <th
                          className="px-1 py-2 text-center"
                          style={{
                            fontSize: '9px',
                            color: selectedScenario === 3 ? '#6c341e' : '#fff'
                          }}
                        >
                          No.
                        </th>
                        <th
                          className="px-1 py-2 text-center"
                          style={{
                            fontSize: '9px',
                            color: selectedScenario === 3 ? '#6c341e' : '#fff'
                          }}
                        >
                          Clientes
                        </th>
                        <th
                          className="px-1 py-2 text-center"
                          style={{
                            fontSize: '9px',
                            color: selectedScenario === 3 ? '#6c341e' : '#fff'
                          }}
                        >
                          Entrada
                        </th>
                        <th
                          className="px-1 py-2 text-center"
                          style={{
                            fontSize: '9px',
                            color: selectedScenario === 3 ? '#6c341e' : '#fff'
                          }}
                        >
                          Atendida
                        </th>
                        <th
                          className="px-1 py-2 text-center"
                          style={{
                            fontSize: '9px',
                            color: selectedScenario === 3 ? '#6c341e' : '#fff'
                          }}
                        >
                          Salida
                        </th>
                        <th
                          className="px-1 py-2 text-center"
                          style={{
                            fontSize: '9px',
                            color: selectedScenario === 3 ? '#6c341e' : '#fff'
                          }}
                        >
                          Cola
                        </th>
                        <th
                          className="px-1 py-2 text-center"
                          style={{
                            fontSize: '9px',
                            color: selectedScenario === 3 ? '#6c341e' : '#fff'
                          }}
                        >
                          Total
                        </th>
                        <th
                          className="px-1 py-2 text-center"
                          style={{
                            fontSize: '9px',
                            color: selectedScenario === 3 ? '#6c341e' : '#fff'
                          }}
                        >
                          Producto
                        </th>
                        <th
                          className="px-1 py-2 text-center"
                          style={{
                            fontSize: '9px',
                            color: selectedScenario === 3 ? '#6c341e' : '#fff'
                          }}
                        >
                          Costo
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentScenarioData.map((row, idx) => (
                        <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#f9f9f9' : '#fff' }}>
                          <td className="px-1 py-1" style={{ fontSize: '9px', color: '#6c341e' }}>
                            {row.day}
                          </td>
                          <td className="px-1 py-1 text-center" style={{ fontSize: '9px', color: '#666' }}>
                            {row.order}
                          </td>
                          <td className="px-1 py-1 text-center font-bold" style={{ fontSize: '9px', color: '#4caf50' }}>
                            {row.numClients}
                          </td>
                          <td className="px-1 py-1 text-center" style={{ fontSize: '9px', color: '#666' }}>
                            {row.entryTime}
                          </td>
                          <td className="px-1 py-1 text-center" style={{ fontSize: '9px', color: '#666' }}>
                            {row.attendedTime}
                          </td>
                          <td className="px-1 py-1 text-center" style={{ fontSize: '9px', color: '#666' }}>
                            {row.exitTime}
                          </td>
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
                          <td className="px-1 py-1 text-center" style={{ fontSize: '9px', color: '#6c341e' }}>
                            Q{typeof row.orderTotal === 'number' ? row.orderTotal.toFixed(2) : row.orderTotal}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              !loading && (
                <div className="p-6 rounded-xl text-center" style={{ backgroundColor: '#f0f0f0' }}>
                  <p style={{ color: '#666' }}>No hay datos para este escenario</p>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}