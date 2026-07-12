import { useEffect, type ReactNode } from 'react';
import { IconX } from './icons';

interface Props {
  titulo: string;
  abierto: boolean;
  onCerrar: () => void;
  children: ReactNode;
  ancho?: string;
}

/** Diálogo modal minimalista: fondo difuminado, tarjeta centrada, cierre con Esc. */
export function Modal({ titulo, abierto, onCerrar, children, ancho = 'max-w-2xl' }: Props) {
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className={`card w-full ${ancho} max-h-[85vh] animate-fade-up overflow-y-auto p-6`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-[17px] font-semibold tracking-tight text-ink">{titulo}</h3>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-full p-2 text-silver transition-colors hover:bg-black/[0.05] hover:text-ink"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
