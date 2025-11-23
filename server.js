import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 8000;

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files

// MongoDB connection - REPLACE YOUR_PASSWORD with your actual password
const MONGODB_URI = 'mongodb+srv://tusharj2004:uHprHlem182DMmtp@campuscush.2thchap.mongodb.net/?retryWrites=true&w=majority&appName=campuscush';
const DB_NAME = 'campusCrush';

let db = null;

async function connectToDatabase() {
    if (db) return db;
    
    try {
        const client = await MongoClient.connect(MONGODB_URI);
        db = client.db(DB_NAME);
        console.log('✅ Connected to MongoDB');
        return db;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        throw error;
    }
}

// API Routes
app.get('/api/compliments', async (req, res) => {
    try {
        const database = await connectToDatabase();
        const compliments = await database.collection('compliments')
            .find({})
            .sort({ timestamp: -1 })
            .toArray();
        
        res.json({ compliments });
    } catch (error) {
        console.error('Error fetching compliments:', error);
        res.status(500).json({ error: 'Failed to fetch compliments' });
    }
});

app.post('/api/compliments', async (req, res) => {
    try {
        const database = await connectToDatabase();
        const compliment = {
            ...req.body,
            timestamp: new Date(),
            likes: 0
        };
        
        const result = await database.collection('compliments').insertOne(compliment);
        
        res.json({ 
            success: true, 
            _id: result.insertedId,
            compliment: { ...compliment, _id: result.insertedId }
        });
    } catch (error) {
        console.error('Error saving compliment:', error);
        res.status(500).json({ error: 'Failed to save compliment' });
    }
});

app.post('/api/compliments/:id/like', async (req, res) => {
    try {
        const { id } = req.params;
        const database = await connectToDatabase();
        
        const result = await database.collection('compliments').updateOne(
            { _id: new ObjectId(id) },
            { $inc: { likes: 1 } }
        );
        
        if (result.modifiedCount === 1) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Compliment not found' });
        }
    } catch (error) {
        console.error('Error liking compliment:', error);
        res.status(500).json({ error: 'Failed to like compliment' });
    }
});

app.post('/api/feedback', async (req, res) => {
    try {
        const database = await connectToDatabase();
        const feedback = {
            ...req.body,
            timestamp: new Date()
        };
        
        await database.collection('feedback').insertOne(feedback);
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving feedback:', error);
        res.status(500).json({ error: 'Failed to save feedback' });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('💝 Campus Crush is ready!');
    console.log('📝 Make sure to replace YOUR_PASSWORD in server.js with your MongoDB password');
});
