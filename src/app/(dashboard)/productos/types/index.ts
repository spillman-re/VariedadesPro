export interface Articulo {
  id: string;
  nombre: string;
  modelo: string;
  id_categoria: number;
  id_marca?: number;
  iva_porcentaje: number;
  activo: boolean;
  categoria?: { nombre: string };
  marca?: { nombre: string };
  creado_at?: string;
}

export interface PresentacionForm {
  id_temp: string; // Generado por crypto.randomUUID()
  nombre: string;
  factor: number;
}

export interface VarianteOpcion {
  id: string; // ID real de variante_tipo_valor
  id_tipo: string;
  valor: string;
}

// Representa una fila de la matriz de precios
export interface CombinacionFinal {
  id_temp: string;
  label: string; // Ej: "Rojo / XL"
  opciones: { 
    id_tipo: string; 
    id_opcion: string; // ID de la tabla variante_tipo_valor
    valor: string 
  }[];
  precios: { 
    [id_presentacion_temp: string]: { 
      precio: string; 
      costo: string; 
      codigo_barras: string 
    } 
  };
}

// Estructura completa que recibe el Hook
export interface FormWizardData {
  base: {
    nombre: string;
    modelo: string;
    id_categoria: string;
    id_marca: string;
    iva_porcentaje: string;
    activo: boolean;
  };
  presentaciones: PresentacionForm[];
  combinaciones: CombinacionFinal[];
}