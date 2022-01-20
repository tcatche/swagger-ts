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
type RequestMethod = 'get' | 'post' | 'put' | 'delete' | 'head' | 'option' | 'patch'
export function request(method: RequestMethod, url: string, body, config) {
  let queryUrl = url
  if (!config) {
    config = {
      showNetworkError: true,
    }
  }
  if (method === 'delete') {
    return axiosInstance[method](queryUrl,{...config, data: body || {} })
  } else if (method === 'get') {
    let params = body ? qs.stringify(body) : ''
    if (params) {
      if (queryUrl.indexOf('?') < 0) {
        params = '?' + params
      } else if (!queryUrl.endsWith('?')) {
        params = '&' + params
      }
    }
    return axiosInstance[method](queryUrl + params, config)
  } else if(method === 'post' || method === 'put' || method === 'patch'){
    return axiosInstance[method](queryUrl, body, config)
  } else if (method === 'head' || method === 'option') {
    return axiosInstance[method](queryUrl, config)
  }
}

export interface ObjectType {
  [key: string]: any;
}

export interface Config {
  $domain?: string;
  $config?: any;
}

export interface Parameters {
  [key: string]: any;
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
    // 判断类型名是否存在泛型的标识
    const genericTypeMatched = formattedName.match(/<.+>$/)
    if (genericTypeMatched) {
      typeName = typeName.split('<').shift()
      // 如果是泛型（interface name<T>），且已存在非泛型（interface name）的定义，删除非泛型（interface name）的定义，只保留泛型的定义
      if (this.cache[typeName]) {
        this.cache[typeName] = undefined
      }
      typeName = `${typeName}<T>`
      if (this.cache[typeName]) {
        return ''
      }
    } else {
      // 如果是非泛型（interface name），且已存在非泛型（interface name）或泛型（interface name<T>）的定义，则退出后续处理
      if (this.cache[typeName] || this.cache[`${typeName}<T>`]) {
        return ''
      }
    }

    const [refTypes, properties] = this.genPropType(Object.values(definition.properties || {}))
    let currType = `\n// ${typeName}\nexport interface ${typeName} {\n${properties}\n}`

    if (genericTypeMatched) {
      // 处理泛型
      currType = currType.replace(new RegExp(genericTypeMatched[0].substr(1, genericTypeMatched[0].length - 2), 'g'), 'T')
    }
    this.cache[typeName] = currType

    return `${refTypes}${currType}`
  }

  genDefinedTypes (defines) {
    // return Object.values(defines).filter(define => define.name.indexOf('«') < 0 && define.name.indexOf('»') < 0).map(genDefinedType).join('\n')
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
      // 判断类型名是否存在泛型的标识
      const genericTypeMatched = responseDataType.match(/<.+>$/)
      if (genericTypeMatched) {
        const typeName = responseDataType.split('<').shift()
        if (!this.cache[`${typeName}<T>`]) {
          responseDataType = 'any'
        }
      } else {
        // 如果类型不是泛型
        if (this.cache[`${responseDataType}<T>`]) {
          responseDataType = `${responseDataType}<any>`
        }
      }
    }
    return `Promise<AxiosResponse<${responseDataType}>>`
  }

  genMethod (method) {
    let result = ''
    // 方法注释
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
    result += methodComments

    // 方法体
    const methodDefine = `
export function ${method.methodName}(parameters: ${method.parameterType}): ${method.responseData.type} {
  const { $config, $domain, ...body} = parameters
  const host = $domain ? $domain : getDomain()
  let path = '${method.path}'

  return request('${method.method.toLowerCase()}', host + path, body, $config)
}`
    result += methodDefine

    return result
  }

  genMethods (methods) {
    return methods.map(method => {
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
