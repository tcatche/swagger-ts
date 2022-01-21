
const typeMaper = {
  'int': 'number',
  'integer': 'number',
  'number': 'number',
  'string': 'string',
  'boolean': 'boolean',
  'file': 'File',
  'object': 'ObjectType'
}

const transferType = (property) => {
  if (property.type === 'array') {
    if (property.items) {
      return `Array<${transferType(property.items)}>`
    }
    return `Array<any>`
  }
  if (property.type) {
    if (property.enum) {
      if (property.type === 'string') {
        return [...new Set(property.enum)].map(item => `'${item}'`).join(' | ')
      } else {
        return [...new Set(property.enum)].join(' | ')
      }
    }
    if (typeMaper[property.type]) {
      return typeMaper[property.type]
    }
    return formatTypeName(property.type)
  }
  if (property.$refType) {
    return formatTypeName(property.$refType)
  }
  if (property.$ref) {
    return formatTypeName(property.$ref.split('/').pop())
  }
  console.log(property)
  return 'any'
}

const formatTypeName = (str) => {
  let result = str.replace(/«/g, '<')
  result = result.replace(/»/g, '>')
  result = result.replace(/List</g, 'Array<')
  result = result.replace(/[: ]+/g, '')
  // 如果为泛型
  if (/[<>]/.test(result)) {
    Object.keys(typeMaper).forEach(key => {
      result = result.replace(new RegExp(`<${key}>`, 'g'), `<${typeMaper[key]}>`)
    })
  }
  return result
}

module.exports = {
  formatTypeName,
  transferType,
  typeMaper
}
