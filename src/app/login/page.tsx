'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Store, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { user, perfil } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && perfil) {
      router.push('/')
    }
  }, [user, perfil, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      setError('Credenciales incorrectas o usuario no encontrado')
      setLoading(false)
      return
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans text-slate-900">
      <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-blue-600 rounded-2xl overflow-hidden bg-white">
        {/* Header más compacto verticalmente */}
        <CardHeader className="flex flex-col items-center pt-6 pb-1">
          <div className="bg-blue-600 p-2.5 rounded-2xl mb-2 shadow-lg shadow-blue-200">
            <Store className="text-white" size={28} />
          </div>
          <CardTitle className="text-3xl font-black uppercase tracking-tight italic mb-1">
            Variedades Pro
          </CardTitle>
          <CardDescription className="text-slate-500 font-medium text-center text-sm ">
            Gestión Inteligente de Inventario y Ventas
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4 px-6 pt-0">
            {/* CONTENEDOR DE ERROR CON ALTURA FIJA */}
            <div className="h-10 flex items-center justify-center mb-8">
              {error ? (
                <div className="w-full bg-red-50 text-red-600 p-2.5 rounded-xl text-xs font-bold border border-red-100 animate-in fade-in zoom-in duration-300 flex items-center justify-center gap-1">
                  <AlertCircle size={14} />
                  {error}
                </div>
              ) : (
                <div className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-bold opacity-50">
                  Acceso Seguro
                </div>
              )}
            </div>
            
            {/* Inputs con más espacio respecto al contenedor de error */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-semibold ml-1 text-[11px] uppercase tracking-wider">
                Correo Electrónico
              </Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="usuario@variedadespro.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-xl border-slate-200 focus:ring-blue-600 focus:border-blue-600 bg-slate-50/50 transition-all focus:bg-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-semibold ml-1 text-[11px] uppercase tracking-wider">
                Contraseña
              </Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 rounded-xl border-slate-200 focus:ring-blue-600 focus:border-blue-600 bg-slate-50/50 transition-all focus:bg-white"
              />
            </div>
          </CardContent>
          
          <CardFooter className="pt-3 pb-8 px-6 flex flex-col gap-2">
            <Button 
              type="submit" 
              className="w-full h-11 rounded-xl font-bold text-sm uppercase tracking-widest bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-[0.98] text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Entrar al Sistema'
              )}
            </Button>
            <p className="text-[10px] text-slate-400 font-medium text-center uppercase tracking-[0.1em]">
              V 2.0.1 • Authorized Personnel Only
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
