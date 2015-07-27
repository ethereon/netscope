Layer = require './layer.coffee'

module.exports =
class Network

    processLayers: (@layers, header) ->
        @layerTable = {}
        implicitLayers = []
        getSingleLayer = (name) =>
            layer = @layerTable[name]
            # Caffe allows top to be a layer which isn't explicitly
            # defined. Create an implicit layer if this is detected.
            if not layer?
                layer = Layer.createImplicit name
                implicitLayers.push layer
                @layerTable[name] = layer
            return layer
        getLayers = (names) =>
            names = [].concat names
            _.map names, getSingleLayer
        # Build the layer LUT.
        for layer in @layers
            @layerTable[layer.name] = layer
        # Connect layers.
        for layer in @layers
            if layer.top?
                layer.outputs = getLayers layer.top
            if layer.bottom?
                layer.inputs = getLayers layer.bottom
        # Include implicit layers.
        Array.prototype.push.apply(@layers, implicitLayers)
        # Patch in data layer parameters.
        if header?.input? and header?.input_dim?
            inputs = [].concat header.input
            dims = header.input_dim
            if inputs.length==(dims.length/4)
                for input, i in inputs
                    dataLayer = @layerTable[input]
                    dataLayer.type = 'data'
                    dataLayer.params.shape = dims.slice i*4, (i+1)*4
            else
                console.log 'Inconsistent input dimensions.'

    @fromCaffe: (desc, phase) ->
        phase ?= 'train'
        [header, layerDesc] = desc
        layers = Layer.parseMultiple layerDesc
        layers = _.filter layers, (layer) ->
            layerPhase = layer.params.include?.phase
            not (layerPhase? and layerPhase!=phase)
        net = new Network()
        net.name = header.name or 'Untitled Network'
        net.processLayers layers, header
        return net