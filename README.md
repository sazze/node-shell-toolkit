## shell-toolkit

Basic shell abstraction API & related tools

### Install

```bash
npm install --save shell-toolkit
```

### Usage

Local Session (run commands on the local host):

```javascript
const LocalSession = require(@sazze/shell-toolkit).LocalSession;

let sess = new LocalSession();

sess.runCommand('uname -a');
```

SSH Session (run commands on a remote host via ssh):

```javascript
const SshSession = require(@sazze/shell-toolkit).SshSession;

// simple-ssh options
let opts = {
  host: 'example.com',
  user: 'user',
  pass: 'pass'
};

let sess = new SshSession(opts);

sess.runCommand('uname -a');
```

[RC](https://github.com/sazze/node-rc-client) Session (run commands on a remote host using [rc-protocol](https://github.com/sazze/node-rc-protocol)):

```javascript
const RcSession = require(@sazze/shell-toolkit).RcSession;

// rc-client options
let opts = {host: 'example.com'};

let sess = new RcSession(opts);

sess.runCommand('uname -a');
```

### License

ISC License (ISC)

Copyright (c) 2016, Sazze, Inc.

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.