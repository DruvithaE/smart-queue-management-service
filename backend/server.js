const app = require("./app");
const { initTable } = require("./config/db");

const PORT = process.env.PORT || 5000;

initTable().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });

  server.on("error", (err) => {
    console.error("Server failed to start:", err.message);
    process.exit(1);
  });
}).catch((err) => {
  console.error("Database initialization failed:", err.message);
  process.exit(1);
});