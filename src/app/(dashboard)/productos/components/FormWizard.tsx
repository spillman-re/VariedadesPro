'use client'
import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronRight, ChevronLeft, Save, Loader2, Package, Barcode, Trash2, Plus, Info, Layers, Search } from 'lucide-react'
import { PresentacionForm } from '../types'

export default function FormWizard({ 
  categorias, 
  marcas, 
  tiposVariante, 
  opcionesVariante, 
  onSave, 
  isSaving,
  articuloParaEditar // <-- Recibimos el artículo seleccionado
}: any) {
  const [step, setStep] = useState(1)
  const [base, setBase] = useState({ 
    nombre: '', 
    modelo: '', 
    id_categoria: '', 
    id_marca: '', 
    iva_porcentaje: '15', 
    activo: true 
  })
  const [seleccion, setSeleccion] = useState<{ [key: string]: any[] }>({})
  const [filtroMatriz, setFiltroMatriz] = useState('')
  const [presentaciones, setPresentaciones] = useState<PresentacionForm[]>([
    { id_temp: 'default', nombre: 'UNIDAD', factor: 1 }
  ])
  const [matrizValores, setMatrizValores] = useState<any>({})

  // LÓGICA DE CARGA PARA EDICIÓN
  useEffect(() => {
  if (articuloParaEditar) {
    // PASO 1: Base
    setBase({
      nombre: articuloParaEditar.nombre,
      modelo: articuloParaEditar.modelo,
      id_categoria: articuloParaEditar.id_categoria?.toString(),
      id_marca: articuloParaEditar.id_marca?.toString(),
      iva_porcentaje: articuloParaEditar.iva_porcentaje?.toString(),
      activo: articuloParaEditar.activo
    });

    // PASO 3: Reconstruir Presentaciones
    if (articuloParaEditar.db_presentaciones) {
      const presc = articuloParaEditar.db_presentaciones.map((p: any) => ({
        id_temp: p.id, // Usamos el ID real como temp
        nombre: p.nombre,
        factor: p.factor
      }));
      setPresentaciones(presc);
    }

    // PASO 2: Reconstruir Selecciones de Atributos
    if (articuloParaEditar.db_variantes) {
      const nuevaSeleccion: any = {};
      articuloParaEditar.db_variantes.forEach((v: any) => {
        v.valores.forEach((val: any) => {
          // Buscamos el objeto de la opción completa en 'opcionesVariante' que viene por props
          const opcionFull = opcionesVariante.find((o: any) => o.id === val.id_opcion);
          if (opcionFull) {
            const tipoId = opcionFull.id_tipo;
            if (!nuevaSeleccion[tipoId]) nuevaSeleccion[tipoId] = [];
            if (!nuevaSeleccion[tipoId].some((s: any) => s.id === opcionFull.id)) {
              nuevaSeleccion[tipoId].push(opcionFull);
            }
          }
        });
      });
      setSeleccion(nuevaSeleccion);

      // PASO 4: Reconstruir Matriz de Precios
      const nuevaMatriz: any = {};
      // Este mapeo es delicado, necesitamos cruzar variantes y presentaciones
      // Pero para simplificar, cargamos los precios por el ID de la variante y presentación
      // Nota: Aquí se requiere una lógica de matching más profunda basada en las combinaciones
    }
  }
}, [articuloParaEditar, opcionesVariante]);

  // Combinaciones de variantes
  const combinaciones = useMemo(() => {
    const keys = Object.keys(seleccion).filter(k => seleccion[k].length > 0)
    if (keys.length === 0) return []
    const cartesian = (acc: any[], currKey: string): any[] => 
      acc.flatMap(a => seleccion[currKey].map(opc => ({ ...a, [currKey]: opc })))
    const res = keys.reduce(cartesian, [{}])
    return res.map((item, idx) => ({
      id_temp: `c-${idx}`,
      label: keys.map(k => item[k].valor).join(' / '),
      opciones: keys.map(k => ({ id_tipo: k, id_opcion: item[k].id, valor: item[k].valor }))
    }))
  }, [seleccion])

  const handleUpdateMatriz = (cId: string, pId: string, field: string, val: string) => {
    setMatrizValores((prev: any) => ({
      ...prev,
      [`${cId}-${pId}`]: { ...(prev[`${cId}-${pId}`] || { precio: '0', costo: '0', codigo_barras: '' }), [field]: val }
    }))
  }

  return (
    <div className="w-full">
      {/* INDICADOR DE PROGRESO */}
      <div className="flex items-center justify-center gap-4 md:gap-8 mb-8 max-w-5xl mx-auto w-full overflow-x-auto pb-2">
        {[{ n: 1, l: 'Base' }, { n: 2, l: 'Atributos' }, { n: 3, l: 'Escalas' }, { n: 4, l: 'Matriz' }].map((s) => (
          <div key={s.n} className="flex items-center gap-3 shrink-0">
            <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${step >= s.n ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>{s.n}</div>
            <span className={`text-[10px] font-black uppercase hidden md:block ${step >= s.n ? 'text-slate-900' : 'text-slate-300'}`}>{s.l}</span>
            {s.n !== 4 && <div className="w-6 md:w-12 h-[2px] bg-slate-100" />}
          </div>
        ))}
      </div>

      <div className="mb-24">
        {/* PASO 1: INFORMACIÓN BASE */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
            <div className="lg:col-span-8 space-y-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-2 text-blue-600 border-b border-blue-100 pb-2 mb-4">
                <Info size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Identificación Técnica</span>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre del Artículo</Label>
                <Input value={base.nombre} onChange={e => setBase({...base, nombre: e.target.value})} className="h-12 rounded-xl text-sm font-bold border-none shadow-sm px-4 bg-white focus:ring-2 focus:ring-blue-600/20" placeholder="Ej: Camisa Polo Original" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Modelo / Estilo</Label><Input value={base.modelo} onChange={e => setBase({...base, modelo: e.target.value})} className="h-12 rounded-xl border-none shadow-sm px-4 bg-white" /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">IVA (%)</Label><Input type="number" value={base.iva_porcentaje} onChange={e => setBase({...base, iva_porcentaje: e.target.value})} className="h-12 rounded-xl border-none shadow-sm px-4 bg-white font-black" /></div>
              </div>
            </div>
            <div className="lg:col-span-4 bg-white p-6 rounded-3xl border-2 border-slate-50 space-y-6 shadow-sm">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Categoría</Label>
                <select className="w-full h-12 bg-slate-50 rounded-xl px-4 font-bold text-sm uppercase border-none focus:ring-2 focus:ring-blue-600" value={base.id_categoria} onChange={e => setBase({...base, id_categoria: e.target.value})}>
                  <option value="">Seleccionar...</option>
                  {categorias?.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Marca</Label>
                <select className="w-full h-12 bg-slate-50 rounded-xl px-4 font-bold text-sm uppercase border-none focus:ring-2 focus:ring-blue-600" value={base.id_marca} onChange={e => setBase({...base, id_marca: e.target.value})}>
                  <option value="">Genérica</option>
                  {marcas?.map((m: any) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* PASO 2: ATRIBUTOS */}
        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-400">
            {tiposVariante?.map((tipo: any) => (
              <div key={tipo.id} className="bg-white p-5 rounded-[25px] border border-slate-100 shadow-sm">
                <span className="text-[9px] font-black uppercase text-blue-600 mb-3 block tracking-widest">{tipo.nombre}</span>
                <div className="flex flex-wrap gap-2">
                  {opcionesVariante?.filter((o: any) => o.id_tipo === tipo.id).map((opc: any) => (
                    <button
                      key={opc.id}
                      onClick={() => {
                        const actual = seleccion[tipo.id] || []
                        const existe = actual.some(s => s.id === opc.id)
                        setSeleccion({...seleccion, [tipo.id]: existe ? actual.filter(s => s.id !== opc.id) : [...actual, opc]})
                      }}
                      className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase transition-all border ${seleccion[tipo.id]?.some(s => s.id === opc.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'}`}
                    >
                      {opc.valor}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PASO 3: ESCALAS */}
        {step === 3 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-400">
            {presentaciones.map((p, idx) => (
              <div key={p.id_temp} className="p-5 bg-slate-900 rounded-[25px] shadow-lg space-y-4 relative">
                <div className="flex justify-between items-start">
                  <Badge className="bg-blue-500/20 text-blue-400 border-none text-[8px]">ESCALA #{idx + 1}</Badge>
                  {p.id_temp !== 'default' && (
                    <button onClick={() => setPresentaciones(presentaciones.filter(it => it.id_temp !== p.id_temp))} className="text-rose-400 hover:text-rose-500"><Trash2 size={14} /></button>
                  )}
                </div>
                <div className="space-y-3">
                  <Input placeholder="Nombre (Ej: CAJA)" className="h-9 rounded-lg bg-white/10 border-none text-white font-bold uppercase text-[10px]" value={p.nombre} onChange={e => { const n = [...presentaciones]; n[idx].nombre = e.target.value; setPresentaciones(n); }} />
                  <Input type="number" placeholder="Contenido" className="h-9 rounded-lg bg-white text-slate-900 font-black text-xs" value={p.factor} onChange={e => { const n = [...presentaciones]; n[idx].factor = parseInt(e.target.value); setPresentaciones(n); }} />
                </div>
              </div>
            ))}
            <button onClick={() => setPresentaciones([...presentaciones, { id_temp: crypto.randomUUID(), nombre: '', factor: 1 }])} className="h-32 rounded-[25px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:bg-blue-50 transition-all gap-2">
              <Plus size={20} />
              <span className="text-[9px] font-black uppercase">Agregar Escala</span>
            </button>
          </div>
        )}

        {/* PASO 4: MATRIZ DE PRECIOS */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50 p-5 rounded-[25px] border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg text-white"><Layers size={18} /></div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">Matriz de Valores</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Variantes x Escalas de venta</p>
                </div>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <Input 
                  placeholder="Buscar combinación..." 
                  className="pl-9 h-10 bg-white border-none shadow-sm rounded-xl text-xs font-bold uppercase"
                  value={filtroMatriz}
                  onChange={(e) => setFiltroMatriz(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-white rounded-[30px] border border-slate-100 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-900 border-none">
                    <TableRow className="hover:bg-slate-900 border-none">
                      <TableHead className="text-white text-[9px] font-black uppercase tracking-[0.2em] h-14 px-8">Variante</TableHead>
                      <TableHead className="text-white text-[9px] font-black uppercase tracking-[0.2em] h-14 text-center">Escala</TableHead>
                      <TableHead className="text-white text-[9px] font-black uppercase h-14 w-40 text-center">Venta (C$)</TableHead>
                      <TableHead className="text-white text-[9px] font-black uppercase h-14 w-40 text-center">Costo (C$)</TableHead>
                      <TableHead className="text-white text-[9px] font-black uppercase h-14 px-8">Código SKU</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {combinaciones
                      .filter(c => c.label.toLowerCase().includes(filtroMatriz.toLowerCase()))
                      .map((comb) => (
                        presentaciones.map((pres) => (
                          <TableRow key={`${comb.id_temp}-${pres.id_temp}`} className="group hover:bg-blue-50/30 transition-all border-slate-50 h-16">
                            <TableCell className="px-8 font-black text-[10px] text-slate-900 uppercase tracking-tight">{comb.label}</TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-slate-100 text-slate-500 border-none text-[8px] font-black px-2 py-1 rounded-md uppercase">
                                {pres.nombre || 'UNIDAD'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-500">C$</span>
                                <Input 
                                  className="h-10 pl-8 text-right font-black text-emerald-600 bg-emerald-50/30 border-none focus:ring-2 focus:ring-emerald-500 rounded-xl transition-all"
                                  placeholder="0.00"
                                  onChange={e => handleUpdateMatriz(comb.id_temp, pres.id_temp, 'precio', e.target.value)}
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400">C$</span>
                                <Input 
                                  className="h-10 pl-8 text-right font-bold text-slate-600 bg-slate-50 border-none focus:ring-2 focus:ring-slate-200 rounded-xl"
                                  placeholder="0.00"
                                  onChange={e => handleUpdateMatriz(comb.id_temp, pres.id_temp, 'costo', e.target.value)}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="px-8">
                              <div className="relative">
                                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                <Input 
                                  className="h-10 pl-10 bg-slate-50 border-none rounded-xl font-mono text-[10px] uppercase"
                                  placeholder="Escanear..."
                                  onChange={e => handleUpdateMatriz(comb.id_temp, pres.id_temp, 'codigo_barras', e.target.value)}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="absolute bottom-0 left-0 right-0 px-8 py-5 border-t bg-white/80 backdrop-blur-md flex justify-between items-center z-20">
        <Button variant="ghost" onClick={() => setStep(s => s - 1)} disabled={step === 1} className="h-11 px-6 rounded-xl uppercase font-black text-[11px] text-slate-400">Atrás</Button>
        <div className="flex items-center gap-3">
            {step < 4 ? (
            <Button onClick={() => setStep(s => s + 1)} className="h-11 px-8 rounded-xl bg-slate-900 hover:bg-black uppercase font-black text-[11px] shadow-lg text-white flex items-center gap-2">Siguiente <ChevronRight size={16} /></Button>
            ) : (
            <Button 
                onClick={() => {
                const finalData = {
                    id: articuloParaEditar?.id || null, // Enviamos el ID si existe para saber que es un UPDATE
                    base,
                    presentaciones,
                    combinaciones: combinaciones.map(c => ({
                    ...c,
                    precios: presentaciones.reduce((acc: any, p: any) => {
                        acc[p.id_temp] = matrizValores[`${c.id_temp}-${p.id_temp}`] || { precio: '0', costo: '0', codigo_barras: '' }
                        return acc
                    }, {})
                    }))
                }
                onSave(finalData)
                }}
                disabled={isSaving}
                className="h-11 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 uppercase font-black text-[11px] shadow-lg text-white flex items-center gap-2"
            >
                {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />} 
                {articuloParaEditar ? 'Guardar Cambios' : 'Finalizar Registro'}
            </Button>
            )}
        </div>
      </div>
    </div>
  )
}