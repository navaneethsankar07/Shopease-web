const { MongoClient } = require('mongodb');
require('dotenv').config();

const state = {
    db: null
};

const connect = async function(done) {
    const url = process.env.MONGODB_URI || 'mongodb+srv://navan_123:podi123@cluster0.qc8lr64.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    const dbname = process.env.DB_NAME || 'shopping';

    console.log(`Connecting to MongoDB at ${url}, database: ${dbname}`);

    const client = new MongoClient(url);

    try {
        await client.connect();
        state.db = client.db(dbname);
        console.log('MongoDB connected successfully');
        done();
    } catch (err) {
        console.error('MongoDB connection error:', err);
        if (client) client.close();
        done(err);
    }
};

const getDB = function() {
    return state.db;
};

module.exports = { connect, getDB };
