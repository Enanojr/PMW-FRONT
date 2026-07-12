import { useEffect, useState, type FormEvent } from 'react';
import { IconDoc, IconSearch, IconUpload } from '../components/icons';
import { useAuth } from '../hooks/useAuth';
import { documentosService } from '../services/recursos.service';
import type { Documento, TipoDocumento } from '../types';
import { formatearBytes, formatearFecha } from '../utils/formato';

const TIPOS: { valor: TipoDocumento | ''; etiqueta: string }[] = [
  { valor: '', etiqueta: 'Todos' },
  { valor: 'MANUAL', etiqueta: 'Manuales' },
  { valor: 'REPORTE', etiqueta: 'Reportes' },
  { valor: 'EVIDENCIA', etiqueta: 'Evidencias' },
  { valor: 'GUIA', etiqueta: 'Guías' },
  { valor: 'OTRO', etiqueta: 'Otros' },
];

/**
 * Directorio + visualizador del repositorio documental.
 * El PDF se lee inline mediante <iframe> apuntando a la URL que resuelve el
 * backend (almacenamiento local hoy; Alfresco en el futuro, sin cambios aquí).
 */
export function Documentos() {
  const { esAdmin } = useAuth();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState<TipoDocumento | ''>('');
  const [seleccionado, setSeleccionado] = useState<Documento | null>(null);
  const [cargando, setCargando] = useState(false);
  const [recarga, setRecarga] = useState(0);

  // Subida de documentos (Admin)
  const [mostrarForm, setMostrarForm] = useState(false);
  const [subida, setSubida] = useState({ titulo: '', tipo: 'MANUAL', modelo_equipo: '', version: '1.0' });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setCargando(true);
      documentosService
        .listar({ search: busqueda || undefined, tipo: tipo || undefined })
        .then((r) => setDocumentos(r.results))
        .catch(() => setDocumentos([]))
        .finally(() => setCargando(false));
    }, 300); // debounce de búsqueda
    return () => clearTimeout(timeout);
  }, [busqueda, tipo, recarga]);

  const subir = async (e: FormEvent) => {
    e.preventDefault();
    if (!archivo) {
      setError('Selecciona un archivo PDF.');
      return;
    }
    setError(null);
    setExito(null);
    setSubiendo(true);
    try {
      const datos = new FormData();
      datos.append('titulo', subida.titulo.trim());
      datos.append('tipo', subida.tipo);
      datos.append('modelo_equipo', subida.modelo_equipo.trim());
      datos.append('version', subida.version.trim() || '1.0');
      datos.append('backend_almacenamiento', 'LOCAL');
      datos.append('archivo', archivo);
      const creado = await documentosService.crear(datos);
      setExito(`Documento "${creado.titulo}" subido correctamente.`);
      setSubida({ titulo: '', tipo: 'MANUAL', modelo_equipo: '', version: '1.0' });
      setArchivo(null);
      setMostrarForm(false);
      setRecarga((r) => r + 1);
    } catch (err: unknown) {
      const detalle =
        (err as { response?: { data?: Record<string, string[]> } }).response?.data;
      const primerError = detalle && Object.values(detalle)[0]?.[0];
      setError(primerError ?? 'No se pudo subir el documento.');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="page-title">Repositorio</h2>
          <p className="page-subtitle">Manuales, guías y reportes escaneados (PDF)</p>
        </div>
        {esAdmin && (
          <button
            onClick={() => {
              setMostrarForm((v) => !v);
              setError(null);
              setExito(null);
            }}
            className={mostrarForm ? 'btn-ghost' : 'btn-primary'}
          >
            {mostrarForm ? 'Cancelar' : (<><IconUpload className="h-4 w-4" /> Subir documento</>)}
          </button>
        )}
      </header>

      {exito && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{exito}</p>
      )}

      {/* Formulario de subida (Admin) */}
      {esAdmin && mostrarForm && (
        <form onSubmit={subir} className="card animate-fade-up p-6">
          <h3 className="text-[15px] font-semibold tracking-tight text-ink">Subir documento</h3>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-2">
              <label htmlFor="d-titulo" className="label-field">Título *</label>
              <input
                id="d-titulo"
                required
                value={subida.titulo}
                onChange={(e) => setSubida((s) => ({ ...s, titulo: e.target.value }))}
                placeholder="Ej. Manual de servicio TASKalfa 3554ci"
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="d-tipo" className="label-field">Tipo *</label>
              <select
                id="d-tipo"
                value={subida.tipo}
                onChange={(e) => setSubida((s) => ({ ...s, tipo: e.target.value }))}
                className="input-field"
              >
                <option value="MANUAL">Manual de equipo</option>
                <option value="REPORTE">Reporte escaneado</option>
                <option value="GUIA">Guía rápida</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div>
              <label htmlFor="d-version" className="label-field">Versión</label>
              <input
                id="d-version"
                value={subida.version}
                onChange={(e) => setSubida((s) => ({ ...s, version: e.target.value }))}
                className="input-field"
              />
            </div>
            <div className="md:col-span-1 xl:col-span-2">
              <label htmlFor="d-modelo" className="label-field">Modelo al que aplica</label>
              <input
                id="d-modelo"
                value={subida.modelo_equipo}
                onChange={(e) => setSubida((s) => ({ ...s, modelo_equipo: e.target.value }))}
                placeholder="Ej. TASKalfa 3554ci (vacío = general)"
                className="input-field"
              />
            </div>
            <div className="md:col-span-1 xl:col-span-2">
              <label htmlFor="d-archivo" className="label-field">Archivo PDF *</label>
              <input
                id="d-archivo"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                className="input-field file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-1.5 file:text-xs file:font-semibold file:text-white"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-kyocera-50 px-3.5 py-2.5 text-[13px] text-kyocera-700">
              {error}
            </p>
          )}

          <button type="submit" disabled={subiendo} className="btn-primary mt-5">
            {subiendo ? 'Subiendo…' : 'Subir al repositorio'}
          </button>
        </form>
      )}

      {/* Filtro segmentado por tipo */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="inline-flex rounded-full bg-black/[0.05] p-1">
          {TIPOS.map((t) => (
            <button
              key={t.valor}
              onClick={() => setTipo(t.valor)}
              className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                tipo === t.valor
                  ? 'bg-white text-ink shadow-card'
                  : 'text-silver hover:text-ink'
              }`}
            >
              {t.etiqueta}
            </button>
          ))}
        </div>
        <div className="relative">
          <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-silver" />
          <input
            type="search"
            placeholder="Buscar por título, modelo…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="input-field w-72 !rounded-full !pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Directorio */}
        <section className="space-y-2 xl:col-span-2">
          {cargando && <p className="py-4 text-center text-sm text-silver">Buscando…</p>}
          {!cargando && documentos.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSeleccionado(doc)}
              className={`w-full rounded-2xl p-4 text-left transition-all duration-200 ${
                seleccionado?.id === doc.id
                  ? 'bg-white shadow-pop ring-1 ring-black/10'
                  : 'bg-white/60 ring-1 ring-black/[0.04] hover:bg-white hover:shadow-card'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-ink">
                  <IconDoc className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-ink">{doc.titulo}</p>
                    <span className="shrink-0 rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-silver">
                      {doc.tipo_display}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-silver">
                    {doc.modelo_equipo || 'General'} · v{doc.version} ·{' '}
                    {formatearBytes(doc.tamano_bytes)} · {formatearFecha(doc.creado_en)}
                  </p>
                </div>
              </div>
            </button>
          ))}
          {!cargando && documentos.length === 0 && (
            <p className="rounded-2xl border border-dashed border-black/10 py-10 text-center text-sm text-silver">
              Sin documentos que coincidan con la búsqueda
            </p>
          )}
        </section>

        {/* Visualizador */}
        <section className="card p-5 xl:col-span-3">
          {seleccionado?.url_descarga ? (
            <div className="flex h-full min-h-[70vh] flex-col">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="truncate text-[15px] font-semibold tracking-tight text-ink">
                  {seleccionado.titulo}
                </h3>
                <a
                  href={seleccionado.url_descarga}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary shrink-0 !px-4 !py-2 !text-xs"
                >
                  Abrir / Descargar
                </a>
              </div>
              <iframe
                title={seleccionado.titulo}
                src={seleccionado.url_descarga}
                className="w-full flex-1 rounded-xl border border-black/[0.06]"
              />
            </div>
          ) : (
            <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 text-silver">
              <IconDoc className="h-8 w-8 opacity-40" />
              <p className="text-sm">Selecciona un documento para visualizarlo</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
