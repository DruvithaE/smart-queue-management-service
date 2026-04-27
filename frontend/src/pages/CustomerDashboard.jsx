import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const CustomerDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="dashboard">
      <h1>Customer Dashboard</h1>
      <p>Welcome, {user?.name}</p>
      <p>Email: {user?.email}</p>
      {/* Add customer-specific features here */}
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default CustomerDashboard;