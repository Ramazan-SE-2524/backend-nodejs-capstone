/* jshint esversion: 8 */
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const pinoLogger = require('./logger')
const path = require('path')

const connectToDatabase = require('./models/db')

// Loads the secondChanceItems into MongoDB the first time the server starts (does nothing if they exist)
require('./util/import-mongo/index')

const app = express()
app.use('*', cors())
const port = 3060

// Connect to MongoDB; we just do this one time
connectToDatabase().then(() => {
  pinoLogger.info('Connected to DB')
})
  .catch((e) => console.error('Failed to connect to DB', e))

app.use(express.json())

// Route files

// authRoutes Step 2: import the authRoutes and store in a constant called authRoutes
const authRoutes = require('./routes/authRoutes')

// Items API Task 1: import the secondChanceItemsRoutes and store in a constant called secondChanceItemsRoutes
const secondChanceItemsRoutes = require('./routes/secondChanceItemsRoutes')

// Search API Task 1: import the searchRoutes and store in a constant called searchRoutes
const searchRoutes = require('./routes/searchRoutes')

const pinoHttp = require('pino-http')
const logger = require('./logger')

app.use(pinoHttp({ logger }))

// Serve the item pictures (/images/...)
app.use(express.static(path.join(__dirname, 'public')))

// Use Routes
// authRoutes Step 2: add the authRoutes to the server by using the app.use() method.
app.use('/api/auth', authRoutes)

// Items API Task 2: add the secondChanceItemsRoutes to the server by using the app.use() method.
app.use('/api/secondchance/items', secondChanceItemsRoutes)

// Search API Task 2: add the searchRoutes to the server by using the app.use() method.
app.use('/api/secondchance/search', searchRoutes)

// Global Error Handler
// (the 4 parameters are required by Express to recognise an error handler)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).send('Internal Server Error')
})

app.get('/', (req, res) => {
  res.send('Inside the server')
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
