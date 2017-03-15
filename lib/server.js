'use strict'
var express = require('express')
var bodyParser = require('body-parser')
var http = require('http')
var db = require('./db')
var app = express()

app.use((req, res, next) => {
  // add json mime, since supertest doesn't add it
  req.headers['content-type'] = 'application/json'
  next()
})

app.use(bodyParser.json())
app.use((err, req, res, next) => {
  if (err) {
    res.status(400).send({
      success: false,
      error: 'failed to parse json body'
    })
  }
})

app.post('/buyers', (req, res) => {
  if (req.body && req.body.id) {
    db.setBuyer(req.body, function (err) {
      res.status(err ? 500 : 201)
        .json({ success: Boolean(err) })
    })
  } else {
    res.status(400)
      .json({
        success: false,
        message: 'missing id in body'
      })
  }
})

app.get('/buyers/:id', (req, res) => {
  db.getBuyer(req.params.id)
    .then((data) => {
      res.status(200)
        .send(JSON.parse(data))
    })
    .catch(err =>
      (err
        ? res.status(404)
        : res.status(200)
          .send('')))
})
app.get('/route', (req, res) => {
  try {
    var state = req.query.state
    var device = req.query.device
    var date = new Date(req.query.timestamp)
    var day = date.getDay()
    var hour = date.getHours()
    db.matchRoutes(day, hour, state, device)
      .then(result =>
        res.status(302)
          .redirect(result.location))
      .catch(err => res.status(500)
        .json({
          success: false,
          message: err.message
        })
      )
  } catch (err) {
    res.status(400).end()
  }
})
module.exports = () => http.createServer(app)
