const domain = require('domain')
const { Entity } = require('sourced')
const should = require('should') // eslint-disable-line no-unused-vars
const MongoRepository = require('sourced-repo-mongo').Repository
const sourcedRepoMongo = require('sourced-repo-mongo/mongo')
const util = require('util')

const Queued = require('..')

describe('sourced-queue-repo', () => {
  before((done) => {
    sourcedRepoMongo.on('connected', (db) => {
      db.collection('Test.events').remove({}, () => {
        done()
      })
    })
    sourcedRepoMongo.connect('mongodb://localhost:27017/sourced-queue-repo')
  })

  after((done) => {
    sourcedRepoMongo.close(done)
  })

  it('should not allow committing an entity when entity is locked', function (done) {
    /* test entity */

    this.timeout(5000)

    let completed = false; let test2

    setTimeout(() => {
      completed.should.eql(false)
      repo.commit(test2, (err) => {
        if (err) return done(err)
        setTimeout(() => {
          completed.should.eql(true)
          done()
        }, 1000)
      })
    }, 1000)

    function Test () {
      this.id = 'test'
      this.gone = false
      Entity.apply(this, arguments)
    }

    Entity.digestMethod(Test, function go () {
      this.gone = true
    })

    util.inherits(Test, Entity)

    /* test repo */

    function TestRepository () {
      MongoRepository.call(this, Test)
    }

    util.inherits(TestRepository, MongoRepository)
    /* sut */

    const repo = Queued(new TestRepository())

    const test = new Test()

    test.go({})

    repo.commit(test, () => {
      repo.get(test.id, (err, test) => {
        if (err) return done(err)

        test2 = test

        test2.go({})

        repo.get(test.id, (err, test3) => {
          if (err) return done(err)

          completed = true
        })
      })
    })
  })

  it('shoudl have access to same domain after async operation', function (done) {
    /* test entity */

    const rando = Math.random()

    const d = domain.create()

    d.rando = rando

    this.timeout(5000)

    let completed = false; let test2

    setTimeout(() => {
      completed.should.eql(false)
      repo.commit(test2, (err) => {
        if (err) return done(err)
        setTimeout(() => {
          completed.should.eql(true)
          process.domain.should.have.property('rando', rando)
          done()
        }, 1000)
      })
    }, 1000)

    function Test () {
      this.id = 'test'
      this.gone = false
      Entity.apply(this, arguments)
    }

    Entity.digestMethod(Test, function go () {
      this.gone = true
    })

    util.inherits(Test, Entity)

    /* test repo */

    function TestRepository () {
      MongoRepository.call(this, Test)
    }

    util.inherits(TestRepository, MongoRepository)
    /* sut */

    const repo = Queued(new TestRepository())

    const test = new Test()

    test.go({})

    d.enter()

    repo.commit(test, () => {
      repo.get(test.id, (err, test) => {
        if (err) return done(err)

        test2 = test

        test2.go({})

        repo.get(test.id, (err, test3) => {
          if (err) return done(err)

          completed = true
        })
      })
    })
  })
})
