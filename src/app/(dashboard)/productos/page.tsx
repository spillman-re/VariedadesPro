'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter
} from '@/components/ui/sheet'
import {
  Loader2, Plus, Search, MoreVertical, Edit, Trash2 as TrashIcon, Save, RefreshCw, AlertTriangle,
  Package2, Tag, Barcode, Layers, Briefcase, TrendingUp, Wallet, Image as ImageIcon,
  AlertCircle, Upload, X, Check, Boxes, Settings2, Scale, Percent, Coins, DollarSign, Info, ChevronRight, ChevronDown
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function ProductosPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [statusFilter, setStatusFilter] = useState<'todos' | 'activos' | 'pausados'>('todos')

  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [expandedPres, setExpandedPres] = useState<string | null>(null)

  const initialFormState = {
    nombre: '',
    codigo_barras: '',
    precio_costo: '',
    iva_porcentaje: '15',
    unidad_medida: 'Unidad',
    unidad_base: 'UNIDAD',
    id_marca: '',
    id_categoria: '',
    stock_minimo: '5',
    imagen_url: '',
    activo: true,
    variantes_informativas: [] as any[],
    presentaciones: [
      {
        id_temp: crypto.randomUUID(),
        nombre: 'UNIDAD',
        factor: 1,
        precio_venta: '',
        es_principal: true,
        codigo_barras: '',
        mayoreo: [],
        variantes_comerciales: []
      }
    ]
  }

  const [formData, setFormData] = useState<any>(initialFormState)

  const { data: categorias } = useQuery({ queryKey: ['categorias'], queryFn: async () => (await supabase.from('categoria').select('*').eq('activo', true).order('nombre')).data || [] })
  const { data: marcas } = useQuery({ queryKey: ['marcas'], queryFn: async () => (await supabase.from('marca').select('*').eq('activo', true).order('nombre')).data || [] })
  const { data: tiposVariante } = useQuery({ queryKey: ['tiposVariante'], queryFn: async () => (await supabase.from('variante_tipos').select('*').eq('activo', true).order('nombre')).data || [] })

  const { data: productos, isLoading: queryLoading } = useQuery({
    queryKey: ['productos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articulo')
        .select(`
          *, 
          categoria:id_categoria(nombre), 
          marca:id_marca(nombre), 
          articulo_presentacion(
            *, 
            articulo_mayoreo(*), 
            articulo_presentacion_variante(*, articulo_variante(*, variante_tipos:id_tipo(nombre)))
          ),
          articulo_variante(*, variante_tipos:id_tipo(nombre))
        `)
        .order('nombre')
      if (error) throw error
      return data
    },
    enabled: !!user
  })

  const handleNumberInput = (val: string, callback: (v: string) => void) => {
    if (val === '' || /^\d*\.?\d*$/.test(val)) callback(val)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const addPresentacion = () => setFormData((prev: any) => ({
    ...prev,
    presentaciones: [...prev.presentaciones, { id_temp: crypto.randomUUID(), nombre: '', factor: 1, precio_venta: '', es_principal: false, codigo_barras: '', mayoreo: [], variantes_comerciales: [] }]
  }))

  const removePresentacion = (idx: number) => {
    if (formData.presentaciones.length === 1) return
    const nextPres = formData.presentaciones.filter((_: any, i: number) => i !== idx)
    setFormData((prev: any) => ({ ...prev, presentaciones: nextPres }))
  }

  const updatePresentacion = (idx: number, field: string, val: any) => {
    const next = [...formData.presentaciones]
    next[idx] = { ...next[idx], [field]: val }
    setFormData((prev: any) => ({ ...prev, presentaciones: next }))
  }

  const addMayoreo = (pIdx: number) => {
    const next = [...formData.presentaciones]
    next[pIdx].mayoreo = [...(next[pIdx].mayoreo || []), { id_temp: crypto.randomUUID(), min_cantidad: 2, max_cantidad: '', precio_unitario: '' }]
    setFormData((prev: any) => ({ ...prev, presentaciones: next }))
  }

  const addVarianteInformativa = () => setFormData((prev: any) => ({
    ...prev,
    variantes_informativas: [...prev.variantes_informativas, { id_temp: crypto.randomUUID(), id_tipo: '', valor: '' }]
  }))

  const addVarianteComercial = (pIdx: number) => {
    const next = [...formData.presentaciones]
    next[pIdx].variantes_comerciales = [...(next[pIdx].variantes_comerciales || []), { id_temp: crypto.randomUUID(), id_tipo: '', valor: '', codigo_barras: '', ajuste_tipo: 'fijo', ajuste_valor: '0', tiene_ajuste: false }]
    setFormData((prev: any) => ({ ...prev, presentaciones: next }))
    setExpandedPres(next[pIdx].id_temp)
  }

  const updateVarianteComercial = (pIdx: number, vcIdx: number, field: string, val: any) => {
    const next = [...formData.presentaciones]
    next[pIdx].variantes_comerciales[vcIdx][field] = val
    setFormData((prev: any) => ({ ...prev, presentaciones: next }))
  }

  useEffect(() => {
    if (editingProduct) {
      const informativas = editingProduct.articulo_variante?.filter((v: any) => !v.id_presentacion) || [];
      const mappedPres = editingProduct.articulo_presentacion?.map((p: any) => ({
        ...p,
        id_temp: p.id,
        precio_venta: p.precio_venta?.toString() || '',
        mayoreo: p.articulo_mayoreo || [],
        variantes_comerciales: p.articulo_presentacion_variante?.map((pv: any) => ({
          id_temp: pv.id,
          id_tipo: pv.articulo_variante?.id_tipo,
          valor: pv.articulo_variante?.valor,
          codigo_barras: pv.articulo_variante?.codigo_barras || '',
          ajuste_tipo: pv.ajuste_tipo,
          ajuste_valor: pv.ajuste_valor?.toString() || '0',
          tiene_ajuste: pv.ajuste_valor !== 0
        })) || []
      })) || [];

      setFormData({
        ...editingProduct,
        precio_costo: editingProduct.precio_costo?.toString() || '',
        id_marca: editingProduct.id_marca?.toString() || '',
        id_categoria: editingProduct.id_categoria?.toString() || '',
        variantes_informativas: informativas,
        presentaciones: mappedPres
      })
      setPreviewUrl(editingProduct.imagen_url)
    } else {
      setFormData(initialFormState)
      setPreviewUrl(null)
    }
  }, [editingProduct, open])

  // --- MUTACIÓN TRANSACCIONAL CORREGIDA PARA BUILD ---
  const mutation = useMutation({
    mutationFn: async (dataToSave: any) => {
      setUploading(true)
      const payloadArticulo: any = {
        nombre: dataToSave.nombre.toUpperCase(),
        codigo_barras: dataToSave.codigo_barras || null,
        precio_costo: parseFloat(dataToSave.precio_costo) || 0,
        iva_porcentaje: parseFloat(dataToSave.iva_porcentaje) || 0,
        id_categoria: parseInt(dataToSave.id_categoria),
        id_marca: dataToSave.id_marca ? parseInt(dataToSave.id_marca) : null,
        stock_minimo: parseInt(dataToSave.stock_minimo) || 0,
        imagen_url: dataToSave.imagen_url
      }

      let res: any;
      // Usamos ['tabla'] para saltar la validación de tipos estricta
      if (editingProduct?.id) {
        res = await (supabase.from as any)('articulo').update(payloadArticulo).eq('id', editingProduct.id).select().single()
      } else {
        res = await (supabase.from as any)('articulo').insert([payloadArticulo]).select().single()
      }

      if (res.error) throw res.error
      const articuloId = res.data.id

      // Aplicamos lo mismo para las tablas relacionales
      await (supabase.from as any)('articulo_variante').delete().eq('id_articulo', articuloId).is('id_presentacion', null)

      if (dataToSave.variantes_informativas?.length) {
        await (supabase.from as any)('articulo_variante').insert(dataToSave.variantes_informativas.map((v: any) => ({
          id_articulo: articuloId, id_tipo: v.id_tipo, valor: v.valor.toUpperCase(), activo: true
        })))
      }

      const { data: currentPres }: any = await (supabase.from as any)('articulo_presentacion').select('id').eq('id_articulo', articuloId)
      if (currentPres?.length) {
        const ids = currentPres.map((p: any) => p.id)
        await (supabase.from as any)('articulo_mayoreo').delete().in('id_presentacion', ids)
        await (supabase.from as any)('articulo_presentacion_variante').delete().in('id_presentacion', ids)
        await (supabase.from as any)('articulo_variante').delete().in('id_presentacion', ids)
      }
      await (supabase.from as any)('articulo_presentacion').delete().eq('id_articulo', articuloId)

      for (const p of dataToSave.presentaciones) {
        const { data: newP, error: pErr }: any = await (supabase.from as any)('articulo_presentacion').insert({
          id_articulo: articuloId, nombre: p.nombre.toUpperCase(), factor: p.factor,
          precio_venta: parseFloat(p.precio_venta) || 0, codigo_barras: p.codigo_barras, es_principal: p.es_principal
        }).select().single()

        if (pErr) throw pErr

        if (p.mayoreo?.length > 0) {
          await (supabase.from as any)('articulo_mayoreo').insert(p.mayoreo.map((m: any) => ({
            id_presentacion: newP.id, min_cantidad: parseInt(m.min_cantidad), max_cantidad: m.max_cantidad || null, precio_unitario: parseFloat(m.precio_unitario)
          })))
        }

        for (const vc of p.variantes_comerciales) {
          const { data: vFis, error: vfErr }: any = await (supabase.from as any)('articulo_variante').insert({
            id_articulo: articuloId, id_presentacion: newP.id, id_tipo: vc.id_tipo,
            valor: vc.valor.toUpperCase(), codigo_barras: vc.codigo_barras || null
          }).select().single()

          if (vfErr) throw vfErr

          await (supabase.from as any)('articulo_presentacion_variante').insert({
            id_presentacion: newP.id, id_variante: vFis.id,
            ajuste_tipo: vc.ajuste_tipo, ajuste_valor: vc.tiene_ajuste ? parseFloat(vc.ajuste_valor) : 0
          })
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] })
      setOpen(false)
      toast.success("Catálogo sincronizado exitosamente")
    },
    onError: (err: any) => toast.error(err.message)
  })

  const productosFiltrados = productos?.filter((p: any) => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <TooltipProvider delayDuration={100}>
      <div className="max-w-[1600px] mx-auto space-y-4 md:space-y-8 pb-12 p-2 md:p-4">
        {/* HEADER RESPONSIVE */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end pt-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg"><Boxes size={24} /></div>
              <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Catálogo</h1>
            </div>
            <p className="text-slate-400 font-bold text-[8px] md:text-[10px] uppercase tracking-[0.3em] pl-1 italic">Gestión Relacional v5.1</p>
          </div>
          <div className="flex w-full md:w-auto gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
                placeholder="BUSCAR..."
                className="pl-10 h-12 rounded-2xl border-none bg-white shadow-sm font-bold text-xs uppercase"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={() => { setEditingProduct(null); setOpen(true); }} className="bg-blue-600 hover:bg-slate-900 h-12 px-4 md:px-6 rounded-2xl font-black uppercase text-[10px] shadow-xl">
              <Plus size={18} className="md:mr-2" /> <span className="hidden md:inline">Nuevo Artículo</span>
            </Button>
          </div>
        </div>

        {/* TABLA / VISTA MOBILE */}
        <div className="bg-white rounded-2xl md:rounded-[35px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                <TableRow className="hover:bg-transparent h-16">
                  <TableHead className="px-6 font-black text-slate-400 uppercase text-[9px] tracking-[0.2em]">Producto & SKU</TableHead>
                  <TableHead className="font-black text-slate-400 uppercase text-[9px] tracking-[0.2em]">Categoría / Marca</TableHead>
                  <TableHead className="font-black text-slate-400 uppercase text-[9px] tracking-[0.2em]">Precio Principal</TableHead>
                  <TableHead className="font-black text-slate-400 uppercase text-[9px] tracking-[0.2em]">Atributos</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queryLoading ? (
                  <TableRow><TableCell colSpan={5} className="h-80 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={40} /></TableCell></TableRow>
                ) : productosFiltrados?.map((p: any) => {
                  const presPrincipal = p.articulo_presentacion?.find((pr: any) => pr.es_principal) || p.articulo_presentacion?.[0];
                  const variantesInfo = p.articulo_variante?.filter((v: any) => !v.id_presentacion) || [];
                  const presentacionesConAjustes = p.articulo_presentacion?.filter((pr: any) => pr.articulo_presentacion_variante?.length > 0);

                  return (
                    <TableRow key={p.id} className="hover:bg-blue-50/20 transition-all border-slate-50 h-20 group">
                      <TableCell className="px-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 bg-white rounded-2xl overflow-hidden flex-shrink-0 border border-slate-100 shadow-sm group-hover:scale-105 transition-transform duration-300">
                            {p.imagen_url ? <img src={p.imagen_url} className="object-cover h-full w-full" /> : <Package2 className="text-slate-200 p-2.5" size={20} />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-black text-slate-900 uppercase text-[12px] truncate tracking-tighter leading-none mb-1">{p.nombre}</span>
                            <span className="text-[9px] font-mono text-slate-400 uppercase bg-slate-50 w-fit px-1.5 rounded border border-slate-100">{p.codigo_barras || 'S/SKU'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-tight">{p.categoria?.nombre || 'General'}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase italic leading-none">{p.marca?.nombre || 'Genérica'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">{presPrincipal?.nombre}</span>
                            <span className="text-sm font-black text-slate-900 tracking-tighter italic">C$ {presPrincipal?.precio_venta || '0.00'}</span>
                          </div>
                          {p.articulo_presentacion?.length > 1 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all cursor-help border border-transparent hover:border-slate-800">
                                  <Layers size={12} />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-slate-900 text-white border-none p-3 rounded-2xl shadow-2xl min-w-[140px]">
                                <p className="text-[8px] font-black uppercase tracking-widest mb-2 border-b border-white/10 pb-1 text-blue-400">Escalas de Venta</p>
                                <div className="space-y-1.5">
                                  {p.articulo_presentacion.map((pr: any) => (
                                    <div key={pr.id} className="flex justify-between gap-4 text-[9px]">
                                      <span className={`font-bold ${pr.es_principal ? 'text-white' : 'text-slate-400'}`}>{pr.nombre} {pr.es_principal && '(M)'}:</span>
                                      <span className="font-black text-emerald-400">C$ {pr.precio_venta}</span>
                                    </div>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {variantesInfo.slice(0, 2).map((v: any, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-[8px] font-black uppercase bg-slate-100 text-slate-500 border-none h-5 px-2">
                                {v.valor}
                              </Badge>
                            ))}
                            {variantesInfo.length > 2 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge className="bg-blue-50 text-blue-600 border-none text-[8px] font-black h-5 cursor-help">+{variantesInfo.length - 2}</Badge>
                                </TooltipTrigger>
                                <TooltipContent className="bg-white text-slate-900 border border-slate-100 p-2 shadow-xl rounded-lg">
                                  {variantesInfo.slice(2).map((v: any, i: number) => (
                                    <p key={i} className="text-[9px] font-black uppercase text-slate-600">{v.variante_tipos?.nombre}: {v.valor}</p>
                                  ))}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          {presentacionesConAjustes.length > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 cursor-help hover:bg-emerald-600 hover:text-white transition-colors">
                                  <Coins size={12} strokeWidth={3} />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="bg-slate-900 text-white border-none p-4 rounded-[25px] shadow-2xl min-w-[200px]">
                                <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-2">
                                  <TrendingUp size={14} className="text-emerald-400" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Recargos por Variantes</span>
                                </div>
                                <div className="space-y-4">
                                  {presentacionesConAjustes.map((pr: any) => (
                                    <div key={pr.id} className="space-y-1.5">
                                      <p className="text-[8px] font-black text-blue-400 uppercase tracking-tighter">{pr.nombre}</p>
                                      {pr.articulo_presentacion_variante.map((pv: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center gap-4 pl-2 border-l border-white/10">
                                          <span className="text-[9px] font-bold text-slate-300">{pv.articulo_variante?.valor}:</span>
                                          <span className="text-[9px] font-black text-emerald-400">
                                            +{pv.ajuste_tipo === 'porcentaje' ? `${pv.ajuste_valor}%` : `C$${pv.ajuste_valor}`}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white h-10 w-10 border-none transition-all">
                              <MoreVertical size={18} className="text-slate-300 group-hover:text-blue-600" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-2xl font-black uppercase text-[10px] p-2 border-none shadow-2xl ring-1 ring-slate-100">
                            <DropdownMenuItem onClick={() => { setEditingProduct(p); setOpen(true); }} className="rounded-lg p-2 gap-2 cursor-pointer focus:bg-blue-50 focus:text-blue-600"><Edit size={14} /> Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteId(p.id)} className="rounded-lg p-2 gap-2 cursor-pointer text-rose-500 focus:bg-rose-50 focus:text-rose-600 mt-1"><TrashIcon size={14} /> Desactivar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100">
            {queryLoading ? (
              <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={32} /></div>
            ) : productosFiltrados?.map((p: any) => {
              const presPrincipal = p.articulo_presentacion?.find((pr: any) => pr.es_principal) || p.articulo_presentacion?.[0];
              return (
                <div key={p.id} className="p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                        {p.imagen_url ? <img src={p.imagen_url} className="object-cover h-full w-full" /> : <Package2 className="text-slate-200 p-3" size={24} />}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 uppercase text-[11px] leading-tight">{p.nombre}</span>
                        <span className="text-[9px] font-bold text-blue-600 uppercase">{p.categoria?.nombre || 'General'}</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical size={16} /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl font-black uppercase text-[10px]">
                        <DropdownMenuItem onClick={() => { setEditingProduct(p); setOpen(true); }}><Edit size={14} className="mr-2" /> Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteId(p.id)} className="text-rose-500"><TrashIcon size={14} className="mr-2" /> Desactivar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex justify-between items-end bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase">{presPrincipal?.nombre}</span>
                      <span className="text-lg font-black text-slate-900 italic">C$ {presPrincipal?.precio_venta}</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 uppercase px-2 py-1 bg-white rounded border border-slate-100">{p.codigo_barras || 'S/SKU'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* FORMULARIO GIGANTE */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col bg-white border-none shadow-3xl">
            <SheetHeader className="p-6 md:p-8 bg-slate-900 text-white shadow-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-2xl shadow-lg"><Settings2 size={24} /></div>
                <div>
                  <SheetTitle className="text-xl md:text-2xl font-black uppercase italic text-white tracking-tighter leading-none">Ficha Profesional</SheetTitle>
                  <SheetDescription className="text-slate-400 font-bold text-[8px] md:text-[9px] uppercase tracking-widest mt-1">Configuración Comercial de Producto</SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <Tabs defaultValue="general" className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 md:px-8 mt-6">
                <TabsList className="grid grid-cols-3 bg-slate-100 p-1 rounded-2xl h-10 md:h-12">
                  <TabsTrigger value="general" className="text-[8px] md:text-[9px] font-black uppercase rounded-xl">1. Base</TabsTrigger>
                  <TabsTrigger value="presentaciones" className="text-[8px] md:text-[9px] font-black uppercase rounded-xl">2. Empaques</TabsTrigger>
                  <TabsTrigger value="variantes" className="text-[8px] md:text-[9px] font-black uppercase rounded-xl">3. Variantes</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar">
                <TabsContent value="general" className="space-y-6 md:space-y-8 mt-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-blue-600"><Tag size={14} strokeWidth={3} /><span className="text-[10px] font-black uppercase tracking-widest">Identificación</span></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Nombre Artículo</Label><Input className="h-12 rounded-xl border-2 border-slate-100 font-bold uppercase focus:border-blue-500 transition-all" value={formData.nombre || ''} onChange={e => setFormData({ ...formData, nombre: e.target.value })} /></div>
                      <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">SKU Base</Label><Input className="h-12 border-2 border-slate-100 font-mono text-sm uppercase rounded-xl" value={formData.codigo_barras || ''} onChange={e => setFormData({ ...formData, codigo_barras: e.target.value })} /></div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 md:p-6 rounded-[25px] md:rounded-3xl space-y-4 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-900"><Info size={14} strokeWidth={3} /><span className="text-[10px] font-black uppercase tracking-widest">Atributos Informativos</span></div>
                      <Button onClick={addVarianteInformativa} size="sm" variant="ghost" className="h-8 text-[9px] font-black text-blue-600 uppercase transition-all">+ Añadir</Button>
                    </div>
                    <div className="space-y-2">
                      {formData.variantes_informativas?.map((v: any, idx: number) => (
                        <div key={v.id_temp || idx} className="grid grid-cols-12 gap-2 items-center bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm">
                          <div className="col-span-5 md:col-span-5">
                            <Select value={v.id_tipo} onValueChange={val => { const next = [...formData.variantes_informativas]; next[idx].id_tipo = val; setFormData({ ...formData, variantes_informativas: next }) }}>
                              <SelectTrigger className="h-9 border-none bg-slate-50 text-[10px] font-bold uppercase rounded-lg"><SelectValue placeholder="..." /></SelectTrigger>
                              <SelectContent className="rounded-xl">{tiposVariante?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-6 md:col-span-6">
                            <Input className="h-9 border-none bg-slate-50 font-bold text-[10px] uppercase rounded-lg" placeholder="VALOR" value={v.valor} onChange={e => { const next = [...formData.variantes_informativas]; next[idx].valor = e.target.value; setFormData({ ...formData, variantes_informativas: next }) }} />
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <button onClick={() => setFormData({ ...formData, variantes_informativas: formData.variantes_informativas.filter((_: any, i: number) => i !== idx) })} className="text-red-300 hover:text-red-500"><X size={16} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Marca</Label><Select value={formData.id_marca || ''} onValueChange={v => setFormData({ ...formData, id_marca: v })}><SelectTrigger className="h-12 rounded-xl border-2 border-slate-100 font-bold uppercase text-[10px]"><SelectValue placeholder="..." /></SelectTrigger><SelectContent className="rounded-xl">{marcas?.map((m: any) => <SelectItem key={m.id} value={m.id.toString()} className="text-[10px] font-bold uppercase">{m.nombre}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Categoría</Label><Select value={formData.id_categoria || ''} onValueChange={(v) => setFormData({ ...formData, id_categoria: v })}><SelectTrigger className="h-12 rounded-xl border-2 border-slate-100 font-bold uppercase text-[10px]"><SelectValue placeholder="..." /></SelectTrigger><SelectContent className="rounded-xl">{categorias?.map((c: any) => <SelectItem key={c.id} value={c.id.toString()} className="text-[10px] font-bold uppercase">{c.nombre}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Medida</Label><Select value={formData.unidad_base || 'UNIDAD'} onValueChange={(v) => setFormData({ ...formData, unidad_base: v })}><SelectTrigger className="h-12 rounded-xl border-2 border-slate-100 font-bold uppercase text-[10px]"><SelectValue placeholder="..." /></SelectTrigger><SelectContent className="rounded-xl">{['UNIDAD', 'PAR', 'DOCENA', 'CAJA', 'LITRO', 'GRAMO'].map(u => <SelectItem key={u} value={u} className="text-[10px] font-bold uppercase">{u}</SelectItem>)}</SelectContent></Select></div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-3xl space-y-4 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-900"><Wallet size={14} strokeWidth={3} /><span className="text-[10px] font-black uppercase tracking-widest">Estructura Financiera</span></div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400 italic">Costo</Label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-blue-600 text-xs">C$</span><Input className="h-12 pl-10 rounded-xl border-none shadow-sm font-black text-lg text-slate-700" value={formData.precio_costo} onChange={e => handleNumberInput(e.target.value, (v) => setFormData({ ...formData, precio_costo: v }))} /></div></div>
                      <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400 italic">IVA %</Label><Input type="number" className="h-12 rounded-xl border-none shadow-sm font-black text-center" value={formData.iva_porcentaje} onChange={e => handleNumberInput(e.target.value, (v) => setFormData({ ...formData, iva_porcentaje: v }))} /></div>
                      <div className="space-y-2 col-span-2 md:col-span-1"><Label className="text-[10px] font-black uppercase text-slate-400 italic">Mínimo Stock</Label><Input type="number" className="h-12 rounded-xl border-none shadow-sm font-black text-center text-rose-500" value={formData.stock_minimo} onChange={e => handleNumberInput(e.target.value, (v) => setFormData({ ...formData, stock_minimo: v }))} /></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Imagen / Miniatura</Label>
                    <div className="relative group h-44 bg-slate-50 rounded-[35px] border-4 border-dashed border-slate-100 flex items-center justify-center cursor-pointer overflow-hidden transition-all">
                      {previewUrl ? (
                        <>
                          <img src={previewUrl} className="h-full w-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 md:group-hover:opacity-100 flex items-center justify-center transition-all">
                            <Button size="sm" variant="destructive" className="rounded-xl font-black text-[9px] uppercase shadow-xl" onClick={(e) => { e.stopPropagation(); setPreviewUrl(null); setFormData({ ...formData, imagen_url: '' }); }}><TrashIcon size={14} className="mr-1" /> Quitar</Button>
                          </div>
                        </>
                      ) : <div onClick={() => fileInputRef.current?.click()} className="text-center"><Upload className="mx-auto text-slate-300 mb-2" size={32} /><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Subir Imagen</span></div>}
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                  </div>
                </TabsContent>

                <TabsContent value="presentaciones" className="space-y-6 mt-0 animate-in fade-in">
                  {formData.presentaciones?.map((p: any, idx: number) => (
                    <div key={p.id_temp || idx} className="p-4 md:p-6 bg-slate-50 rounded-2xl md:rounded-[35px] border border-slate-100 space-y-4 relative group shadow-sm">
                      <div className="grid grid-cols-2 md:grid-cols-12 gap-3 items-end">
                        <div className="col-span-2 md:col-span-3 space-y-1"><Label className="text-[8px] font-black text-slate-400 uppercase">Empaque</Label><Input className="h-10 rounded-xl border-none shadow-sm font-bold uppercase text-xs" value={p.nombre || ''} onChange={e => updatePresentacion(idx, 'nombre', e.target.value)} /></div>
                        <div className="col-span-1 md:col-span-2 space-y-1"><Label className="text-[8px] font-black text-slate-400 uppercase">Factor</Label><Input type="number" className="h-10 rounded-xl border-none shadow-sm text-center font-black text-xs" value={p.factor ?? 1} onChange={e => handleNumberInput(e.target.value, (v) => updatePresentacion(idx, 'factor', v))} /></div>
                        <div className="col-span-1 md:col-span-3 space-y-1"><Label className="text-[8px] font-black text-slate-400 uppercase">Precio Base</Label><div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-600">C$</span><Input className="h-10 pl-7 rounded-xl border-none shadow-sm font-black text-blue-700 text-xs" value={p.precio_venta} onChange={e => handleNumberInput(e.target.value, (v) => updatePresentacion(idx, 'precio_venta', v))} /></div></div>
                        <div className="col-span-2 md:col-span-4 space-y-1"><Label className="text-[8px] font-black text-slate-400 uppercase">SKU</Label><Input className="h-10 rounded-xl border-none shadow-sm font-mono text-[9px] uppercase" value={p.codigo_barras || ''} onChange={e => updatePresentacion(idx, 'codigo_barras', e.target.value)} /></div>
                      </div>
                      <div className="pt-2 border-t border-slate-200">
                        <div className="flex justify-between items-center mb-2"><span className="text-[8px] font-black uppercase text-emerald-600">Reglas de Mayoreo</span><Button onClick={() => addMayoreo(idx)} size="sm" variant="ghost" className="h-6 text-[8px] font-black text-emerald-600"><Plus size={10} className="mr-1" /> Añadir Rango</Button></div>
                        <div className="space-y-2">
                          {p.mayoreo?.map((m: any, mIdx: number) => (
                            <div key={m.id_temp} className="flex flex-wrap md:flex-nowrap gap-2 items-center bg-white p-2 rounded-xl border border-emerald-100 shadow-sm">
                              <div className="flex items-center gap-1 flex-1">
                                <span className="text-[8px] font-bold text-slate-400 uppercase">D:</span><Input className="h-7 w-10 text-[10px] font-black text-center" value={m.min_cantidad ?? 0} onChange={e => { const next = [...formData.presentaciones]; handleNumberInput(e.target.value, (v) => { next[idx].mayoreo[mIdx].min_cantidad = v; setFormData({ ...formData, presentaciones: next }); }); }} />
                                <span className="text-[8px] font-bold text-slate-400 uppercase">H:</span><Input placeholder="∞" className="h-7 w-10 text-[10px] font-black text-center" value={m.max_cantidad || ''} onChange={e => { const next = [...formData.presentaciones]; handleNumberInput(e.target.value, (v) => { next[idx].mayoreo[mIdx].max_cantidad = v; setFormData({ ...formData, presentaciones: next }); }); }} />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] font-bold text-emerald-500 uppercase">Precio:</span><div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-600">C$</span><Input className="h-7 w-20 pl-7 border-none bg-emerald-50/50 font-black text-[10px] text-emerald-700" value={m.precio_unitario} onChange={e => { const next = [...formData.presentaciones]; handleNumberInput(e.target.value, (v) => { next[idx].mayoreo[mIdx].precio_unitario = v; setFormData({ ...formData, presentaciones: next }); }); }} /></div>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-300 hover:text-red-500" onClick={() => { const next = [...formData.presentaciones]; next[idx].mayoreo = next[idx].mayoreo.filter((_: any, i: number) => i !== mIdx); setFormData({ ...formData, presentaciones: next }) }}><X size={12} /></Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removePresentacion(idx)} className="absolute -top-2 -right-2 h-8 w-8 bg-white shadow-md rounded-full text-red-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 border-none transition-all shadow-red-100"><X size={14} /></Button>
                    </div>
                  ))}
                  <Button onClick={addPresentacion} className="w-full h-12 rounded-2xl bg-blue-50 text-blue-600 border-none font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 hover:text-white transition-all"><Plus size={16} className="mr-2" /> Nueva Presentación</Button>
                </TabsContent>

                <TabsContent value="variantes" className="space-y-4 mt-0 animate-in fade-in">
                  {formData.presentaciones?.map((p: any, pIdx: number) => (
                    <div key={p.id_temp || pIdx} className={`border border-slate-100 rounded-2xl md:rounded-[35px] overflow-hidden transition-all duration-300 ${expandedPres === p.id_temp ? 'bg-slate-50/50 shadow-lg' : 'bg-white'}`}>
                      <div
                        onClick={() => setExpandedPres(expandedPres === p.id_temp ? null : p.id_temp)}
                        className="flex items-center gap-3 p-4 md:p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <div className={`p-2 rounded-xl transition-all ${expandedPres === p.id_temp ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}`}>
                          <Package2 size={18} />
                        </div>
                        <div className="flex-1">
                          <span className="text-[10px] md:text-[11px] font-black uppercase text-slate-900 tracking-widest italic">{p.nombre || 'SIN NOMBRE'}</span>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">{p.variantes_comerciales?.length || 0} Variantes</p>
                        </div>
                        <Button
                          onClick={(e) => { e.stopPropagation(); addVarianteComercial(pIdx); }}
                          size="sm"
                          className="bg-purple-50 text-purple-600 rounded-xl text-[8px] md:text-[9px] font-black h-8 px-2 md:px-4 uppercase"
                        >
                          + Variante
                        </Button>
                        <div className={`transition-transform duration-300 ${expandedPres === p.id_temp ? 'rotate-180' : ''}`}>
                          <ChevronDown size={20} className="text-slate-300" />
                        </div>
                      </div>
                      {expandedPres === p.id_temp && (
                        <div className="p-4 md:p-6 pt-0 space-y-4 animate-in slide-in-from-top-2 duration-300">
                          <div className="space-y-4 md:pl-4 md:border-l-2 md:border-blue-600/20 mt-2">
                            {p.variantes_comerciales?.map((vc: any, vcIdx: number) => (
                              <div key={vc.id_temp} className="p-4 md:p-6 bg-slate-900 rounded-2xl md:rounded-[35px] space-y-4 shadow-2xl relative">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                  <div className="md:col-span-3">
                                    <Label className="text-[8px] font-black text-white/40 uppercase mb-1 block">Atributo</Label>
                                    <Select value={vc.id_tipo} onValueChange={v => updateVarianteComercial(pIdx, vcIdx, 'id_tipo', v)}>
                                      <SelectTrigger className="h-10 bg-white/10 border-none text-white font-black text-[9px] rounded-xl"><SelectValue placeholder="..." /></SelectTrigger>
                                      <SelectContent className="rounded-xl border-none shadow-2xl uppercase font-bold text-[10px]">{tiposVariante?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <div className="md:col-span-3">
                                    <Label className="text-[8px] font-black text-white/40 uppercase mb-1 block">Valor</Label>
                                    <Input className="h-10 bg-white/10 border-none text-white font-bold uppercase text-xs rounded-xl" value={vc.valor} onChange={e => updateVarianteComercial(pIdx, vcIdx, 'valor', e.target.value)} />
                                  </div>
                                  <div className="md:col-span-6">
                                    <Label className="text-[8px] font-black text-white/40 uppercase mb-1 block">SKU Específico</Label>
                                    <div className="relative"><Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} /><Input className="h-10 pl-10 bg-white/10 border-none text-white font-mono text-xs rounded-xl uppercase" placeholder="ESCANEAR..." value={vc.codigo_barras} onChange={e => updateVarianteComercial(pIdx, vcIdx, 'codigo_barras', e.target.value)} /></div>
                                  </div>
                                </div>
                                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 pt-3 border-t border-white/5">
                                  <div className="flex items-center gap-2">
                                    <Switch checked={vc.tiene_ajuste} onCheckedChange={c => updateVarianteComercial(pIdx, vcIdx, 'tiene_ajuste', c)} className="scale-75" />
                                    <span className="text-[9px] font-black text-white/40 uppercase">¿Ajusta Precio?</span>
                                  </div>
                                  {vc.tiene_ajuste && (
                                    <div className="flex-1 flex gap-3 animate-in slide-in-from-left-2 duration-300">
                                      <Select value={vc.ajuste_tipo} onValueChange={v => updateVarianteComercial(pIdx, vcIdx, 'ajuste_tipo', v)}>
                                        <SelectTrigger className="h-9 w-32 bg-white/5 border-none text-white font-black text-[8px] rounded-xl"><SelectValue /></SelectTrigger>
                                        <SelectContent className="border-none font-bold uppercase text-[9px]"><SelectItem value="fijo">C$ FIJO</SelectItem><SelectItem value="porcentaje">% PORC.</SelectItem></SelectContent>
                                      </Select>
                                      <div className="relative flex-1 max-w-[150px]">
                                        {vc.ajuste_tipo === 'porcentaje' ? <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" size={12} /> : <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" size={12} />}
                                        <Input className="h-9 pl-9 bg-white/10 border-none text-white font-black text-xs rounded-xl" value={vc.ajuste_valor} onChange={e => handleNumberInput(e.target.value, (v) => updateVarianteComercial(pIdx, vcIdx, 'ajuste_valor', v))} />
                                      </div>
                                    </div>
                                  )}
                                  <button onClick={() => { const next = [...formData.presentaciones]; next[pIdx].variantes_comerciales = next[pIdx].variantes_comerciales.filter((_: any, i: number) => i !== vcIdx); setFormData({ ...formData, presentaciones: next }); }} className="md:ml-auto p-2 text-white/20 hover:text-red-400 self-end md:self-center"><TrashIcon size={18} /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </TabsContent>
              </div>
            </Tabs>

            <SheetFooter className="p-6 md:p-8 border-t bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 italic"><AlertCircle size={14} /><span>Relaciones v5.1 Activas</span></div>
              <Button onClick={() => mutation.mutate(formData)} disabled={mutation.isPending || uploading} className="h-16 w-full md:w-auto md:px-10 rounded-2xl md:rounded-[30px] bg-blue-600 hover:bg-slate-900 font-black uppercase tracking-[0.2em] text-xs shadow-2xl transition-all border-none text-white">
                {mutation.isPending ? <Loader2 className="animate-spin mr-3" /> : <Save size={20} className="mr-3" />}
                {editingProduct ? 'Actualizar Ficha' : 'Guardar Ficha'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* ALERT DIALOG ELIMINAR */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent className="rounded-[30px] md:rounded-[50px] p-6 md:p-10 border-none shadow-3xl bg-white text-center flex flex-col items-center max-w-[90vw] md:max-w-lg">
            <AlertDialogHeader className="flex flex-col items-center">
              <div className="h-16 w-16 md:h-20 md:w-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={32} />
              </div>
              <AlertDialogTitle className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
                ¿Desactivar Artículo?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-2">
                Esta acción ocultará el producto del catálogo activo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-8 flex flex-col md:flex-row gap-3 w-full">
              <AlertDialogCancel className="h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest border-slate-100 flex-1 hover:bg-slate-50 transition-all shadow-sm">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (!deleteId) return;

                  // Usamos esta sintaxis para forzar a TypeScript a ignorar la validación de la tabla
                  const table: any = supabase.from('articulo');

                  table
                    .update({ activo: false })
                    .eq('id', deleteId)
                    .then((res: any) => {
                      if (res.error) {
                        toast.error("Error al desactivar: " + res.error.message);
                      } else {
                        queryClient.invalidateQueries({ queryKey: ['productos'] });
                        setDeleteId(null);
                        toast.info("Producto desactivado");
                      }
                    });
                }}
                className="h-14 rounded-2xl bg-red-600 hover:bg-red-700 font-black uppercase text-[10px] tracking-widest flex-1 text-white shadow-xl transition-all active:scale-95 border-none"
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}