// server.js or app.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const http = require('http');
const socketIo = require('socket.io');

//routes
const userRoutes = require("./routes/userRoutes");
const splitRoutes = require("./routes/splitRoutes");
const bankAccountRoutes = require("./routes/bankaccRoutes");
const splitgroupRouters = require("./routes/splitgroupRouters");
const templatesRoutes = require("./routes/templatesRoutes");
const contactRoutes = require("./routes/contactRoutes");
const personalRoutes = require("./routes/personalRoutes");
// Load environment variables
dotenv.config();

// Ensure JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  console.warn("Warning: JWT_SECRET is not set in environment variables. Using default secret.");
  process.env.JWT_SECRET = 'your-super-secret-key-123';
}

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {

  // Join a group room
  socket.on('joinGroup', (groupId) => {
    socket.join(groupId);
  });

  // Leave a group room
  socket.on('leaveGroup', (groupId) => {
    socket.leave(groupId);
  });

  // Handle settle up mode changes
  socket.on('settleUpModeChanged', (data) => {
    socket.to(data.groupId).emit('settleUpModeChanged', data);
  });

  // Handle new transaction
  socket.on('newTransaction', (data) => {
    socket.to(data.groupId).emit('transactionUpdate', data);
  });

  // Handle transaction update
  socket.on('transactionUpdated', (data) => {
    socket.to(data.groupId).emit('transactionUpdate', data);
  });

  // Handle transaction deletion
  socket.on('transactionDeleted', (data) => {
    socket.to(data.groupId).emit('transactionDeleted', data);
  });

  // Handle settlement status change
  socket.on('settlementStatusChanged', (data) => {
    socket.to(data.groupId).emit('settlementUpdate', data);
  });

  // Handle balance updates
  socket.on('balanceUpdated', (data) => {
    socket.to(data.groupId).emit('balanceUpdate', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(cors({
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/splits", splitRoutes);
app.use("/api/v1/bankaccounts", bankAccountRoutes);
app.use("/api/v1/splitgroups", splitgroupRouters);
app.use("/api/v1/templates", templatesRoutes);
app.use("/api/v1/contact", contactRoutes);
app.use("/api/v1/personal", personalRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// 404 handler - must be last
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = app;
