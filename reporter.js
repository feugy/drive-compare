const {relative} = require('path')

module.exports = (folderA, folderB, results) => {
  if (results.onlyA) {
    console.log(`\nonly existing in ${folderA}:`)
    results.onlyA.forEach(item => {
      console.log(`\t${relative(folderA, item.path)}`)
    })
  }
  if (results.onlyB) {
    console.log(`\nonly existing in ${folderB}:`)
    results.onlyB.forEach(item => {
      console.log(`\t${relative(folderB, item.path)}`)
    })
  }
  if (!results.onlyA && !results.onlyB) {
    console.log(`${folderA} and ${folderB} are synced !`)
  }
}
