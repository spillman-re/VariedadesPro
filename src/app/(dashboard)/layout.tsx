'use client'

import { useAuth } from '@/context/AuthContext'
import { Sidebar } from '@/components/shared/Sidebar'
import { Loader2, MapPin, User, Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { perfil, loading, user } = useAuth()
  const router = useRouter()

  // Seguridad a nivel de cliente: Si no hay usuario tras cargar, redirigir
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  // Pantalla de carga mientras verificamos la sesión
  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] animate-pulse">
          Verificando Credenciales...
        </p>
      </div>
    )
  }

  // Si no hay perfil (por ejemplo, cuenta inactiva), no renderizamos nada 
  // (El AuthContext ya debería haber ejecutado el signOut)
  if (!perfil) return null

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* MENU LATERAL IZQUIERDO */}
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* BARRA SUPERIOR (TOPBAR) */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-30 shadow-sm">
          {/* Info de la Sucursal */}
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
              <MapPin size={16} className="text-blue-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-1">
                Sucursal Activa
              </span>
              <span className="text-sm font-bold text-slate-700 leading-none">
                {/* Aquí luego traeremos el nombre real de la tabla sucursal */}
                {perfil.id_sucursal_asignada ? 'Sucursal Principal' : 'Sin Sucursal'}
              </span>
            </div>
          </div>
          
          {/* Info del Usuario y Notificaciones */}
          <div className="flex items-center gap-6">
            <button className="text-slate-400 hover:text-slate-600 transition-colors relative">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block"></div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-slate-900 leading-none mb-1">
                  {perfil.nombre}
                </p>
                <p className="text-[10px] uppercase font-bold text-blue-600 tracking-widest leading-none">
                  {perfil.id_rol === 1 ? 'Administrador' : perfil.id_rol === 2 ? 'Supervisor' : 'Cajero'}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-200 overflow-hidden border-2 border-white">
                <User size={20} className="text-white" />
              </div>
            </div>
          </div>
        </header>

        {/* ÁREA DE CONTENIDO (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}