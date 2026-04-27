import { useEffect, useState, useContext } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "../context/AuthContext";

export default function NotificationPanel() {
  const { user } = useContext(AuthContext);
  const [notification, setNotification] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) return;
    const newSocket = io(process.env.REACT_APP_API_BASE_URL);

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);

      newSocket.emit("register", String(user.id));
      console.log("Registered user:", user.id);
    });

    newSocket.on("notification", (data) => {
      console.log("Notification received:", data);

      setNotification({ message: data.message });

      setTimeout(() => setNotification(null), 5000);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  if (!notification) return null;

  return (
    <div style={styles.container}>
      <div style={styles.toast}>{notification.message}</div>
    </div>
  );
}

const styles = {
  container: {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: 1000,
  },
  toast: {
    background: "#4f46e5",
    color: "#fff",
    padding: "12px 18px",
    borderRadius: "8px",
    minWidth: "260px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    fontWeight: "500",
  },
};