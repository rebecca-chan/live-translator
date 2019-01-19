const path = require('path')
const morgan = require('morgan')
const compression = require('compression')
const PORT = process.env.PORT || 8080
const express = require('express')
const app = express()

module.exports = app

if (process.env.NODE_ENV !== 'production') require('../secrets')

const createApp = () => {
  app.use(morgan('dev'))

  //body parsing
  app.use(express.json())
  app.use(express.urlencoded({extended: true}))

  app.use(express.static(path.join(__dirname, '..', 'public')))

  app.use('/bundle.js', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public/bundle.js'))
  })

  app.use((req, res, next) => {
    if (path.extname(req.path).length) {
      const err = new Error('Not found')
      err.status = 404
      next(err)
    } else {
      next()
    }
  })

  //send everthing ot index.html
  app.use('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public/index.html'))
  })

  // compression middleware
  app.use(compression())
}

const startListening = () => {
  // start listening (and create a 'server' object representing our server)
  const server = app.listen(PORT, () =>
    console.log(`Mixing it up on port ${PORT}`)
  )
}

async function bootApp() {
  await createApp()
  await startListening()
}
// This evaluates as true when this file is run directly from the command line,
// i.e. when we say 'node server/index.js' (or 'nodemon server/index.js', or 'nodemon server', etc)
// It will evaluate false when this module is required by another module - for example,
// if we wanted to require our app in a test spec
if (require.main === module) {
  bootApp()
} else {
  createApp()
}
