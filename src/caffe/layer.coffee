module.exports =
class Layer
    constructor: ->
        @params = {}

    @parseMultiple: (desc) ->
        layers = []
        for entry in desc
            # Support the deprecated Caffe 'layers' key as well.
            layerDesc = entry.layer or entry.layers
            if layerDesc?
                layer = new Layer
                headerKeys = ['name', 'type', 'top', 'bottom']
                _.extend layer, _.pick(layerDesc, headerKeys)
                layer.params = _.omit layerDesc, headerKeys
                layers.push layer
            else
                console.log 'Unidentified entry ignored: ', entry
        return layers

    @createImplicit: (name) ->
        layer = new Layer
        layer.name = name
        layer.type = 'implicit'
        return layer

    isInPlace: ->
        @top? and (@top==@bottom)