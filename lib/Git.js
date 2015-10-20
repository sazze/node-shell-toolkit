"use strict";

const git = require('simple-git');
const _ = require('lodash');

class Git {

  constructor(repoUrl, cloneDir, outstream, errstream) {
    errstream = errstream || outstream;

    this.repoUrl = repoUrl;
    this.git = git(cloneDir).outputHandler(function (cmd, stdout, stderr) {
      stdout.pipe(outstream);
      stderr.pipe(errstream);
    });
  }

  cloneRecursive(gitUrl, cloneDir) {
    let self = this;
    if (!cloneDir) {
      cloneDir = '';
    }
    return new Promise(function(resolve, reject) {
      self.git._run(`clone --recursive ${gitUrl} ${cloneDir}`, function(err, result) {
        if (err) {
          sand.log(err.stack || err.message || err);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

}

let proto = git().__proto__;

for (let name in proto) {
  if (proto.hasOwnProperty(name) && _.isFunction(proto[name]) && !/^_/.test(name)) {
    Git.prototype[name] = function() {
      return callGitAsPromise(this.git, name, arguments);
    };
  }
}

module.exports = Git;

function callGitAsPromise(git, func, _args) {
  return new Promise(function(resolve, reject) {
    Array.prototype.push.call(_args, function(err, result) {
      if (err) {
        return reject(err);
      }
      resolve(result);
    });
    return git[func].apply(git, _args);
  });
}