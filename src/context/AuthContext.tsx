// src/context/AuthContext.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { useRouter } from 'next/navigation';

type Perfil = Database['public']['Tables']['perfiles']['Row'];

interface AuthContextType {
  user: any | null;
  perfil: Perfil | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
  const initializeAuth = async () => {
    // Intentar sacar la sesión del storage local primero para velocidad
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session) {
      setUser(session.user)
      const { data } = await supabase.from('perfiles').select('*').eq('id', session.user.id).single()
      setPerfil(data)
    }
    setLoading(false) // Esto tiene que pasar SI O SI, falle o no el perfil
  }

  initializeAuth()

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      setUser(session.user)
      // Actualizar perfil sin poner loading en true de nuevo
      supabase.from('perfiles').select('*').eq('id', session.user.id).single().then(({data}) => setPerfil(data))
    } else {
      setUser(null)
      setPerfil(null)
    }
    setLoading(false)
  })

  return () => subscription.unsubscribe()
}, []) // Arreglo vacío para que solo corra UNA vez al montar

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, perfil, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// ✅ Esto también debe exportarse
export const useAuth = () => useContext(AuthContext);
