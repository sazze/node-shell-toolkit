"use strict";

const Client = require('@sazze/rc-client');
const Session = require('./Session');
const _ = require('lodash');

class RcSession extends Session {
  constructor(opts, cmdOpts) {
    opts = _.merge({}, opts);
    let client = new Client(opts);
    super(client, cmdOpts);
  }
}

module.exports = RcSession;