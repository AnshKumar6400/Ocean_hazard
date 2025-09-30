import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ReportForm from "./components/ReportForm";
import ReportMap from "./components/ReportMap";
import Navbar from "./components/Navbar";

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 p-4">
          <Routes>
            <Route path="/" element={<ReportForm />} />
            <Route path="/map" element={<ReportMap />} />
            {/* Auth routes */}
            <Route path="/login" element={<h1>Login Page</h1>} />
            <Route path="/signup" element={<h1>Signup Page</h1>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
