import { Routes, Route } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import Leads from "../pages/Leads";
import ProtectedRoute from "../components/ProtectedRoute";
import HomePage from "../pages/HomePage";

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
    </Routes>
  );
};

export default AppRoute;
