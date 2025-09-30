import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="p-4 bg-white flex justify-between sticky top-0 items-center shadow-md z-50">
      {/* Left side links */}
      <div className="flex gap-6">
        <Link
          to="/"
          className="text-gray-700 font-medium hover:text-emerald-600 transition"
        >
          Submit Report
        </Link>
        <Link
          to="/map"
          className="text-gray-700 font-medium hover:text-emerald-600 transition"
        >
          View Map
        </Link>
      </div>

      <div className="flex gap-4">
        <Link
          to="/login"
          className="px-4 py-1.5 rounded-md text-sm font-medium text-emerald-600 border border-emerald-600 hover:bg-emerald-600 hover:text-white transition"
        >
          Login
        </Link>
        <Link
          to="/signup"
          className="px-4 py-1.5 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition"
        >
          Sign Up
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;
