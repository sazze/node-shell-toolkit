"use strict";

const SshSession = require('..').SshSession;
const co = require('co');

console.log(process.argv)
co(function *() {
  let session = new SshSession({host: process.argv[2], user: process.env.USER, pass: process.env.PASS});
  let result = yield session.runCommand('ls');
  console.log(result.stdout.split('\n'));
}).catch(console.log);
