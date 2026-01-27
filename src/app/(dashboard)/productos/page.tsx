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
  Loader2, Plus, Search, MoreVertical, Edit, Trash2, Save, RefreshCw, AlertTriangle,
  Package2, Tag, Barcode, Layers, Briefcase, TrendingUp, Wallet, Image as ImageIcon, AlertCircle, Upload, X, Check, ArrowUpCircle
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
import { toast } from "sonner"

export default function ProductosPage() {
  const { user, loading: authLoading } = useAuth()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [statusFilter, setStatusFilter] = useState<'todos' | 'activos' | 'pausados'>('todos')
  const [categoryFilter, setCategoryFilter] = useState<string>('todas')
  const [brandFilter, setBrandFilter] = useState<string>('todas')

  const [quickEditId, setQuickEditId] = useState<string | null>(null)
  const [quickPrice, setQuickPrice] = useState<string>('')

  const [isDuplicate, setIsDuplicate] = useState(false)
  const [duplicateProduct, setDuplicateProduct] = useState<any | null>(null) // Para la resurrección
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [formData, setFormData] = useState({
    nombre: '',
    codigo_barras: '',
    precio_costo: 0,
    precio_venta_unidad: 0,
    precio_venta_mayorista: 0, // AGREGADO
    iva_porcentaje: 15, // AGREGADO
    unidad_medida: 'Unidad', // AGREGADO
    contenido_mayorista: 1, // AGREGADO (Lógica de empaque)
    id_marca: '',
    id_categoria: '',
    stock_minimo: 5,
    imagen_url: '',
    activo: true
  })

  const deleteImageFromStorage = async (url: string) => {
    if (!url) return
    try {
      const fileName = url.split('/').pop()
      if (fileName) {
        await supabase.storage.from('productos').remove([fileName])
      }
    } catch (error) {
      console.error("Error limpiando storage:", error)
    }
  }

  // QUERIES
  const { data: categorias } = useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data } = await supabase.from('categoria').select('id, nombre').eq('activo', true).order('nombre')
      return data || []
    }
  })

  const { data: marcas } = useQuery({
    queryKey: ['marcas'],
    queryFn: async () => {
      const { data } = await supabase.from('marca').select('id, nombre').eq('activo', true).order('nombre')
      return data || []
    }
  })

  const { data: productos, isLoading: queryLoading } = useQuery({
    queryKey: ['productos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articulo')
        .select(`*, categoria:id_categoria(nombre), marca:id_marca(nombre)`)
        .order('nombre')
      if (error) throw error
      return data
    },
    enabled: !authLoading && !!user,
    refetchOnMount: 'always' // <--- AGREGA ESTA LÍNEA
  })

  // Validación de duplicados mejorada (Resurrección)
  useEffect(() => {
    const checkDuplicate = async () => {
      if (formData.codigo_barras.length > 2 && !editingProduct) {
        const code = formData.codigo_barras.trim().toUpperCase()
        const { data } = await supabase.from('articulo').select('*').eq('codigo_barras', code).maybeSingle()
        if (data) {
          setIsDuplicate(true)
          setDuplicateProduct(data)
        } else {
          setIsDuplicate(false)
          setDuplicateProduct(null)
        }
      } else {
        setIsDuplicate(false)
        setDuplicateProduct(null)
      }
    }
    const timer = setTimeout(checkDuplicate, 500)
    return () => clearTimeout(timer)
  }, [formData.codigo_barras, editingProduct])

  useEffect(() => {
    if (editingProduct) {
      setFormData({
        nombre: editingProduct.nombre,
        codigo_barras: editingProduct.codigo_barras || '',
        precio_costo: editingProduct.precio_costo || 0,
        precio_venta_unidad: editingProduct.precio_venta_unidad || 0,
        precio_venta_mayorista: editingProduct.precio_venta_mayorista || 0, // CARGAR
        iva_porcentaje: editingProduct.iva_porcentaje ?? 15, // CARGAR
        unidad_medida: editingProduct.unidad_medida || 'Unidad', // CARGAR
        contenido_mayorista: editingProduct.contenido_mayorista || 1, // CARGAR
        id_marca: editingProduct.id_marca?.toString() || '',
        id_categoria: editingProduct.id_categoria?.toString() || '',
        stock_minimo: editingProduct.stock_minimo || 5,
        imagen_url: editingProduct.imagen_url || '',
        activo: editingProduct.activo ?? true
      })
      setPreviewUrl(editingProduct.imagen_url || null)
    } else {
      setFormData({
        nombre: '', codigo_barras: '', precio_costo: 0, precio_venta_unidad: 0,
        precio_venta_mayorista: 0, iva_porcentaje: 15, unidad_medida: 'Unidad', contenido_mayorista: 1, // RESETEAR
        id_marca: '', id_categoria: '', stock_minimo: 5, imagen_url: '', activo: true
      })
      setPreviewUrl(null)
      setSelectedFile(null)
    }
  }, [editingProduct])

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('productos').upload(fileName, file)
    if (uploadError) throw uploadError
    const { data: { publicUrl } } = supabase.storage.from('productos').getPublicUrl(fileName)
    return publicUrl
  }

  const mutation = useMutation({
    mutationFn: async (dataToSave: any) => {
      if (isDuplicate && duplicateProduct?.activo && !editingProduct) {
        throw new Error("Este código de barras ya pertenece a un producto activo")
      }

      setUploading(true)

      const targetProduct = editingProduct || (isDuplicate && !duplicateProduct?.activo ? duplicateProduct : null)

      let finalImageUrl = targetProduct?.imagen_url || ''

      if (!previewUrl && targetProduct?.imagen_url) {
        await deleteImageFromStorage(targetProduct.imagen_url)
        finalImageUrl = ''
      }

      if (selectedFile) {
        if (targetProduct?.imagen_url) await deleteImageFromStorage(targetProduct.imagen_url)
        finalImageUrl = await uploadImage(selectedFile)
      }

      const payload = {
        nombre: dataToSave.nombre.trim().toUpperCase(),
        codigo_barras: dataToSave.codigo_barras.trim().toUpperCase(),
        precio_costo: dataToSave.precio_costo,
        precio_venta_unidad: dataToSave.precio_venta_unidad,
        precio_venta_mayorista: dataToSave.precio_venta_mayorista,
        iva_porcentaje: dataToSave.iva_porcentaje,
        unidad_medida: dataToSave.unidad_medida.toUpperCase(),
        contenido_mayorista: dataToSave.contenido_mayorista,
        id_categoria: dataToSave.id_categoria ? parseInt(dataToSave.id_categoria) : null,
        id_marca: dataToSave.id_marca ? parseInt(dataToSave.id_marca) : null,
        stock_minimo: dataToSave.stock_minimo,
        imagen_url: finalImageUrl,
        activo: true
      }

      const targetId = targetProduct?.id

      if (targetId) {
        const { error } = await (supabase.from('articulo') as any).update(payload).eq('id', targetId)
        if (error) throw error
      } else {
        const { error } = await (supabase.from('articulo') as any).insert([payload])
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] })
      setOpen(false)
      setEditingProduct(null)
      setSelectedFile(null)
      toast.success("Catálogo actualizado")
    },
    onError: (err: any) => toast.error(err.message),
    onSettled: () => setUploading(false)
  })

  const quickUpdateMutation = useMutation({
    mutationFn: async ({ id, precio }: { id: string, precio: number }) => {
      const { error } = await (supabase.from('articulo') as any).update({ precio_venta_unidad: precio }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] })
      setQuickEditId(null)
      toast.success("Precio actualizado")
    }
  })

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: boolean }) => {
      const { error } = await (supabase.from('articulo') as any).update({ activo: status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['productos'] })
      setDeleteId(null)
      toast.info(variables.status ? "Producto reactivado" : "Producto desactivado")
    }
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handlePriceInput = (val: string, field: string) => {
    // Permitir solo números y un punto
    const regex = /^[0-9]*\.?[0-9]*$/;
    if (regex.test(val)) {
      setFormData({ ...formData, [field]: val as any })
    }
  }

  const productosFiltrados = productos?.filter((p: any) => {
    const matchSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || p.codigo_barras?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'todos' ? true : statusFilter === 'activos' ? p.activo === true : p.activo === false;
    const matchCategory = categoryFilter === 'todas' ? true : p.id_categoria?.toString() === categoryFilter;
    const matchBrand = brandFilter === 'todas' ? true : p.id_marca?.toString() === brandFilter;
    return matchSearch && matchStatus && matchCategory && matchBrand;
  })

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-12 animate-in fade-in duration-700 pl-4 pr-4">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200"><Layers size={24} /></div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Catálogo</h1>
          </div>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] pl-1">Variedades Pro / Inventario Global</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mr-2">
            <button onClick={() => setStatusFilter('todos')} className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === 'todos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Todos</button>
            <button onClick={() => setStatusFilter('activos')} className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === 'activos' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-emerald-500'}`}>Activos</button>
            <button onClick={() => setStatusFilter('pausados')} className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === 'pausados' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-red-500'}`}>Pausados</button>
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
            <Input placeholder="BUSCAR..." className="w-[180px] md:w-[220px] h-12 pl-12 rounded-2xl border-slate-200 bg-white shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all uppercase text-[10px] font-black tracking-widest" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Button onClick={() => { setEditingProduct(null); setOpen(true); }} className="bg-blue-600 hover:bg-slate-900 text-white rounded-2xl h-12 px-6 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-blue-100 transition-all active:scale-95 border-none">
            <Plus size={18} className="mr-2 stroke-[3px]" /> Nuevo
          </Button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center gap-4 bg-white p-3 rounded-[25px] border border-slate-100 shadow-sm">
          <div className="p-2 bg-slate-50 rounded-xl text-blue-600"><Layers size={18} /></div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="border-none shadow-none font-bold uppercase text-[10px] tracking-widest focus:ring-0">
              <SelectValue placeholder="Filtrar por Categoría" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-slate-100 font-bold uppercase text-[10px]">
              <SelectItem value="todas">Todas las Categorías</SelectItem>
              {categorias?.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-[25px] border border-slate-100 shadow-sm">
          <div className="p-2 bg-slate-50 rounded-xl text-emerald-600"><Briefcase size={18} /></div>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="border-none shadow-none font-bold uppercase text-[10px] tracking-widest focus:ring-0">
              <SelectValue placeholder="Filtrar por Marca" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-slate-100 font-bold uppercase text-[10px]">
              <SelectItem value="todas">Todas las Marcas</SelectItem>
              {marcas?.map((m: any) => <SelectItem key={m.id} value={m.id.toString()}>{m.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50 border-b border-slate-100">
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-8 h-16 font-black text-slate-400 uppercase text-[10px] tracking-widest">Información</TableHead>
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Clasificación</TableHead>
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest text-right">Precio Detalle</TableHead>
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest text-right">Precio Mayorista</TableHead>
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest text-center">Estado</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queryLoading ? (
              <TableRow><TableCell colSpan={6} className="h-80 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={40} /></TableCell></TableRow>
            ) : productosFiltrados?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-80 text-center text-slate-400 font-bold uppercase text-xs tracking-widest italic">No se encontraron artículos</TableCell></TableRow>
            ) : productosFiltrados?.map((p: any) => (
              <TableRow key={p.id} className="group border-slate-50 hover:bg-blue-50/30 transition-all duration-200">
                <TableCell className="px-8 py-6">
                  <div className="flex items-center gap-6">
                    <div className="h-14 w-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:border-blue-200 group-hover:shadow-md transition-all overflow-hidden">
                      {p.imagen_url ? <img src={p.imagen_url} alt={p.nombre} className="h-full w-full object-cover" /> : <Package2 size={24} />}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-black text-slate-900 uppercase text-sm tracking-tight">{p.nombre}</span>
                      <span className="font-mono text-[10px] text-slate-400 font-bold bg-slate-50 px-2 rounded-md border border-slate-100 w-fit">{p.codigo_barras || 'S/C'} ({p.unidad_medida})</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1.5">
                    <Badge variant="outline" className="w-fit border-blue-100 text-blue-600 font-black text-[9px] uppercase tracking-tighter bg-blue-50/50">{p.categoria?.nombre || 'General'}</Badge>
                    <span className="text-[9px] font-bold text-slate-300 uppercase italic ml-1">{p.marca?.nombre || 'Genérica'}</span>
                  </div>
                </TableCell>

                <TableCell className="text-right">
                  {quickEditId === p.id ? (
                    <div className="flex items-center justify-end gap-2 animate-in slide-in-from-right-2">
                      <Input
                        autoFocus
                        className="w-24 h-10 text-right font-black text-blue-600 rounded-lg border-blue-200"
                        value={quickPrice}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, '');
                          setQuickPrice(val);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') quickUpdateMutation.mutate({ id: p.id, precio: parseFloat(quickPrice) })
                          if (e.key === 'Escape') setQuickEditId(null)
                        }}
                      />
                      <Button size="icon" className="h-10 w-10 rounded-lg bg-emerald-500 hover:bg-emerald-600" onClick={() => quickUpdateMutation.mutate({ id: p.id, precio: parseFloat(quickPrice) })}>
                        <Check size={16} />
                      </Button>
                    </div>
                  ) : (
                    <span
                      className="font-black text-xl text-slate-900 tracking-tighter tabular-nums cursor-pointer hover:text-blue-600 hover:scale-105 transition-all"
                      onClick={() => {
                        setQuickEditId(p.id)
                        setQuickPrice(p.precio_venta_unidad.toString())
                      }}
                    >
                      C$ {p.precio_venta_unidad?.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </TableCell>

                <TableCell className="text-right font-bold text-slate-500 tabular-nums uppercase text-[11px]">
                  C$ {p.precio_venta_mayorista?.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                </TableCell>

                <TableCell className="text-center">
                  <Badge className={p.activo ? 'bg-emerald-500 text-white border-none font-black text-[9px]' : 'bg-slate-300 text-white border-none font-black text-[9px]'}>{p.activo ? 'ACTIVO' : 'PAUSADO'}</Badge>
                </TableCell>
                <TableCell className="px-8 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" className="h-12 w-12 rounded-2xl hover:bg-white hover:shadow-md transition-all"><MoreVertical size={20} className="text-slate-400" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-2xl p-2 min-w-[180px] border-slate-100 shadow-2xl">
                      <DropdownMenuItem onClick={() => { setEditingProduct(p); setOpen(true); }} className="gap-3 p-3 cursor-pointer text-blue-600 focus:bg-blue-50 focus:text-blue-700 rounded-xl font-black text-[10px] tracking-widest uppercase"><Edit size={16} /> Editar</DropdownMenuItem>
                      {p.activo ? (
                        <DropdownMenuItem onClick={() => setDeleteId(p.id)} className="gap-3 p-3 cursor-pointer text-red-500 focus:bg-red-50 focus:text-red-600 rounded-xl font-black text-[10px] tracking-widest uppercase mt-1"><Trash2 size={16} /> Desactivar</DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => toggleStatusMutation.mutate({ id: p.id, status: true })} className="gap-3 p-3 cursor-pointer text-emerald-600 focus:bg-emerald-50 focus:text-emerald-700 rounded-xl font-black text-[10px] tracking-widest uppercase mt-1"><ArrowUpCircle size={16} /> Reactivar</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* FORMULARIO */}
      {/* CAMBIO: Al cerrar el Sheet (v=false), reseteamos el estado de edición para limpiar los inputs */}
      <Sheet open={open} onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setEditingProduct(null);
          setFormData({
            nombre: '', codigo_barras: '', precio_costo: 0, precio_venta_unidad: 0,
            precio_venta_mayorista: 0, iva_porcentaje: 15, unidad_medida: 'Unidad', contenido_mayorista: 1,
            id_marca: '', id_categoria: '', stock_minimo: 5, imagen_url: '', activo: true
          });
          setPreviewUrl(null);
          setSelectedFile(null);
        }
      }}>
        <SheetContent className="w-full sm:max-w-lg border-none p-0 flex flex-col bg-white shadow-2xl">
          <SheetHeader className="p-10 pb-8 bg-white border-b-4 border-blue-600">
            <div className="flex items-center gap-4 mb-2">
              <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                {editingProduct ? <RefreshCw size={24} /> : isDuplicate && !duplicateProduct?.activo ? <ArrowUpCircle size={24} className="text-emerald-600" /> : <Package2 size={24} />}
              </div>
              <div>
                <SheetTitle className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
                  {editingProduct ? 'Editar Producto' : isDuplicate && !duplicateProduct?.activo ? 'Reactivar Producto' : 'Nuevo Ingreso'}
                </SheetTitle>
                <SheetDescription className="text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mt-1">Módulo de Gestión / Variedades Pro</SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
            <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(formData); }} id="producto-form" className="space-y-10">
              {isDuplicate && !duplicateProduct?.activo && (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl flex gap-4 items-center animate-bounce">
                  <AlertCircle className="text-emerald-600" />
                  <p className="text-[10px] font-black text-emerald-800 uppercase leading-tight">
                    ¡Código detectado en archivo! Al guardar, reactivaremos "{duplicateProduct.nombre}" con estos nuevos datos.
                  </p>
                </div>
              )}

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label className="text-[11px] uppercase font-black text-slate-900 tracking-[0.1em] flex items-center gap-2 ml-1"><Tag size={14} className="text-blue-600" /> Nombre del Artículo</Label>
                    <Input required className="h-14 rounded-2xl border-2 border-slate-100 focus:border-blue-600 focus:ring-0 bg-white px-6 text-base font-bold uppercase transition-all" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[11px] uppercase font-black text-slate-900 tracking-[0.1em] flex items-center gap-2 ml-1"><Package2 size={14} className="text-blue-600" /> Unidad Medida</Label>
                    <Select value={formData.unidad_medida} onValueChange={(val) => setFormData({ ...formData, unidad_medida: val })}>
                      <SelectTrigger className="h-14 rounded-2xl border-2 border-slate-100 bg-white font-bold uppercase text-[11px] px-6"><SelectValue placeholder="..." /></SelectTrigger>
                      <SelectContent className="rounded-2xl font-bold uppercase text-xs border-2 border-slate-100">
                        {['Unidad', 'Par', 'Docena', 'Caja', 'Kit', 'Litro', 'Gramo'].map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-[11px] uppercase font-black text-slate-900 tracking-[0.1em] flex items-center gap-2 ml-1"><Layers size={14} className="text-blue-600" /> Categoría</Label>
                    <Select value={formData.id_categoria} onValueChange={(val) => setFormData({ ...formData, id_categoria: val })}>
                      <SelectTrigger className="h-14 rounded-2xl border-2 border-slate-100 bg-white font-bold uppercase text-[11px] px-6"><SelectValue placeholder="..." /></SelectTrigger>
                      <SelectContent className="rounded-2xl font-bold uppercase text-xs border-2 border-slate-100">
                        {categorias?.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[11px] uppercase font-black text-slate-900 tracking-[0.1em] flex items-center gap-2 ml-1"><Briefcase size={14} className="text-blue-600" /> Marca</Label>
                    <Select value={formData.id_marca} onValueChange={(val) => setFormData({ ...formData, id_marca: val })}>
                      <SelectTrigger className="h-14 rounded-2xl border-2 border-slate-100 bg-white font-bold uppercase text-[11px] px-6"><SelectValue placeholder="..." /></SelectTrigger>
                      <SelectContent className="rounded-2xl font-bold uppercase text-xs border-2 border-slate-100">
                        {marcas?.map((m: any) => <SelectItem key={m.id} value={m.id.toString()}>{m.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-[11px] uppercase font-black text-slate-900 tracking-[0.1em] flex items-center gap-2 ml-1"><AlertCircle size={14} className="text-orange-500" /> Stock Mín.</Label>
                    <Input type="number" className="h-14 rounded-2xl border-2 border-slate-100 bg-white text-center font-bold" value={formData.stock_minimo} onChange={(e) => setFormData({ ...formData, stock_minimo: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-3">
                    <Label className={`text-[11px] uppercase font-black tracking-[0.1em] flex items-center gap-2 ml-1 ${isDuplicate ? (duplicateProduct?.activo ? 'text-red-500' : 'text-emerald-600') : 'text-slate-900'}`}>
                      <Barcode size={14} className={isDuplicate ? (duplicateProduct?.activo ? 'text-red-500' : 'text-emerald-600') : 'text-blue-600'} /> Código
                    </Label>
                    <Input placeholder="Código..." className={`h-14 rounded-2xl border-2 transition-all font-mono text-sm px-6 ${isDuplicate ? (duplicateProduct?.activo ? 'border-red-500 bg-red-50' : 'border-emerald-500 bg-emerald-50') : 'border-slate-100'}`} value={formData.codigo_barras} onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="space-y-6 border-t border-slate-100 pt-8">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><Wallet size={16} className="text-blue-600" /><span className="text-[11px] font-black uppercase tracking-widest text-slate-900">Estructura de Costos</span></div>
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] uppercase font-black text-slate-400">IVA (%)</Label>
                    <Input type="number" className="w-16 h-8 rounded-lg border-2 border-slate-100 text-center font-bold text-xs" value={formData.iva_porcentaje} onChange={(e) => setFormData({ ...formData, iva_porcentaje: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="group space-y-2">
                    <div className="flex justify-between items-center px-2"><Label className="text-[10px] uppercase font-black text-slate-400">Costo</Label></div>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">C$</div>
                      <Input type="text" inputMode="decimal" className="h-16 pl-8 rounded-2xl border-2 border-slate-100 bg-slate-50/30 focus:bg-white focus:border-slate-300 transition-all font-black text-lg text-slate-600" value={formData.precio_costo} onChange={(e) => handlePriceInput(e.target.value, 'precio_costo')} />
                    </div>
                  </div>
                  <div className="group space-y-2">
                    <div className="flex justify-between items-center px-2"><Label className="text-[10px] uppercase font-black text-blue-600">Venta Unidad</Label></div>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 font-black text-xs">C$</div>
                      <Input type="text" inputMode="decimal" className="h-16 pl-8 rounded-2xl border-2 border-blue-100 bg-blue-50/20 focus:bg-white focus:border-blue-600 transition-all font-black text-lg text-blue-700" value={formData.precio_venta_unidad} onChange={(e) => handlePriceInput(e.target.value, 'precio_venta_unidad')} />
                    </div>
                  </div>
                  <div className="group space-y-2">
                    <div className="flex justify-between items-center px-2"><Label className="text-[10px] uppercase font-black text-emerald-600">Mayorista</Label></div>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-black text-xs">C$</div>
                      <Input type="text" inputMode="decimal" className="h-16 pl-8 rounded-2xl border-2 border-emerald-100 bg-emerald-50/20 focus:bg-white focus:border-emerald-600 transition-all font-black text-lg text-emerald-700" value={formData.precio_venta_mayorista} onChange={(e) => handlePriceInput(e.target.value, 'precio_venta_mayorista')} />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-orange-50/50 rounded-[28px] border-2 border-orange-100/50 space-y-4">
                  <div className="flex items-center gap-2 text-orange-600">
                    <TrendingUp size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Configuración de Empaque</span>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-orange-800 ml-1">Unidades por Paquete/Caja (Contenido)</Label>
                    <Input
                      type="number"
                      className="h-14 rounded-2xl border-2 border-orange-200 bg-white text-center font-black text-xl text-orange-600 shadow-inner"
                      value={formData.contenido_mayorista}
                      onChange={(e) => setFormData({ ...formData, contenido_mayorista: parseInt(e.target.value) || 1 })}
                    />
                    <p className="text-[9px] text-orange-400 font-bold uppercase text-center tracking-tighter italic">Esto define cuántas unidades se descuentan al vender "una caja"</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t border-slate-100 pt-8">
                <Label className="text-[11px] uppercase font-black text-slate-900 tracking-[0.1em] flex items-center gap-2 ml-1"><ImageIcon size={14} className="text-blue-600" /> Imagen del Producto</Label>
                <div onClick={() => fileInputRef.current?.click()} className="group relative h-40 w-full rounded-[30px] border-4 border-dashed border-slate-100 bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:border-blue-200 hover:bg-blue-50/30 transition-all overflow-hidden">
                  {previewUrl ? (
                    <>
                      <img src={previewUrl} className="h-full w-full object-cover" alt="Preview" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"><RefreshCw className="text-white" size={32} /></div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-blue-500"><Upload size={32} /><span className="text-[10px] font-black uppercase tracking-widest">Seleccionar Archivo</span></div>
                  )}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                {previewUrl && <button type="button" onClick={() => { setPreviewUrl(null); setSelectedFile(null); }} className="w-full text-red-500 font-bold uppercase text-[9px] tracking-widest hover:underline pt-2"><X size={14} className="inline mr-1" /> Eliminar Imagen seleccionada</button>}
              </div>
            </form>
          </div>
          <SheetFooter className="p-10 bg-white border-t border-slate-100">
            <Button type="submit" form="producto-form" disabled={mutation.isPending || (isDuplicate && duplicateProduct?.activo) || uploading} className={`w-full h-20 rounded-[30px] font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl transition-all active:scale-95 border-none text-white ${isDuplicate && !duplicateProduct?.activo ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-blue-600'}`}>
              {mutation.isPending || uploading ? <Loader2 className="animate-spin" /> : (
                <div className="flex items-center gap-4">
                  {editingProduct ? <Save size={24} /> : isDuplicate && !duplicateProduct?.activo ? <ArrowUpCircle size={24} /> : <Save size={24} />}
                  <span>{editingProduct ? 'Guardar Cambios' : isDuplicate && !duplicateProduct?.activo ? 'Reactivar Producto' : 'Confirmar Registro'}</span>
                </div>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-[50px] border-none p-12 shadow-3xl bg-white">
          <AlertDialogHeader className="flex flex-col items-center gap-8">
            <div className="h-24 w-24 bg-red-50 rounded-full flex items-center justify-center text-red-500 shadow-inner rotate-3"><AlertTriangle size={48} /></div>
            <div className="space-y-2 text-center">
              <AlertDialogTitle className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">¿Desactivar?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed text-center">El producto quedará oculto del punto de venta.</AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-12 gap-4">
            <AlertDialogCancel className="rounded-3xl h-14 flex-1 font-black uppercase text-[10px] tracking-widest border-slate-100">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && toggleStatusMutation.mutate({ id: deleteId, status: false })} className="rounded-3xl h-14 flex-1 bg-red-600 hover:bg-red-700 font-black uppercase text-[10px] tracking-widest border-none text-white shadow-xl shadow-red-100">Desactivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}