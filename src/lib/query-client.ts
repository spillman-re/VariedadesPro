import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Los datos se consideran "frescos" por 5 minutos
      gcTime: 1000 * 60 * 60 * 24, // Mantener en caché por 24 horas
      retry: 1, // Reintento único para evitar bucles en fallos de red
      refetchOnWindowFocus: false, // No recargar cada vez que cambies de pestaña
    },
  },
});