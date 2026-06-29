import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// Components will be imported here once created

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>Welcome to Simple Banking App</div>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
