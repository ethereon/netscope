module.exports =
class Loader
    constructor: (@parser) ->
        # The parser is a unary function that accepts the network source
        # and outputs a Network instance.

    fromGist: (gistID, callback) =>
        # Load the model with the given Gist ID.
        url = 'https://api.github.com/gists/'+gistID
        $.getJSON url, (data) =>
            fileSet = data['files']
            isSolitaryFile = Object.keys(fileSet).length==1
            for fileKey of fileSet
                fileInfo = fileSet[fileKey]
                filename = fileInfo['filename'].toLowerCase()
                isProto = _.endsWith filename, '.prototxt'
                isSolver = _.startsWith filename, 'solver'
                if (isProto and not isSolver) or isSolitaryFile
                    @load fileInfo['content'], callback
                    return
            console.log 'No prototxt found in the given GIST.'

    fromURL: (url, callback) =>
        # Load the model from the given URL.
        # This may fail due to same-origin policy.
        $.ajax
            url: url
            success: => @load data, callback

    fromPreset: (name, callback) =>
        # Load a preset model. Caffe Only.
        # TODO: Deprecate this. Replace with Gists.
        $.get './presets/'+name+'.prototxt', (data) =>
            @load data, callback

    load: (data, callback) =>
        net = @parser.parse data
        if not _.isUndefined(callback)
            callback net
        return net
