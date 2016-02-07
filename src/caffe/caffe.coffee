Parser = require './parser'
Network = require '../network.coffee'

generateLayers = (descriptors, phase) ->
    phase ?= 'train'
    layers = []
    for entry in descriptors
        # Support the deprecated Caffe 'layers' key as well.
        layerDesc = entry.layer or entry.layers
        if layerDesc?
            layer = {}
            headerKeys = ['name', 'type', 'top', 'bottom']
            _.extend layer, _.pick(layerDesc, headerKeys)
            layer.attribs = _.omit layerDesc, headerKeys
            layers.push layer
        else
            console.log 'Unidentified entry ignored: ', entry
    layers = _.filter layers, (layer) ->
        layerPhase = layer.attribs.include?.phase
        not (layerPhase? and layerPhase!=phase)
    return layers

generateNetwork = (layers, header) ->
    nodeTable = {}
    implicitLayers = []
    net = new Network header.name
    getSingleNode = (name) =>
        node = nodeTable[name]
        # Caffe allows top to be a layer which isn't explicitly
        # defined. Create an implicit layer if this is detected.
        if not node?
            node = net.createNode name, 'implicit'
            nodeTable[name] = node
        return node
    getNodes = (names, exclude) =>
        names = [].concat names
        if exclude?
            _.pullAll names, exclude
        _.map names, getSingleNode
    # Build the node LUT.
    for layer in layers
        nodeTable[layer.name] = net.createNode layer.name, layer.type, layer.attribs
    # Connect layers.
    inplaceTable = {}
    for layer in layers
        node = nodeTable[layer.name]
        if layer.top?
            if layer.top==layer.bottom
                # This is an inplace node. We will treat this specially.
                # Note that this would have otherwise introduced a cycle,
                # violating the requirements of a DAG.
                if not inplaceTable[layer.top]?
                    inplaceTable[layer.top] = []
                inplaceTable[layer.top].push node
                continue
            else
                node.addChildren getNodes(layer.top, [layer.name])
        if layer.bottom?
            node.addParents getNodes(layer.bottom, [].concat layer.top)
    # Splice in the inplace nodes.
    for own k, inplaceOps of inplaceTable
        curNode = nodeTable[k]
        curNode.coalesce = inplaceOps
        children = curNode.detachChildren()
        for inplaceChild in inplaceOps
            inplaceChild.annotation = 'InPlace'
            curNode.addChild inplaceChild
            curNode = inplaceChild
        curNode.addChildren children
    # Patch in data layer parameters.
    if header?.input? and header?.input_dim?
        inputs = [].concat header.input
        dims = header.input_dim
        if inputs.length==(dims.length/4)
            for input, i in inputs
                dataNode = nodeTable[input]
                dataNode.type = 'data'
                dataNode.attribs.shape = dims.slice i*4, (i+1)*4
        else
            console.log 'Inconsistent input dimensions.'
    return net

module.exports =
class CaffeParser
    @parse : (txt, phase) ->
        [header, layerDesc] = Parser.parse txt
        layers = generateLayers layerDesc, phase
        return generateNetwork layers, header
