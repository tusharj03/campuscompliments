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

export async function GET(request) {
    try {
        const { db } = await connectToDatabase();
        const compliments = await db.collection('compliments')
            .find({})
            .sort({ timestamp: -1 })
            .toArray();
        
        return new Response(JSON.stringify({ compliments }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error fetching compliments:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch compliments' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function POST(request) {
    try {
        const { db } = await connectToDatabase();
        const body = await request.json();
        
        const compliment = {
            ...body,
            timestamp: new Date(),
            likes: 0
        };
        
        const result = await db.collection('compliments').insertOne(compliment);
        
        return new Response(JSON.stringify({ 
            success: true, 
            _id: result.insertedId,
            compliment: { ...compliment, _id: result.insertedId }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error saving compliment:', error);
        return new Response(JSON.stringify({ error: 'Failed to save compliment' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}