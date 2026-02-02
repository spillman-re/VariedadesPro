import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export function useProductos() {
  const queryClient = useQueryClient()

  // 1. OBTENER DETALLE PROFUNDO (Para el Editor)
  const getDetalleProducto = async (id: string) => {
    const { data, error } = await supabase
      .from('articulo')
      .select(`
        *,
        presentaciones:articulo_presentacion(*),
        variantes:articulo_variante(
          id,
          activo,
          valores:articulo_variante_valor(
            id_opcion,
            opcion:variante_tipo_valor(valor, id_tipo)
          ),
          precios:articulo_precio(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  };

  // 2. GUARDADO MASIVO (WIZARD - INSERT)
  const saveArticuloCompleto = useMutation({
    mutationFn: async (data: any) => {
      const articuloPayload = {
        nombre: data.base.nombre.trim().toUpperCase(),
        modelo: data.base.modelo.trim().toUpperCase(),
        id_categoria: parseInt(data.base.id_categoria),
        id_marca: data.base.id_marca ? parseInt(data.base.id_marca) : null,
        iva_porcentaje: parseFloat(data.base.iva_porcentaje) || 0,
        activo: true
      };

      const { data: art, error: artErr } = await (supabase.from('articulo') as any)
        .insert([articuloPayload]).select().single();
      if (artErr) throw artErr;

      // Presentaciones
      const { data: createdPres, error: pErr } = await (supabase.from('articulo_presentacion') as any)
        .insert(data.presentaciones.map((p: any) => ({
          id_articulo: art.id,
          nombre: p.nombre.trim().toUpperCase(),
          factor: p.factor
        }))).select();
      if (pErr) throw pErr;

      const presMap: any = {};
      data.presentaciones.forEach((p: any) => {
        const dbP = createdPres.find((cp: any) => cp.nombre === p.nombre.toUpperCase());
        if (dbP) presMap[p.id_temp] = dbP.id;
      });

      // Variantes y Precios
      for (const comb of data.combinaciones) {
        const { data: vFisica, error: vErr } = await (supabase.from('articulo_variante') as any)
          .insert([{ id_articulo: art.id }]).select().single();
        if (vErr) throw vErr;

        const valores = comb.opciones.map((o: any) => ({ id_variante: vFisica.id, id_opcion: o.id_opcion }));
        const precios = Object.entries(comb.precios).map(([pTempId, vals]: any) => ({
          id_variante: vFisica.id,
          id_presentacion: presMap[pTempId],
          precio_venta: parseFloat(vals.precio) || 0,
          costo: parseFloat(vals.costo) || 0,
          codigo_barras: vals.codigo_barras || null
        }));

        await Promise.all([
          (supabase.from('articulo_variante_valor') as any).insert(valores),
          (supabase.from('articulo_precio') as any).insert(precios)
        ]);
      }
      return art;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      toast.success("Artículo creado con éxito");
    }
  });

  // 3. ACTUALIZAR BASE (EDITOR)
  const updateBase = useMutation({
    mutationFn: async ({ id, base }: any) => {
      const { error } = await (supabase.from('articulo') as any)
        .update({
          nombre: base.nombre.toUpperCase(),
          modelo: base.modelo.toUpperCase(),
          id_categoria: parseInt(base.id_categoria),
          id_marca: base.id_marca ? parseInt(base.id_marca) : null,
          iva_porcentaje: parseFloat(base.iva_porcentaje)
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      toast.success("Datos actualizados");
    }
  });

  // 4. ACTUALIZAR PRECIO INDIVIDUAL (EDITOR)
  const updatePrecio = useMutation({
    mutationFn: async ({ id, precio, costo, sku }: any) => {
      const { error } = await (supabase.from('articulo_precio') as any)
        .update({
          precio_venta: parseFloat(precio),
          costo: parseFloat(costo),
          codigo_barras: sku
        })
        .eq('id', id);
      if (error) throw error;
    }
  });

  // 5. DESACTIVACIÓN LÓGICA (TOGGLE)
  const toggleEstado = useMutation({
    mutationFn: async ({ id, estadoActual }: any) => {
      const { error } = await (supabase.from('articulo') as any)
        .update({ activo: !estadoActual })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.resetQueries({ queryKey: ['productos'] });
      toast.success("Estado actualizado");
    }
  });

  return {
    getDetalleProducto,
    saveArticulo: saveArticuloCompleto.mutateAsync,
    updateBase: updateBase.mutateAsync,
    updatePrecio: updatePrecio.mutateAsync,
    toggleEstado: toggleEstado.mutate,
    isSaving: saveArticuloCompleto.isPending || updateBase.isPending || toggleEstado.isPending
  };
}