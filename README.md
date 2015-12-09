<h1 align="center">Entwine</h1>

<p align="center">
  <a href="#logo">
    <img align="center" src="logo.png" alt="Entwine" height="80px" />
  </a>
</p>

Immutable dependency injection in Node.js inspired (very) heavily by [Component](https://github.com/stuartsierra/component).

## Installation ##

```shell
npm install --save entwine
```

## Usage ##

```javascript
let entwine = require('entwine');

//
// Database component
//

class Database extends entwine.component({config: {}, conn: null}) {
  start() {
    let self = this;

    return connectToDatabase(this.config).then(conn => self.set('conn', conn));
  }

  stop() {
    let self = this;

    return disconnectFromDatabase(this.conn).then(() => self.remove('conn'));
  }
}

function database(config) {
  return new Database({config: config});
}

//
// Server component
//

class Server extends entwine.component({config: {}, socket: null, database: null}) {
  start() {
    let self = this;

    return listenOnPort(this.config).then(socket => self.set('socket', socket));
  }

  stop() {
    let self = this;

    return unlistenOnPort(this.config).then(() => self.remove('socket'));
  }
}

function server(config) {
  return new Server({config: config});
}

//
// System
//

entwine.system({
  server: server(serverConfig),
  database: database(databaseConfig)
},{
  server: ['database']
}).start().then(s => {
  console.log('system started');
  return s.stop();
}).then(() => {
  console.log('system stopped');
});

```

## Testing ##

```shell
npm test
```

## License ##

Copyright (c) 2015 [MojoTech](https://mojotech.com)

Entwine is free software, and may be redistributed under the terms specified in the [LICENSE](LICENSE.txt) file.
