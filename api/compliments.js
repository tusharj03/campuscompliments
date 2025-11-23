import { MongoClient, ObjectId } from 'mongodb';

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
    if (req.method === 'GET') {
        try {
            const { db } = await connectToDatabase();
            const compliments = await db.collection('compliments')
                .find({})
                .sort({ timestamp: -1 })
                .toArray();
            
            res.status(200).json({ compliments });
        } catch (error) {
            console.error('Error fetching compliments:', error);
            res.status(500).json({ error: 'Failed to fetch compliments' });
        }
    } else if (req.method === 'POST') {
        try {
            const { db } = await connectToDatabase();
            const compliment = {
                ...req.body,
                timestamp: new Date(),
                likes: 0
            };
            
            const result = await db.collection('compliments').insertOne(compliment);
            res.status(200).json({ 
                success: true, 
                _id: result.insertedId,
                compliment: { ...compliment, _id: result.insertedId }
            });
        } catch (error) {
            console.error('Error saving compliment:', error);
            res.status(500).json({ error: 'Failed to save compliment' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}