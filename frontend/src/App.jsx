import { Routes, Route } from 'react-router-dom';
import ImsPage from './pages/ImsPage';

function App() {
  return (
    <Routes>
      <Route path="/ims" element={<ImsPage />} />
      <Route path="/" element={<ImsPage />} />
    </Routes>
  );
}

export default App;

