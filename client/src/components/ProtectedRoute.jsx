import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem("accessToken");

  if (!token) {
    return <Navigate to="/" state={{ authRequired: true }} replace />;
  }

  return children;
};

export default ProtectedRoute;
