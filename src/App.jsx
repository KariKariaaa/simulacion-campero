// App.jsx
import { useState, useCallback, useEffect } from 'react'
import FileUpload from './components/FileUpload'
import FileUploadSimulation from './components/FileUploadSimulation'
import QueueAnalysis from './components/QueueAnalysis'
import DataTable from './components/DataTable'
import './App.css'
import { supabase } from './supabaseClient';
import SimulationHistory from './components/SimulationHistory'
import CrudGastoProducts from './components/crudGastoProducts'

export default function App() {
  const [data, setData] = useState(null)
  const [dataShow, setDataShow] = useState(null)
  const [analysisParams, setAnalysisParams] = useState(null)
  const [activeTab, setActiveTab] = useState('analysis')
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [productos, setProductos] = useState([]);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const { data: productosData, error } = await supabase
          .from('tbProductos')
          .select('*');

        if (error) {
          throw new Error(error.message);
        }

        setProductos(productosData);
      } catch (err) {
        console.error('Error fetching productos:', err);
      }
    };

    const fetchExpenses = async () => {
      try {
        const { data: expensesData, error } = await supabase
          .from('tbGastos')
          .select('*');

        if (error) {
          throw new Error(error.message);
        }

        setExpenses(expensesData || []);
      } catch (err) {
        console.error('Error fetching expenses:', err);
      }
    };

    fetchProductos();
    fetchExpenses();
  }, []);
  
  // Cargar datos desde Supabase
  const loadDataFromSupabase = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: supabaseData, error: dbError } = await supabase
        .from('tbDatosCargados')
        .select('*');

      if (dbError) {
        throw new Error(dbError.message);
      }

      if (!supabaseData || supabaseData.length === 0) {
        setError('No hay datos en la base de datos');
        setLoading(false);
        return;
      }

      // Convertir datos de Supabase al formato esperado
      const processedData = supabaseData.map((row, idx) => {
        // Calcular tiempo en cola y tiempo total
        const entrada = row.entrada ? timeStringToMinutes(row.entrada) : 0;
        const atendida = row.atendida ? timeStringToMinutes(row.atendida) : 0;
        const salida = row.salida ? timeStringToMinutes(row.salida) : 0;

        let queueTimeMinutes = 0;
        let totalTimeMinutes = 0;

        if (entrada && atendida) {
          queueTimeMinutes = Math.max(0, atendida - entrada);
        }

        if (entrada && salida) {
          totalTimeMinutes = Math.max(0, salida - entrada);
        }

        return {
          'Día': row.dia || 'Sin especificar',
          'No. Registro': row.no_cliente || idx + 1,
          'Hora Entrada': row.entrada || '',
          'Hora Atendida': row.atendida || '',
          'Hora Salida': row.salida || '',
          'Tiempo en Cola': minutesToTimeFormat(queueTimeMinutes),
          'Tiempo Total': minutesToTimeFormat(totalTimeMinutes),
          'no_cliente': row.no_cliente || 0,
          'abandoned': !row.salida || !row.total
        };
      });

      // Datos para mostrar en tabla
      const displayData = processedData.map((row, idx) => ({
        day: row['Día'],
        no_cliente: row['no_cliente'],
        reg: row['No. Registro'],
        entry: row['Hora Entrada'],
        attended: row['Hora Atendida'],
        exit: row['Hora Salida'] || '-',
        queue: row['Tiempo en Cola'],
        total: row['Tiempo Total'],
        abandoned: row['abandoned']
      }));

      setData(processedData);
      setDataShow(displayData);
    } catch (err) {
      setError('Error al cargar datos: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Función auxiliar para convertir HH:MM:SS a minutos
  const timeStringToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseInt(parts[2]) || 0;
    return hours * 60 + minutes + seconds / 60;
  };

  // Función auxiliar para convertir minutos a HH:MM:SS
  const minutesToTime = (minutes) => {
    if (minutes === 0 || isNaN(minutes)) return '00:00:00';
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.round((minutes % 1) * 60);
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Función auxiliar para convertir minutos a MM:SS (para duraciones)
  const minutesToTimeFormat = (minutes) => {
    if (minutes === 0 || isNaN(minutes)) return '00:00';
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes % 1) * 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleDataLoaded = useCallback((loadedData) => {
    setData(loadedData)
  }, [])

  const handleDataShow = useCallback((parsedData) => {
    setDataShow(parsedData)
  }, [])

  const handleAnalysisParams = useCallback((params) => {
    setAnalysisParams(params)
  }, [])

  const handleReset = useCallback(() => {
    setData(null)
    setDataShow(null)
    setAnalysisParams(null)
    setError('')
  }, [])

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
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-semibold transition border-b-2 ${
                activeTab === 'history'
                  ? 'border-b-2'
                  : 'border-b-2'
              }`}
              style={{
                color: activeTab === 'history' ? '#6c341e' : '#999',
                borderBottomColor: activeTab === 'history' ? '#6c341e' : 'transparent'
              }}
            >
              Historial de Simulaciones
            </button>
            <button
              onClick={() => setActiveTab('products-expenses')}
              className={`px-6 py-3 font-semibold transition border-b-2 ${
                activeTab === 'products-expenses'
                  ? 'border-b-2'
                  : 'border-b-2'
              }`}
              style={{
                color: activeTab === 'products-expenses' ? '#6c341e' : '#999',
                borderBottomColor: activeTab === 'products-expenses' ? '#6c341e' : 'transparent'
              }}
            >
              Productos y Gastos
            </button>
          </div>

          {/* Tab Content - Analysis */}
          {activeTab === 'analysis' && (
            <>
              {!data ? (
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                  <h2 className="text-2xl font-bold mb-2" style={{ color: '#6c341e' }}>
                    Cargar Datos de Análisis
                  </h2>
                  <p className="text-gray-600 text-sm mb-6">Carga los datos de la base de datos para comenzar el análisis de colas</p>
                  
                  <button
                    onClick={loadDataFromSupabase}
                    disabled={loading}
                    className="px-8 py-4 rounded-full font-semibold transition border-2 text-lg"
                    style={{
                      borderColor: '#6c341e',
                      backgroundColor: '#6c341e',
                      color: '#fbd816'
                    }}
                  >
                    {loading ? 'Cargando...' : 'Comenzar Análisis'}
                  </button>

                  {error && (
                    <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200">
                      <p className="text-red-700 font-semibold">{error}</p>
                    </div>
                  )}
                </div>
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
                      Cargar Nuevo Análisis
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
                products={productos}
                expenses={expenses}
              />
            </div>
          )}
          {/* Tab Content - History */}
          {activeTab === 'history' && (
            <div>
              <SimulationHistory/>
            </div>
          )}
          {/* Tab Content - Products and Expenses */}
          {activeTab === 'products-expenses' && (
            <div>
              <CrudGastoProducts/>
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