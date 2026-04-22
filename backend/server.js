const app = require("./app");
const { initTable } = require("./config/db");

const PORT = process.env.PORT || 3000;

initTable().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});