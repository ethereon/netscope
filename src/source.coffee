CaffeParser = require './caffe-parser'
Network     = require './network.coffee'

fromProtoText = (txt, callback) ->
    net = Network.fromCaffe CaffeParser.parse txt
    if not _.isUndefined(callback)
        callback(net)
    return net

exports.fromProtoText = fromProtoText

exports.fromGist = (gistID, callback) ->
    url = 'https://api.github.com/gists/'+gistID
    $.getJSON url, (data) ->
        fileSet = data['files']
        isSolitaryFile = Object.keys(fileSet).length==1
        for fileKey of fileSet
            fileInfo = fileSet[fileKey]
            filename = fileInfo['filename'].toLowerCase()
            isProto = _.endsWith filename, '.prototxt'
            isSolver = _.startsWith filename, 'solver'
            if (isProto and not isSolver) or isSolitaryFile
                callback fromProtoText fileInfo['content']
                return
        console.log 'No prototxt found in the given GIST.'

exports.fromURL = (url, callback) ->
    $.ajax
        url: url
        success: -> callback fromProtoText data

exports.fromPreset = (name, callback) ->
    $.get './presets/'+name+'.prototxt', (data) ->
        callback fromProtoText data
        
