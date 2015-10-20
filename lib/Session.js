"use strict";

const _ = require('lodash');
const ScpClient = require('scp2');
const EventEmitter = require('events').EventEmitter;
const SemVer = require('semver');
const co = require('co');

class Session extends EventEmitter {

  constructor(client, cmdOpts) {
    super();
    this.client = client || {send: function(script, opts, cb) {cb(null, script);}};
    this.cmdOpts = cmdOpts || {};
  }

  test() {
    console.log(this);
  }

  runCommand(script, opts) {
    let self = this;

    opts = _.merge({}, this.cmdOpts, opts);
    opts = !_.isEmpty(opts) ? opts : undefined;

    return new Promise(function (resolve, reject) {

      if (_.isPlainObject(script)) {
        co(function *() {
          let resp = yield self[script.method].apply(self, script.args);

          if (script.exitCodes && !_.isUndefined(resp.exitCode) && -1 === script.exitCodes.indexOf(resp.exitCode)) {
            throw new Error('Invalid exit code: ' + resp.exitCode);
          }

          return resp;
        }).then(resolve).catch(reject);
        return;
      }

      self.emit('cmd', 'start', script, opts);

      self.client.send(script, opts, function(err, result) {
        if (err) {
          return reject(err);
        }

        self.emit('cmd', 'finish', script, opts, result);

        resolve(result);
      });
    });
  }

  pwd(pwdopts, opts) {
    return this.runCommand(`pwd ${formatOpts(pwdopts)}`, opts);
  }

  symlink(src, dest, lnopts, opts) {
    return this.runCommand(`ln ${formatOpts(lnopts, 'nfs')} ${src} ${dest}`, opts);
  }

  readlink(target, rlopts, opts) {
    return this.runCommand(`readlink ${formatOpts(rlopts, '')} ${target}`, opts);
  }

  rm(filename, rmopts, opts) {
    return this.runCommand(`rm ${formatOpts(rmopts)} ${filename}`, opts);
  }

  ls(filename, lsopts, opts) {
    return this.runCommand(`ls ${formatOpts(lsopts)} ${filename || ''}`, opts);
  }

  cat(filename, catopts, opts) {
    return this.runCommand(`cat ${formatOpts(catopts, '')} ${filename}`, opts);
  }

  exists(filename, lsopts, opts) {
    let self = this;
    return co(function *() {

      try {
        let result = yield self.ls(filename, lsopts, opts);
        return 0 === result.exitCode;
      } catch (e) {
        return false;
      }

    });
  }

  service(name, action, opts) {
    if (!isValidAction(action)) {
      throw new Error(`Invalid service action: ${action}`);
    }
    return this.runCommand(`service ${name} ${action}`, opts);
  }

  supervisorctl(name, action, opts) {
    if (!isValidAction(action)) {
      throw new Error(`Invalid supervisorctl action: ${action}`);
    }
    return this.runCommand(`supervisorctl ${action} ${name}`, opts);
  }

  wget(url, outputFile, wgetopts, opts) {
    if (!outputFile) {
      throw new Error('Outfile is required');
    }
    return this.runCommand(`wget ${formatOpts(wgetopts)} -O ${outputFile} ${url}`, opts);
  }

  extract(filename, outputDir, tgzopts, opts) {
    if (!outputDir) {
      throw new Error('Output dir is required');
    }
    let postArgs = '';
    if (_.isPlainObject(tgzopts)) {
      postArgs = tgzopts.postArgs;
      tgzopts = tgzopts.args || 'xzf';
    }
    return this.runCommand(`tar ${formatOpts(tgzopts)} ${filename} -C ${outputDir} ${postArgs}`, opts)
  }

  rename(fromFilename, toFilename, mvopts, opts) {
    if (!fromFilename || !toFilename) {
      throw new Error('from and to filenames are required');
    }
    return this.runCommand(`mv ${formatOpts(mvopts)} ${fromFilename} ${toFilename}`, opts);
  }

  mkdir(dirname, mkdiropts, opts) {
    return this.runCommand(`mkdir ${formatOpts(mkdiropts, 'p')} ${dirname}`, opts);
  }

  chown(filename, owner, group, chownopts, opts) {
    return this.runCommand(`chown ${formatOpts(chownopts)} ${owner}:${group} ${filename}`, opts);
  }

  chmod(filename, perms, chmodopts, opts) {
    return this.runCommand(`chmod ${formatOpts(chmodopts)} ${perms} ${filename}`, opts);
  }

  findSemVer(cmd, regex, postParse) {
    postParse = _.isFunction(postParse) ? postParse : _.identity;
    let self = this;
    return co(function *() {
      let out = yield self.runCommand(cmd);
      if (out.exitCode) {
        throw new Error(out.stdout + ' ' + out.stderr);
      }

      let ver = findSemVer(out, regex);
      if (null !== ver) {
        return postParse(ver);
      }

      throw new Error(`"${cmd}" not found`);
    });
  }

  phpSemVer() {
    return this.findSemVer('php -v', /^PHP\s+(\d+\.\d+\.\d+)/i);
  }

  javacSemVer() {
    return this.findSemVer('javac -version', /^javac.*?(\d+\.\d+\.\d+(?:_\d+)?)/i, function (ver) {
      return ver.replace(/_/g, '-');
    });
  }

  scalacSemVer() {
    return this.findSemVer('scalac -version', /^Scala.*?version.*?(\d+\.\d+\.\d+(?:_\d+)?)/i);
  }

  nodeSemVer() {
    return this.findSemVer('node -v', /^v?(\d+\.\d+\.\d+)/i);
  }

  iojsSemVer() {
    return this.findSemVer('iojs -v', /^v?(\d+\.\d+\.\d+)/i);
  }

  ping(host, pingopts, opts) {
    if (!_.isArray(host)) {
      return this.runCommand(`ping ${pingopts || '-c 1 -w 1'} ${host}`, opts);
    } else {
      return pasync.mapLimit(host, MAP_LIMIT, function(h) {
        return this.ping(h.ipv4Address, pingopts, opts);
      }.bind(this));
    }
  }

  push(meta, target, dest) {
    return new Promise(function(resolve, reject) {
      meta = _.merge({}, meta, {path: dest});
      ScpClient.scp(target, meta, function(err) {
        if (err) {
          return reject(err);
        }
        resolve();
      })
    });
  }

  static replaceCmdArgs(cmd, replacements) {

    for (let replacementKey in replacements) {
      let placeholder = `<${replacementKey}>`;
      let replacement = replacements[replacementKey];

      if (_.isString(cmd)) {
        cmd = cmd.replace(placeholder, replacement);

      } else if (_.isPlainObject(cmd)) {
        cmd.args = _.map(cmd.args, function(arg) {
          return arg.replace(placeholder, replacement);
        });
      }

    }

    return cmd;
  }

}

module.exports = Session;

function isValidAction(name) {
  switch (name) {
    case 'stop':
    case 'start':
    case 'reload':
    case 'restart':
    case 'status':
      return true;
    default:
      return false;
  }
}

function formatOpts(opts, def) {
  return !_.isUndefined(opts) ? (opts ? '-' + opts : '') : (!_.isUndefined(def) ? (def ? '-' + def : '') : '');
}

function findSemVer(out, verRegex) {
  let output = out.stdout + '\n' + out.stderr;
  for (let line of output.split(/\n/g)) {
    let matches = verRegex.exec(line);
    if (matches && matches[1]) {
      return matches[1];
    }
  }
  return null
}