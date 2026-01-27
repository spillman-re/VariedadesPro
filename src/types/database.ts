export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      // ==========================================
      // 1. IDENTIDAD Y CONFIGURACIÓN
      // ==========================================
      sucursal: {
        Row: {
          id: string
          nombre: string
          direccion: string | null
          telefono: string | null
          activo: boolean
          creado_at: string
        }
        Insert: Omit<Database['public']['Tables']['sucursal']['Row'], 'id' | 'creado_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['sucursal']['Insert']>
      }
      perfiles: {
        Row: {
          id: string
          nombre: string
          id_rol: number | null
          id_sucursal_asignada: string | null
          activo: boolean
        }
        Insert: Database['public']['Tables']['perfiles']['Row']
        Update: Partial<Database['public']['Tables']['perfiles']['Insert']>
      }
      rol: {
        Row: { id: number; nombre_rol: string }
        Insert: { id?: number; nombre_rol: string }
        Update: Partial<Database['public']['Tables']['rol']['Insert']>
      }

      // ==========================================
      // 2. CATÁLOGO MAESTRO (CON FLAGS OFFLINE)
      // ==========================================
      articulo: {
        Row: {
          id: string
          codigo_barras: string | null
          nombre: string
          id_categoria: number | null
          id_marca: number | null
          precio_costo: number
          precio_venta_unidad: number
          precio_venta_mayorista: number | null
          iva_porcentaje: number
          activo: boolean
          creado_at: string
          // Campos Sincronización
          local_id: string | null
          updated_at: string
          server_at: string | null
          is_dirty: boolean
        }
        Insert: Omit<Database['public']['Tables']['articulo']['Row'], 'creado_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['articulo']['Insert']>
      }

      // ==========================================
      // 3. INVENTARIO Y LOGÍSTICA
      // ==========================================
      stock_sucursal: {
        Row: {
          id: string
          id_sucursal: string
          id_articulo: string
          cantidad_actual: number
          stock_minimo: number
          local_id: string | null
          updated_at: string
          is_dirty: boolean
        }
        Insert: Omit<Database['public']['Tables']['stock_sucursal']['Row'], 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['stock_sucursal']['Insert']>
      }

      kardex: {
        Row: {
          id: string
          id_articulo: string
          id_sucursal: string
          tipo_movimiento: 'venta' | 'compra' | 'traslado_in' | 'traslado_out' | 'ajuste' | 'devolucion'
          cantidad: number
          saldo_resultante: number
          referencia_id: string | null
          fecha: string
          local_id: string | null
          updated_at: string
          is_dirty: boolean
        }
        Insert: Omit<Database['public']['Tables']['kardex']['Row'], 'fecha' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['kardex']['Insert']>
      }

      // ==========================================
      // 4. VENTAS Y CAJA
      // ==========================================
      factura: {
        Row: {
          id: string
          local_id: string | null
          numero_factura: number
          id_arqueo: string | null
          id_usuario: string | null
          id_cliente: string | null
          id_sucursal: string | null
          tipo_pago: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto'
          total_neto: number
          total_iva: number
          total_final: number
          estado: 'emitida' | 'anulada'
          fecha_venta: string
          updated_at: string
          server_at: string | null
          is_dirty: boolean
        }
        Insert: Omit<Database['public']['Tables']['factura']['Row'], 'id' | 'fecha_venta' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['factura']['Insert']>
      }

      factura_detalle: {
        Row: {
          id: string
          id_factura: string
          id_articulo: string
          cantidad: number
          precio_unitario_venta: number
          iva_monto_linea: number
          subtotal_linea: number
          local_id: string | null
          updated_at: string
          is_dirty: boolean
        }
        Insert: Omit<Database['public']['Tables']['factura_detalle']['Row'], 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['factura_detalle']['Insert']>
      }

      arqueo_caja: {
        Row: {
          id: string
          id_caja: string
          id_usuario: string
          monto_inicial: number
          monto_final_contado: number | null
          monto_final_sistema: number | null
          fecha_apertura: string
          fecha_cierre: string | null
          estado: 'abierto' | 'cerrado'
          local_id: string | null
          updated_at: string
          is_dirty: boolean
        }
        Insert: Omit<Database['public']['Tables']['arqueo_caja']['Row'], 'fecha_apertura' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['arqueo_caja']['Insert']>
      }

      // Tablas de soporte (Categoria, Marca, Proveedor, Cliente, etc. siguen un patrón similar)
      categoria: { Row: { id: number; nombre: string; activo: boolean }; Insert: { id?: number; nombre: string; activo?: boolean }; Update: Partial<Database['public']['Tables']['categoria']['Insert']> }
      marca: { Row: { id: number; nombre: string; activo: boolean }; Insert: { id?: number; nombre: string; activo?: boolean }; Update: Partial<Database['public']['Tables']['marca']['Insert']> }
      cliente: { Row: { id: string; nombre: string; cedula_ruc: string | null; telefono: string | null; updated_at: string }; Insert: { id?: string; nombre: string; cedula_ruc?: string | null; telefono?: string | null }; Update: Partial<Database['public']['Tables']['cliente']['Insert']> }
    }
  }
}