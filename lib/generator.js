const parse = require('./parse.js')
const Helpers = require('./helpers')
class Generator {
  constructor () {
    this.cache = {}
  }
  genAPI (domain) {
    return `/* eslint-disable */
import axios, { AxiosInstance, AxiosResponse } from 'axios'
import qs from 'qs'

let domain = '${domain}'
let axiosInstance = axios.create()

export function getDomain(): string {
  return domain
}

export function setDomain($domain: string): void {
  domain = $domain
}

export function getAxiosInstance(): AxiosInstance {
  return axiosInstance
}

export function setAxiosInstance($axiosInstance: AxiosInstance): void {
  axiosInstance = $axiosInstance
}

export type RequestMethod = 'get' | 'post' | 'put' | 'delete' | 'head' | 'option' | 'patch'

export interface ObjectType {
  [key: string]: any;
}

export interface Config {
  $domain?: string;
  $config?: any;
}

export interface Parameters {
  [key: string]: any;
}

export function request(method: RequestMethod, url: string, body?: ObjectType, config: ObjectType = {}) {
  let queryUrl = url
  if (method === 'get') {
    let params = body ? qs.stringify(body) : ''
    if (params) {
      if (queryUrl.indexOf('?') < 0) {
        params = '?' + params
      } else if (!queryUrl.endsWith('?')) {
        params = '&' + params
      }
    }
    return axiosInstance[method](queryUrl + params, config)
  }
  if(method === 'post' || method === 'put' || method === 'patch'){
    return axiosInstance[method](queryUrl, body, config)
  }
  if(method === 'head' || method === 'option') {
    return axiosInstance[method](queryUrl, config)
  }
  if(method === 'delete') {
    return axiosInstance[method](queryUrl, {...config, data: body || {} })
  }
  return Promise.reject(new Error('Not supported request method: ' + method))
}`
  }

  genPropType (arr) {
    const propertiesArr = []
    let refTypes = ''
    for (let property of arr) {
      if (property.ref) {
        const currRefType = this.genDefinedType(property.ref)
        refTypes = currRefType + refTypes
        propertiesArr.push(`  ${property.name}${property.required ? ':' : '?:'} ${property.ref.name};`)
      } else {
        propertiesArr.push(`  ${property.name}${property.required ? ':' : '?:'} ${Helpers.transferType(property)};${property.description ? ` // ${property.description}` : ''}`)
      }
    }
    return [refTypes, propertiesArr.join('\n')]
  }

  genDefinedType (definition) {
    const formattedName = Helpers.formatTypeName(definition.name)
    let typeName = formattedName
    // ??????????????????????????????????????????
    const genericTypeMatched = formattedName.match(/<.+>$/)
    if (genericTypeMatched) {
      typeName = typeName.split('<').shift()
      // ??????????????????interface name<T>??????????????????????????????interface name?????????????????????????????????interface name???????????????????????????????????????
      if (this.cache[typeName]) {
        this.cache[typeName] = undefined
      }
      typeName = `${typeName}<T>`
      if (this.cache[typeName]) {
        return ''
      }
    } else {
      // ?????????????????????interface name??????????????????????????????interface name???????????????interface name<T>????????????????????????????????????
      if (this.cache[typeName] || this.cache[`${typeName}<T>`]) {
        return ''
      }
    }

    const [refTypes, properties] = this.genPropType(Object.values(definition.properties || {}))
    let currType = `\n// ${typeName}\nexport interface ${typeName} {\n${properties}\n}`

    if (genericTypeMatched) {
      // ????????????
      currType = currType.replace(new RegExp(genericTypeMatched[0].substr(1, genericTypeMatched[0].length - 2), 'g'), 'T')
    }
    this.cache[typeName] = currType

    return `${refTypes}${currType}`
  }

  genDefinedTypes (defines) {
    // return Object.values(defines).filter(define => define.name.indexOf('??') < 0 && define.name.indexOf('??') < 0).map(genDefinedType).join('\n')
    Object.values(defines).forEach(define => this.genDefinedType(define))
    return Object.values(this.cache).filter(v => v).join('\n')
    // return Object.values(defines).forEach(genDefinedType).join('\n')
  }

  genMethodParamsType (name, arr) {
    const [refTypes, properties] = this.genPropType(arr)
    return `${refTypes}\n\nexport interface ${name} {\n${properties}\n}`
  }

  genResponseType (method) {
    let responseDataType = 'never'
    if (method.responseData.schema && method.responseData.schema.$ref) {
      responseDataType = Helpers.formatTypeName(method.responseData.schema.$ref.split('/').pop())
      // ??????????????????????????????????????????
      const genericTypeMatched = responseDataType.match(/<.+>$/)
      if (genericTypeMatched) {
        const typeName = responseDataType.split('<').shift()
        if (!this.cache[`${typeName}<T>`]) {
          responseDataType = 'any'
        }
      } else {
        // ????????????????????????
        if (this.cache[`${responseDataType}<T>`]) {
          responseDataType = `${responseDataType}<any>`
        }
      }
    }
    return `Promise<AxiosResponse<${responseDataType}>>`
  }

  genMethod (method) {
    // ????????????
    let methodComments = `

/**
 * @name: ${method.methodName}
 * @date: ${new Date().toLocaleDateString()}
 * @description: ${method.summary}\n`
    if (method.parameters) {
      method.parameters.forEach((parameter) => {
        methodComments += ` * @param: {${parameter.name}} [${Helpers.formatTypeName(parameter.type || parameter.$refType)}]\n`
      })
      methodComments += ` * @return: ${method.responseData.type}\n`
    }
    methodComments += ` */`

    // ?????????
    const methodDefine = `
export function ${method.methodName}(parameters: ${method.parameterType}): ${method.responseData.type} {
  const { $config, $domain, ...body} = parameters
  const host = $domain ? $domain : getDomain()
  let path = '${method.path}'

  return request('${method.method.toLowerCase()}', host + path, body, $config)
}`

    return methodComments + methodDefine
  }

  genMethods (methods) {
    return methods.map((method) => {
      // ??????????????????
      const parameterType = method.methodName + 'Parameters'
      const isHasParameters = method.parameters.length > 0
      method.parameterType = method.parameters.length > 0 ? `Config & ${parameterType}` : 'Config'
      method.responseData.type = this.genResponseType(method)
      return `${isHasParameters ? this.genMethodParamsType(parameterType, method.parameters) : ''}${this.genMethod(method)}`
    }).join('')
  }
  run (swagger) {
    const data = parse.parseApi(swagger)
    // fs.writeFileSync(path.join(__dirname, `../test/data.json`), JSON.stringify(data, null, '  '))
    let template = [
      this.genAPI(data.domain),
      this.genDefinedTypes(data.definitions),
      this.genMethods(data.methods)
    ].join('\n')
    return template
  }
}

module.exports = Generator
