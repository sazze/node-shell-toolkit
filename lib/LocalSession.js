"use strict";

const Session = require('./Session');
const ChildProcess = require('child_process');

class LocalSession extends Session {
  constructor(cmdOpts) {
    super(new LocalClient(), cmdOpts);
  }
}

class LocalClient {
  send(script, opts, callback) {
    let resp = {};

    //require('child_process').exec(`/bin/sh -c export HOME='/home/deploy' && source ~/.bashrc && nvm exec iojs-v2.4.0 npm install --registry https://registry.npmjs.org`, console.log);
    //console.log(`/bin/sh -c export HOME='/home/deploy' && source ~/.bashrc && nvm exec iojs-v2.4.0 npm install --registry https://registry.npmjs.org`);
    //console.log(script);

    let cproc = ChildProcess.exec(script, opts, function (err, stdout, stderr) {
      if (err) {
        return callback(err, resp);
      }
      resp.stdout = stdout;
      resp.stderr = stderr;
    });
    cproc.on('close', function(code, signal) {
      resp.exitCode = code;
      resp.signal = signal;
      callback(null, resp);
    })
  }
}

module.exports = LocalSession;