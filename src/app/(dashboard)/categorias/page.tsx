'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Tag, Briefcase, Trash2, Edit2, Bookmark, CheckCircle2, Save, X, AlertCircle, Search } from 'lucide-react'
import { toast } from "sonner"

export default function CategoriasMarcasPage() {
  const queryClient = useQueryClient()
  const [catName, setCatName] = useState('')
  const [marcaName, setMarcaName] = useState('')
  const [editingCat, setEditingCat] = useState<any | null>(null)
  const [editingMarca, setEditingMarca] = useState<any | null>(null)

  // ESTADOS PARA BÚSQUEDA INTERNA
  const [searchCat, setSearchCat] = useState('')
  const [searchMarca, setSearchMarca] = useState('')

  // 1. QUERIES - AGREGADO refetchOnMount para actualizar contadores al entrar
  const { data: categorias, isLoading: loadingCats } = useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data } = await supabase.from('categoria').select('*, articulo(count)').eq('activo', true).order('nombre')
      return data || []
    },
    refetchOnMount: 'always' // Esto asegura que al cambiar de pestaña el contador sea real
  })

  const { data: marcas, isLoading: loadingMarcas } = useQuery({
    queryKey: ['marcas'],
    queryFn: async () => {
      const { data } = await supabase.from('marca').select('*, articulo(count)').eq('activo', true).order('nombre')
      return data || []
    },
    refetchOnMount: 'always' // Esto asegura que al cambiar de pestaña el contador sea real
  })

  // 2. MUTACIÓN CATEGORÍA
  const catMutation = useMutation({
    mutationFn: async ({ id, nombre }: { id?: number, nombre: string }) => {
      const normalizedName = nombre.trim()
      
      if (id) {
        const { error } = await (supabase.from('categoria') as any).update({ nombre: normalizedName }).eq('id', id)
        if (error) throw error
      } else {
        const { data } = await supabase.from('categoria').select('id, activo').ilike('nombre', normalizedName).maybeSingle()
        const existing = data as any

        if (existing) {
          if (existing.activo) throw new Error("Esta categoría ya está activa")
          const { error } = await (supabase.from('categoria') as any).update({ activo: true }).eq('id', existing.id)
          if (error) throw error
        } else {
          const { error } = await (supabase.from('categoria') as any).insert([{ nombre: normalizedName, activo: true }])
          if (error) throw error
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] })
      cancelEditCat()
      toast.success("Categoría actualizada")
    },
    onError: (err: any) => toast.error(err.message)
  })

  // 3. MUTACIÓN MARCA
  const marcaMutation = useMutation({
    mutationFn: async ({ id, nombre }: { id?: number, nombre: string }) => {
      const normalizedName = nombre.trim()

      if (id) {
        const { error } = await (supabase.from('marca') as any).update({ nombre: normalizedName }).eq('id', id)
        if (error) throw error
      } else {
        const { data } = await supabase.from('marca').select('id, activo').ilike('nombre', normalizedName).maybeSingle()
        const existing = data as any

        if (existing) {
          if (existing.activo) throw new Error("Esta marca ya está activa")
          const { error } = await (supabase.from('marca') as any).update({ activo: true }).eq('id', existing.id)
          if (error) throw error
        } else {
          const { error } = await (supabase.from('marca') as any).insert([{ nombre: normalizedName, activo: true }])
          if (error) throw error
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marcas'] })
      cancelEditMarca()
      toast.success("Marca actualizada")
    },
    onError: (err: any) => toast.error(err.message)
  })

  const deleteCatMutation = useMutation({
    mutationFn: async (cat: any) => {
      const count = cat.articulo?.[0]?.count || 0
      if (count > 0) throw new Error(`No puedes eliminar: hay ${count} productos en esta categoría`)
      const { error } = await (supabase.from('categoria') as any).update({ activo: false }).eq('id', cat.id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categorias'] }); toast.info("Registro ocultado"); },
    onError: (err: any) => toast.error(err.message)
  })

  const deleteMarcaMutation = useMutation({
    mutationFn: async (marca: any) => {
      const count = marca.articulo?.[0]?.count || 0
      if (count > 0) throw new Error(`No puedes eliminar: hay ${count} productos de esta marca`)
      const { error } = await (supabase.from('marca') as any).update({ activo: false }).eq('id', marca.id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['marcas'] }); toast.info("Registro ocultado"); },
    onError: (err: any) => toast.error(err.message)
  })

  const startEditCat = (cat: any) => { setEditingCat(cat); setCatName(cat.nombre); }
  const cancelEditCat = () => { setEditingCat(null); setCatName(''); }
  const startEditMarca = (m: any) => { setEditingMarca(m); setMarcaName(m.nombre); }
  const cancelEditMarca = () => { setEditingMarca(null); setMarcaName(''); }

  // LÓGICA DE FILTRADO PARA TABLAS
  const categoriasFiltradas = categorias?.filter((c: any) => 
    c.nombre.toLowerCase().includes(searchCat.toLowerCase())
  )
  const marcasFiltradas = marcas?.filter((m: any) => 
    m.nombre.toLowerCase().includes(searchMarca.toLowerCase())
  )

  return (
    <div className="max-w-[1400px] mx-auto space-y-10 pb-12 animate-in fade-in duration-700 pl-4 pr-4">
      <div className="px-2 pt-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 rounded-xl text-white shadow-lg"><Bookmark size={24} /></div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Clasificación</h1>
        </div>
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] pl-1 mt-1">Variedades Pro / Catálogo</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* PANEL CATEGORÍAS */}
        <div className="space-y-6">
          <Card className="border-none shadow-2xl rounded-[35px] overflow-hidden bg-white ring-1 ring-slate-100">
            <CardHeader className={`border-b pb-8 transition-colors ${editingCat ? 'bg-blue-50/50' : 'bg-slate-50/50'}`}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-black italic uppercase text-slate-800 flex items-center gap-2"><Tag size={20} className="text-blue-600" /> {editingCat ? 'Editando' : 'Categorías'}</CardTitle>
                <Badge variant="outline" className="font-black text-[9px]">{categorias?.length || 0} Activas</Badge>
              </div>
              <div className="flex gap-2 mt-4">
                <Input placeholder="Nombre..." className="rounded-xl border-slate-200 uppercase font-bold text-xs tracking-widest h-12" value={catName} onChange={(e) => setCatName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && catName && catMutation.mutate({ id: editingCat?.id, nombre: catName })} />
                {editingCat && <Button variant="outline" onClick={cancelEditCat} className="rounded-xl h-12 border-slate-200"><X size={20} /></Button>}
                <Button onClick={() => catName && catMutation.mutate({ id: editingCat?.id, nombre: catName })} disabled={catMutation.isPending} className={`${editingCat ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600'} rounded-xl h-12 px-6 shadow-lg transition-all`}>
                  {catMutation.isPending ? <Loader2 className="animate-spin" /> : editingCat ? <Save size={20} /> : <Plus size={20} />}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[500px] overflow-y-auto custom-scrollbar">
              <div className="p-4 bg-slate-50/50 border-b flex items-center gap-2">
                <Search size={14} className="text-slate-400" />
                <input 
                  placeholder="Buscar en categorías..." 
                  className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-slate-600 w-full"
                  value={searchCat}
                  onChange={(e) => setSearchCat(e.target.value)}
                />
              </div>
              <Table>
                <TableBody>
                  {loadingCats ? (
                    <TableRow><TableCell className="text-center py-10"><Loader2 className="animate-spin mx-auto text-slate-300"/></TableCell></TableRow>
                  ) : categoriasFiltradas?.map((cat: any) => (
                    <TableRow key={cat.id} className="group hover:bg-slate-50/50 transition-colors border-b">
                      <TableCell className="px-8 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-black text-slate-700 uppercase text-xs tracking-widest">{cat.nombre}</span>
                          <Badge className="bg-slate-100 text-slate-400 border-none font-bold text-[9px] h-5">{cat.articulo?.[0]?.count || 0}</Badge>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button onClick={() => startEditCat(cat)} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600"><Edit2 size={14}/></Button>
                          <Button onClick={() => deleteCatMutation.mutate(cat)} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500"><Trash2 size={14}/></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* PANEL MARCAS */}
        <div className="space-y-6">
          <Card className="border-none shadow-2xl rounded-[35px] overflow-hidden bg-white ring-1 ring-slate-100">
            <CardHeader className={`border-b pb-8 transition-colors ${editingMarca ? 'bg-emerald-50/50' : 'bg-slate-50/50'}`}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-black italic uppercase text-slate-800 flex items-center gap-2"><Briefcase size={20} className="text-emerald-600" /> {editingMarca ? 'Editando' : 'Marcas'}</CardTitle>
                <Badge variant="outline" className="font-black text-[9px]">{marcas?.length || 0} Activas</Badge>
              </div>
              <div className="flex gap-2 mt-4">
                <Input placeholder="Nombre..." className="rounded-xl border-slate-200 uppercase font-bold text-xs tracking-widest h-12" value={marcaName} onChange={(e) => setMarcaName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && marcaName && marcaMutation.mutate({ id: editingMarca?.id, nombre: marcaName })} />
                {editingMarca && <Button variant="outline" onClick={cancelEditMarca} className="rounded-xl h-12 border-slate-200"><X size={20} /></Button>}
                <Button onClick={() => marcaName && marcaMutation.mutate({ id: editingMarca?.id, nombre: marcaName })} disabled={marcaMutation.isPending} className={`${editingMarca ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-600 hover:bg-emerald-700'} rounded-xl h-12 px-6 shadow-lg transition-all`}>
                  {marcaMutation.isPending ? <Loader2 className="animate-spin" /> : editingMarca ? <Save size={20} /> : <Plus size={20} />}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[500px] overflow-y-auto custom-scrollbar">
              <div className="p-4 bg-slate-50/50 border-b flex items-center gap-2">
                <Search size={14} className="text-slate-400" />
                <input 
                  placeholder="Buscar en marcas..." 
                  className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-slate-600 w-full"
                  value={searchMarca}
                  onChange={(e) => setSearchMarca(e.target.value)}
                />
              </div>
              <Table>
                <TableBody>
                  {loadingMarcas ? (
                    <TableRow><TableCell className="text-center py-10"><Loader2 className="animate-spin mx-auto text-slate-300"/></TableCell></TableRow>
                  ) : marcasFiltradas?.map((m: any) => (
                    <TableRow key={m.id} className="group hover:bg-slate-50/50 transition-colors border-b">
                      <TableCell className="px-8 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-black text-slate-700 uppercase text-xs tracking-widest">{m.nombre}</span>
                          <Badge className="bg-slate-100 text-slate-400 border-none font-bold text-[9px] h-5">{m.articulo?.[0]?.count || 0}</Badge>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button onClick={() => startEditMarca(m)} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600"><Edit2 size={14}/></Button>
                          <Button onClick={() => deleteMarcaMutation.mutate(m)} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500"><Trash2 size={14}/></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}