Source      = require './source.coffee'
Renderer    = require './renderer.coffee'
Editor      = require './editor.coffee'

class AppController
    constructor: ->
        @inProgress = false
        @$spinner   = $('#net-spinner')
        @$netBox    = $('#net-container')
        @$netError  = $('#net-error')
        @svg        = '#net-svg'

        @setupErrorHandler()
        @setupRoutes()

    startLoading: (loader, args...) ->
        if @inProgress
            return
        @$netError.hide()
        @$netBox.hide()
        @$spinner.show()
        loader args..., (net) => @completeLoading(net)

    completeLoading: (net) ->
        @$spinner.hide()
        $('#net-title').html(net.name.replace(/_/g, ' '))
        @$netBox.show()
        $(@svg).empty()
        $('.qtip').remove()
        renderer = new Renderer net, @svg
        @inProgress = false

    makeLoader: (loader) ->
        (args...) =>
            @startLoading loader, args...

    showEditor: ->
        # Lazily load CodeMirror
        loader = @makeLoader Source.fromProtoText
        if(_.isUndefined(window.CodeMirror))
            $.getScript 'assets/js/lib/codemirror.min.js', ->
                @netEditor = new Editor(loader)

    showDocumentation: ->
        window.location.href = 'quickstart.html'

    setupErrorHandler: ->
        window.onerror = (message, filename, lineno, colno, e) =>
            msg = message
            if not (_.isUndefined(e) || _.isUndefined(e.line) || _.isUndefined(e.column))
                msg = _.template('Line ${line}, Column ${column}: ${message}')(e)
            @$spinner.hide()
            $('.msg', @$netError).html(msg);
            @$netError.show()
            @inProgress = false

    setupRoutes: ->
        routes =
           '/gist/:gistID' : @makeLoader Source.fromGist
           '/url/(.+)'     : @makeLoader Source.fromURL
           '/preset/:name' : @makeLoader Source.fromPreset
           '/editor(/?)'   : => @showEditor()
           '/doc'          : => @showDocumentation()
        @router = Router(routes)
        @router.init '/doc'

$(document).ready ->
    app = new AppController()
