const request = require('supertest');
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const app = require('../app'); // Assuming app is in the '../app' file
const bodyParser = require('body-parser');

// Middleware
app.use(bodyParser.json());

// Mocked MongoDB Client
jest.mock('mongodb', () => {
    const mInsertOne = jest.fn();
    const mUpdateOne = jest.fn();
    const mFind = jest.fn();
    const mCollection = {
        insertOne: mInsertOne,
        updateOne: mUpdateOne,
        find: mFind
    };
    const mDb = {
        collection: jest.fn(() => mCollection)
    };
    const mClient = {
        db: jest.fn(() => mDb)
    };
    return { MongoClient: { connect: jest.fn(() => Promise.resolve(mClient)) }, ObjectId: jest.fn() };
});

// Test for POST /users
describe('POST /users', () => {
    let db;
    beforeAll(async () => {
        const client = await MongoClient.connect('mongodb://localhost:27017');
        db = client.db();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should create a new user successfully', async () => {
        const user = { name: 'John Doe', email: 'johndoe@example.com' };
        const mockInsertedId = 'mockedUserId';

        // Mock the insertOne response for a successful user creation
        db.collection('users').insertOne.mockResolvedValue({ insertedId: mockInsertedId });

        const response = await request(app)
            .post('/users')
            .send(user);

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('User created');
        expect(response.body.userId).toBe(mockInsertedId);
    });

    it('should return 400 if name or email is missing', async () => {
        const user = { name: 'John Doe' }; // Missing email

        const response = await request(app)
            .post('/users')
            .send(user)
            .expect(400);

        expect(response.body.message).toBe('Name and email are required');
    });

    it('should return 500 if there is a server error', async () => {
        const user = { name: 'John Doe', email: 'johndoe@example.com' };

        // Mock the insertOne function to throw an error (server error)
        db.collection('users').insertOne.mockRejectedValue(new Error('Database error'));

        const response = await request(app)
            .post('/users')
            .send(user)
            .expect(500);

        expect(response.body.message).toBe('Internal server error');
    });
});

// Test for PUT /users/:id
describe('PUT /users/:id', () => {
    let db;
    beforeAll(async () => {
        const client = await MongoClient.connect('mongodb://localhost:27017');
        db = client.db();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should update a user successfully', async () => {
        const userId = 'mockedUserId';
        const updates = { name: 'John Doe Updated', email: 'johnupdated@example.com' };
        const mockUpdateResult = { matchedCount: 1, modifiedCount: 1 };
        
        // Mock the updateOne response for a successful update
        db.collection('users').updateOne.mockResolvedValue(mockUpdateResult);

        const response = await request(app)
            .put(`/users/${userId}`)
            .send(updates);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('User updated');
        expect(db.collection('users').updateOne).toHaveBeenCalledWith(
            { _id: new ObjectId(userId) },
            { $set: updates }
        );
    });

    it('should return 404 if the user is not found', async () => {
        const userId = 'mockedUserId';
        const updates = { name: 'John Doe Updated' };
        const mockUpdateResult = { matchedCount: 0, modifiedCount: 0 };

        // Mock the updateOne response for when the user is not found
        db.collection('users').updateOne.mockResolvedValue(mockUpdateResult);

        const response = await request(app)
            .put(`/users/${userId}`)
            .send(updates);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('User not found');
    });

    it('should return 500 if there is a server error', async () => {
        const userId = 'mockedUserId';
        const updates = { name: 'John Doe Updated' };

        // Mock the updateOne function to throw an error (server error)
        db.collection('users').updateOne.mockRejectedValue(new Error('Database error'));

        const response = await request(app)
            .put(`/users/${userId}`)
            .send(updates);

        expect(response.status).toBe(500);
        expect(response.body.message).toBe('Internal server error');
    });
});

// Test for GET /users
// describe('GET /users', () => {
//     let db;
//     beforeAll(async () => {
//         const client = await MongoClient.connect('mongodb://localhost:27017');
//         db = client.db();
//     });

//     afterEach(() => {
//         jest.clearAllMocks();
//     });

//     it('should fetch users successfully', async () => {
//         const mockUsers = [
//             { _id: 'user1', name: 'John Doe', email: 'johndoe@example.com' },
//             { _id: 'user2', name: 'Jane Doe', email: 'janedoe@example.com' }
//         ];

//         // Mock the find() response to return a list of users
//         db.collection('users').find.mockResolvedValue({
//             toArray: jest.fn().mockResolvedValue(mockUsers)
//         });

//         const response = await request(app)
//             .get('/users');

//         expect(response.status).toBe(200);
//         expect(response.body).toEqual(mockUsers);
//         expect(db.collection('users').find).toHaveBeenCalled();
//     });

//     it('should return 500 if there is a server error', async () => {
//         // Mock the find function to throw an error (server error)
//         db.collection('users').find.mockRejectedValue(new Error('Database error'));

//         const response = await request(app)
//             .get('/users')
//             .expect(500);

//         expect(response.body.message).toBe('Internal server error');
//     });
describe('GET /users', () => {
    let db;
    beforeAll(async () => {
        const client = await MongoClient.connect('mongodb://localhost:27017');
        db = client.db();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should fetch users successfully', async () => {
        const mockUsers = [
            { _id: 'user1', name: 'John Doe', email: 'johndoe@example.com' },
            { _id: 'user2', name: 'Jane Doe', email: 'janedoe@example.com' }
        ];

        // Mock the find() and toArray() response to return a list of users
        db.collection('users').find.mockReturnValue({
            toArray: jest.fn().mockResolvedValue(mockUsers)
        });

        const response = await request(app)
            .get('/users');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockUsers);
        expect(db.collection('users').find).toHaveBeenCalled();
    });

    it('should return 500 if there is a server error', async () => {
        // Mock find to throw an error (simulate database failure)
        db.collection('users').find.mockReturnValue({
            toArray: jest.fn().mockRejectedValue(new Error('Database error'))
        });

        const response = await request(app)
            .get('/users')
            .expect(500);

        expect(response.body.message).toBe('Internal server error');
    });
});

