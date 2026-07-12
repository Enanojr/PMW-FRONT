/**
 * Insignia de estado minimalista: punto de color + etiqueta.
 * El color nunca viaja solo — la etiqueta siempre acompaña al punto.
 */
const puntos: Record<string, string> = {
  // Equipos
  OPERATIVO: 'bg-emerald-500',
  EN_MANTENIMIENTO: 'bg-amber-500',
  FUERA_DE_SERVICIO: 'bg-red-500',
  BAJA: 'bg-slate-400',
  // Mantenimientos / Órdenes
  PROGRAMADO: 'bg-sky-500',
  ABIERTA: 'bg-sky-500',
  ASIGNADA: 'bg-indigo-500',
  EN_PROCESO: 'bg-amber-500',
  COMPLETADO: 'bg-emerald-500',
  CERRADA: 'bg-emerald-500',
  CANCELADO: 'bg-slate-400',
  CANCELADA: 'bg-slate-400',
  REPROGRAMADO: 'bg-purple-500',
  // Prioridades
  URGENTE: 'bg-red-500',
  ALTA: 'bg-orange-500',
  MEDIA: 'bg-amber-400',
  // Esquema comercial del equipo
  ARRENDAMIENTO: 'bg-indigo-500',
  POLIZA: 'bg-sky-500',
  PROPIO: 'bg-slate-500',
};

interface Props {
  codigo: string;
  etiqueta: string;
}

export function StatusBadge({ codigo, etiqueta }: Props) {
  const punto = puntos[codigo] ?? 'bg-slate-400';
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-black/[0.04] px-2.5 py-1 text-[11px] font-medium text-[#3a3a3c]">
      <span className={`h-1.5 w-1.5 rounded-full ${punto}`} />
      {etiqueta}
    </span>
  );
}
