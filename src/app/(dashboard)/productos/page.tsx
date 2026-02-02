'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useProductos } from './hooks/useProductos'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Package2, Loader2, Search, Edit2, Trash2, Tag, Power, PowerOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import FormWizard from './components/FormWizard'

export default function CatalogPage() {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedArticulo, setSelectedArticulo] = useState<any>(null)
  
  const { saveArticulo, toggleEstado, isSaving } = useProductos()

  // Queries auxiliares
  const { data: categorias = [] } = useQuery({ queryKey: ['categorias'], queryFn: async () => (await supabase.from('categoria').select('*')).data || [] })
  const { data: marcas = [] } = useQuery({ queryKey: ['marcas'], queryFn: async () => (await supabase.from('marca').select('*')).data || [] })
  const { data: tiposVariante = [] } = useQuery({ queryKey: ['variante_tipo'], queryFn: async () => (await supabase.from('variante_tipo').select('*')).data || [] })
  const { data: opcionesVariante = [] } = useQuery({ queryKey: ['variante_tipo_valor'], queryFn: async () => (await supabase.from('variante_tipo_valor').select('*')).data || [] })

  // Query principal con "Join manual" para evitar errores de relación
  const { data: articulos = [], isLoading, refetch } = useQuery({
    queryKey: ['productos'],
    queryFn: async () => {
      const { data: rawArticulos, error } = await supabase.from('articulo').select('*').order('creado_at', { ascending: false });
      if (error) throw error;

      return rawArticulos.map((art: any) => ({
        ...art,
        categoria: categorias.find((c: any) => c.id === art.id_categoria),
        marca: marcas.find((m: any) => m.id === art.id_marca)
      }));
    },
    enabled: categorias.length > 0 // Espera a tener las categorías para mapear
  })

  const articulosFiltrados = articulos.filter((art: any) => {
    const term = search.toLowerCase().trim();
    return art.nombre?.toLowerCase().includes(term) || art.modelo?.toLowerCase().includes(term);
  })

  const handleEdit = async (art: any) => {
  // 1. Ya tenemos la info base, ahora buscamos lo profundo
  const { data: variantes } = await supabase
    .from('articulo_variante')
    .select(`
      id,
      valores:articulo_variante_valor(id_opcion),
      precios:articulo_precio(*)
    `)
    .eq('id_articulo', art.id);

  const { data: presentaciones } = await supabase
    .from('articulo_presentacion')
    .select('*')
    .eq('id_articulo', art.id);

  // 2. Empaquetamos todo para el Wizard
  const articuloCompleto = {
    ...art,
    db_presentaciones: presentaciones,
    db_variantes: variantes
  };

  setSelectedArticulo(articuloCompleto);
  setIsOpen(true);
};

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen font-sans">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-100"><Tag size={28} /></div>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">Catálogo Maestro</h1>
          </div>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] pl-1">Variedades Pro v5.6 / Sistema de Gestión</p>
        </div>
        <Button onClick={() => { setSelectedArticulo(null); setIsOpen(true); }} className="bg-blue-600 hover:bg-slate-900 h-14 px-10 rounded-3xl font-black uppercase text-[11px] shadow-2xl transition-all active:scale-95">
          <Plus size={20} className="mr-2 stroke-[3px]" /> Registrar Artículo
        </Button>
      </div>

      {/* BUSCADOR */}
      <div className="bg-white p-4 rounded-[30px] shadow-sm border border-slate-100">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          <Input
            placeholder="Buscar por nombre o modelo..."
            className="pl-12 h-14 rounded-2xl border-none bg-slate-50 font-bold uppercase text-xs tracking-widest focus:ring-2 focus:ring-blue-500/20 shadow-inner"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-[45px] shadow-2xl border border-slate-100 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50 h-20">
            <TableRow className="border-none">
              <TableHead className="px-10 font-black text-slate-400 uppercase text-[10px] tracking-widest">Información</TableHead>
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest text-center">Categoría</TableHead>
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest text-center">Estado</TableHead>
              <TableHead className="w-[150px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="h-96 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={50} /></TableCell></TableRow>
            ) : articulosFiltrados.map((art: any) => (
              <TableRow key={art.id} className={`h-24 transition-colors group ${!art.activo ? 'bg-slate-50/50 opacity-60' : 'hover:bg-blue-50/10'}`}>
                <TableCell className="px-10">
                  <div className="flex items-center gap-5">
                    <div className="h-14 w-14 bg-white rounded-[20px] flex items-center justify-center text-slate-300 border shadow-sm"><Package2 size={24} /></div>
                    <div>
                      <p className="font-black text-slate-900 uppercase text-[13px] tracking-tight">{art.nombre}</p>
                      <p className="text-[10px] text-slate-400 font-mono italic mt-1">{art.modelo} | {art.marca?.nombre || 'GENÉRICA'}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className="bg-blue-50 text-blue-600 border-none text-[9px] font-black uppercase px-3 py-1">{art.categoria?.nombre || 'General'}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={art.activo ? "bg-emerald-50 text-emerald-600 border-none text-[8px] font-black" : "bg-rose-50 text-rose-600 border-none text-[8px] font-black"}>
                    {art.activo ? 'ACTIVO' : 'INACTIVO'}
                  </Badge>
                </TableCell>
                <TableCell className="px-10 text-right">
                  <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(art)} className="rounded-xl hover:bg-blue-50 text-blue-600"><Edit2 size={16} /></Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => toggleEstado({ id: art.id, estadoActual: art.activo })} 
                      className={`rounded-xl ${art.activo ? 'hover:bg-rose-50 text-rose-600' : 'hover:bg-emerald-50 text-emerald-600'}`}
                    >
                      {art.activo ? <PowerOff size={16} /> : <Power size={16} />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* DIALOG WIZARD */}
      <Dialog open={isOpen} onOpenChange={(val) => { setIsOpen(val); if(!val) setSelectedArticulo(null); }}>
        <DialogContent className="!max-w-[95vw] lg:!max-w-[1100px] p-0 rounded-[35px] border-none shadow-2xl bg-white overflow-hidden">
          <div className="flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b bg-slate-50/30">
              <DialogHeader>
                <DialogTitle className="text-3xl font-black uppercase tracking-tighter italic text-slate-900 leading-none">
                  {selectedArticulo ? 'Editar Artículo' : 'Nuevo Artículo'}
                </DialogTitle>
              </DialogHeader>
            </div>
            <div className="overflow-y-auto custom-scrollbar p-8">
              <FormWizard
                categorias={categorias}
                marcas={marcas}
                tiposVariante={tiposVariante}
                opcionesVariante={opcionesVariante}
                articuloParaEditar={selectedArticulo}
                onSave={async (data: any) => {
                  await saveArticulo(data);
                  setIsOpen(false);
                  refetch();
                }}
                isSaving={isSaving}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}