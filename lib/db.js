'use strict'
var dotenv = require('dotenv')
dotenv.config({ path: '../.env' })
var _ = require('lodash')
var redis = process.env.NODE_ENV === 'test' ? require('fakeredis') : require('redis')
var bb = require('bluebird')

bb.promisifyAll(redis.RedisClient.prototype)
bb.promisifyAll(redis.Multi.prototype)

var R = redis.createClient({
  host: process.env.REDIS_URL,
  port: process.env.REDIS_PORT
})

let _matchRoutes = (day, hour, state, device) => {
  return new Promise((resolve, reject) => {
    var deviceMatcher = `device:${device}`
    var hourMatcher = `hour:${hour}`
    var dayMatcher = `day:${day}`
    var stateMatcher = `state:${state}`
    var intersect = [deviceMatcher, hourMatcher, dayMatcher, stateMatcher]
    return R.sinterAsync(intersect)
      .then(data => {
        return R.mgetAsync(data)
      })
      .then(data => {
        if (!data || !data.length || data.length === 0) {
          reject(new Error('no data!'))
        } else {
          var parsed = _.map(data, JSON.parse)
          var sorted = parsed.sort((left, right) => { return Math.sign(right.value - left.value) })
          resolve(sorted[0])
        }
      })
      .catch(err => {
        reject(err.message)
      })
  })
}

let _setBuyer = (buyer, cb) => {
  var multi = R.multi()
  var key = `buyer:${buyer.id}`
  multi.set(key, JSON.stringify(buyer))
  _.map(buyer.offers, (offer, index) => {
    var key = `buyer:${buyer.id}${index}`
    multi.set(key, JSON.stringify(offer))

    _.map(Object.keys(offer.criteria), criteriaKey => {
      _.map(offer.criteria[criteriaKey], crit => {
        multi.sadd(`${criteriaKey}:${crit}`, key)
      })
    })
  })
  multi.exec(cb)
}

let _getBuyer = id => R.getAsync(`buyer:${id}`)

module.exports = {
  setBuyer: _setBuyer,
  getBuyer: _getBuyer,
  matchRoutes: _matchRoutes
}
