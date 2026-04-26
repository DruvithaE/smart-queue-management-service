const http = require("http");
const app = require("./app");
const { initTable } = require("./config/db");

const initSocket = require("./services/notification_service/socketHandler");
const notificationService = require("./services/notification_service/notificationService");


const PORT = process.env.PORT || 5000;

initTable()
  .then(() => {

    const server = http.createServer(app);

    // initialize socket
    const io = initSocket(server);

    // inject io into notification service
    notificationService.setIO(io);

    // start server
    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });

    // error handling
    server.on("error", (err) => {
      console.error("Server failed to start:", err.message);
      process.exit(1);
    });

  })
  .catch((err) => {
    console.error("Database initialization failed:", err.message);
    process.exit(1);
  });