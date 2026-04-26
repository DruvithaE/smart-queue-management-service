import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

export default function NotificationPanel({ userId }) {
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    socket.on("connect", () => {
      socket.emit("register", userId);
    });

    socket.on("notification", (data) => {
      console.log("Notification received:", data);

      // replace existing notification instead of stacking
      setNotification({
        message: data.message,
      });

      // auto remove after 5 sec
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    });

    return () => {
      socket.off("notification");
    };
  }, [userId]);

  if (!notification) return null;

  return (
    <div style={styles.container}>
      <div style={styles.toast}>
        {notification.message}
      </div>
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