#!/usr/bin/env node
import driveCompare from './compare.js'
import reporter from'./reporter.js'

const [_1, _2, folderA, folderB] = process.argv
  
console.log(`Comparing ${folderA} and ${folderB}...`)

driveCompare(folderA, folderB)
  .then(results => reporter(folderA, folderB, results))
  .catch(err => console.error(err.message))
