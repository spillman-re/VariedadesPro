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
  AlertCircle, Upload, X, Check, Boxes, Settings2, Scale, Percent, Coins
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
import { toast } from "sonner"

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

  // --- ESTADO INICIAL ---
  const initialFormState = {
    nombre: '',
    codigo_barras: '',
    precio_costo: 0,
    iva_porcentaje: 15,
    unidad_medida: 'Unidad',
    unidad_base: 'UNIDAD',
    id_marca: '',
    id_categoria: '',
    stock_minimo: 5,
    imagen_url: '',
    activo: true,
    presentaciones: [
      { id_temp: crypto.randomUUID(), nombre: 'UNIDAD', factor: 1, precio_venta: 0, es_principal: true, codigo_barras: '', mayoreo: [] }
    ],
    variantes: [] as any[] 
  }

  const [formData, setFormData] = useState(initialFormState)

  // --- QUERIES ---
  const { data: categorias } = useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data } = await supabase.from('categoria').select('*').eq('activo', true).order('nombre')
      return data || []
    }
  })

  const { data: marcas } = useQuery({
    queryKey: ['marcas'],
    queryFn: async () => {
      const { data } = await supabase.from('marca').select('*').eq('activo', true).order('nombre')
      return data || []
    }
  })

  const { data: tiposVariante } = useQuery({
    queryKey: ['tiposVariante'],
    queryFn: async () => {
      const { data } = await supabase.from('variante_tipos').select('*').eq('activo', true).order('nombre')
      return data || []
    }
  })

  const { data: productos, isLoading: queryLoading } = useQuery({
    queryKey: ['productos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articulo')
        .select(`*, categoria:id_categoria(nombre), marca:id_marca(nombre), articulo_presentacion(*, articulo_mayoreo(*)), articulo_variante(*, variante_tipos:id_tipo(nombre))`)
        .order('nombre')
      if (error) throw error
      return data
    },
    enabled: !!user
  })

  // --- LÓGICA DINÁMICA ---
  const addPresentacion = () => setFormData(prev => ({
    ...prev,
    presentaciones: [...prev.presentaciones, { id_temp: crypto.randomUUID(), nombre: '', factor: 1, precio_venta: 0, es_principal: false, codigo_barras: '', mayoreo: [] }]
  }))

  const updatePresentacion = (idx: number, field: string, val: any) => {
    const next = [...formData.presentaciones]
    next[idx] = { ...next[idx], [field]: val }
    setFormData(prev => ({ ...prev, presentaciones: next }))
  }

  const addMayoreo = (pIdx: number) => {
    const next = [...formData.presentaciones]
    next[pIdx].mayoreo.push({ id_temp: crypto.randomUUID(), min_cantidad: 2, max_cantidad: '', precio_unitario: 0 })
    setFormData(prev => ({ ...prev, presentaciones: next }))
  }

  const addVarianteTipo = () => setFormData(prev => ({
    ...prev,
    variantes: [...prev.variantes, { id_tipo: '', valores: [{ id_temp: crypto.randomUUID(), valor: '', ajuste_tipo: 'fijo', ajuste_valor: 0 }] }]
  }))

  const addValorVariante = (vIdx: number) => {
    const next = [...formData.variantes]
    next[vIdx].valores.push({ id_temp: crypto.randomUUID(), valor: '', ajuste_tipo: 'fijo', ajuste_valor: 0 })
    setFormData(prev => ({ ...prev, variantes: next }))
  }

  const updateValorVariante = (vIdx: number, valIdx: number, field: string, val: any) => {
    const next = [...formData.variantes]
    next[vIdx].valores[valIdx][field] = val
    setFormData(prev => ({ ...prev, variantes: next }))
  }

  // --- EFECTO DE EDICIÓN (REESTRUCTURACIÓN DE VARIANTE PARA LA UI) ---
  useEffect(() => {
    if (editingProduct) {
      // Agrupamos las variantes planas de la DB en la estructura anidada del formulario
      const variantesAgrupadas = editingProduct.articulo_variante.reduce((acc: any[], curr: any) => {
        const found = acc.find(v => v.id_tipo === curr.id_tipo);
        const valorData = { id_temp: curr.id, valor: curr.valor, ajuste_tipo: curr.ajuste_tipo, ajuste_valor: curr.ajuste_valor };
        if (found) {
          found.valores.push(valorData);
        } else {
          acc.push({ id_tipo: curr.id_tipo, valores: [valorData] });
        }
        return acc;
      }, []);

      setFormData({
        ...editingProduct,
        id_marca: editingProduct.id_marca?.toString() || '',
        id_categoria: editingProduct.id_categoria?.toString() || '',
        presentaciones: editingProduct.articulo_presentacion.map((p: any) => ({
          ...p,
          id_temp: p.id,
          mayoreo: p.articulo_mayoreo || []
        })) || initialFormState.presentaciones,
        variantes: variantesAgrupadas
      })
      setPreviewUrl(editingProduct.imagen_url)
    } else {
      setFormData(initialFormState)
      setPreviewUrl(null)
    }
  }, [editingProduct, open])

  // --- MUTACIÓN TRANSACCIONAL ---
  const mutation = useMutation({
    mutationFn: async (dataToSave: any) => {
      setUploading(true)
      let finalImageUrl = dataToSave.imagen_url

      if (selectedFile) {
        const fileName = `${crypto.randomUUID()}.${selectedFile.name.split('.').pop()}`
        const { error: upErr } = await supabase.storage.from('productos').upload(fileName, selectedFile)
        if (upErr) throw upErr
        finalImageUrl = supabase.storage.from('productos').getPublicUrl(fileName).data.publicUrl
      }

      const payloadArticulo = {
        nombre: dataToSave.nombre.toUpperCase(),
        codigo_barras: dataToSave.codigo_barras?.toUpperCase() || null,
        precio_costo: parseFloat(dataToSave.precio_costo) || 0,
        iva_porcentaje: parseFloat(dataToSave.iva_porcentaje) || 0,
        unidad_medida: dataToSave.unidad_medida,
        unidad_base: dataToSave.unidad_base.toUpperCase(),
        id_categoria: dataToSave.id_categoria ? parseInt(dataToSave.id_categoria) : null,
        id_marca: dataToSave.id_marca ? parseInt(dataToSave.id_marca) : null,
        stock_minimo: parseInt(dataToSave.stock_minimo) || 0,
        imagen_url: finalImageUrl,
        updated_at: new Date().toISOString(),
        local_id: crypto.randomUUID(),
        is_dirty: false
      }

      let articuloId = editingProduct?.id
      if (articuloId) {
        const { error } = await (supabase.from('articulo') as any).update(payloadArticulo).eq('id', articuloId)
        if (error) throw error
      } else {
        const { data, error } = await (supabase.from('articulo') as any).insert([payloadArticulo]).select().single()
        if (error) throw error
        articuloId = data.id
      }

      // --- SYNC PRESENTACIONES Y MAYOREO ---
      const { data: oldPres } = await supabase.from('articulo_presentacion').select('id').eq('id_articulo', articuloId)
      if (oldPres && oldPres.length > 0) await supabase.from('articulo_mayoreo').delete().in('id_presentacion', oldPres.map(p => p.id))
      await supabase.from('articulo_presentacion').delete().eq('id_articulo', articuloId)

      for (const p of dataToSave.presentaciones) {
        const { data: newP, error: pErr } = await (supabase.from('articulo_presentacion') as any).insert({
          id_articulo: articuloId,
          nombre: p.nombre.toUpperCase(),
          factor: parseInt(p.factor) || 1,
          precio_venta: parseFloat(p.precio_venta) || 0,
          es_principal: p.es_principal,
          codigo_barras: p.codigo_barras?.toUpperCase() || null
        }).select().single()
        if (pErr) throw pErr
        if (p.mayoreo?.length > 0) {
          await (supabase.from('articulo_mayoreo') as any).insert(p.mayoreo.map((m: any) => ({
            id_presentacion: newP.id,
            min_cantidad: parseInt(m.min_cantidad),
            max_cantidad: m.max_cantidad ? parseInt(m.max_cantidad) : null,
            precio_unitario: parseFloat(m.precio_unitario)
          })))
        }
      }

      // --- SYNC VARIANTES (CONVERSION DE ANIDADO A PLANO) ---
      await supabase.from('articulo_variante').delete().eq('id_articulo', articuloId)
      const variantesFinal: any[] = []
      dataToSave.variantes.forEach((v: any) => {
        if (!v.id_tipo) return; // Saltamos si no hay tipo seleccionado
        v.valores.forEach((val: any) => {
          if (val.valor.trim() !== "") {
            variantesFinal.push({
              id_articulo: articuloId,
              id_tipo: v.id_tipo,
              valor: val.valor.toUpperCase(),
              ajuste_tipo: val.ajuste_tipo,
              ajuste_valor: parseFloat(val.ajuste_valor) || 0,
              activo: true
            })
          }
        })
      })
      if (variantesFinal.length > 0) {
        const { error: vErr } = await (supabase.from('articulo_variante') as any).insert(variantesFinal)
        if (vErr) throw vErr
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] })
      setOpen(false)
      toast.success("Catálogo sincronizado exitosamente")
    }
  })

  // ... (Resto de handlers auxiliares como handlePriceInput y handleFileChange)
  const handlePriceInput = (val: string, field: string) => {
    const regex = /^[0-9]*\.?[0-9]*$/;
    if (regex.test(val)) setFormData({ ...formData, [field]: val as any })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const productosFiltrados = productos?.filter((p: any) => {
    const matchSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || p.codigo_barras?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'todos' ? true : statusFilter === 'activos' ? p.activo === true : p.activo === false;
    return matchSearch && matchStatus;
  })

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-12 p-4">
      {/* HEADER */}
      <div className="flex justify-between items-end pt-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/20"><Boxes size={24} /></div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Catálogo Pro</h1>
          </div>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] pl-1">Inventario Multidimensional v4</p>
        </div>
        <Button onClick={() => { setEditingProduct(null); setOpen(true); }} className="bg-blue-600 hover:bg-slate-900 h-12 px-6 rounded-2xl font-black uppercase text-[10px] shadow-xl transition-all active:scale-95 border-none">
          <Plus size={18} className="mr-2" /> Nuevo Producto
        </Button>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-8 h-16 font-black text-slate-400 uppercase text-[10px] tracking-widest">Información</TableHead>
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Empaques</TableHead>
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Variantes</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queryLoading ? (
              <TableRow><TableCell colSpan={4} className="h-40 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" /></TableCell></TableRow>
            ) : productosFiltrados?.map((p: any) => (
              <TableRow key={p.id} className="hover:bg-blue-50/30 transition-all border-slate-50">
                <TableCell className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center shadow-sm">
                      {p.imagen_url ? <img src={p.imagen_url} className="object-cover h-full w-full" /> : <Package2 className="text-slate-300" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900 uppercase text-xs tracking-tight">{p.nombre}</span>
                      <span className="text-[10px] text-slate-400 font-mono italic">{p.codigo_barras || 'S/C'}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {p.articulo_presentacion?.map((pres: any) => (
                      <Badge key={pres.id} variant="outline" className={`text-[8px] font-black uppercase ${pres.es_principal ? 'border-blue-600 text-blue-600' : ''}`}>
                        {pres.nombre} (C$ {pres.precio_venta})
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                   <div className="flex gap-1 flex-wrap">
                    {p.articulo_variante?.map((v: any, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-[8px] font-bold uppercase">{v.variante_tipos?.nombre}: {v.valor}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="px-8">
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><MoreVertical size={18} /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl font-bold uppercase text-[10px] p-2">
                      <DropdownMenuItem onClick={() => {setEditingProduct(p); setOpen(true);}} className="rounded-lg"><Edit size={14} className="mr-2 text-blue-600" /> Editar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* FORMULARIO GIGANTE */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col bg-white border-none shadow-3xl">
          <SheetHeader className="p-8 bg-slate-900 text-white shadow-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20"><Settings2 size={24} /></div>
              <div>
                <SheetTitle className="text-2xl font-black uppercase italic text-white tracking-tighter leading-none">Editor Maestro</SheetTitle>
                <SheetDescription className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1">Sincronización Relacional v4.0</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <Tabs defaultValue="general" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-3 bg-slate-100 p-1 mx-8 mt-6 rounded-2xl h-12">
              <TabsTrigger value="general" className="text-[9px] font-black uppercase rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Datos Base</TabsTrigger>
              <TabsTrigger value="presentaciones" className="text-[9px] font-black uppercase rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Empaques</TabsTrigger>
              <TabsTrigger value="variantes" className="text-[9px] font-black uppercase rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Variantes</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
              {/* TAB GENERAL */}
              <TabsContent value="general" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre del Artículo</Label>
                    <Input className="h-14 rounded-2xl border-2 border-slate-100 font-bold uppercase focus:border-blue-600 focus:ring-0 transition-all" value={formData.nombre || ''} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Código de Barras Base</Label>
                    <Input className="h-14 rounded-2xl border-2 border-slate-100 font-mono text-sm uppercase" value={formData.codigo_barras || ''} onChange={e => setFormData({...formData, codigo_barras: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1"><Briefcase size={10} className="inline mr-1" /> Marca</Label>
                    <Select value={formData.id_marca || ''} onValueChange={v => setFormData({...formData, id_marca: v})}>
                      <SelectTrigger className="h-12 rounded-xl border-2 border-slate-100 font-bold uppercase"><SelectValue placeholder="..." /></SelectTrigger>
                      <SelectContent className="rounded-xl">{marcas?.map((m: any) => <SelectItem key={m.id} value={m.id.toString()} className="text-[10px] font-bold uppercase">{m.nombre}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1"><Layers size={10} className="inline mr-1" /> Categoría</Label>
                    <Select value={formData.id_categoria || ''} onValueChange={(v) => setFormData({...formData, id_categoria: v})}>
                      <SelectTrigger className="h-12 rounded-xl border-2 border-slate-100 font-bold uppercase"><SelectValue placeholder="..." /></SelectTrigger>
                      <SelectContent className="rounded-xl">{categorias?.map((c: any) => <SelectItem key={c.id} value={c.id.toString()} className="text-[10px] font-bold uppercase">{c.nombre}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Costo Base por Unidad</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300">C$</span>
                      <Input className="h-14 pl-12 rounded-2xl border-2 border-slate-100 font-black text-lg text-slate-700" value={formData.precio_costo ?? 0} onChange={e => handlePriceInput(e.target.value, 'precio_costo')} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">IVA %</Label>
                    <Input type="number" className="h-14 rounded-2xl border-2 border-slate-100 font-black text-center" value={formData.iva_porcentaje ?? 0} onChange={e => setFormData({...formData, iva_porcentaje: e.target.value as any})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Stock Min.</Label>
                    <Input type="number" className="h-14 rounded-2xl border-2 border-slate-100 font-black text-center" value={formData.stock_minimo ?? 0} onChange={e => setFormData({...formData, stock_minimo: e.target.value as any})} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Unidad de Medida Base</Label>
                  <Select value={formData.unidad_base || 'UNIDAD'} onValueChange={(v) => setFormData({...formData, unidad_base: v})}>
                    <SelectTrigger className="h-12 rounded-xl border-2 border-slate-100 font-bold uppercase"><SelectValue placeholder="..." /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {['UNIDAD', 'PAR', 'DOCENA', 'CAJA', 'LITRO', 'GRAMO'].map(u => <SelectItem key={u} value={u} className="text-[10px] font-bold uppercase">{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* TAB PRESENTACIONES Y MAYOREO */}
              <TabsContent value="presentaciones" className="space-y-6 mt-0 animate-in fade-in">
                <div className="flex items-center justify-between p-2">
                  <span className="text-[11px] font-black uppercase text-blue-600 italic tracking-tighter">Empaques y Códigos</span>
                  <Button onClick={addPresentacion} size="sm" className="bg-blue-600 hover:bg-slate-900 rounded-xl text-[9px] font-black h-9 px-4 uppercase shadow-lg border-none"><Plus size={14} className="mr-1" /> Nuevo</Button>
                </div>
                {formData.presentaciones.map((p, idx) => (
                  <div key={p.id_temp || idx} className="p-6 bg-slate-50 rounded-[35px] border border-slate-100 space-y-4 relative group shadow-sm">
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-3 space-y-1">
                        <Label className="text-[8px] font-black text-slate-400 uppercase ml-1">Nombre</Label>
                        <Input className="h-10 rounded-xl border-none shadow-sm font-bold uppercase text-xs" value={p.nombre || ''} onChange={e => updatePresentacion(idx, 'nombre', e.target.value)} />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-[8px] font-black text-slate-400 uppercase ml-1">Factor</Label>
                        <Input type="number" className="h-10 rounded-xl border-none shadow-sm text-center font-black text-xs" value={p.factor ?? 1} onChange={e => updatePresentacion(idx, 'factor', e.target.value)} />
                      </div>
                      <div className="col-span-3 space-y-1">
                        <Label className="text-[8px] font-black text-slate-400 uppercase ml-1">Precio Detalle</Label>
                        <Input type="number" className="h-10 rounded-xl border-none shadow-sm font-black text-blue-600 text-xs" value={p.precio_venta ?? 0} onChange={e => updatePresentacion(idx, 'precio_venta', e.target.value)} />
                      </div>
                      <div className="col-span-3 space-y-1">
                        <Label className="text-[8px] font-black text-slate-400 uppercase ml-1"><Barcode size={10} className="inline mr-1" /> Cód. Barras</Label>
                        <Input className="h-10 rounded-xl border-none shadow-sm font-mono text-[9px] uppercase" placeholder="Escanear..." value={p.codigo_barras || ''} onChange={e => updatePresentacion(idx, 'codigo_barras', e.target.value)} />
                      </div>
                      <div className="col-span-1 flex flex-col items-center gap-2">
                        <Label className="text-[8px] font-black text-slate-400 uppercase">Main</Label>
                        <div onClick={() => setFormData({...formData, presentaciones: formData.presentaciones.map((item, i) => ({ ...item, es_principal: i === idx }))})} className={`h-6 w-6 rounded-md border-2 cursor-pointer transition-all ${p.es_principal ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'} flex items-center justify-center`}>
                          {p.es_principal && <Check size={14} strokeWidth={4} />}
                        </div>
                      </div>
                    </div>
                    {/* MAYOREO */}
                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[8px] font-black uppercase text-emerald-600 italic">Precios por Volumen para {p.nombre}</span>
                        <Button onClick={() => addMayoreo(idx)} size="sm" variant="ghost" className="h-6 text-[8px] font-black text-emerald-600 hover:bg-emerald-50"><Plus size={10} className="mr-1" /> Añadir Rango</Button>
                      </div>
                      <div className="space-y-2">
                        {p.mayoreo?.map((m: any, mIdx: number) => (
                          <div key={m.id_temp || mIdx} className="flex gap-2 items-center bg-white p-2 rounded-xl border border-emerald-100 shadow-sm animate-in slide-in-from-right-2">
                            <span className="text-[8px] font-bold text-slate-400">DESDE</span>
                            <Input type="number" className="h-7 w-12 text-[10px] font-black" value={m.min_cantidad ?? 0} onChange={e => {
                              const next = [...formData.presentaciones]; next[idx].mayoreo[mIdx].min_cantidad = e.target.value; setFormData({...formData, presentaciones: next})
                            }} />
                            <span className="text-[8px] font-bold text-slate-400">HASTA</span>
                            <Input type="number" placeholder="∞" className="h-7 w-12 text-[10px] font-black" value={m.max_cantidad || ''} onChange={e => {
                              const next = [...formData.presentaciones]; next[idx].mayoreo[mIdx].max_cantidad = e.target.value; setFormData({...formData, presentaciones: next})
                            }} />
                            <span className="text-[8px] font-bold ml-auto text-emerald-500">PRECIO UNIT. C$</span>
                            <Input type="number" className="h-7 w-20 text-[10px] font-black text-emerald-600 bg-emerald-50/50" value={m.precio_unitario ?? 0} onChange={e => {
                              const next = [...formData.presentaciones]; next[idx].mayoreo[mIdx].precio_unitario = e.target.value; setFormData({...formData, presentaciones: next})
                            }} />
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-300 hover:text-red-500" onClick={() => {
                              const next = [...formData.presentaciones]; next[idx].mayoreo = next[idx].mayoreo.filter((_: any, i: number) => i !== mIdx); setFormData({...formData, presentaciones: next})
                            }}><X size={12} /></Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removePresentacion(idx)} className="absolute -top-2 -right-2 h-8 w-8 bg-white shadow-md rounded-full text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"><X size={14} /></Button>
                  </div>
                ))}
              </TabsContent>

              {/* TAB VARIANTES */}
              <TabsContent value="variantes" className="space-y-6 mt-0 animate-in fade-in">
                <div className="flex items-center justify-between p-2">
                  <span className="text-[11px] font-black uppercase text-purple-600 italic tracking-tighter">Atributos y Ajustes de Precio</span>
                  <Button onClick={addVarianteTipo} size="sm" className="bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-xl text-[9px] font-black h-9 px-4 uppercase shadow-sm border-none"><Plus size={14} className="mr-1" /> Nuevo Atributo</Button>
                </div>
                {formData.variantes.map((v, vIdx) => (
                  <div key={vIdx} className="p-6 bg-slate-900 rounded-[35px] space-y-4 shadow-xl relative animate-in zoom-in-95">
                    <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-[8px] font-black text-slate-400 uppercase ml-1">Tipo de Atributo</Label>
                        <Select value={v.id_tipo || ''} onValueChange={val => {
                          const next = [...formData.variantes]; next[vIdx].id_tipo = val; setFormData({...formData, variantes: next})
                        }}>
                          <SelectTrigger className="bg-white/10 border-none h-11 rounded-xl text-white font-black uppercase text-[10px]"><SelectValue placeholder="Seleccionar tipo..." /></SelectTrigger>
                          <SelectContent className="rounded-xl border-none font-bold uppercase text-[10px]">
                            {tiposVariante?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={() => addValorVariante(vIdx)} size="sm" className="bg-white/10 hover:bg-white/20 text-white rounded-lg text-[8px] font-black h-8 mt-6 border-none px-4">+ Valor</Button>
                    </div>

                    <div className="space-y-3">
                      {v.valores.map((val: any, valIdx: number) => (
                        <div key={val.id_temp} className="grid grid-cols-12 gap-2 items-center bg-white/5 p-3 rounded-2xl hover:bg-white/10 transition-all shadow-inner">
                          <div className="col-span-3">
                            <Input placeholder="Valor (35)" className="h-9 bg-white/10 border-none text-white font-bold uppercase text-xs" value={val.valor || ''} onChange={e => updateValorVariante(vIdx, valIdx, 'valor', e.target.value)} />
                          </div>
                          <div className="col-span-3">
                            <Select value={val.ajuste_tipo || 'fijo'} onValueChange={v => updateValorVariante(vIdx, valIdx, 'ajuste_tipo', v)}>
                              <SelectTrigger className="h-9 bg-white/5 border-none text-white font-black uppercase text-[8px] focus:ring-0"><SelectValue /></SelectTrigger>
                              <SelectContent className="border-none font-bold uppercase text-[9px]"><SelectItem value="fijo">C$ Fijo</SelectItem><SelectItem value="porcentaje">% Porcent.</SelectItem></SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-4 flex items-center gap-2">
                            <span className="text-[10px] font-black text-emerald-400">±</span>
                            <Input type="number" className="h-9 bg-white/10 border-none text-emerald-400 font-black text-xs" value={val.ajuste_valor ?? 0} onChange={e => updateValorVariante(vIdx, valIdx, 'ajuste_valor', e.target.value)} />
                          </div>
                          <div className="col-span-2 flex justify-end">
                            <Button variant="ghost" size="icon" onClick={() => {
                              const next = [...formData.variantes]; next[vIdx].valores = next[vIdx].valores.filter((_: any, i: number) => i !== valIdx); setFormData({...formData, variantes: next})
                            }} className="h-8 w-8 text-red-400 hover:bg-red-500/20 rounded-full"><X size={14} /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setFormData({...formData, variantes: formData.variantes.filter((_, i) => i !== vIdx)})} className="absolute -top-2 -right-2 h-8 w-8 bg-red-600 shadow-md rounded-full text-white hover:bg-red-700 transition-colors"><X size={14} /></Button>
                  </div>
                ))}
              </TabsContent>
            </div>
          </Tabs>

          <SheetFooter className="p-8 border-t bg-slate-50">
            <Button onClick={() => mutation.mutate(formData)} disabled={mutation.isPending || uploading} className="w-full h-16 rounded-[30px] bg-blue-600 hover:bg-slate-900 font-black uppercase tracking-[0.2em] text-xs shadow-2xl transition-all active:scale-95 border-none text-white">
              {mutation.isPending ? <Loader2 className="animate-spin mr-3" /> : <Save size={20} className="mr-3" />}
              Finalizar Registro Pro
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ALERT DIALOG ELIMINACIÓN */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-[50px] p-10 border-none shadow-3xl bg-white">
          <AlertDialogHeader className="flex flex-col items-center">
            <div className="h-20 w-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4"><AlertTriangle size={40} /></div>
            <AlertDialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 italic text-center italic">¿Desactivar?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest border-slate-100 flex-1 hover:bg-slate-50 transition-all">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              supabase.from('articulo').update({ activo: false }).eq('id', deleteId).then(() => {
                queryClient.invalidateQueries({ queryKey: ['productos'] });
                setDeleteId(null);
                toast.info("Producto desactivado");
              })
            }} className="h-14 rounded-2xl bg-red-600 hover:bg-red-700 font-black uppercase text-[10px] tracking-widest flex-1 text-white shadow-xl transition-all active:scale-95 border-none">Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}