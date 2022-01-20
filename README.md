# swagger-ts
Swagger to axios ts Codegen

# Installation
```shell
npm install swagger-ts --dev
```
# Generate
## Using JSON file
```javascript
const fs = require('fs')
const path = require('path')
const swagger2ts = require('../index')
const json = require('./origin.json')

swagger2ts.generate(json).then(codeResult => {
  fs.writeFileSync(path.join(__dirname, `result.ts`), codeResult)
}).catch(console.log)
```
## Using JSON URL
```javascript
const fs = require('fs')
const path = require('path')
const swagger2ts = require('../index')
const jsonUrl = 'http://api.xx.com/xx.json'

swagger2ts.generate(jsonUrl).then(codeResult => {
  fs.writeFileSync(path.join(__dirname, `result.ts`), codeResult)
}).catch(console.log)
```

# License

[MIT](https://opensource.org/licenses/MIT)


# changelog
