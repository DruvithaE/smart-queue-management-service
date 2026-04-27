let io = null;

// inject socket instance
exports.setIO = (ioInstance) => {
  io = ioInstance;
};

exports.sendNotification = (userId, message) => {
  const room = String(userId); // ensure same type

  console.log("Sending notification to:", room);
  console.log(io ? "IO instance is available" : "IO instance is NOT available");

  io.to(room).emit("notification", {
    message,
    timestamp: new Date()
  });
};