import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: "📊" },
    { path: "/transactions", label: "Transactions", icon: "💳" },
    { path: "/budget", label: "Budget", icon: "💰" },
    { path: "/test/transactions", label: "Test", icon: "🧪" },
  ];

  const handleLogout = () => {
    // Clear all authentication tokens
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("idToken");

    // Clear user data
    localStorage.removeItem("userId");

    // Redirect to login page
    navigate("/login");
  };

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <h2>BudgetBuddy</h2>
      </div>

      <div className="nav-links">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-link ${location.pathname === item.path ? "active" : ""}`}
          >
            <span className="nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
      </div>

      <div className="nav-user">
        <button className="user-menu">
          <span>👤</span>
          <span>Profile</span>
        </button>
        <button
          className="logout-button"
          onClick={handleLogout}
          aria-label="Logout"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
