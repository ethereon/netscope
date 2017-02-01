exports.typeIsArray = typeIsArray = (value) ->
    value and
        typeof value is 'object' and
        value instanceof Array and
        typeof value.length is 'number' and
        typeof value.splice is 'function' and
        not ( value.propertyIsEnumerable 'length' )

exports.asArray = (valueOrArray) ->
    if typeIsArray valueOrArray
        return valueOrArray
    return [ valueOrArray ]

exports.asScalar = (valueOrArray) ->
    unless typeIsArray valueOrArray
        return valueOrArray
    if valueOrArray.length == 1
        return valueOrArray[0]
    return valueOrArray

exports.toTitleCaseSaveSpaces = toTitleCaseSaveSpaces = (str) ->
    str[0].toUpperCase() + str[1..str.length - 1].toLowerCase()

exports.toTitleCase = (str) ->
    # Use ' ' or '_' as splitters
    partialNames = str.split /[\ _]/
    result = ''
    for part in partialNames
        result += toTitleCaseSaveSpaces(part)
    return result
