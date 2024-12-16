const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');
const winston = require('winston'); // For logging

const app = express();
const PORT = 8080;
const MONGO_URL = 'mongodb+srv://shazilhasan:shazil123@cluster0.xwu0h.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'userDB';

// Middleware
app.use(bodyParser.json());

// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'app.log' })
    ]
});

// MongoDB client
let db;
MongoClient.connect(MONGO_URL)
    .then(client => {
        db = client.db(DB_NAME);
        logger.info('Connected to MongoDB');
    })
    .catch(error => {
        logger.error('Error connecting to MongoDB', error);
        process.exit(1);
    });

// Routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Create a new user
app.post('/users', async (req, res) => {
    try {
        const user = req.body;
        if (!user.name || !user.email) {
            logger.warn('Invalid user data received', { user });
            return res.status(400).json({ message: 'Name and email are required' });
        }
        const result = await db.collection('users').insertOne(user);
        logger.info('User created', { userId: result.insertedId });
        res.status(201).json({ message: 'User created', userId: result.insertedId });
    } catch (error) {
        logger.error('Error creating user', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update a user
app.put('/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const updates = req.body;
        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            { $set: updates }
        );
        if (result.matchedCount === 0) {
            logger.warn('User not found', { userId });
            return res.status(404).json({ message: 'User not found' });
        }
        logger.info('User updated', { userId });
        res.json({ message: 'User updated' });
    } catch (error) {
        logger.error('Error updating user', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get list of users
app.get('/users', async (req, res) => {
    try {
        const users = await db.collection('users').find().toArray();
        logger.info('Fetched users', { count: users.length });
        res.json(users);
    } catch (error) {
        logger.error('Error fetching users', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Start server
app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
});

module.exports = app; // For unit testing
