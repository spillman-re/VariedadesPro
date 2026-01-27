'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings, 
  LogOut,
  Warehouse,
  History,
  Bookmark // <--- IMPORTACIÓN AGREGADA
} from 'lucide-react'

// Definimos los roles para evitar errores de undefined
const menuItems = [
  { name: 'Inicio', href: '/', icon: LayoutDashboard, roles: [1, 2, 3] },
  { name: 'Punto de Venta', href: '/ventas', icon: ShoppingCart, roles: [1, 2, 3] },
  { name: 'Productos', href: '/productos', icon: Package, roles: [1, 2] },
  { name: 'Clasificación', href: '/categorias', icon: Bookmark, roles: [1, 2] }, // <--- ROLES AGREGADOS
  { name: 'Inventario', href: '/inventario', icon: Warehouse, roles: [1, 2] },
  { name: 'Kardex', href: '/kardex', icon: History, roles: [1] },
  { name: 'Usuarios', href: '/usuarios', icon: Users, roles: [1] },
  { name: 'Configuración', href: '/configuracion', icon: Settings, roles: [1] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { perfil, signOut } = useAuth()

  return (
    <div className="flex flex-col w-64 bg-slate-900 text-slate-300 h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="bg-blue-600 p-1.5 rounded-lg">
          <Warehouse className="text-white" size={20} />
        </div>
        <span className="font-black text-white tracking-tight uppercase italic">VariedadesPro</span>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          // Filtrar por rol (si perfil existe). Usamos el encadenamiento opcional ?.
          if (perfil && !item.roles?.includes(perfil.id_rol || 0)) return null;

          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm",
                isActive 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                  : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon size={18} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={signOut}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all font-medium text-sm text-slate-400"
        >
          <LogOut size={18} />
          Cerrar Sesión
        </button>
      </div>
    </div>
  )
}