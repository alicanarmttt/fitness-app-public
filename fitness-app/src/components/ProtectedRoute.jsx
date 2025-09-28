// src/components/ProtectedRoute.jsx

import React from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

// Bu component, içine aldığı bir "child" component'i (örneğin Home sayfasını)
// sadece kullanıcı giriş yapmışsa gösterir.
const ProtectedRoute = ({ children }) => {
  // Redux store'dan kullanıcının giriş yapıp yapmadığı bilgisini alıyoruz.
  const { isAuthenticated } = useSelector((state) => state.auth);
  const location = useLocation();

  // Eğer kullanıcı giriş yapmamışsa (isAuthenticated false ise),
  // onu login sayfasına yönlendiriyoruz.
  // 'replace' ve 'state' props'ları, kullanıcı giriş yaptıktan sonra
  // başlangıçta gitmek istediği sayfaya geri dönebilmesini sağlar.
  if (!isAuthenticated) {
    return <Navigate to="/register" replace state={{ from: location }} />;
  }

  // Eğer kullanıcı giriş yapmışsa, hiçbir şey yapma ve
  // istendiği gibi "child" component'i (Home, Calendar vs.) göster.
  return children;
};

export default ProtectedRoute;
