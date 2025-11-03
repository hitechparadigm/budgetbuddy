import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Navigation: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/transactions', label: 'Transactions', icon: '💳' },
    { path: '/budget', label: 'Budget', icon: '💰' },
    { path: '/test/transactions', label: 'Test', icon: '🧪' }
  ];

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
            className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
      </div>

      <div className="nav-user">
        <button className="user-menu">
          <span>👤</span>
          <span>Profile</span>
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
