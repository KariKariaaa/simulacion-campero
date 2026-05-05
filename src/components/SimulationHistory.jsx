import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function SimulationHistory() {
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

  // Cargar lista de simulaciones
  useEffect(() => {
    fetchSimulations()
  }, [])

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
  }, [selectedSimId])


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
      products: dbRow.producto ? [{ nombre: dbRow.producto }] : [],
      orderTotal: dbRow.costo ? dbRow.costo.toFixed(0) : '0'
    }
  }

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
              <div className="bg-white rounded-3xl p-4 shadow-lg">
                <h3 
                  className="text-lg font-bold mb-3"
                  style={{ color: selectedScenario === 1 ? '#cb691c' : selectedScenario === 2 ? '#6c341e' : '#fbd816' }}
                >
                  Escenario {selectedScenario} ({currentScenarioData.length} registros)
                </h3>
                <div className="overflow-auto" style={{ maxHeight: '600px' }}>
                  <table className="w-full border-collapse text-xs">
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
                            Q{row.orderTotal}.00
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