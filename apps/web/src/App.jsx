import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ReportForm from './components/ReportForm';
import ReportMap from './components/ReportMap';
function App() {
  return (
    <Router>
      <div>
        {/* Simple navigation */}
        <nav className="p-4 bg-gray-200 flex gap-4">
          <Link to="/">Submit Report</Link>
          <Link to="/map">View Map</Link>
        </nav>

        <Routes>
          <Route path="/" element={<ReportForm />} />
          <Route path="/map" element={<ReportMap />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
