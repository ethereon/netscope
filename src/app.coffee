Renderer    = require './renderer.coffee'
Editor      = require './editor.coffee'

module.exports =
class AppController
    constructor: ->
        @inProgress = false
        @$spinner   = $('#net-spinner')
        @$netBox    = $('#net-container')
        @$netError  = $('#net-error')
        @svg        = '#net-svg'
        @setupErrorHandler()

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

    showEditor: (loader) ->
        # Display the editor by lazily loading CodeMirror.
        # loader is an instance of a Loader.
        if(_.isUndefined(window.CodeMirror))
            $.getScript 'assets/js/lib/codemirror.min.js', =>
                @netEditor = new Editor @makeLoader loader.load

    setupErrorHandler: ->
        window.onerror = (message, filename, lineno, colno, e) =>
            msg = message
            if not (_.isUndefined(e) || _.isUndefined(e.line) || _.isUndefined(e.column))
                msg = _.template('Line ${line}, Column ${column}: ${message}')(e)
            @$spinner.hide()
            $('.msg', @$netError).html(msg);
            @$netError.show()
            @inProgress = false

