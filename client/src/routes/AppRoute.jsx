import { Routes, Route } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import Leads from "../pages/Leads";

const AppRoute = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/leads" element={<Leads />} />
      <Route path="/lead/:id" element={<Leads />} />
    </Routes>
  );
};

export default AppRoute;
