Renderer = require './renderer.coffee'
Editor   = require './editor.coffee'
Notify   = require './notify.coffee'

module.exports =
class AppController
    constructor: ->
        @inProgress = false
        @$spinner   = $('#net-spinner')
        @$netBox    = $('#net-container')
        @$netError  = $('#net-error')
        @$netWarn   = $('#net-warning')
        @svg        = '#net-svg'
        @setupErrorHandler()

    startLoading: (loader, args...) ->
        if @inProgress
            return
        @$netError.hide()
        @$netWarn.hide()
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
        window.onerror = @handleError
        Notify.onerror   @handleError
        Notify.onwarning @handleWarning

    handleError: (message, filename, lineno, colno, e) =>
        msg = message
        if e?.line? and e?.column?
            msg = "Line #{e.line}, Column #{e.column}: #{e.message}"
        @$spinner.hide()
        $('.msg', @$netError).html(msg);
        @$netError.show()
        @inProgress = false

    handleWarning: (message) =>
        $('.msg', @$netWarn).html(message);
        @$netWarn.show()
