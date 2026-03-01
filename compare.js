import {readdir} from 'node:fs/promises'
import {extname, join, normalize, resolve, sep} from 'node:path'
import {promisify} from 'node:util'
import process from 'node:child_process'
const exec = promisify(process.exec)

const maxBuffer = 1024 * 1024 * 100

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

const parseZip = (folder, {stdout}) => {
  const lines = stdout.split('\n')
  const tree = {}
  for (const line of lines.slice(2, -2)) {
    if (/^ +\d+ /.test(line)) {
      const path = normalize(line.split(' ').at(-1).replace(/\r/g, ''))
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

const parseSmb = (folder, {stdout}) => {
  const lines = stdout.split('\n')
  const tree = {}
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && 
        !trimmed.startsWith('Domain=') &&
        !trimmed.startsWith('OS=') &&
        !trimmed.includes('blocks available') &&
        !trimmed.includes('bytes free') &&
        trimmed !== '.' && 
        trimmed !== '..' &&
        !trimmed.startsWith('smb:') &&
        !trimmed.startsWith('WARNING:') &&
        !trimmed.startsWith('GENSEC:')) {
      
      // Handle smbclient ls output format: "filename A/D size date time"
      // Example: "Documents D 0 Mon Jan 01 12:00:00 2024"
      const match = trimmed.match(/^(\S.*?)\s+([DA])\s+\d+/)
      if (match) {
        const filename = match[1].trim()
        if (filename && filename.length > 0) {
          const path = normalize(filename)
          let current = tree
          for (const folder of path.split(sep)) {
            if (!(folder in current)) {
              current[folder] = {}
            }
            current = current[folder]
          }
        }
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
   
  if (folder.startsWith('smb://')) {
    try {
      const content = await exec(`smbclient "${folder}" -c "ls" -N`, {maxBuffer: 1024*1024*100})
      return parseSmb(folder, content)
    } catch (err) {
      throw new Error(`failed to access SMB share ${folder}: ${err.message}. Make sure smbclient is installed.`)
    }
  }
  
  if (extname(folder) === '.7z') {
    // parse all zip entries
    const content = await exec(`7z l "${folder}"`, {maxBuffer})
    return parse7z(folder, content)
  } else if (extname(folder) === '.zip') {
    // parse all zip entries
    const content = await exec(`unzip -l "${folder}"`, {maxBuffer})
    return parseZip(folder, content)
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

export default async (folderA, folderB) => {
  const pathA = folderA.startsWith('smb://') ? folderA : resolve(folderA)
  const pathB = folderB.startsWith('smb://') ? folderB : resolve(folderB)
  return compare({path: pathA}, {path: pathB}, {onlyA: [], onlyB: []})
}
