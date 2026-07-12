import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Administracion } from './pages/Administracion';
import { Calendario } from './pages/Calendario';
import { Dashboard } from './pages/Dashboard';
import { Documentos } from './pages/Documentos';
import { Equipos } from './pages/Equipos';
import { Login } from './pages/Login';
import { Ordenes } from './pages/Ordenes';

/** El Técnico no tiene dashboard: su inicio es el calendario. */
function Inicio() {
  const { esAdmin } = useAuth();
  return esAdmin ? <Dashboard /> : <Navigate to="/calendario" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Rutas autenticadas (Admin y Técnico) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Inicio />} />
              <Route path="/calendario" element={<Calendario />} />
              <Route path="/ordenes" element={<Ordenes />} />
              <Route path="/documentos" element={<Documentos />} />
              {/* Equipos: ambos roles consultan y dan de alta */}
              <Route path="/equipos" element={<Equipos />} />
            </Route>
          </Route>

          {/* Rutas exclusivas del Administrador */}
          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route element={<Layout />}>
              <Route path="/administracion" element={<Administracion />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
