"use strict";

const dns = require('dns');
const SSH = require('simple-ssh');
const Session = require('./Session');
const _ = require('lodash');

class SshSession extends Session {
  constructor(config, cmdOpts) {
    super(new SshClient(config), cmdOpts);
  }
}

module.exports = SshSession;

class SshClient {

  constructor(config) {
    this.config = config;
  }

  send(script, opts, callback) {
    callback = _.once(callback);

    let config = _.merge({}, this.config);
    let ssh = new SSH(config);
    ssh.on('error', function(err) {
      callback(err);
      ssh.end();
    });

    opts = _.merge({}, opts, {
      exit: function(code, stdout, stderr) {
        callback(null, {
          exitCode: code,
          stdout: stdout,
          stderr: stderr,
          signal: null
        });
        ssh.end();
      }
    });

    ssh.exec(script, opts).start();
  }
}