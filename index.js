const request = require('request')
const fs = require('fs')
const path = require('path')
const Generator = require('./lib/generator.js')
const url = require('url')

/**
 * http 请求 swagger json文件
 * @param {*} swaggerUrl swagger json 文件地址
 */
function apiRequest (swaggerUrl) {
  return new Promise((resolve, reject) => {
    request
      .get(swaggerUrl, (error, resp, body) => {
        if (error) {
          reject(new Error(`${url} error: statusCode ${resp.statusCode}`))
        } else if (resp.statusCode !== 200) {
          reject(new Error(`${url} error: statusCode ${resp.statusCode}`))
        } else {
          resolve(JSON.parse(body))
        }
      })
  })
}

function saveFile (apiContent, outputName) {
  if (outputName.split('.').pop() !== 'ts') {
    console.log(`outputName 必须以 '.ts' 结尾，否则不会自动保存文件`)
    return apiContent
  }
  const dirName = path.dirname(outputName)
  fs.mkdirSync(dirName, { recursive: true }, (err) => {
    if (err) {
      console.error('创建文件夹失败:', dirName)
      throw err
    }
  })
  fs.writeFileSync(outputName, apiContent)
  return apiContent
}

/**
 * 根据swagger json描述生成axios请求方法
 * @param {*} opt swagger json数据对象
 */
function generate (swagger, outputName) {
  function runner (json) {
    const content = new Generator().run(json)
    if (outputName) {
      saveFile(content, outputName)
    }
    return content
  }
  if (typeof swagger === 'string' && swagger.startsWith('http')) {
    return apiRequest(swagger).then(runner)
  }
  return Promise.resolve(() => runner(swagger)).then(saveFile)
}

module.exports.generate = generate
