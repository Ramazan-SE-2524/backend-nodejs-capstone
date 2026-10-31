// db.js
require('dotenv').config()
const MongoClient = require('mongodb').MongoClient

// MongoDB connection URL with authentication options
const url = `${process.env.MONGO_URL}`

let dbInstance = null
const dbName = `${process.env.MONGO_DB}`

async function connectToDatabase () {
  if (dbInstance) {
    return dbInstance
  }

  const client = new MongoClient(url)

  // Task 1: Connect to MongoDB
  await client.connect()

  // Task 2: Connect to the database (MONGO_DB, "secondChance") and store it in dbInstance
  dbInstance = client.db(dbName)

  // Task 3: Return the database instance
  return dbInstance
}

module.exports = connectToDatabase
