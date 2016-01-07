var Entity = require('sourced').Entity;
var events = require('events');
var MongoRepository = require('sourced-repo-mongo').Repository;
var Queued = require('../');
var should = require('should');
var sourcedRepoMongo = require('sourced-repo-mongo/mongo');
var util = require('util');
var _ = require('lodash');

describe('sourced-queue-repo', function () {

  before(function (done) {
    sourcedRepoMongo.on('connected', function (db) {
      db.collection('Test.events').remove({}, function () {
        done();
      });
    });
    sourcedRepoMongo.connect('mongodb://localhost:27017/sourced-queue-repo');
  });

  it('should not allow committing an entity when entity is locked', function (done) {

    /* test entity */

    this.timeout(5000);

    var completed = false, test2;

    setTimeout(function ensureNotCompleted () {
      completed.should.eql(false);
      repo.commit(test2, function (err) {
        if (err) return done(err);
        setTimeout(function () {
          completed.should.eql(true);
          done();
        }, 1000);
      });
    }, 1000);

    function Test () {
      this.id = 'test';
      this.gone = false;
      Entity.apply(this, arguments);
    }

    Entity.digestMethod(Test, function go () {
      this.gone = true;
    });

    util.inherits(Test, Entity);

    /* test repo */

    function TestRepository () {
      MongoRepository.call(this, Test);
    }

    util.inherits(TestRepository, MongoRepository);
    /* sut */

    var repo = Queued(new TestRepository());

    var test = new Test();

    test.go({});

    repo.commit(test, function () {

      repo.get(test.id, function (err, test) {
        if (err) return done(err);

        test2 = test;

        test2.go({});

        console.log(test2)

        repo.get(test.id, function (err, test3) {
          if (err) return done(err);

          console.log(test3)

          completed = true;

        });

      });

    });

  });

});