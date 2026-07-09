import { Routes, Route } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import Leads from "../pages/Leads";
import ProtectedRoute from "../components/ProtectedRoute";
import HomePage from "../pages/HomePage";
import Contact from "../pages/Contact";
import About from "../pages/About";

const AppRoute = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route
        path="/leads"
        element={
          <ProtectedRoute>
            <Leads />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lead/:id"
        element={
          <ProtectedRoute>
            <Leads />
          </ProtectedRoute>
        }
      />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
    </Routes>
  );
};

export default AppRoute;
