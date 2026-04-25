const notificationService = require("../services/notification_service/notificationService");

exports.subscribe = (req, res) => {
    const { userId, eventTypes } = req.body;

    if (!userId || !eventTypes) {
        return res.status(400).json({ error: "Missing fields" });
    }

    notificationService.subscribe(userId, eventTypes);

    res.json({ message: "Subscribed successfully" });
};

exports.notify = (req, res) => {
    const { userId, message } = req.body;

    if (!userId || !message) {
        return res.status(400).json({ error: "Missing fields" });
    }

    notificationService.sendNotification(userId, message);

    res.json({ message: "Notification sent" });
};