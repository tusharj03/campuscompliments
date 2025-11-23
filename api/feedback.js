import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'campusCrush';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db(DB_NAME);
    
    cachedClient = client;
    cachedDb = db;
    
    return { client, db };
}

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const { db } = await connectToDatabase();
            const feedback = {
                ...req.body,
                timestamp: new Date()
            };
            
            await db.collection('feedback').insertOne(feedback);
            res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error saving feedback:', error);
            res.status(500).json({ error: 'Failed to save feedback' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}