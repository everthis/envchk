const assert = require('assert')
const path = require('path')
const envchk = require('../index')

describe('envCheck', function() {
  const testFileDir = path.resolve(__dirname, 'dir')
  const chkPromise = envchk.readDirAndFiles(testFileDir, [])
  describe('checkAll', function() {
    it('should return a promise', function() {
      assert.equal(true, chkPromise instanceof Promise)
    })
    it('should return an Array with 6 items', async function() {
      const envArr = await chkPromise.then(envchk.genAST)
      assert.equal(6, envArr.length)
    })
    it('names of envArr should be [ "ENV1", "env2", "ENV7", "ENV8", "env5", "env6" ]', async function() {
      const envArr = await chkPromise.then(envchk.genAST)
      assert.equal('ENV1', envArr[0].name)
      assert.equal('env2', envArr[1].name)
      assert.equal('ENV7', envArr[2].name)
      assert.equal('ENV8', envArr[3].name)
      assert.equal('env5', envArr[4].name)
      assert.equal('env6', envArr[5].name)
    })
  })
})
