const express = require('express')
const router = express.Router()
const connectToDatabase = require('../models/db')

// Escape the characters that have a special meaning in a regular expression,
// so the text typed by the user is searched literally
function escapeRegex (text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Search for secondChanceItems: GET /api/secondchance/search
router.get('/', async (req, res, next) => {
  try {
    // Task 1: Connect to MongoDB using connectToDatabase. Remember to use the await keyword and store the connection in `db`
    const db = await connectToDatabase()

    const collection = db.collection('secondChanceItems')

    // Initialize the query object
    const query = {}

    // Task 2: Add the name filter to the query if the name parameter is not empty
    if (req.query.name && req.query.name.trim() !== '') {
      query.name = { $regex: escapeRegex(req.query.name.trim()), $options: 'i' } // partial match, case-insensitive
    }

    // Task 3: Add other filters to the query
    if (req.query.category) {
      query.category = req.query.category
    }
    if (req.query.condition) {
      query.condition = req.query.condition
    }
    if (req.query.age_years) {
      query.age_years = { $lte: parseInt(req.query.age_years) }
    }

    // Task 4: Fetch the filtered items using the find(query) method
    const secondChanceItems = await collection.find(query).toArray()

    res.json(secondChanceItems)
  } catch (e) {
    next(e)
  }
})

module.exports = router
