module.exports =
class Editor
    constructor: (@loader) ->
        editorWidthPercentage = 30;
        $editorBox = $($.parseHTML '<div class="column"></div>')
        $editorBox.width(editorWidthPercentage+'%')
        $('#net-column').width((100-editorWidthPercentage)+'%')
        $('#master-container').prepend $editorBox
        @editor = CodeMirror $editorBox[0],
            value: '# Enter your network definition here.\n# Use Shift+Enter to update the visualization.'
            lineNumbers : true
            lineWrapping : true
        @editor.on 'keydown', (cm, e) => @onKeyDown(e)

    onKeyDown: (e) ->
        if (e.shiftKey && e.keyCode==13)
            # Using onKeyDown lets us prevent the default action,
            # even if an error is encountered (say, due to parsing).
            # This would not be possible with keymaps.
            e.preventDefault()
            @loader @editor.getValue()
