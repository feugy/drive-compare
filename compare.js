const {promisify} = require('util')
const readdir = promisify(require('fs').readdir)
const {basename, extname, join, normalize, resolve, sep} = require('path')
const exec = promisify(require('child_process').exec)

const extract = (folder, tree) =>
  Object.keys(tree).map(name => ({
    path: join(folder, name),
    name,
    content: Object.keys(tree[name]).length ? extract(join(folder, name), tree[name]) : []
  }))

const parse7z = (folder, {stdout}) => {
  const lines = stdout.split('\n')
  const tree = {}
  for (const line of lines) {
    if (/^\d{4}/.test(line) && line[20] !== ' ') {
      const path = normalize(line.substring(53).replace(/\r/g, ''))
      let current = tree
      for (const folder of path.split(sep)) {
        if (!(folder in current)) {
          current[folder] = {}
        }
        current = current[folder]
      }
    }
  }
  return extract(folder, tree)
}

const getContent = async ({path: folder, content}) => {
  if (content) {
    // folder was already parsed
    return content
  }
  if (extname(folder) === '.7z') {
    // parse all zip entries
    const content = await exec(`7z l ${folder}`, {maxBuffer: 1024*1024*100})
    return parse7z(folder, content)
  }
  try {
    return (await readdir(folder)).map(item => ({
      path: join(folder, item),
      name: item
    }))
  } catch (err) {
    if (err.code === 'ENOTDIR') {
      return []
    }
    throw new Error(`failed to read folder ${folder}: ${err.message}`)
  }
}

const compare = async (folderA, folderB, results) => {
  const [contentA, contentB] = await Promise.all([getContent(folderA), getContent(folderB)])
  const matchedInB = []
  await Promise.all(contentA.map(itemA => {
    const itemB = contentB.find(({name}) => name === itemA.name)
    if (!itemB) {
      results.onlyA.push(itemA)
      return Promise.resolve()
    }
    matchedInB.push(itemB)
    return compare(itemA, itemB, results)
  }))
  results.onlyB.push(...contentB.filter(item => matchedInB.indexOf(item) === -1))
  return results
}

module.exports = async (folderA, folderB) =>
  compare({path: resolve(folderA)}, {path: resolve(folderB)}, {onlyA: [], onlyB: []})
