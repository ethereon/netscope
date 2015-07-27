Source      = require './source.coffee'
Renderer    = require './renderer.coffee'
Editor      = require './editor.coffee'

class LoadingController
    constructor: (@loader) ->
        @inProgress = false
        @$spinner = $('#net-spinner')
        @$netBox = $('#net-container')
        @svg = '#net-svg'

    start: (args...) -> 
        if @inProgress
            return
        @inProgress = true
        @$netBox.hide()
        @$spinner.show()
        @loader args..., (net) => @finish(net)

    finish: (net) ->
        @$spinner.hide()
        $('#net-title').html(net.name.replace(/_/g, ' '))
        @$netBox.show()
        $(@svg).empty()
        $('.qtip').remove()
        renderer = new Renderer net, @svg
        @inProgress = false

makeLoader = (loader) ->
    controller = new LoadingController loader
    (args...) ->
        controller.start args...

showEditor = () ->
    # Lazily load CodeMirror
    if(_.isUndefined(window.CodeMirror))
        $.getScript 'assets/js/lib/codemirror.min.js', ->
            window.netEditor = new Editor(makeLoader Source.fromProtoText)

showDocumentation = () ->
    console.log '!'
    window.location.href = 'quickstart.html'

$(document).ready ->
    routes =
        '/gist/:gistID' : makeLoader Source.fromGist
        '/url/(.+)'     : makeLoader Source.fromURL
        '/editor(/?)'   : showEditor
        '/doc'          : showDocumentation
    router = Router(routes)
    router.init '/doc'