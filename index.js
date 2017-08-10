/*
 * search all environment variables used in this process.pwd()
 * support: ENV['env1'] , ENV.env2 or process.env.env6
 */
const fs = require('fs')
const path = require('path')
const acorn = require('acorn')
const {promisify} = require('util')
const readFileAsync = promisify(fs.readFile)
const walk = require("acorn/dist/walk")
const excludedFolders = ['.git', 'node_modules', 'bower_components', 'web_modules', '.bin', 'bin']
let pwdFiles = []
let pwdDirs = []

const walkSync = (dir, filelist = []) => {
 let tmpPath = ''
 fs.readdirSync(dir).forEach(file => {
   tmpPath = path.join(dir, file)
   filelist = fs.statSync(tmpPath).isDirectory()
     ? walkSync(tmpPath, filelist)
     : (typeCheck(tmpPath) ? filelist.concat(tmpPath) : filelist)
 })
 return filelist
}

function typeCheck(filePath) {
	const types = ['js']
	for (let i = types.length - 1; i >= 0; i--) {
		if(types.indexOf(path.extname(filePath).slice(1)) !== -1) {
			return true
		}
	}
	return false
}

function pp (obj) {
 return JSON.stringify(obj, null, 2)
}

function getEnvIdentifier(node, list = []) {
	let res = ''
	if (node.object
		&& node.object.type === 'Identifier'
		&& node.object.name === 'ENV') {
    if (node.property
			  && node.property.type === 'Literal') {
       	res = node.property.value
    } else if (node.property
			  && node.property.type === 'Identifier') {
       	res = node.property.name
    }
	}
	res === '' ? null : list.push(res)
	return list
}

function envIdentifierWithProcess(node, list = []) {
let res = ''
if (node.object
  && node.object.type === 'MemberExpression'
  && node.object.object
  && node.object.object.type === 'Identifier'
  && node.object.object.name === 'process'
  && node.object.property
  && node.object.property.type === 'Identifier'
  && node.object.property.name === 'env'
  && node.property
  && node.property.type === 'Identifier') {
    res = node.property.name
}
res === '' ? null : list.push(res)
return list
}

function filterDirs(arr) {
	return arr.filter(el => excludedFolders.indexOf(path.parse(el).name) === -1)
}

async function genAST(wantedFileList) {
	const res = []
	try {
		let str = ''
		let ast = {}
		for (let i = wantedFileList.length - 1; i >= 0; i--) {
			str = await readFileAsync(wantedFileList[i], {encoding: 'utf8'})
			// AssignmentExpression
			ast = acorn.parse(str, {
				ecmaVersion: 8,
        sourceType: 'script',
        allowImportExportEverywhere: true
			})
			walk.simple(ast, {
			  MemberExpression(node) {
			  	getEnvIdentifier(node, res)
        envIdentifierWithProcess(node, res)
			  }
			})
		}
	} catch (err) {
		console.log('ERROR:', err)
	}
	return res
}


function readDirAndFiles(files = []) {
	let tmpPath
	const dir = process.cwd()
	return new Promise((resolve, reject) => {
    try {
      if (!files.length) {
        const list = fs.readdirSync(dir)
        list.forEach(file => {
          tmpPath = path.join(dir, file)
          fs.statSync(tmpPath).isDirectory()
          ? pwdDirs.push(tmpPath)
          : (typeCheck(tmpPath) ? pwdFiles.push(tmpPath) : null)
        })
        pwdDirs = filterDirs(pwdDirs)
        for (let i = pwdDirs.length - 1; i >= 0; i--) {
          pwdFiles = pwdFiles.concat(walkSync(pwdDirs[i]))
        }
      } else {
        pwdFiles = pwdFiles.concat(files)
      }
      resolve(pwdFiles)
    } catch (err) {
      reject(err)
    }
  })
}

function checkAll() {
  readDirAndFiles()
  .then(genAST)
  .then(data => console.log(pp(data)))
}

module.exports = {
  checkAll,
  genAST,
  readDirAndFiles
}