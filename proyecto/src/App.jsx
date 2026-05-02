// App.jsx
import { useState } from 'react'
import FileUpload from './components/FileUpload'
import FileUploadSimulation from './components/FileUploadSimulation'
import QueueAnalysis from './components/QueueAnalysis'
import DataTable from './components/DataTable'
import './App.css'

export default function App() {
  const [data, setData] = useState(null)
  const [dataShow, setDataShow] = useState(null)
  const [analysisParams, setAnalysisParams] = useState(null)
  const [activeTab, setActiveTab] = useState('analysis')

  const handleDataLoaded = (loadedData) => {
    setData(loadedData)
  }

  const handleDataShow = (parsedData) => {
    setDataShow(parsedData)
  }

  const handleAnalysisParams = (params) => {
    setAnalysisParams(params)
  }

  const handleReset = () => {
    setData(null)
    setDataShow(null)
    setAnalysisParams(null)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fef8e8' }}>
      {/* Header */}
      <header className="p-6 md:p-10" style={{ backgroundColor: '#6c341e' }}>
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Análisis de Colas
          </h1>
          <p className="text-white text-opacity-90">
            Teoría de Colas - Pollo Campero
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 md:p-10">
        <div className="max-w-7xl mx-auto">
          {/* Tabs Navigation */}
          <div className="flex gap-4 mb-6 border-b" style={{ borderColor: '#e0e0e0' }}>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-6 py-3 font-semibold transition border-b-2 ${
                activeTab === 'analysis'
                  ? 'border-b-2'
                  : 'border-b-2'
              }`}
              style={{
                color: activeTab === 'analysis' ? '#6c341e' : '#999',
                borderBottomColor: activeTab === 'analysis' ? '#6c341e' : 'transparent'
              }}
            >
              Análisis de Datos
            </button>
            <button
              onClick={() => setActiveTab('simulation')}
              className={`px-6 py-3 font-semibold transition border-b-2 ${
                activeTab === 'simulation'
                  ? 'border-b-2'
                  : 'border-b-2'
              }`}
              style={{
                color: activeTab === 'simulation' ? '#6c341e' : '#999',
                borderBottomColor: activeTab === 'simulation' ? '#6c341e' : 'transparent'
              }}
            >
              Realizar Simulación
            </button>
          </div>

          {/* Tab Content - Analysis */}
          {activeTab === 'analysis' && (
            <>
              {!data ? (
                <FileUpload onDataLoaded={handleDataLoaded} ondDataShow={handleDataShow} />
              ) : (
                <div className="space-y-6">
                  {/* Botón Reset */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleReset}
                      className="px-6 py-3 rounded-full font-semibold transition border-2"
                      style={{
                        borderColor: '#6c341e',
                        backgroundColor: '#6c341e',
                        color: '#fbd816'
                      }}
                    >
                      Cargar Nuevo Archivo
                    </button>
                  </div>

                  {/* Análisis */}
                  <QueueAnalysis data={data} onAnalysisParams={handleAnalysisParams} />

                  {/* Tabla de Datos */}
                  <DataTable data={dataShow} />
                </div>
              )}
            </>
          )}

          {/* Tab Content - Simulation */}
          {activeTab === 'simulation' && (
            <div>
              <FileUploadSimulation 
                data={data} 
                analysisParams={analysisParams}
                dataLoaded={!!data}
              />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-gray-600 text-sm" style={{ backgroundColor: '#f5f5f5' }}>
        <p>Modelación y Simulación - Teoría de Colas</p>
      </footer>
    </div>
  )
}