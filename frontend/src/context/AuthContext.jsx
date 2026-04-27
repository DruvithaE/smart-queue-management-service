import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Verify token on mount
      fetch($`http://localhost:{process.env.BACKEND_PORT}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.id) {
            setUser(data);
          } else {
            setToken(null);
            localStorage.removeItem("token");
          }
        })
        .catch(() => {
          setToken(null);
          localStorage.removeItem("token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await fetch($`http://localhost:{process.env.BACKEND_PORT}/api/auth/login`, {
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
    throw new Error(data.message);
  };

  const signup = async (email, password, confirmPassword, role, name) => {
    const res = await fetch($`http://localhost:{process.env.BACKEND_PORT}/api/auth/signup`, {
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
    throw new Error(data.message);
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