let io = null;

// inject socket instance
exports.setIO = (ioInstance) => {
  io = ioInstance;
};

exports.sendNotification = (userId, message) => {
  const room = String(userId); // ensure same type

  io.to(room).emit("notification", {
    message,
    timestamp: new Date()
  });
};