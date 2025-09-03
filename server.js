const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
require('dotenv').config();

//* Middleware
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//* MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
});

const exerciseSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: { type: Date, required: true },
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

//* Routes

app.get('/', (_req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

// Create new user
app.post('/api/users', async (req, res) => {
    const username = req.body.username;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    const user = new User({ username });
    await user.save();
    res.json({ username: user.username, _id: user._id });
});

// Get all users
app.get('/api/users', async (_req, res) => {
    const users = await User.find({}, 'username _id');
    res.json(users);
});

// Add exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
    const { description, duration, date } = req.body;
    const user = await User.findById(req.params._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const exerciseDate = date ? new Date(date) : new Date();
    const exercise = new Exercise({
        userId: user._id,
        description,
        duration: Number(duration),
        date: exerciseDate,
    });

    await exercise.save();

    res.json({
        username: user.username,
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString(),
        _id: user._id,
    });
});

// Get exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
    const user = await User.findById(req.params._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let from = req.query.from ? new Date(req.query.from) : new Date(0);
    let to = req.query.to ? new Date(req.query.to) : new Date();
    const limit = req.query.limit ? Number(req.query.limit) : 0;

    let query = Exercise.find({
        userId: user._id,
        date: { $gte: from, $lte: to },
    }).select('description duration date');

    if (limit > 0) query = query.limit(limit);

    const exercises = await query.exec();

    const log = exercises.map(e => ({
        description: e.description,
        duration: e.duration,
        date: e.date.toDateString(),
    }));

    res.json({
        _id: user._id,
        username: user.username,
        count: log.length,
        log,
    });
});

//* Server
const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port);
});
