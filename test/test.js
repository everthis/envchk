const assert = require('assert')
const path = require('path')
const envchk = require('../index')

describe('envCheck', function() {
  const testFile = path.resolve(__dirname, 'dir', 'index.js')
  const chkPromise = envchk.readDirAndFiles([testFile])
  describe('checkAll', function() {
    it('should return a promise', function() {
      assert.equal(true, chkPromise instanceof Promise)
    })
    it('should return an Array with 4 items', async function() {
      const envArr = await chkPromise.then(envchk.genAST)
      assert.equal(4, envArr.length)
    })
    it('names of envArr should be [ "ENV1", "env2", "env5", "env6" ]', async function() {
      const envArr = await chkPromise.then(envchk.genAST)
      assert.equal('ENV1', envArr[0].name)
      assert.equal('env2', envArr[1].name)
      assert.equal('env5', envArr[2].name)
      assert.equal('env6', envArr[3].name)
    })
  })
})
