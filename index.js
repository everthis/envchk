/*
 * search all environment variables used in this process.pwd()
 * support: ENV['env1'] , ENV.env2 or process.env.env6
 */
const fs = require('fs')
const path = require('path')
const babylon = require('babylon')
const { promisify } = require('util')
const readFileAsync = promisify(fs.readFile)
const traverse = require('babel-traverse').default
const excludedFolders = [
  '.git',
  'node_modules',
  'bower_components',
  'web_modules',
  '.bin',
  'bin'
]
const excludedFilePrefix = ['._']
const cwd = process.cwd()
const cwdLen = cwd.length + 1

let pwdFiles = []
let pwdDirs = []

const walkSync = (dir, filelist = []) => {
  let tmpPath = ''
  fs.readdirSync(dir).forEach(file => {
    tmpPath = path.join(dir, file)
    filelist = fs.statSync(tmpPath).isDirectory()
      ? walkSync(tmpPath, filelist)
      : typeCheck(tmpPath) ? filelist.concat(tmpPath) : filelist
  })
  return filelist
}

function typeCheck(filePath) {
  const types = ['js']
  for (let i = types.length - 1; i >= 0; i--) {
    if (types.indexOf(path.extname(filePath).slice(1)) !== -1) {
      return true
    }
  }
  return false
}

function pp(obj) {
  return JSON.stringify(obj, null, 2)
}

function getEnvIdentifier(node, list = [], filePath) {
  let res = ''
  if (
    node.object &&
    node.object.type === 'Identifier' &&
    node.object.name === 'ENV'
  ) {
    if (
      node.property &&
      ['Literal', 'StringLiteral'].indexOf(node.property.type) !== -1
    ) {
      res = node.property.value
    } else if (node.property && node.property.type === 'Identifier') {
      res = node.property.name
    }
  }
  res === '' ? null : list.push({ name: res, paths: [filePath.slice(cwdLen)] })
  return list
}

function envIdentifierWithProcess(node, list = [], filePath) {
  let res = ''
  if (
    node.object &&
    node.object.type === 'MemberExpression' &&
    node.object.object &&
    node.object.object.type === 'Identifier' &&
    node.object.object.name === 'process' &&
    node.object.property &&
    node.object.property.type === 'Identifier' &&
    node.object.property.name === 'env' &&
    node.property &&
    node.property.type === 'Identifier'
  ) {
    res = node.property.name
  }
  res === '' ? null : list.push({ name: res, paths: [filePath.slice(cwdLen)] })
  return list
}

function filterDirs(arr) {
  return arr.filter(el => excludedFolders.indexOf(path.parse(el).name) === -1)
}

function filterFiles(arr) {
  return arr.filter(el => {
    const pn = path.parse(el).name
    for (let i = 0; i < excludedFilePrefix.length; i++) {
      if (pn.lastIndexOf(excludedFilePrefix[i], 0) === 0) {
        return false
      }
    }
    return true
  })
}

async function genAST(wantedFileList) {
  const res = []
  try {
    let str = ''
    let ast = {}
    for (let i = wantedFileList.length - 1; i >= 0; i--) {
      // console.log(wantedFileList[i])
      str = await readFileAsync(wantedFileList[i], { encoding: 'utf8' })
      // AssignmentExpression
      ast = babylon.parse(str, {
        sourceType: 'module',
        plugins: [
          'jsx',
          'flow',
          'flowComments',
          'typescript',
          'doExpressions',
          'objectRestSpread',
          'decorators',
          'decorators2',
          'classProperties',
          'classPrivateProperties',
          'classPrivateMethods',
          'exportDefaultFrom',
          'exportNamespaceFrom',
          'asyncGenerators',
          'functionBind',
          'functionSent',
          'dynamicImport',
          'numericSeparator',
          'optionalChaining',
          'importMeta',
          'bigInt',
          'optionalCatchBinding',
          'throwExpressions',
          'pipelineOperator',
          'nullishCoalescingOperator'
        ]
        // ecmaVersion: 8,
        // plugins:{asyncawait:true},
        // sourceType: 'module',
        // allowHashBang: true,
        // allowImportExportEverywhere: true
      })
      traverse(ast, {
        enter: function(path) {
          if (path.node.type == 'MemberExpression') {
            getEnvIdentifier(path.node, res, wantedFileList[i])
            envIdentifierWithProcess(path.node, res, wantedFileList[i])
          }
        }
      })
    }
  } catch (err) {
    console.log('ERROR:', err)
  }
  return res
}

function readDirAndFiles(cwdDir, files = []) {
  let tmpPath
  const dir = cwdDir || process.cwd()
  return new Promise((resolve, reject) => {
    try {
      if (!files.length) {
        const list = fs.readdirSync(dir)
        list.forEach(file => {
          tmpPath = path.join(dir, file)
          fs.statSync(tmpPath).isDirectory()
            ? pwdDirs.push(tmpPath)
            : typeCheck(tmpPath) ? pwdFiles.push(tmpPath) : null
        })
        pwdDirs = filterDirs(pwdDirs)
        for (let i = pwdDirs.length - 1; i >= 0; i--) {
          pwdFiles = pwdFiles.concat(walkSync(pwdDirs[i]))
        }
      } else {
        pwdFiles = pwdFiles.concat(files)
      }
      pwdFiles = filterFiles(pwdFiles)
      resolve(pwdFiles)
    } catch (err) {
      reject(err)
    }
  })
}

function uniqArr(arr) {
  return arr.filter((v, i, a) => {
    const idx = a.findIndex(el => el.name === v.name)
    if (idx === i) {
      return true
    } else {
      if (a[idx].paths.indexOf(v.paths[0]) === -1) {
        a[idx].paths.push(v.paths[0])
      }
      return false
    }
  })
}

function checkAll(cwdDir) {
  return readDirAndFiles(cwdDir)
    .then(genAST)
    .then(data => uniqArr(data))
}

module.exports = {
  checkAll,
  genAST,
  readDirAndFiles
}
