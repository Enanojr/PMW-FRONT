import { IconChevronLeft, IconChevronRight } from './icons';

interface Props {
  count: number;
  pagina: number;
  tamanoPagina?: number;
  onCambiar: (pagina: number) => void;
}

/** Paginación minimalista: rango visible + anterior/siguiente. */
export function Paginacion({ count, pagina, tamanoPagina = 20, onCambiar }: Props) {
  const totalPaginas = Math.max(1, Math.ceil(count / tamanoPagina));
  if (totalPaginas <= 1) return null;

  const desde = (pagina - 1) * tamanoPagina + 1;
  const hasta = Math.min(pagina * tamanoPagina, count);

  return (
    <div className="flex items-center justify-between">
      <p className="text-[13px] text-silver">
        {desde}–{hasta} de {count}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onCambiar(pagina - 1)}
          disabled={pagina <= 1}
          className="btn-ghost !px-2.5"
          aria-label="Página anterior"
        >
          <IconChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[13px] font-medium text-ink">
          {pagina} / {totalPaginas}
        </span>
        <button
          onClick={() => onCambiar(pagina + 1)}
          disabled={pagina >= totalPaginas}
          className="btn-ghost !px-2.5"
          aria-label="Página siguiente"
        >
          <IconChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
