utils = require '../utils/utils.coffee'

areShapesEqual = (x, y) ->
    if x.length != y.length
        return false
    for i in [0...x.length]
        if x[i] != y[i]
            return false
    return true

getValueOrDefault = (param, defaultValue) ->
    if param? then param else defaultValue

extractKernelSizes =(params) ->
    params.kernel_size or [ params.kernel_h, params.kernel_w ]

extractPaddingSizes = (params) ->
    if params.pad?
        return params.pad
    if (not params.pad_h?) and (not params.pad_w?)
        return 0
    return [
        getValueOrDefault params.pad_h, 0
        getValueOrDefault params.pad_w, 0
    ]

extractStrideSizes = (params) ->
    if params.stride?
        return params.stride
    if (not params.stride_h?) and (not params.stride_w?)
        return 1
    return [
        getValueOrDefault params.stride_h, 1
        getValueOrDefault params.stride_w, 1
    ]

getParameterAsArray = (parameter, requiredLength, name) ->
    if utils.typeIsArray parameter
        if parameter.length != requiredLength
            throw "Dimensions of the '#{name}' parameter " +
                  "must be equal to #{requiredLength}."
        return parameter
    return (parameter for i in [0...requiredLength])

shapesToString = (inputShapes) ->
    text = '['
    for shape in inputShapes
        text += " [ #{shape} ]"
    text += ' ]'
    return text


layers = {}
layers.uniform =
class @UniformLayer
    inferShapes: (bottoms, tops) ->
        unless tops?[0]? then return
        # Assume 'Uniform' layer doen't change the output shape
        # We interpret all currently unsupported layer as 'Uniform'
        for i in [0...tops.length]
            tops[i].shape = bottoms[i].shape[..]

layers.Loss =
class @LossLayer
    inferShapes: (bottoms, tops) ->
        unless tops?[0]? then return
        # Loss layer always returns scalar
        tops[0].shape = [ 1 ]

layers.Data =
class @DataLayer
    constructor: (attribs) ->
        @defaultBatchSize = 1
        @defaultChannels  = 3
        @outputShape = @tryExtractShapes attribs

    inferShapes: (bottoms, tops) =>
        unless tops?[0]? then return
        @checkParameters bottoms, tops
        tops[0].shape = @outputShape[..]
        tops[1].shape = @outputShape[..0] if tops[1]

    checkParameters: (bottoms, tops) =>
        unless @outputShape?
            throw "Can't extract data shape from Data layer"
        if bottoms?.length > 0
            throw "Data layer doesn't expect any input."
        unless tops?.length in [1, 2]
            throw 'Outputs number of Data layer must be equal to one or two.'

    tryExtractShapes: (attribs) =>
        shape = attribs?.input_param?.shape?.dim
        unless shape?
            shape = attribs?.input_param?.shape
        unless shape?
            shape = attribs?.shape
        unless shape?
            shape = @tryExtractShapeFromTransformParam attribs
        unless shape?
            shape = @tryExtractShapeFromMemoryDataLayer attribs
        return shape

    tryExtractShapeFromTransformParam: (attribs) =>
        cropSize = attribs.transform_param?.crop_size
        if cropSize?
            channels = @defaultChannels
            channels = 1 if attribs.transform_param.force_gray
            return [@defaultBatchSize, channels, cropSize, cropSize]

    tryExtractShapeFromMemoryDataLayer: (attribs) =>
        param = attribs?.memory_data_param
        batch_size = param.batch_size or @defaultBatchSize
        channels   = param.channels or @defaultChannels
        height     = param.height
        width      = param.width
        if height? and width?
            return [batch_size, channels, height, width]

class ConvolutionLayerBase
    constructor: (@name, attribs) ->
        params = attribs?.convolution_param
        unless params?
            throw "#{@name} layer must have convolution_param."
        @filters  = params.num_output
        @padding  = extractPaddingSizes params
        @stride   = extractStrideSizes  params
        @kernel   = extractKernelSizes  params
        @dilation = getValueOrDefault params.dilation, 1
        @axis     = getValueOrDefault params.axis, 1

    inferShapes: (bottoms, tops) =>
        unless tops?[0]? then return
        @checkParameters bottoms, tops
        # Convolution layer behaviour is alligned with Caffe
        # The layer processes each bottom -> top pair independently
        for i in [0...tops.length]
            @inferShapesForOneBlob bottoms[i], tops[i]

    inferShapesForOneBlob: (bottom, top) =>
        inputShape = bottom.shape
        outputShape = inputShape[..]
        succeedingDimensions = inputShape[@axis + 1..]
        sucDimLength = succeedingDimensions.length
        padding  = getParameterAsArray @padding,  sucDimLength, 'padding'
        kernel   = getParameterAsArray @kernel,   sucDimLength, 'kernel'
        stride   = getParameterAsArray @stride,   sucDimLength, 'stride'
        dilation = getParameterAsArray @dilation, sucDimLength, 'dilation'
        @inferShapesForOneBlobInternal inputShape, outputShape, padding,
                                       kernel, stride, dilation
        top.shape = outputShape

    inferShapesForOneBlobInternal: (input, output, padding, kernel, stride, dilation) =>
        # Assume 'input' and 'output' are shapes
        undefined

    checkParameters: (bottoms, tops) =>
        unless @filters?
            throw "#{@name} layer must have num_output parameter."
        if not @kernel? and (not @kernel[0]? or not @kernel[1]?)
            console.log @kernel
            throw "#{@name} kernel sizes must be set."
        unless bottoms?
            throw "#{@name} layer received undefined bottom blobs."
        if bottoms.length != tops.length
            throw "#{@name} layer can process number of top blobs which is equal to " +
                  "the number of bottom blobs, but received #{tops.length} top blobs and " +
                  "#{bottoms.length} bottom blobs."

layers.Convolution =
class @ConvolutionLayer extends ConvolutionLayerBase
    constructor: (attribs) ->
        super 'Convolution', attribs

    inferShapesForOneBlobInternal: (input, output, padding, kernel, stride, dilation) =>
        output[@axis] = @filters
        for i in [@axis + 1...input.length]
            ii = i - @axis - 1
            kernelExtent = dilation[ii] * (kernel[ii] - 1) + 1;
            outDim = (input[i] + 2 * padding[ii] - kernelExtent) / stride[ii] + 1
            output[i] = Math.floor outDim

layers.Deconvolution =
class @DeconvolutionLayer extends ConvolutionLayerBase
    constructor: (attribs) ->
        super 'Deconvolution', attribs

    inferShapesForOneBlobInternal: (input, output, padding, kernel, stride, dilation) =>
        output[@axis] = @filters
        for i in [@axis + 1...input.length]
            ii = i - @axis - 1
            kernelExtent = dilation[ii] * (kernel[ii] - 1) + 1;
            outDim = stride[ii] * (input[i] - 1) + kernelExtent - 2 * padding[ii]
            output[i] = Math.floor outDim

layers.Pooling =
class @PoolingLayer
    constructor: (attribs) ->
        @spatialDimSize = 2
        params = attribs?.pooling_param
        if not params?
            throw 'Pooling layer must have pooling_param.'
        @padding = extractPaddingSizes params
        @stride  = extractStrideSizes  params
        @kernel  = extractKernelSizes  params
        @isGlobalPooling = getValueOrDefault params.global_pooling, false
        # Caffe Pooling layer works only with two last axes, so pool will be
        # applied to dim - 2 and dim - 1 axes.

    inferShapes: (bottoms, tops) =>
        unless tops?[0]? then return
        # Caffe pooling implementation works only with the single bottom -> top
        # pair. Blob tops[1] stores the output pooling mask if tops.length > 1.
        @checkParameters bottoms, tops
        inputShape = bottoms[0].shape
        outputShape = inputShape[..]
        padding = getParameterAsArray @padding, @spatialDimSize, 'padding'
        stride  = getParameterAsArray @stride,  @spatialDimSize, 'stride'
        kernel  = @getKernelSizes inputShape
        for i in [0...@spatialDimSize]
            ii = inputShape.length - @spatialDimSize + i
            outDim = (inputShape[ii] + 2 * padding[i] - kernel[i]) / stride[i]
            outDimRounded = (Math.floor(Math.ceil outDim)) + 1
            if (outDimRounded - 1) * stride[i] >= inputShape[ii] + padding[i]
                outDimRounded--
            outputShape[ii] = outDimRounded
        tops[0].shape = outputShape
        tops[1].shape = outputShape[..] if tops[1]

    checkParameters: (bottoms, tops) =>
        if not @kernel? and (not @kernel[0]? or not @kernel[1]?)
            throw 'Pooling layer must have kernel_size parameter.'
        unless bottoms?
            throw 'Pooling layer received undefined bottom blobs.'
        if bottoms.length != 1
            throw "Pooling layer can process exactly one input, " +
                  "but received #{bottoms.length} input shapes."
        unless tops.length in [1, 2]
            throw "Pooling layer produces single output shape or two equal " +
                  "shapes if the second top shape is specified."

    getKernelSizes: (inputShape) =>
        if @isGlobalPooling
            kernel = inputShape[-@spatialDimSize..]
        else
            kernel = getParameterAsArray @kernel, @spatialDimSize, 'kernel'
        return kernel


layers.InnerProduct =
class @InnerProductLayer
    constructor: (attribs) ->
        params = attribs?.inner_product_param
        if not params?
            throw 'InnerProduct layer must have inner_product_param.'
        @numOutput = params.num_output
        @axis = getValueOrDefault params.axis, 1

    inferShapes: (bottoms, tops) =>
        unless tops?[0]? then return
        @checkParameters bottoms, tops
        inputShape = bottoms[0].shape
        outputShape = inputShape[...@axis]
        outputShape[@axis] = @numOutput
        tops[0].shape = outputShape

    checkParameters: (bottoms, tops) =>
        if not @numOutput?
            throw 'InnerProduct layer must have num_output parameter.'
        unless bottoms?
            throw 'InnerProduct layer received undefined bottom blobs.'
        if bottoms.length != 1 or tops.length != 1
            throw "InnerProduct layer can accept and produce exactly one blob, but " +
                  "received #{bottoms.length} bottoms blobs and #{tops.length} top blobs."


layers.Concat =
class @ConcatLayer
    constructor: (attribs) ->
        params = attribs?.concat_param
        axis   = params?.concat_dim
        axis  ?= params?.axis
        @axis  = getValueOrDefault axis, 1

    inferShapes: (bottoms, tops) =>
        unless tops?[0]? then return
        @checkParameters bottoms, tops
        firstInputShape = bottoms[0].shape
        outputShape = firstInputShape[..]
        outputShape[@axis] = 0
        for bottom in bottoms
            outputShape[@axis] += bottom.shape[@axis]
        tops[0].shape = outputShape

    checkParameters: (bottoms, tops) =>
        unless bottoms?[0]?
            throw 'Concat layer must have at least one bottom blob.'
        firstShape = bottoms[0].shape
        inputShapes = (bottom.shape for bottom in bottoms)
        for shape in inputShapes
            unless @checkInputShapeAxes firstShape, shape
                throw "Concat layer received incorrect input shapes: " +
                      "#{shapesToString(inputShapes)}. " +
                      "All axes except axis along which concatenation " +
                      "is performing must have the same sizes."

    checkInputShapeAxes: (firstShape, shape) =>
        if firstShape.length != shape.length
            return false
        for i in [0...shape.length]
            if i != @axis and firstShape[i] != shape[i]
                return false
        return true

layers.Eltwise =
class @EltwiseLayer
    inferShapes: (bottoms, tops) =>
        unless tops?[0]? then return
        @checkParameters bottoms, tops
        firstInputShape = bottoms[0].shape
        tops[0].shape = firstInputShape[..]

    checkParameters: (bottoms, tops) =>
        unless bottoms?[0]?
            throw 'Eltwise layer must have at least one input.'
        inputShapes = (bottom.shape for bottom in bottoms)
        firstShape = inputShapes[0]
        for shape in inputShapes
            unless areShapesEqual firstShape, shape
                throw "Eltwise layer received incorrect input shapes: " +
                      "#{shapesToString(inputShapes)}. " +
                      "All axes must have the same sizes."

layers.Crop =
class @CropLayer
    constructor: (attribs) ->
        params = attribs.crop_param
        @axis = getValueOrDefault params?.axis, 0

    inferShapes: (bottoms, tops) =>
        unless tops?[0]? then return
        @checkParameters bottoms, tops
        outputShape = bottoms[0].shape[..]
        for i in [@axis...outputShape.length]
            outputShape[i] = bottoms[1].shape[i]
        tops[0].shape = outputShape

    checkParameters: (bottoms, tops) =>
        if bottoms?.length != 2
            throw 'Crop layer must have exactly two bottom blobs.'

isLossLayer = (layerType) ->
    /loss/i.test layerType

isDataLayer = (layerType) ->
    (/input/i.test layerType) or
    (/data/i.test layerType)

getLayerType = (layerTypeName) ->
    if isDataLayer layerTypeName
        return layers.Data
    if isLossLayer layerTypeName
        return layers.Loss
    layerType = layers[layerTypeName]
    unless layerType?
        layerTypeNameTitle = utils.toTitleCase layerTypeName
        layerType = layers[layerTypeNameTitle]
    return layerType or layers.uniform

exports.inferTopShapes = (node) ->
    LayerType = getLayerType node.type
    try
        layer = new LayerType node.attribs
        layer.inferShapes node.bottoms, node.tops
        return (top.shape for top in node.tops)
    catch e
        throw "Can't infer output shape of the '#{node.name}' " +
              "layer of type '#{node.type}'. " + e
