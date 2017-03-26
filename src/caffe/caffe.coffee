Parser  = require './parser'
Layers  = require './layers.coffee'
Network = require './../network.coffee'
Utils   = require './../utils/utils.coffee'
Notify  = require './../notify.coffee'

class Blob
    constructor: (@name) ->
        @readers = [ ]
        @writers = [ ]

    addWriter: (writerNode) =>
        @writers.push writerNode
        writerNode.tops ?= [ ]
        writerNode.tops.push @

    addReader: (readerNode) =>
        @readers.push readerNode
        readerNode.bottoms ?= [ ]
        readerNode.bottoms.push @

    connectWithNodeAsTop: (blob, writerNode) ->
        blob.addWriter writerNode

    connectWithNodeAsBottom: (blob, readerNode) ->
        blob.addReader readerNode


class BlobTable
    constructor: (layers) ->
        @table = { }
        @fillInternalTable layers

    fillInternalTable: (layers) =>
        for layer in layers
            @generateBlobsByNames layer.top
            @generateBlobsByNames layer.bottom

    getBlobByName: (blobName) =>
        @table[blobName]

    generateBlobsByNames: (blobNames) =>
        unless blobNames? then return
        for blobName in Utils.asArray(blobNames)
            unless blobName of @table
                blobNode = new Blob blobName
                @table[blobName] = blobNode


class NodesGenerator
    constructor: (@blobTable) ->

    fillNetwork: (network, layers) =>
        @connectNodesWithBlobs network, layers
        @connectNodesWithEachOther()
        return network

    connectNodesWithEachOther: =>
        for own k, blob of @blobTable.table
            inplaceNodes = _.intersection blob.writers, blob.readers
            nonInplaceWriters = _.difference blob.writers, inplaceNodes
            nonInplaceReaders = _.difference blob.readers, inplaceNodes
            writerNode = @getFirstWriterNode blob, nonInplaceWriters
            if writerNode?
                lastInplaceNode = @connectInplaceNodes writerNode, inplaceNodes
                @connectNonInplaceNodes lastInplaceNode, nonInplaceReaders

    connectInplaceNodes: (parentNode, inplaceNodes) =>
        parentNode.coalesce ?= [ ]
        lastParrentNode = parentNode
        for inplaceNode in inplaceNodes
            inplaceNode.annotation = 'InPlace'
            lastParrentNode.addChild inplaceNode
            parentNode.coalesce.push inplaceNode
            lastParrentNode = inplaceNode
        return lastParrentNode

    connectNonInplaceNodes: (parentNode, nonInplaceNodes) =>
        for node in nonInplaceNodes
            parentNode.addChild node

    connectNodesWithBlobs: (network, layers) =>
        for layer in layers
            node = @createNode network, layer
            @connectSingleNodeWithBlobs node, Blob::connectWithNodeAsTop, layer.top
            @connectSingleNodeWithBlobs node, Blob::connectWithNodeAsBottom, layer.bottom
        return network

    connectSingleNodeWithBlobs: (node, connectorFunction, blobNames) =>
        unless blobNames? then return
        for blobName in Utils.asArray(blobNames)
            blob = @blobTable.getBlobByName blobName
            connectorFunction blob, node

    createNode: (net, layer) ->
        node = net.createNode layer.name, layer.type, layer.attribs
        node.bottoms = [ ]
        node.tops = [ ]
        return node

    getFirstWriterNode: (blob, nonInplaceWriters) =>
        if nonInplaceWriters.length > 1
            throw "Writers number for the '#{blob.name}' Blob is greater than one." +
                  "Non inplace layers with names #{(n.name for n in nonInplaceWriters)} " +
                  "write to the same memory, Caffe topology is incorrect."
        return nonInplaceWriters[0]


class LayersGenerator
    constructor: (@descriptors, @header) ->

    generate: (phase) =>
        descriptors = @tryExtractDescriptorsFromHeader()
        layers = @generateRegularLayers phase
        return layers

    generateRegularLayers: (phase) =>
        phase ?= 'train'
        layers = [ ]
        headerKeys = ['name', 'type', 'top', 'bottom']
        for entry in @descriptors
            # Support the deprecated Caffe 'layers' key as well.
            layerDesc = entry.layer or entry.layers
            if layerDesc?
                layer = { }
                _.extend layer, _.pick(layerDesc, headerKeys)
                layer.attribs = _.omit layerDesc, headerKeys
                layers.push layer
            else
                console.log 'Unidentified entry ignored: ', entry
        layers = _.filter layers, (layer) ->
            layerPhase = layer.attribs.include?.phase
            not (layerPhase? and layerPhase!=phase)
        return layers

    tryExtractDescriptorsFromHeader: =>
        dataLayer = @tryConvertHeaderInputToDataLayer()
        unless dataLayer?
            dataLayer = @tryConvertInputShapeEntryToDataLayer()
        if dataLayer?
            @descriptors.push dataLayer
        return @descriptors

    tryConvertInputShapeEntryToDataLayer: =>
        for entry in @descriptors
            inputShape = entry.input_shape
            if inputShape? then break
        if inputShape?
            inputName = @header.input or 'data'
            return @createDataLayerDescriptor inputName, inputShape.dim

    tryConvertHeaderInputToDataLayer: =>
        layerName = @header?.input
        inputDim  = @header?.input_dim
        if layerName? and inputDim?
            return @createDataLayerDescriptor layerName, inputDim

    createDataLayerDescriptor: (name, shape) ->
        layer = {
            name: name,
            type: 'Data',
            top: name,
            input_param: { shape: shape }
        }
        return { layer: layer }


generateNetwork = (layers, header) ->
    try
        network = new Network header.name
        blobTable = new BlobTable layers
        generator = new NodesGenerator blobTable
        return generator.fillNetwork network, layers
    catch e
        Notify.error "Can't build network graph. " + e

generateLayers = (descriptors, header) ->
    layersGenerator = new LayersGenerator descriptors, header
    return layersGenerator.generate()

setNodeOutputShapesAttribute = (node) ->
    unless node?.tops?.length > 0 then return
    node.attribs.blob_shapes = { }
    for blob in node.tops
        shapeText = '[ ' + blob.shape.join(', ') + ' ]'
        node.attribs.blob_shapes[blob.name] = shapeText

computePrecedingShapes = (node) ->
    for parent in node.parents
        unless parent.areTopShapesInfered
            computePrecedingShapes parent
            parent.areTopShapesInfered = true
    Layers.inferTopShapes node
    setNodeOutputShapesAttribute node

computeShapes = (net) ->
    endNodes = net.findEndNodes()
    try
        for node in endNodes
            computePrecedingShapes node
    catch e
        Notify.warning "Can't infer network data shapes. " + e

module.exports =
class CaffeParser
    @parse : (txt, phase) ->
        [header, descriptors] = Parser.parse txt
        layers = generateLayers descriptors, header
        network = generateNetwork layers, header
        computeShapes network
        return network
