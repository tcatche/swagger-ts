const request = require('request')
const generator = require('./lib/generator.js')
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

/**
 * 根据swagger json描述生成axios请求方法
 * @param {*} opt swagger json数据对象
 */
function generate (swagger) {
  if (typeof swagger === 'string' && swagger.startsWith('http')) {
    return apiRequest(swagger).then(json => {
      return generator.run(json)
    })
  }
  return Promise.resolve(generator.run(swagger))
}

module.exports.generate = generate
