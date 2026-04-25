// In-memory storage (fine for prototype)
const lastNotifiedPositions = new Map();
const subscriptions = {};

let io = null;

// Inject socket instance from app.js
exports.setIO = (ioInstance) => {
    io = ioInstance;
};

// Store user subscriptions
exports.subscribe = (userId, eventTypes) => {
    subscriptions[userId] = eventTypes;
    console.log(`User ${userId} subscribed to`, eventTypes);
};

// Send notification to a user
exports.sendNotification = (userId, message, position = null) => {
  if (position !== null) {
    const lastPos = lastNotifiedPositions.get(userId);

    // only notify if crossing threshold into <=5
    if (lastPos !== undefined && lastPos <= 5) {
      return;
    }

    if (position > 5) {
      return;
    }

    lastNotifiedPositions.set(userId, position);
  }

  console.log("Sending notification to:", userId);

  io.to(userId).emit("notification", {
    message,
    timestamp: new Date()
  });
};