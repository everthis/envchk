### usage

```bash
npm i envchk --save
```

CLI:

```bash
envchk
```

Node.js:

```javascript
const envchk = require('envchk').checkAll
envchk().then(arr => console.log(arr))
```

### output

```text
[{ name: 'URI_PRODUCTION',
    paths: [ 'server/controller/api.js', 'server/app.js' ] },
  { name: 'SESSION_SECRET', paths: [ 'server/app.js' ] },
  { name: 'URI_DEV', paths: [ 'server/app.js' ] },
  { name: 'EMAIL_NOTIFICATION_STATUS',
    paths: [ 'server/app.js' ] } ]
```
