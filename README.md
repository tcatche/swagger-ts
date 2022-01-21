# @tcatche/swagger-ts
Swagger to axios ts Codegen，适配 swagger2.0 版本

# Installation
```shell
npm install @tcatche/swagger-ts --dev
```
# Generate
## Using JSON file
```js
const fs = require('fs')
const path = require('path')
const swagger2ts = require('@tcatche/swagger-ts')
const json = require('./origin.json')

swagger2ts.generate(json).then(codeResult => {
  fs.writeFileSync(path.join(__dirname, `result.ts`), codeResult)
}).catch(console.log)
```
## Using JSON URL
```js
const fs = require('fs')
const path = require('path')
const swagger2ts = require('@tcatche/swagger-ts')
const jsonUrl = 'http://api.xx.com/xx.json'

swagger2ts.generate(jsonUrl).then(codeResult => {
  fs.writeFileSync(path.join(__dirname, `result.ts`), codeResult)
}).catch(console.log)
```

## 自动保存文件
为 `swagger2ts.generate` 第二个参数传入保存的文件名的绝对路径（文件后缀不能省略），则生成完会保存文件：
```js
const fs = require('fs')
const path = require('path')
const swagger2ts = require('@tcatche/swagger-ts')
const jsonUrl = 'http://api.xx.com/xx.json'

swagger2ts.generate(jsonUrl, '/home/works/api/result.ts').catch(console.log)
```

会把生成的内容保存在 `/home/works/api/result.ts`

# License

[MIT](https://opensource.org/licenses/MIT)


# changelog
## 1.0.1
初始化版本

## 1.0.2
删除一些无用文件

## 1.0.3
优化枚举值类型

## 1.0.4
Features：
- 增加文件自动保存的支持

Fixes：
- 修复枚举值类型为字符串时错误
- 去掉类型名中的空格
- 修复重复的类型定义

## 1.0.5
Features：
- 去掉一些无用的代码，调整一些逻辑

## 1.0.6
Fixes：
- 修改文档中的错误