import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function CrudGastoProducts() {
  const [activeTab, setActiveTab] = useState('productos')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Productos
  const [productos, setProductos] = useState([])
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProductId, setEditingProductId] = useState(null)
  const [productForm, setProductForm] = useState({
    nombre: '',
    precio_venta: '',
    precio_costo: '',
    porcentaje: ''
  })

  // Gastos
  const [gastos, setGastos] = useState([])
  const [showGastoForm, setShowGastoForm] = useState(false)
  const [editingGastoId, setEditingGastoId] = useState(null)
  const [gastoForm, setGastoForm] = useState({
    nombre: '',
    tipo: 'Fijo',
    monto: ''
  })

  // Confirmación de eliminación
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteItemToConfirm, setDeleteItemToConfirm] = useState(null)
  const [deleteItemType, setDeleteItemType] = useState(null) // 'producto' o 'gasto'

  // Cargar datos al montar
  useEffect(() => {
    loadProductos()
    loadGastos()
  }, [])

  // ==================== PRODUCTOS ====================
  
  const loadProductos = async () => {
    try {
      setLoading(true)
      const { data, error: dbError } = await supabase
        .from('tbProductos')
        .select('*')
        .order('idProductos', { ascending: true })

      if (dbError) throw new Error(dbError.message)
      setProductos(data || [])
      setError('')
    } catch (err) {
      setError('Error al cargar productos: ' + err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleProductFormChange = (e) => {
    const { name, value } = e.target
    setProductForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const resetProductForm = () => {
    setProductForm({
      nombre: '',
      precio_venta: '',
      precio_costo: '',
      porcentaje: ''
    })
    setEditingProductId(null)
    setShowProductForm(false)
  }

  const saveProduct = async () => {
    try {
      // Validaciones
      if (!productForm.nombre.trim()) {
        setError('El nombre del producto es requerido')
        return
      }
      if (!productForm.precio_venta || parseFloat(productForm.precio_venta) <= 0) {
        setError('El precio de venta debe ser mayor a 0')
        return
      }
      if (!productForm.precio_costo || parseFloat(productForm.precio_costo) < 0) {
        setError('El precio de costo debe ser válido')
        return
      }

      setLoading(true)
      setError('')

      if (editingProductId) {
        // Actualizar
        const { error: dbError } = await supabase
          .from('tbProductos')
          .update({
            nombre: productForm.nombre,
            precio_venta: parseFloat(productForm.precio_venta),
            precio_costo: parseFloat(productForm.precio_costo),
            porcentaje: productForm.porcentaje ? parseFloat(productForm.porcentaje) : null
          })
          .eq('idProductos', editingProductId)

        if (dbError) throw new Error(dbError.message)
        setSuccess('Producto actualizado correctamente')
      } else {
        // Crear
        const { error: dbError } = await supabase
          .from('tbProductos')
          .insert([{
            nombre: productForm.nombre,
            precio_venta: parseFloat(productForm.precio_venta),
            precio_costo: parseFloat(productForm.precio_costo),
            porcentaje: productForm.porcentaje ? parseFloat(productForm.porcentaje) : null
          }])

        if (dbError) throw new Error(dbError.message)
        setSuccess('Producto creado correctamente')
      }

      await loadProductos()
      resetProductForm()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Error al guardar producto: ' + err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const editProduct = (producto) => {
    setProductForm({
      nombre: producto.nombre,
      precio_venta: producto.precio_venta,
      precio_costo: producto.precio_costo,
      porcentaje: producto.porcentaje || ''
    })
    setEditingProductId(producto.idProductos)
    setShowProductForm(true)
  }

  const deleteProduct = async (id) => {
    setDeleteItemToConfirm(id)
    setDeleteItemType('producto')
    setShowDeleteConfirm(true)
  }

  // ==================== GASTOS ====================

  const loadGastos = async () => {
    try {
      setLoading(true)
      const { data, error: dbError } = await supabase
        .from('tbGastos')
        .select('*')
        .order('id', { ascending: false })

      if (dbError) throw new Error(dbError.message)
      setGastos(data || [])
      setError('')
    } catch (err) {
      setError('Error al cargar gastos: ' + err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleGastoFormChange = (e) => {
    const { name, value } = e.target
    setGastoForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const resetGastoForm = () => {
    setGastoForm({
      nombre: '',
      tipo: 'Fijo',
      monto: ''
    })
    setEditingGastoId(null)
    setShowGastoForm(false)
  }

  const saveGasto = async () => {
    try {
      // Validaciones
      if (!gastoForm.nombre.trim()) {
        setError('El nombre del gasto es requerido')
        return
      }
      if (!gastoForm.monto || parseFloat(gastoForm.monto) <= 0) {
        setError('El monto debe ser mayor a 0')
        return
      }

      setLoading(true)
      setError('')

      if (editingGastoId) {
        // Actualizar
        const { error: dbError } = await supabase
          .from('tbGastos')
          .update({
            nombre: gastoForm.nombre,
            tipo: gastoForm.tipo,
            monto: parseFloat(gastoForm.monto)
          })
          .eq('id', editingGastoId)

        if (dbError) throw new Error(dbError.message)
        setSuccess('Gasto actualizado correctamente')
      } else {
        // Crear
        const { error: dbError } = await supabase
          .from('tbGastos')
          .insert([{
            nombre: gastoForm.nombre,
            tipo: gastoForm.tipo,
            monto: parseFloat(gastoForm.monto)
          }])

        if (dbError) throw new Error(dbError.message)
        setSuccess('Gasto creado correctamente')
      }

      await loadGastos()
      resetGastoForm()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Error al guardar gasto: ' + err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const editGasto = (gasto) => {
    setGastoForm({
      nombre: gasto.nombre,
      tipo: gasto.tipo,
      monto: gasto.monto
    })
    setEditingGastoId(gasto.id)
    setShowGastoForm(true)
  }

  const deleteGasto = async (id) => {
    setDeleteItemToConfirm(id)
    setDeleteItemType('gasto')
    setShowDeleteConfirm(true)
  }

  // Confirmar eliminación
  const confirmDelete = async () => {
    try {
      setLoading(true)
      setError('')

      if (deleteItemType === 'producto') {
        const { error: dbError } = await supabase
          .from('tbProductos')
          .delete()
          .eq('idProductos', deleteItemToConfirm)

        if (dbError) throw new Error(dbError.message)
        setSuccess('Producto eliminado correctamente')
        await loadProductos()
      } else if (deleteItemType === 'gasto') {
        const { error: dbError } = await supabase
          .from('tbGastos')
          .delete()
          .eq('id', deleteItemToConfirm)

        if (dbError) throw new Error(dbError.message)
        setSuccess('Gasto eliminado correctamente')
        await loadGastos()
      }

      setShowDeleteConfirm(false)
      setDeleteItemToConfirm(null)
      setDeleteItemType(null)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Error al eliminar: ' + err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setDeleteItemToConfirm(null)
    setDeleteItemType(null)
  }

  // ==================== RENDER ====================

  return (
    <div className="w-full space-y-6 p-6">
      {/* Tabs Navigation */}
      <div className="flex gap-0 border-b-2" style={{ borderBottomColor: '#e0e0e0' }}>
        <button
          onClick={() => {
            setActiveTab('productos')
            setError('')
            setSuccess('')
          }}
          className="px-6 py-3 font-semibold transition-all border-b-4"
          style={{
            color: activeTab === 'productos' ? '#6c341e' : '#999',
            borderBottomColor: activeTab === 'productos' ? '#6c341e' : 'transparent',
            backgroundColor: activeTab === 'productos' ? '#fef8e8' : 'transparent'
          }}
        >
           Productos
        </button>
        <button
          onClick={() => {
            setActiveTab('gastos')
            setError('')
            setSuccess('')
          }}
          className="px-6 py-3 font-semibold transition-all border-b-4"
          style={{
            color: activeTab === 'gastos' ? '#6c341e' : '#999',
            borderBottomColor: activeTab === 'gastos' ? '#6c341e' : 'transparent',
            backgroundColor: activeTab === 'gastos' ? '#fef8e8' : 'transparent'
          }}
        >
           Gastos
        </button>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-4 rounded-xl border-l-4" style={{ backgroundColor: '#fef2f2', borderLeftColor: '#dc2626' }}>
          <p style={{ color: '#dc2626', fontWeight: 'bold' }}>{error}</p>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl border-l-4" style={{ backgroundColor: '#f0fdf4', borderLeftColor: '#16a34a' }}>
          <p style={{ color: '#16a34a', fontWeight: 'bold' }}>{success}</p>
        </div>
      )}

      {/* MODAL FONDO OSCURO */}
      {(showProductForm || showGastoForm || showDeleteConfirm) && (
        <div 
          className="fixed inset-0  z-40 transition-opacity"
          onClick={() => {
            if (showProductForm) resetProductForm()
            if (showGastoForm) resetGastoForm()
            if (showDeleteConfirm) cancelDelete()
          }}
        />
      )}

      {/* MODAL PRODUCTO FORM */}
      {showProductForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-3xl p-8 shadow-2xl max-w-2xl w-full" 
            style={{ borderLeft: '4px solid #cb691c' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold mb-6" style={{ color: '#6c341e' }}>
              {editingProductId ? ' Editar Producto' : ' Nuevo Producto'}
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block font-semibold mb-2" style={{ color: '#6c341e' }}>Nombre *</label>
                <input
                  type="text"
                  name="nombre"
                  value={productForm.nombre}
                  onChange={handleProductFormChange}
                  placeholder="Nombre del producto"
                  disabled={loading}
                  className="w-full px-4 py-2 rounded-lg border-2 outline-none transition"
                  style={{ borderColor: '#e0e0e0' }}
                  onFocus={(e) => e.target.style.borderColor = '#cb691c'}
                  onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                />
              </div>
              <div>
                <label className="block font-semibold mb-2" style={{ color: '#6c341e' }}>Precio de Venta (Q) *</label>
                <input
                  type="number"
                  name="precio_venta"
                  value={productForm.precio_venta}
                  onChange={handleProductFormChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  disabled={loading}
                  className="w-full px-4 py-2 rounded-lg border-2 outline-none transition"
                  style={{ borderColor: '#e0e0e0' }}
                  onFocus={(e) => e.target.style.borderColor = '#cb691c'}
                  onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                />
              </div>
              <div>
                <label className="block font-semibold mb-2" style={{ color: '#6c341e' }}>Precio de Costo (Q) *</label>
                <input
                  type="number"
                  name="precio_costo"
                  value={productForm.precio_costo}
                  onChange={handleProductFormChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  disabled={loading}
                  className="w-full px-4 py-2 rounded-lg border-2 outline-none transition"
                  style={{ borderColor: '#e0e0e0' }}
                  onFocus={(e) => e.target.style.borderColor = '#cb691c'}
                  onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                />
              </div>
              <div>
                <label className="block font-semibold mb-2" style={{ color: '#6c341e' }}>Probabilidad compra</label>
                <input
                  type="number"
                  name="porcentaje"
                  value={productForm.porcentaje}
                  onChange={handleProductFormChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  disabled={loading}
                  className="w-full px-4 py-2 rounded-lg border-2 outline-none transition"
                  style={{ borderColor: '#e0e0e0' }}
                  onFocus={(e) => e.target.style.borderColor = '#cb691c'}
                  onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={resetProductForm}
                className="px-6 py-2 rounded-lg font-bold transition"
                style={{
                  backgroundColor: '#f0f0f0',
                  color: '#6c341e'
                }}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={saveProduct}
                className="px-6 py-2 rounded-lg font-bold transition transform hover:scale-105"
                style={{
                  backgroundColor: '#cb691c',
                  color: '#fbd816'
                }}
                disabled={loading}
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GASTO FORM */}
      {showGastoForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-3xl p-8 shadow-2xl max-w-2xl w-full" 
            style={{ borderLeft: '4px solid #cb691c' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold mb-6" style={{ color: '#6c341e' }}>
              {editingGastoId ? ' Editar Gasto' : ' Nuevo Gasto'}
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="col-span-2">
                <label className="block font-semibold mb-2" style={{ color: '#6c341e' }}>Nombre del Gasto *</label>
                <input
                  type="text"
                  name="nombre"
                  value={gastoForm.nombre}
                  onChange={handleGastoFormChange}
                  placeholder="Descripción del gasto"
                  disabled={loading}
                  className="w-full px-4 py-2 rounded-lg border-2 outline-none transition"
                  style={{ borderColor: '#e0e0e0' }}
                  onFocus={(e) => e.target.style.borderColor = '#cb691c'}
                  onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                />
              </div>
              <div>
                <label className="block font-semibold mb-2" style={{ color: '#6c341e' }}>Tipo *</label>
                <select
                  name="tipo"
                  value={gastoForm.tipo}
                  onChange={handleGastoFormChange}
                  disabled={loading}
                  className="w-full px-4 py-2 rounded-lg border-2 outline-none transition"
                  style={{ borderColor: '#e0e0e0' }}
                  onFocus={(e) => e.target.style.borderColor = '#cb691c'}
                  onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                >
                  <option value="Fijo">Fijo</option>
                  <option value="Variable">Variable</option>
                </select>
              </div>
              <div className="col-span-3">
                <label className="block font-semibold mb-2" style={{ color: '#6c341e' }}>Monto (Q) *</label>
                <input
                  type="number"
                  name="monto"
                  value={gastoForm.monto}
                  onChange={handleGastoFormChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  disabled={loading}
                  className="w-full px-4 py-2 rounded-lg border-2 outline-none transition"
                  style={{ borderColor: '#e0e0e0' }}
                  onFocus={(e) => e.target.style.borderColor = '#cb691c'}
                  onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={resetGastoForm}
                className="px-6 py-2 rounded-lg font-bold transition"
                style={{
                  backgroundColor: '#f0f0f0',
                  color: '#6c341e'
                }}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={saveGasto}
                className="px-6 py-2 rounded-lg font-bold transition transform hover:scale-105"
                style={{
                  backgroundColor: '#cb691c',
                  color: '#fbd816'
                }}
                disabled={loading}
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN DE ELIMINACIÓN */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full" 
            style={{ borderLeft: '4px solid #dc2626' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold mb-4" style={{ color: '#6c341e' }}>
               Confirmar Eliminación
            </h3>
            <p className="text-lg mb-6" style={{ color: '#333' }}>
              {deleteItemType === 'producto' 
                ? '¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.'
                : '¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer.'}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                className="px-6 py-2 rounded-lg font-bold transition"
                style={{
                  backgroundColor: '#f0f0f0',
                  color: '#6c341e'
                }}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-6 py-2 rounded-lg font-bold transition transform hover:scale-105"
                style={{
                  backgroundColor: '#dc2626',
                  color: '#fff'
                }}
                disabled={loading}
              >
                {loading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCTOS TAB */}
      {activeTab === 'productos' && (
        <div className="space-y-6">
          {/* Header and Add Button */}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold" style={{ color: '#6c341e' }}>Gestión de Productos</h2>
            <button
              onClick={() => {
                setShowProductForm(true)
                setEditingProductId(null)
                setProductForm({
                  nombre: '',
                  precio_venta: '',
                  precio_costo: '',
                  porcentaje: ''
                })
                setError('')
              }}
              className="px-6 py-3 rounded-xl font-bold transition transform hover:scale-105 active:scale-95"
              style={{
                backgroundColor: '#cb691c',
                color: '#fbd816'
              }}
              disabled={loading}
            >
              + Nuevo Producto
            </button>
          </div>

          {/* Products Table */}
          {productos.length > 0 ? (
            <div className="bg-white rounded-3xl p-8 shadow-lg overflow-auto" style={{ maxHeight: '450px' }}>
              <table className="w-full border-collapse" >
                <thead>
                  <tr style={{ backgroundColor: '#6c341e' }}>
                    <th className="px-4 py-3 text-left" style={{ color: '#fbd816', fontWeight: 'bold' }}>ID</th>
                    <th className="px-4 py-3 text-left" style={{ color: '#fbd816', fontWeight: 'bold' }}>Nombre</th>
                    <th className="px-4 py-3 text-right" style={{ color: '#fbd816', fontWeight: 'bold' }}>Precio Venta</th>
                    <th className="px-4 py-3 text-right" style={{ color: '#fbd816', fontWeight: 'bold' }}>Precio Costo</th>
                    <th className="px-4 py-3 text-center" style={{ color: '#fbd816', fontWeight: 'bold' }}>Probabildiad de compra %</th>
                    <th className="px-4 py-3 text-center" style={{ color: '#fbd816', fontWeight: 'bold' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((producto, idx) => (
                    <tr key={producto.idProductos} style={{ backgroundColor: idx % 2 === 0 ? '#fafaf9' : '#fff', borderBottom: '1px solid #e0e0e0' }}>
                      <td className="px-4 py-3" style={{ color: '#6c341e', fontWeight: 'bold' }}>{producto.idProductos}</td>
                      <td className="px-4 py-3" style={{ color: '#333' }}>{producto.nombre}</td>
                      <td className="px-4 py-3 text-right" style={{ color: '#4caf50', fontWeight: 'bold' }}>Q{parseFloat(producto.precio_venta).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right" style={{ color: '#f44336' }}>Q{parseFloat(producto.precio_costo).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center" style={{ color: '#cb691c', fontWeight: 'bold' }}>{producto.porcentaje ? parseFloat(producto.porcentaje).toFixed(2) : '-'}%</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => editProduct(producto)}
                            className="px-3 py-1 rounded-lg font-semibold transition hover:scale-110"
                            style={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}
                            disabled={loading}
                          >
                             Editar
                          </button>
                          <button
                            onClick={() => deleteProduct(producto.idProductos)}
                            className="px-3 py-1 rounded-lg font-semibold transition hover:scale-110"
                            style={{ backgroundColor: '#ffebee', color: '#dc2626' }}
                            disabled={loading}
                          >
                             Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 shadow-lg text-center">
              <p style={{ color: '#999', fontSize: '18px' }}>No hay productos registrados</p>
            </div>
          )}
        </div>
      )}

      {/* GASTOS TAB */}
      {activeTab === 'gastos' && (
        <div className="space-y-6">
          {/* Header and Add Button */}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold" style={{ color: '#6c341e' }}>Gestión de Gastos</h2>
            <button
              onClick={() => {
                setShowGastoForm(true)
                setEditingGastoId(null)
                setGastoForm({
                  nombre: '',
                  tipo: 'Fijo',
                  monto: ''
                })
                setError('')
              }}
              className="px-6 py-3 rounded-xl font-bold transition transform hover:scale-105 active:scale-95"
              style={{
                backgroundColor: '#cb691c',
                color: '#fbd816'
              }}
              disabled={loading}
            >
              + Nuevo Gasto
            </button>
          </div>
          {gastos.length > 0 ? (
            <div className="bg-white rounded-3xl p-8 shadow-lg overflow-auto" style={{ maxHeight: '450px'}}>
              <table className="w-full border-collapse">
                <thead>
                  <tr style={{ backgroundColor: '#6c341e' }}>
                    <th className="px-4 py-3 text-left" style={{ color: '#fbd816', fontWeight: 'bold' }}>ID</th>
                    <th className="px-4 py-3 text-left" style={{ color: '#fbd816', fontWeight: 'bold' }}>Nombre</th>
                    <th className="px-4 py-3 text-center" style={{ color: '#fbd816', fontWeight: 'bold' }}>Tipo</th>
                    <th className="px-4 py-3 text-right" style={{ color: '#fbd816', fontWeight: 'bold' }}>Monto Mensual</th>
                    <th className="px-4 py-3 text-center" style={{ color: '#fbd816', fontWeight: 'bold' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {gastos.map((gasto, idx) => (
                    <tr key={gasto.id} style={{ backgroundColor: idx % 2 === 0 ? '#fafaf9' : '#fff', borderBottom: '1px solid #e0e0e0' }}>
                      <td className="px-4 py-3" style={{ color: '#6c341e', fontWeight: 'bold' }}>{gasto.id}</td>
                      <td className="px-4 py-3" style={{ color: '#333' }}>{gasto.nombre}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-3 py-1 rounded-lg text-sm font-semibold" 
                          style={{
                            backgroundColor: gasto.tipo === 'Fijo' ? '#dbeafe' :
                                           gasto.tipo === 'Variable' ? '#fef3e8' : '#e0e0e0',
                            color: gasto.tipo === 'Fijo' ? '#1976d2' :
                                   gasto.tipo === 'Variable' ? '#d97706': '#333'
                          }}>
                          {gasto.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold" style={{ color: '#d97706' }}>Q{parseFloat(gasto.monto).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => editGasto(gasto)}
                            className="px-3 py-1 rounded-lg font-semibold transition hover:scale-110"
                            style={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}
                            disabled={loading}
                          >
                             Editar
                          </button>
                          <button
                            onClick={() => deleteGasto(gasto.id)}
                            className="px-3 py-1 rounded-lg font-semibold transition hover:scale-110"
                            style={{ backgroundColor: '#ffebee', color: '#dc2626' }}
                            disabled={loading}
                          >
                             Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 shadow-lg text-center">
              <p style={{ color: '#999', fontSize: '18px' }}>No hay gastos registrados</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}