#!/usr/bin/env node
const path = require('path')
const mod = require(path.join(__dirname, '..', 'lib', 'database', 'sqlite'))

mod.initDatabase()
  .then(() => {
    console.log('Migrations applied')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Migration runner failed', err)
    process.exit(1)
  })
