let io = null;

// inject socket instance
exports.setIO = (ioInstance) => {
  io = ioInstance;
};

// simple send function
exports.sendNotification = (userId, message) => {
  console.log("Sending notification to:", userId);

  io.to(userId).emit("notification", {
    message,
    timestamp: new Date()
  });
};