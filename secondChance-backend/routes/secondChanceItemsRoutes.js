const express = require('express')
const multer = require('multer')
const router = express.Router()
const connectToDatabase = require('../models/db')
const logger = require('../logger')

// Define the upload directory path
const directoryPath = 'public/images'

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, directoryPath) // Specify the upload directory
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname) // Use the original file name
  }
})

const upload = multer({ storage })

// Get all secondChanceItems: GET /api/secondchance/items
router.get('/', async (req, res, next) => {
  logger.info('/ called')
  try {
    // Step 2: task 1 - connect to the database
    const db = await connectToDatabase()

    // Step 2: task 2 - get the secondChanceItems collection
    const collection = db.collection('secondChanceItems')

    // Step 2: task 3 - fetch all the secondChanceItems
    const secondChanceItems = await collection.find({}).toArray()

    // Step 2: task 4 - return the items as JSON
    res.json(secondChanceItems)
  } catch (e) {
    logger.error('oops something went wrong', e)
    next(e)
  }
})

// Add a new item: POST /api/secondchance/items (the picture is uploaded in the "file" field)
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    // Step 3: task 1 - connect to the database
    const db = await connectToDatabase()

    // Step 3: task 2 - get the secondChanceItems collection
    const collection = db.collection('secondChanceItems')

    // Step 3: task 3 - create the new item from the request body
    // (form fields arrive as text, so the numbers and the comments are converted)
    const secondChanceItem = { ...req.body }
    if (secondChanceItem.age_days !== undefined) {
      secondChanceItem.age_days = Number(secondChanceItem.age_days)
    }
    if (secondChanceItem.age_years !== undefined) {
      secondChanceItem.age_years = Number(secondChanceItem.age_years)
    }
    if (!Array.isArray(secondChanceItem.comments)) {
      secondChanceItem.comments = []
    }

    // Step 3: task 4 - the new id is the highest existing id + 1 (ids are stored as text)
    const existing = await collection.find({}, { projection: { id: 1 } }).toArray()
    const highestId = existing
      .map((item) => parseInt(item.id, 10))
      .filter((id) => Number.isFinite(id))
      .reduce((highest, id) => Math.max(highest, id), 0)
    secondChanceItem.id = (highestId + 1).toString()

    // Step 3: task 5 - add the date and save the item
    secondChanceItem.date_added = Math.floor(new Date().getTime() / 1000)
    await collection.insertOne(secondChanceItem)

    res.status(201).json(secondChanceItem)
  } catch (e) {
    next(e)
  }
})

// Get a single secondChanceItem by ID: GET /api/secondchance/items/:id
router.get('/:id', async (req, res, next) => {
  try {
    // Step 4: task 1 - connect to the database
    const db = await connectToDatabase()

    // Step 4: task 2 - get the secondChanceItems collection
    const collection = db.collection('secondChanceItems')

    // Step 4: task 3 - find the item by its id
    const id = req.params.id
    const secondChanceItem = await collection.findOne({ id })

    // Step 4: task 4 - return the item, or 404 if it does not exist
    if (!secondChanceItem) {
      return res.status(404).send('secondChanceItem not found')
    }

    res.json(secondChanceItem)
  } catch (e) {
    next(e)
  }
})

// Update an existing item: PUT /api/secondchance/items/:id
router.put('/:id', async (req, res, next) => {
  try {
    // Step 5: task 1 - connect to the database
    const db = await connectToDatabase()
    const id = req.params.id

    // Step 5: task 2 - get the secondChanceItems collection
    const collection = db.collection('secondChanceItems')

    // Step 5: task 3 - check that the item exists
    const secondChanceItem = await collection.findOne({ id })
    if (!secondChanceItem) {
      logger.error('secondChanceItem not found')
      return res.status(404).json({ error: 'secondChanceItem not found' })
    }

    // Step 5: task 4 - update the editable fields (age_years is calculated from age_days)
    const ageDays = Number(req.body.age_days)
    const changes = {
      category: req.body.category,
      condition: req.body.condition,
      age_days: ageDays,
      age_years: Number((ageDays / 365).toFixed(1)),
      description: req.body.description,
      updatedAt: new Date()
    }
    await collection.findOneAndUpdate({ id }, { $set: changes }, { returnDocument: 'after' })

    // Step 5: task 5 - confirm the upload
    res.json({ uploaded: 'success' })
  } catch (e) {
    next(e)
  }
})

// Delete an existing item: DELETE /api/secondchance/items/:id
router.delete('/:id', async (req, res, next) => {
  try {
    // Step 6: task 1 - connect to the database
    const db = await connectToDatabase()
    const id = req.params.id

    // Step 6: task 2 - get the secondChanceItems collection
    const collection = db.collection('secondChanceItems')

    // Step 6: task 3 - check that the item exists
    const secondChanceItem = await collection.findOne({ id })
    if (!secondChanceItem) {
      logger.error('secondChanceItem not found')
      return res.status(404).json({ error: 'secondChanceItem not found' })
    }

    // Step 6: task 4 - delete the item and confirm
    await collection.deleteOne({ id })
    res.json({ deleted: 'success' })
  } catch (e) {
    next(e)
  }
})

module.exports = router
