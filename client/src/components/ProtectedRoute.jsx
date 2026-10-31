import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("accessToken");
  const { pathname, search, hash } = useLocation();

  if (!token) {
    return <Navigate
      to="/"
      state={{ authRequired: true, returnTo: `${pathname}${search}${hash}` }}
      replace
    />;
  }

  return children;
};

export default ProtectedRoute;
