const express = require('express')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { body, validationResult } = require('express-validator')
const connectToDatabase = require('../models/db')
const router = express.Router()
const dotenv = require('dotenv')
const pino = require('pino') // Import Pino logger

const logger = pino() // Create a Pino logger instance

dotenv.config()

// Create JWT secret
const JWT_SECRET = process.env.JWT_SECRET

// e-mail addresses are compared in lower case, so "Ann@Mail.com" and "ann@mail.com" are the same user
const normalizeEmail = (email) => String(email).trim().toLowerCase()

// Register a new user: POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'firstName, lastName, email and password are required' })
    }

    // Task 1: Connect to `secondChance` in MongoDB through `connectToDatabase` in `db.js`
    const db = await connectToDatabase()

    // Task 2: Access MongoDB `users` collection
    const collection = db.collection('users')

    // Task 3: Check for existing email
    const userEmail = normalizeEmail(email)
    const existingEmail = await collection.findOne({ email: userEmail })
    if (existingEmail) {
      logger.error('Email id already exists')
      return res.status(400).json({ error: 'Email id already exists' })
    }

    // Hash the password (it is never stored as plain text)
    const salt = await bcryptjs.genSalt(10)
    const hash = await bcryptjs.hash(password, salt)

    // Task 4: Save user details in database
    const newUser = await collection.insertOne({
      email: userEmail,
      firstName,
      lastName,
      password: hash,
      createdAt: new Date()
    })

    // Task 5: Create JWT authentication with user._id as payload
    const payload = {
      user: {
        id: newUser.insertedId.toString()
      }
    }
    const authtoken = jwt.sign(payload, JWT_SECRET)

    logger.info('User registered successfully')
    res.json({ authtoken, email: userEmail })
  } catch (e) {
    logger.error(e)
    return res.status(500).send('Internal server error')
  }
})

// Log in a registered user: POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' })
    }

    // Task 1: Connect to `secondChance` in MongoDB through `connectToDatabase` in `db.js`
    const db = await connectToDatabase()

    // Task 2: Access MongoDB `users` collection
    const collection = db.collection('users')

    // Task 3: Check for user credentials in database
    const theUser = await collection.findOne({ email: normalizeEmail(email) })

    if (theUser) {
      // Task 4: Check if the password matches the encrypted password and send appropriate message on mismatch
      const result = await bcryptjs.compare(password, theUser.password)
      if (!result) {
        logger.error('Passwords do not match')
        return res.status(401).json({ error: 'Wrong password' })
      }

      // Task 5: Fetch user details from the database
      const userName = theUser.firstName
      const userEmail = theUser.email

      // Task 6: Create JWT authentication if passwords match with user._id as payload
      const payload = {
        user: {
          id: theUser._id.toString()
        }
      }
      const authtoken = jwt.sign(payload, JWT_SECRET)

      logger.info('User logged in successfully')
      return res.status(200).json({ authtoken, userName, userEmail })
    }

    // Task 7: Send appropriate message if the user is not found
    logger.error('User not found')
    return res.status(404).json({ error: 'User not found' })
  } catch (e) {
    logger.error(e)
    return res.status(500).json({ error: 'Internal server error', details: e.message })
  }
})

// Update the user information: PUT /api/auth/update
// The e-mail of the user is sent in the "Email" header, the new name in the body,
// and the token received at login in the "Authorization: Bearer <token>" header.
router.put('/update', [body('name', 'Name is required').notEmpty()], async (req, res) => {
  // Task 2: Validate the input using `validationResult` and return an appropriate message if you detect an error
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    logger.error('Validation errors in update request', errors.array())
    return res.status(400).json({ errors: errors.array() })
  }

  try {
    // Task 3: Check if `email` is present in the header and throw an appropriate error message if not present
    const email = req.headers.email
    if (!email) {
      logger.error('Email not found in the request headers')
      return res.status(400).json({ error: 'Email not found in the request headers' })
    }

    // The token must be valid
    const authorization = req.headers.authorization || ''
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
    let tokenUserId
    try {
      tokenUserId = jwt.verify(token, JWT_SECRET).user.id
    } catch (e) {
      logger.error('Invalid or missing token')
      return res.status(401).json({ error: 'Invalid or missing token' })
    }

    // Task 4: Connect to MongoDB
    const db = await connectToDatabase()
    const collection = db.collection('users')

    // Task 5: Find the user credentials in database
    const userEmail = normalizeEmail(email)
    const existingUser = await collection.findOne({ email: userEmail })
    if (!existingUser) {
      logger.error('User not found')
      return res.status(404).json({ error: 'User not found' })
    }

    // The token must belong to this user
    if (existingUser._id.toString() !== String(tokenUserId)) {
      logger.error('Token does not belong to this user')
      return res.status(403).json({ error: 'You can only update your own profile' })
    }

    // Task 6: Update the user credentials in the database
    const updatedUser = await collection.findOneAndUpdate(
      { email: userEmail },
      { $set: { firstName: req.body.name, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    // Task 7: Create JWT authentication with `user._id` as a payload using the secret key from the .env file
    const payload = {
      user: {
        id: updatedUser._id.toString()
      }
    }
    const authtoken = jwt.sign(payload, JWT_SECRET)
    logger.info('User updated successfully')
    res.json({ authtoken })
  } catch (error) {
    logger.error(error)
    return res.status(500).send('Internal server error')
  }
})

module.exports = router
