'use client'
import { useState } from 'react' // Importado para el estado móvil
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
  Bookmark,
  Menu // Icono para el disparador móvil
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

const menuItems = [
  { name: 'Inicio', href: '/', icon: LayoutDashboard, roles: [1, 2, 3] },
  { name: 'Punto de Venta', href: '/ventas', icon: ShoppingCart, roles: [1, 2, 3] },
  { name: 'Productos', href: '/productos', icon: Package, roles: [1, 2] },
  { name: 'Clasificación', href: '/categorias', icon: Bookmark, roles: [1, 2] },
  { name: 'Inventario', href: '/inventario', icon: Warehouse, roles: [1, 2] },
  { name: 'Kardex', href: '/kardex', icon: History, roles: [1] },
  { name: 'Usuarios', href: '/usuarios', icon: Users, roles: [1] },
  { name: 'Configuración', href: '/configuracion', icon: Settings, roles: [1] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { perfil, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  // Contenido de la navegación (extraído para no repetir código)
  const NavContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="bg-blue-600 p-1.5 rounded-lg">
          <Warehouse className="text-white" size={20} />
        </div>
        <span className="font-black text-white tracking-tight uppercase italic">VariedadesPro</span>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          if (perfil && !item.roles?.includes(perfil.id_rol || 0)) return null;

          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)} // Cierra el menú al hacer clic en móvil
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

  return (
    <>
      {/* TRIGGER MÓVIL (Solo visible en celulares/tablets) */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-slate-900 border-slate-800 text-white hover:bg-slate-800 rounded-xl shadow-xl">
              <Menu size={20} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-slate-900 border-r-slate-800">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* SIDEBAR DESKTOP (Se oculta en móvil, se muestra en LG en adelante) */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-slate-300 h-screen sticky top-0 shrink-0">
        <NavContent />
      </aside>
    </>
  )
}