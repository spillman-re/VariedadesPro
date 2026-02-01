'use client'

import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  PackageSearch, 
  AlertTriangle, 
  ShoppingCart, 
  ArrowRight,
  PlusCircle
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { perfil } = useAuth()
  
  const stats = [
    { title: "Ventas del Día", value: "C$ 0.00", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Artículos en Catálogo", value: "0", icon: PackageSearch, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Stock Bajo", value: "0", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* SECCIÓN DE BIENVENIDA */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Hola, {perfil?.nombre?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-500 font-medium">
          Este es el resumen de actividad para tu sucursal hoy.
        </p>
      </div>

      {/* MÉTRICAS RÁPIDAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="border-none shadow-sm outline outline-1 outline-slate-200">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${stat.bg}`}>
                <stat.icon className={stat.color} size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.title}</p>
                <p className="text-2xl font-black text-slate-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUMNA IZQUIERDA: ACCIONES RÁPIDAS Y ALERTAS */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm outline outline-1 outline-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-600">
                Acciones Frecuentes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/dashboard/ventas">
                <Button className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex flex-col gap-1 shadow-lg shadow-blue-200 transition-all active:scale-95">
                  <ShoppingCart size={20} />
                  <span className="font-bold uppercase text-[10px] tracking-widest">Nueva Venta (POS)</span>
                </Button>
              </Link>
              <Link href="/dashboard/inventario">
                <Button variant="outline" className="w-full h-20 border-2 border-slate-100 hover:bg-slate-50 rounded-2xl flex flex-col gap-1 transition-all active:scale-95 text-slate-600">
                  <PlusCircle size={20} />
                  <span className="font-bold uppercase text-[10px] tracking-widest">Entrada de Mercadería</span>
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* LISTA DE STOCK BAJO (VACÍO POR AHORA) */}
          <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <AlertTriangle className="text-amber-500" size={20} />
                Alertas de Inventario
              </CardTitle>
            </CardHeader>
            <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="bg-slate-100 p-4 rounded-full">
                <PackageSearch className="text-slate-300" size={32} />
              </div>
              <div className="max-w-[200px]">
                <p className="text-sm font-bold text-slate-900">Todo en orden</p>
                <p className="text-xs text-slate-500">No hay productos por debajo del stock mínimo.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUMNA DERECHA: ÚLTIMOS MOVIMIENTOS */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm outline outline-1 outline-slate-200 h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-600">
                Actividad Reciente
              </CardTitle>
              <Link href="/dashboard/kardex" className="text-blue-600 text-[10px] font-black uppercase hover:underline">
                Ver todo
              </Link>
            </CardHeader>
            <CardContent className="p-0">
               <div className="p-8 text-center">
                 <p className="text-xs font-medium text-slate-400">No hay movimientos registrados hoy.</p>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}