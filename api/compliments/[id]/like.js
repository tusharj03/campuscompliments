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
    if (req.method === 'POST') {
        try {
            const { id } = req.query;
            const { db } = await connectToDatabase();
            
            const result = await db.collection('compliments').updateOne(
                { _id: new ObjectId(id) },
                { $inc: { likes: 1 } }
            );
            
            if (result.modifiedCount === 1) {
                res.status(200).json({ success: true });
            } else {
                res.status(404).json({ error: 'Compliment not found' });
            }
        } catch (error) {
            console.error('Error liking compliment:', error);
            res.status(500).json({ error: 'Failed to like compliment' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}