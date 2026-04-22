const express = require("express");
const cors = require("cors");
require("dotenv").config();
const waitTimeController = require("./controllers/waitTimeController");
const rideRoutes = require("./routes/rideRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/wait-time", waitTimeController);
app.use("/rides", rideRoutes);
app.use("/admin", adminRoutes);

module.exports = app;  // NO app.listen here