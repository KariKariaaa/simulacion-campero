import { useState } from 'react';
import * as XLSX from 'xlsx';

export default function FileUpload({ onDataLoaded, ondDataShow }) {
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  const formatExcelTime = (val) => {
    if (typeof val === 'number') {
      const totalSeconds = Math.round(val * 86400);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;

      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    return val;
  };

  const formatExcelDuration = (val) => {
    if (typeof val === 'number') {
      const totalSeconds = Math.round(val * 86400);
      const m = Math.floor(totalSeconds / 60);
      const s = totalSeconds % 60;

      return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    return val;
  };

  const requiredColumns = ['Día', 'No. Registro', 'Hora Entrada', 'Hora Atendida', 'Hora Salida', 'Tiempo en Cola', 'Tiempo Total'];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);

        if (json.length === 0) {
          setError('El archivo Excel está vacío');
          setFileName('');
          return;
        }

        // Validar que tenga las columnas necesarias
        const firstRow = json[0];
        const missingColumns = requiredColumns.filter(col => !(col in firstRow));
        
        if (missingColumns.length > 0) {
          setError(`Faltan columnas requeridas: ${missingColumns.join(', ')}`);
          setFileName('');
          return;
        }

        const parsed = json.map(row => {
          // Detectar abandonos: cualquier celda vacía indica abandono
          const hasAllData = 
            row['Hora Entrada'] !== null && row['Hora Entrada'] !== undefined && row['Hora Entrada'] !== '' &&
            row['Hora Atendida'] !== null && row['Hora Atendida'] !== undefined && row['Hora Atendida'] !== '' &&
            row['Hora Salida'] !== null && row['Hora Salida'] !== undefined && row['Hora Salida'] !== '' &&
            row['Tiempo en Cola'] !== null && row['Tiempo en Cola'] !== undefined && row['Tiempo en Cola'] !== '' &&
            row['Tiempo Total'] !== null && row['Tiempo Total'] !== undefined && row['Tiempo Total'] !== '';

          return {
            day: row['Día'],
            reg: row['No. Registro'],
            entry: hasAllData ? formatExcelTime(row['Hora Entrada']) : '',
            attended: hasAllData ? formatExcelTime(row['Hora Atendida']) : '',
            exit: hasAllData ? formatExcelTime(row['Hora Salida']) : '',
            queue: hasAllData ? formatExcelDuration(row['Tiempo en Cola']) : '',
            total: hasAllData ? formatExcelDuration(row['Tiempo Total']) : '',
            abandoned: !hasAllData, // Marcar como abandono si hay datos vacíos
          };
        });

        onDataLoaded(json);
        ondDataShow(parsed);
      } catch (err) {
        setError('Error al leer el archivo: ' + err.message);
        setFileName('');
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
      <h2 className="text-2xl font-bold mb-2" style={{ color: '#6c341e' }}>
        Cargar Datos
      </h2>
      <p className="text-gray-600 text-sm mb-6">Selecciona un archivo Excel con los datos de observación</p>

      <div className="w-full">
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
          id="file-input"
        />

        <label htmlFor="file-input">
          <div
            className="border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition hover:bg-gray-50"
            style={{ borderColor: '#cb691c' }}
          >
            <p className="text-lg font-semibold mb-2" style={{ color: '#6c341e' }}>
              Arrastra tu archivo Excel aquí
            </p>
            <p style={{ color: '#cb691c' }}>
              O haz clic para seleccionar
            </p>
          </div>
        </label>
      </div>

      <div className="mt-6 p-4 rounded-2xl" style={{ backgroundColor: '#f5f5f5' }}>
        <p className="font-semibold mb-2" style={{ color: '#6c341e' }}>
          Formato esperado:
        </p>
        <ul className="text-sm space-y-1" style={{ color: '#666' }}>
          <li>• Una sola hoja</li>
          <li>• Columnas: Día, No. Registro, Hora Entrada, Hora Atendida, Hora Salida, Tiempo en Cola, Tiempo Total</li>
          <li>• Celdas vacías = Cliente que abandonó la cola</li>
        </ul>
      </div>

      {fileName && (
        <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: '#fef8e8' }}>
          <p className="text-sm font-semibold" style={{ color: '#6c341e' }}>
            {fileName}
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-50">
          <p className="text-sm font-semibold text-red-700">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
