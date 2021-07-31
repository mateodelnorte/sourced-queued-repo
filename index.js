const { EventEmitter } = require('events')
const queue = require('fastq')
const util = require('util')

function Lock () {
  this.locked = false
  EventEmitter.call(this)
}

util.inherits(Lock, EventEmitter)

Lock.prototype.unlock = function unlock () {
  if (this.locked === false) return
  this.locked = false
  this.emit('unlocked')
}

Lock.prototype.lock = function lock () {
  if (this.locked === true) return
  this.locked = true
  this.emit('locked')
}

module.exports = function (repo) {
  const copy = Object.create(repo)

  copy._locks = {}
  copy._queues = {}

  copy._ensureQueue = function (id) {
    if (!this._queues[id]) {
      const lock = this._locks[id] = new Lock()
      this._queues[id] = queue((task, next) => {
        lock.once('unlocked', () => {
          next()
        })
        lock.lock()
        task()
      }, 1)
    }
  }

  copy._commit = copy.commit
  copy._get = copy.get

  copy.get = function (id, cb) {
    this._ensureQueue(id)

    const fn = process.domain
      ? process.domain.bind(this._get.bind(this, id, cb))
      : this._get.bind(this, id, cb)

    this._queues[id].push(fn, () => { })
  }

  copy.lock = function (entity) {
    this._ensureQueue(entity.id)
    this._locks[entity.id].lock()
  }

  copy.commit = function (entity, cb) {
    const self = this
    this._ensureQueue(entity.id)
    this._commit(entity, (err) => {
      if (err) return cb(err)
      self._locks[entity.id].unlock()
      cb()
    })
  }

  copy.unlock = function (entity) {
    this._ensureQueue(entity.id)
    this._locks[entity.id].unlock()
  }

  return copy
}
