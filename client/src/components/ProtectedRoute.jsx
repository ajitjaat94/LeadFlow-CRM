import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    return <Navigate to="/" state={{ authRequired: true }} replace />;
  }

  return children;
};

export default ProtectedRoute;
