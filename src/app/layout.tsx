'use client'
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { AuthProvider } from '@/context/AuthContext';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/sonner" // Importación correcta

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider> 
            {children}
            {/* Añadimos el Toaster aquí. 
               richColors: para que los errores sean rojos y éxitos verdes.
               closeButton: para que el usuario pueda cerrar la notificación.
            */}
            <Toaster position="top-right" richColors closeButton />
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}