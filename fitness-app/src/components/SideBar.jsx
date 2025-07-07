import React from "react";
import { NavLink } from "react-router-dom";

function SideBar() {
  return (
    <div
      className="d-flex flex-column flex-shrink-0 p-3 bg-dark"
      style={{ width: 200, minHeight: "100vh" }}
    >
      <span className="fs-4 text-white mb-4">Fit Bross</span>
      <ul className="nav nav-pills flex-column mb-auto">
        <li className="nav-item mb-2">
          <NavLink
            to="/"
            className={({ isActive }) =>
              "nav-link " +
              (isActive ? "active bg-primary text-white" : "text-white-50")
            }
            end
          >
            Program Creating
          </NavLink>
        </li>
        <li className="nav-item mb-2">
          <NavLink
            to="/calendar"
            className={({ isActive }) =>
              "nav-link " +
              (isActive ? "active bg-primary text-white" : "text-white-50")
            }
          >
            Calendar
          </NavLink>
        </li>
        <li className="nav-item mb-2">
          <NavLink
            to="/analysis"
            className={({ isActive }) =>
              "nav-link " +
              (isActive ? "active bg-primary text-white" : "text-white-50")
            }
          >
            Analysis
          </NavLink>
        </li>
      </ul>
    </div>
  );
}

export default SideBar;
