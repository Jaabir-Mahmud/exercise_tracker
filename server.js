const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());

// Accept URL-encoded form data for FCC tests
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  tls: true,
  tlsAllowInvalidCertificates: true,
  tlsAllowInvalidHostnames: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => console.log("Connected to MongoDB"));

const userSchema = new mongoose.Schema({ username: String });
const exerciseSchema = new mongoose.Schema({
  userId: String,
  description: String,
  duration: Number,
  date: Date,
});

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

// POST /api/users - create new user
app.post("/api/users", async (req, res) => {
  const username = req.body.username;
  if (!username) return res.status(400).json({ error: "Username required" });

  const user = new User({ username });
  await user.save();
  res.json({ username: user.username, _id: user._id });
});

// GET /api/users - list all users
app.get("/api/users", async (req, res) => {
  const users = await User.find({});
  res.json(users.map(u => ({ username: u.username, _id: u._id })));
});

// POST /api/users/:_id/exercises - add exercise
app.post("/api/users/:_id/exercises", async (req, res) => {
  const user = await User.findById(req.params._id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const description = req.body.description;
  const duration = Number(req.body.duration);
  const date = req.body.date ? new Date(req.body.date) : new Date();

  const exercise = new Exercise({
    userId: user._id,
    description,
    duration,
    date,
  });
  await exercise.save();

  res.json({
    _id: user._id,
    username: user.username,
    date: exercise.date.toDateString(),
    duration: exercise.duration,
    description: exercise.description,
  });
});

// GET /api/users/:_id/logs - get exercise logs
app.get("/api/users/:_id/logs", async (req, res) => {
  const user = await User.findById(req.params._id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { from, to, limit } = req.query;
  let filter = { userId: user._id };

  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  let query = Exercise.find(filter).sort({ date: 1 });
  if (limit) query = query.limit(Number(limit));
  const exercises = await query;

  res.json({
    _id: user._id,
    username: user.username,
    count: exercises.length,
    log: exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString(),
    })),
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server running on port " + port));
