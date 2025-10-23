// src/components/SideBar.jsx

import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../redux/slices/authSlice"; // <-- Logout aksiyonumuzu import ediyoruz
import FitnessLogo from "../img/Gemini_Generated_Image_m87sh0m87sh0m87s.png";
// --- İkonları import ediyoruz ---
import {
  FaHome,
  FaPlusSquare,
  FaCalendarAlt,
  FaChartBar,
  FaSignInAlt,
  FaUserPlus,
  FaSignOutAlt,
} from "react-icons/fa";

function SideBar() {
  // Redux'tan gerekli state ve fonksiyonları alıyoruz
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Çıkış yapma fonksiyonu
  const handleLogout = () => {
    dispatch(logout());
    navigate("/login"); // Çıkış yaptıktan sonra login sayfasına yönlendir
  };

  // NavLink'lerin className'ini belirleyen fonksiyon. Kodu tekrar etmemek için.
  const getNavLinkClass = ({ isActive }) =>
    "nav-link d-flex align-items-center " +
    (isActive ? "active bg-primary text-white" : "text-white-50");
  const logoStyle = {
    width: "50px", // Logonun genişliği
    height: "auto", // Oranını korur
  };
  return (
    <div
      className="d-flex flex-column flex-shrink-0 p-3 bg-dark"
      style={{ width: 230, minHeight: "100vh" }} // Genişliği biraz artırdık
    >
      <div style={{ marginBottom: "50px" }}>
        <span className="fs-4 text-white mb-4">Fit Bross</span>
        <img
          src={FitnessLogo}
          alt="Fitness Uygulaması Logosu"
          style={logoStyle}
        />
      </div>

      <ul className="nav nav-pills flex-column mb-auto">
        {/* ---- KULLANICI GİRİŞ YAPMIŞSA GÖSTERİLECEK LİNKLER ---- */}
        {isAuthenticated && (
          <>
            <li className="nav-item mb-2">
              <NavLink to="/" className={getNavLinkClass} end>
                <FaHome className="me-2" /> {/* İkon eklendi */}
                Home
              </NavLink>
            </li>
            <li className="nav-item mb-2">
              <NavLink to="/create-program" className={getNavLinkClass}>
                <FaPlusSquare className="me-2" />
                Program Creating
              </NavLink>
            </li>
            <li className="nav-item mb-2">
              <NavLink to="/calendar" className={getNavLinkClass}>
                <FaCalendarAlt className="me-2" />
                Calendar
              </NavLink>
            </li>
            <li className="nav-item mb-2">
              <NavLink to="/analysis" className={getNavLinkClass}>
                <FaChartBar className="me-2" />
                Analysis
              </NavLink>
            </li>
          </>
        )}

        {/* ---- KULLANICI GİRİŞ YAPMAMIŞSA GÖSTERİLECEK LİNKLER ---- */}
        {!isAuthenticated && (
          <>
            <li className="nav-item mb-2">
              <NavLink to="/login" className={getNavLinkClass}>
                <FaSignInAlt className="me-2" />
                Login
              </NavLink>
            </li>
            <li className="nav-item mb-2">
              <NavLink to="/register" className={getNavLinkClass}>
                <FaUserPlus className="me-2" />
                Register
              </NavLink>
            </li>
          </>
        )}
      </ul>

      {/* Kullanıcı giriş yapmışsa, email ve logout butonu göster */}
      {isAuthenticated && (
        <div className="dropdown border-top pt-3 mt-3">
          <span
            className="d-block text-white-50 text-truncate mb-2"
            title={user?.email}
          >
            {user?.email}
          </span>
          <button
            className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center"
            onClick={handleLogout}
          >
            <FaSignOutAlt className="me-2" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default SideBar;
