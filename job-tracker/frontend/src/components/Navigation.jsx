import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navigation.css';

function Navigation() {
  return (
    <nav className="navigation">
      <NavLink to="/table" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
        Table View
      </NavLink>
      <NavLink to="/sankey" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
        Sankey Diagram
      </NavLink>
    </nav>
  );
}

export default Navigation;