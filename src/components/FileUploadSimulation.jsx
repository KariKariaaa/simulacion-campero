import { useState } from 'react'
import Simulator from './Simulator'

const FileUploadSimulation = ({ data, analysisParams, dataLoaded, products }) => {
  const [simulationData, setSimulationData] = useState(data)

  // Si ya hay datos cargados del análisis, mostrar directamente el simulador
  if (dataLoaded && data && analysisParams) {
    return (
      <div className="w-full space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold" style={{ color: '#6c341e' }}>
            Simulación de Sistema de Colas
          </h2>
        </div>
        <Simulator 
          analysisParams={analysisParams} 
          originalData={data}
          products={products}
        />
      </div>
    )
  }

  // Si no hay datos cargados, mostrar mensaje informativo
  if (!dataLoaded) {
    return (
      <div className="bg-yellow-50 p-8 rounded-3xl shadow-sm border border-yellow-200">
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#f59e0b' }}>
          Datos Necesarios
        </h2>
        <p className="text-yellow-700 font-semibold">
          Por favor, carga datos en la sección "Análisis de Datos" primero para poder realizar la simulación.
        </p>
      </div>
    )
  }

  return null
}

export default FileUploadSimulation