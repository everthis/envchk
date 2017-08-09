#!/usr/bin/env node
/*
 * search all environment variables used in this process.pwd()
 * support: ENV['env1'] or ENV.env2
 */
const envchk = require('../index')
envchk.checkAll()

