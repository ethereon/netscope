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
            extraKeys:
                'Shift-Enter': =>
                    @loader @editor.getValue()
                