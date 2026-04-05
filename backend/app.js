const express = require("express");
const cors = require("cors");
const waitTimeController = require("./controllers/waitTimeController");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/wait-time", waitTimeController);

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});