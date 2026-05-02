//DataTable.jsx
import { useState } from 'react';
import { formatTimeValue } from '../utils/queueCalculations';

export default function DataTable({ data }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  if (!data || data.length === 0) return null;

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const currentData = data.slice(startIdx, endIdx);

  const columns = Object.keys(data[0]);
  
  // Detectar columnas que contienen tiempo
  const timeColumns = [
    'Hora Entrada', 
    'Hora Atendida', 
    'Hora Salida', 
    'Tiempo en Cola', 
    'Tiempo Total'
  ];
  
  // Función para formatear el valor de la celda
  const formatCellValue = (columnName, value) => {
    // Si es una columna de tiempo, formatearla
    if (timeColumns.includes(columnName)) {
      return formatTimeValue(value);
    }
    // Si no, devolverla tal cual
    return value;
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
      <h2 className="text-2xl font-bold mb-6" style={{ color: '#6c341e' }}>
        Datos Cargados
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: '#6c341e' }}>
              <th className="px-4 py-3 text-left text-white font-semibold">Día</th>
              <th className="px-4 py-3 text-center text-white font-semibold">No.</th>
              <th className="px-4 py-3 text-center text-white font-semibold">Hora Entrada</th>
              <th className="px-4 py-3 text-center text-white font-semibold">Hora Atendida</th>
              <th className="px-4 py-3 text-center text-white font-semibold">Hora Salida</th>
              <th className="px-4 py-3 text-center text-white font-semibold">Tiempo en Cola</th>
              <th className="px-4 py-3 text-center text-white font-semibold">Tiempo Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#f9f9f9' : '#fff', borderBottom: '1px solid #eee' }}>
                <td className="px-4 py-3" style={{ color: '#6c341e', fontWeight: 500 }}>{row.day}</td>
                <td className="px-4 py-3 text-center" style={{ color: '#666' }}>{row.reg}</td>
                <td className="px-4 py-3 text-center" style={{ color: '#666' }}>{row.entry}</td>
                <td className="px-4 py-3 text-center" style={{ color: '#666' }}>{row.attended}</td>
                <td className="px-4 py-3 text-center" style={{ color: '#666' }}>{row.exit}</td>
                <td className="px-4 py-3 text-center font-semibold" style={{ color: '#cb691c' }}>{row.queue}</td>
                <td className="px-4 py-3 text-center font-semibold" style={{ color: '#cb691c' }}>{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm" style={{ color: '#666' }}>
        Total de registros: <strong>{data.length}</strong>
      </p>
    </div>
  );
}