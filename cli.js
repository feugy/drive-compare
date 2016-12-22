#!/usr/bin/env node

const driveCompare = require('./compare')
const reporter = require('./reporter')

const [_1, _2, folderA, folderB] = process.argv

driveCompare(folderA, folderB)
  .then(results => reporter(folderA, folderB, results))
  .catch(err => console.error(err.message))
