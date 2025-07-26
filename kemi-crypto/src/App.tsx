import { Routes, Route } from 'react-router-dom';
import './App.css';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import CoinDetail from './pages/CoinDetail';
import ScrollToTop from './components/ScrollToTop';

function App() {
  return (
    <>
      {/* ScrollToTop component handles automatic scroll restoration on route changes */}
      <ScrollToTop />
      
      <Routes>
        <Route 
          path="/" 
          element={
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          } 
        />
        <Route path="/coins/:coinId" element={<CoinDetail />} />
      </Routes>
    </>
  );
}

export default App;
