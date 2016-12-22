const {readdir} = require('fs')
const path = require('path')

const getContent = folder =>
  new Promise((resolve, reject) => {
    readdir(folder, (err, content) => {
      if (err && err.code === 'ENOTDIR') {
        return resolve([])
      } else if (err) {
        return reject(new Error(`failed to read folder ${folder}: ${err.message}`))
      }
      resolve(content.map(item => ({
        path: path.join(folder, item),
        name: item
      })))
    })
  })

const compare = (folderA, folderB, results) =>
  Promise.all([getContent(folderA), getContent(folderB)])
    .then(([contentA, contentB]) => {
      const matchedInB = []
      return Promise.all(contentA.map(itemA => {
        const itemB = contentB.find(item => item.name === itemA.name)
        if (!itemB) {
          results.onlyA.push(itemA)
          return Promise.resolve()
        }
        matchedInB.push(itemB)
        return compare(itemA.path, itemB.path, results)
      }))
        .then(() => results.onlyB.push(...contentB
          .filter(item => matchedInB.indexOf(item) === -1)
        ))
    })
    .then(() => results)

module.exports = (folderA, folderB) =>
  compare(path.resolve(folderA), path.resolve(folderB), {onlyA: [], onlyB: []})
