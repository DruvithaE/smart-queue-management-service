import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

const PORT = process.env.REACT_APP_BACKEND_PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch(`${BASE_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.id) {
            setUser(data);
          } else {
            setUser(null);
            setToken(null);
            localStorage.removeItem("token");
          }
        })
        .catch(() => {
          setUser(null);
          setToken(null);
          localStorage.removeItem("token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.token) {
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem("token", data.token);
      return data;
    }

    throw new Error(data.message || "Login failed");
  };

  const signup = async (email, password, confirmPassword, role, name) => {
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, confirmPassword, role, name })
    });

    const data = await res.json();

    if (data.token) {
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem("token", data.token);
      return data;
    }

    throw new Error(data.message || "Signup failed");
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};