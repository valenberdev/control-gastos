import { Routes, Route } from "react-router";
import Dashboard from "./pages/Dashboard";
import Historial from "./pages/Historial";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import BottomNav from "./components/BottomNav";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PublicLayout from "./components/PublicLayout";
import RouteTitle from "./components/RouteTitle";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <div className="app-shell">
      {user && <BottomNav />}

      <RouteTitle />
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/historial"
          element={
            <ProtectedRoute>
              <Historial />
            </ProtectedRoute>
          }
        />
        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route element={<PublicLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/olvide-mi-contrasena" element={<ForgotPassword />} />
          <Route path="/restablecer" element={<ResetPassword />} />
          <Route path="/privacidad" element={<Privacy />} />
          <Route path="/terminos" element={<Terms />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </div>
  );
}
