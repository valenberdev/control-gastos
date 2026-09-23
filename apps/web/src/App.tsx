import { Routes, Route } from 'react-router';
import Dashboard from './pages/Dashboard';
import Historial from './pages/Historial';
import BottomNav from './components/BottomNav';

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/historial" element={<Historial />} />
      </Routes>
      <BottomNav />
    </div>
  );
}