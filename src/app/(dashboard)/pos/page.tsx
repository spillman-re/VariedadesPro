'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Search, ShoppingCart, Tag, Package, Ruler, Hash, 
  Trash2, Plus, Minus, CreditCard, Receipt, Loader2, Info, X, Check, TrendingUp
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from "sonner"
import { Label } from '@/components/ui/label'

// --- TIPOS ---
interface CartItem {
  id_temp: string
  articulo: any
  presentacion: any
  variantes: any[]
  cantidad: number
  precio_unitario: number
  subtotal: number
  iva: number
}

export default function POSPrototipo() {
  const [busqueda, setBusqueda] = useState('')
  const [productos, setProductos] = useState<any[]>([])
  const [carrito, setCarrito] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  
  // Rastreo de selección de variantes por producto en la UI
  const [variantesSeleccionadas, setVariantesSeleccionadas] = useState<Record<string, any[]>>({})
  
  const buscarProductos = async (term: string) => {
    if (term.length < 2) return
    setLoading(true)
    const { data, error } = await supabase
      .from('articulo')
      .select(`
        *,
        presentaciones:articulo_presentacion(*, mayoreo:articulo_mayoreo(*)),
        variantes:articulo_variante(*, tipo:variante_tipos(*))
      `)
      .ilike('nombre', `%${term}%`)
      .eq('activo', true)
      .limit(10)

    if (!error) setProductos(data || [])
    setLoading(false)
  }
  
  const calcularPrecioFinal = (presentacion: any, variantesSel: any[], cantidad: number) => {
    const precioBasePres = parseFloat(presentacion.precio_venta) || 0
    const factor = parseInt(presentacion.factor) || 1
    let totalAjustesPorUnidad = 0

    // Sumar ajustes de las variantes seleccionadas
    variantesSel.forEach(v => {
      const valorAjuste = parseFloat(v.ajuste_valor) || 0
      if (v.ajuste_tipo === 'fijo') {
        totalAjustesPorUnidad += valorAjuste
      } else if (v.ajuste_tipo === 'porcentaje') {
        // El porcentaje se calcula sobre el precio unitario base (Precio curva / factor)
        const precioUnitarioBase = precioBasePres / factor
        totalAjustesPorUnidad += (precioUnitarioBase * (valorAjuste / 100))
      }
    })

    // Precio Final = Base Presentación + (Ajuste Unitario * Cantidad de unidades en el empaque)
    let precioConVariantes = precioBasePres + (totalAjustesPorUnidad * factor)

    // Verificar si aplica Mayoreo (Prioridad sobre ajustes manuales si existe regla)
    const reglaMayoreo = presentacion.mayoreo?.find((m: any) => 
      cantidad >= m.min_cantidad && (!m.max_cantidad || cantidad <= m.max_cantidad)
    )

    if (reglaMayoreo) return parseFloat(reglaMayoreo.precio_unitario)
    
    return precioConVariantes
  }
  
  const toggleVariante = (productoId: string, variante: any) => {
    const actuales = variantesSeleccionadas[productoId] || []
    const existe = actuales.find(v => v.id === variante.id)
    
    let nuevas: any[]
    if (existe) {
      nuevas = actuales.filter(v => v.id !== variante.id)
    } else {
      // Solo una variante por tipo (ej: no dos tallas a la vez)
      const filtradas = actuales.filter(v => v.id_tipo !== variante.id_tipo)
      nuevas = [...filtradas, variante]
    }

    setVariantesSeleccionadas({ ...variantesSeleccionadas, [productoId]: nuevas })
  }


  const agregarAlCarrito = (articulo: any, pres: any) => {
    const vars = variantesSeleccionadas[articulo.id] || []
    
    // El ID temporal identifica combinaciones únicas de producto + empaque + variantes
    const id_temp = `${articulo.id}-${pres.id}-${vars.map(v => v.id).sort().join('-')}`
    const existe = carrito.find(item => item.id_temp === id_temp)
    
    if (existe) {
      actualizarCantidad(id_temp, existe.cantidad + 1)
    } else {
      const precio = calcularPrecioFinal(pres, vars, 1)
      const nuevoItem: CartItem = {
        id_temp,
        articulo,
        presentacion: pres,
        variantes: vars,
        cantidad: 1,
        precio_unitario: precio,
        subtotal: precio,
        iva: precio * (articulo.iva_porcentaje / 100)
      }
      setCarrito([...carrito, nuevoItem])
      toast.success("Producto añadido")
    }
  }

  const actualizarCantidad = (id_temp: string, nuevaCant: number) => {
    if (nuevaCant < 1) return
    setCarrito(carrito.map(item => {
      if (item.id_temp === id_temp) {
        const nuevoPrecio = calcularPrecioFinal(item.presentacion, item.variantes, nuevaCant)
        return {
          ...item,
          cantidad: nuevaCant,
          precio_unitario: nuevoPrecio,
          subtotal: nuevoPrecio * nuevaCant,
          iva: (nuevoPrecio * nuevaCant) * (item.articulo.iva_porcentaje / 100)
        }
      }
      return item
    }))
  }

  const totalNeto = carrito.reduce((acc, item) => acc + item.subtotal, 0)
  const totalIva = carrito.reduce((acc, item) => acc + item.iva, 0)
  const totalFinal = totalNeto + totalIva

  return (
    <div className="grid grid-cols-12 gap-6 p-6 h-screen bg-slate-100">
      
      {/* SECCIÓN IZQUIERDA: CATÁLOGO INTERACTIVO */}
      <div className="col-span-12 lg:col-span-7 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <Input 
            placeholder="Buscar por nombre o código..." 
            className="h-16 pl-14 rounded-2xl border-none shadow-lg text-lg font-bold uppercase tracking-tight"
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); buscarProductos(e.target.value); }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {loading && <Loader2 className="animate-spin text-blue-600 mx-auto col-span-2" size={40} />}
          
          {productos.map(prod => {
            const selVars = variantesSeleccionadas[prod.id] || []
            return (
              <Card key={prod.id} className="rounded-[35px] border-none shadow-md hover:shadow-xl transition-all bg-white overflow-hidden">
                <CardContent className="p-6 space-y-5">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="font-black text-slate-900 uppercase text-sm leading-none">{prod.nombre}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{prod.marca?.nombre || 'MARCA'}</p>
                    </div>
                    <Badge className="bg-blue-50 text-blue-600 border-none font-bold text-[9px]">IVA {prod.iva_porcentaje}%</Badge>
                  </div>

                  {/* VARIANTES CON AJUSTE VISIBLE */}
                  {prod.variantes?.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Variantes / Atributos:</Label>
                      <div className="flex flex-wrap gap-2">
                        {prod.variantes.map((v: any) => {
                          const isSelected = selVars.find(sv => sv.id === v.id)
                          return (
                            <button
                              key={v.id}
                              onClick={() => toggleVariante(prod.id, v)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1 border-2 ${
                                isSelected 
                                ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                                : 'bg-slate-50 border-transparent text-slate-500 hover:border-slate-200'
                              }`}
                            >
                              {isSelected && <Check size={10} className="text-emerald-400" />}
                              {v.valor}
                              {v.ajuste_valor > 0 && <span className="ml-1 text-[8px] opacity-70">+{v.ajuste_valor}</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* BOTONES DE ACCIÓN POR EMPAQUE */}
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Agregar al Ticket:</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {prod.presentaciones?.map((pres: any) => (
                        <Button 
                          key={pres.id} 
                          variant="outline" 
                          className="h-auto py-3 px-4 rounded-2xl border-slate-100 hover:border-blue-600 hover:bg-blue-50 flex flex-col items-center gap-1 transition-all group"
                          onClick={() => agregarAlCarrito(prod, pres)}
                        >
                          <span className="font-black text-[10px] text-slate-500 uppercase group-hover:text-blue-600">{pres.nombre}</span>
                          <span className="text-[11px] font-black text-slate-900">C$ {pres.precio_venta}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* SECCIÓN DERECHA: RECIBO DE VENTA */}
      <div className="col-span-12 lg:col-span-5 bg-white rounded-[45px] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl"><ShoppingCart size={22} /></div>
            <div>
              <h2 className="text-xl font-black uppercase italic tracking-tighter">Ticket Actual</h2>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Lesly Beauty Salon POS</p>
            </div>
          </div>
          <Badge className="bg-white/10 text-white border-none py-1 px-4 rounded-full">{carrito.length} Art.</Badge>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {carrito.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-200">
              <Receipt size={64} strokeWidth={1} />
              <p className="font-black uppercase text-[10px] tracking-[0.4em] mt-4">Esperando Selección...</p>
            </div>
          )}
          
          {carrito.map((item) => (
            <div key={item.id_temp} className="p-5 bg-slate-50 rounded-[30px] border border-slate-100 animate-in slide-in-from-right-3 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <p className="font-black text-slate-900 uppercase text-xs tracking-tight">{item.articulo.nombre}</p>
                  <div className="flex gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[8px] font-black border-blue-200 text-blue-600 uppercase">{item.presentacion.nombre}</Badge>
                    {item.variantes.map(v => (
                      <Badge key={v.id} className="text-[8px] font-bold bg-slate-900 text-white border-none uppercase">{v.valor}</Badge>
                    ))}
                  </div>
                </div>
                <button onClick={() => setCarrito(carrito.filter(c => c.id_temp !== item.id_temp))} className="text-slate-300 hover:text-red-500 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="flex justify-between items-end">
                <div className="flex items-center bg-white rounded-xl p-1 shadow-sm border border-slate-100">
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => actualizarCantidad(item.id_temp, item.cantidad - 1)}><Minus size={14} /></Button>
                  <span className="w-10 text-center font-black text-sm">{item.cantidad}</span>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-blue-600" onClick={() => actualizarCantidad(item.id_temp, item.cantidad + 1)}><Plus size={14} /></Button>
                </div>
                <div className="text-right">
                   {item.precio_unitario !== item.presentacion.precio_venta && (
                    <div className="flex items-center justify-end gap-1 text-emerald-500">
                      <TrendingUp size={10} />
                      <p className="text-[9px] font-black uppercase italic">Precio con ajuste</p>
                    </div>
                  )}
                  <p className="font-black text-xl text-slate-900 tracking-tighter">C$ {item.subtotal.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* PIE DE VENTA (TOTALES) */}
        <div className="p-10 bg-slate-50 border-t-2 border-dashed border-slate-200 space-y-6">
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span>Subtotal Neto</span>
              <span>C$ {totalNeto.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span>IVA (15%)</span>
              <span>C$ {totalIva.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-end pt-4 border-t border-slate-200">
              <span className="text-sm font-black text-slate-900 uppercase italic tracking-tighter">Total a Cobrar</span>
              <span className="text-4xl font-black text-blue-600 tracking-tighter">C$ {totalFinal.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          
          <Button className="w-full h-20 rounded-[30px] bg-slate-900 hover:bg-blue-600 text-white font-black uppercase tracking-[0.3em] text-xs shadow-2xl transition-all active:scale-95 border-none">
            <CreditCard className="mr-3" size={18} /> Procesar Venta
          </Button>
        </div>
      </div>
    </div>
  )
}