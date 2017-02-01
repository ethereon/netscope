assert = require 'assert'
layers = require '../src/caffe/layers.coffee'
utils  = require '../src/utils/utils.coffee'

runLayerTasks = (tasks, nameFunction, compareFunction) ->
    tasks.forEach (task) ->
        it nameFunction(task), ->
            compareFunction task

shapeToArrayOfShapes = (shapeOrShapes) ->
    if utils.typeIsArray shapeOrShapes[0]
        return shapeOrShapes
    return [ shapeOrShapes ]

compareLayerOutput = (LayerType, parameterMaker, task) ->
    [inputShapeOrShapes, expectingOutputShapeOrShapes, params] = task
    caffeParams = parameterMaker utils.asArray(params)...
    layer = new LayerType caffeParams
    inputShapes = shapeToArrayOfShapes inputShapeOrShapes
    expectingOutputShapes = shapeToArrayOfShapes expectingOutputShapeOrShapes
    bottoms = ( { shape: s } for s in inputShapes )
    tops = ( { shape: null } for s in expectingOutputShapes )
    layer.inferShapes bottoms, tops
    actualOutputShapes = (top.shape for top in tops)
    assert.deepEqual expectingOutputShapes, actualOutputShapes

stringifyConvParams = (filters, kernels, strides, paddings,
                       useKernelHW = false,
                       useStrideHW = false,
                       usePaddingHW = false) ->
    kernelsStr  = utils.asArray(kernels).join 'x'
    stridesStr  = utils.asArray(strides).join 'x'
    paddingsStr = utils.asArray(paddings).join 'x'
    text = "#{kernelsStr}"
    text += "@#{filters}" if filters?
    text += " + #{stridesStr}s" if strides?
    text += " + #{paddingsStr}p" if paddings?
    text += " kernel_hw" if useKernelHW
    text += " stride_hw" if useStrideHW
    text += " padding_hw" if usePaddingHW
    return text

setupSlidingWindowParameters = (params, kernels, strides, paddings,
                                useKernelHW, useStrideHW, usePaddingHW) ->
    if useKernelHW
        getKernel = (i) =>
            if kernels?[i]? then kernels[i] else kernels
        params.kernel_h = getKernel 0
        params.kernel_w = getKernel 1
    else
        params.kernel_size = kernels
    if useStrideHW
        getStride = (i) =>
            if strides?[i]? then strides[i] else strides
        params.stride_h = getStride 0
        params.stride_w = getStride 1
    else
        params.stride = strides if strides?
    if usePaddingHW
        getPaddings = (i) =>
            if paddings?[i]? then paddings[i] else paddings
        params.pad_h = getPaddings 0
        params.pad_w = getPaddings 1
    else
        params.pad = paddings if paddings?

runConvTasks = (tasks, useKernelHW = false,
                       useStrideHW = false,
                       usePaddingHW = false) ->
    makeCaffeConvParams = (filters, kernels, strides, paddings) =>
        params =  { num_output: filters }
        setupSlidingWindowParameters params, kernels, strides, paddings,
                                     useKernelHW, useStrideHW, usePaddingHW
        return { convolution_param: params }
    makeConvTaskName = (task) =>
        convParamsStr = stringifyConvParams task[2]...,
                        useKernelHW, useStrideHW, usePaddingHW
        return "from [ #{task[0]} ] to [ #{task[1]} ] with #{convParamsStr}"
    compareConvOutput = (task) ->
        compareLayerOutput layers.ConvolutionLayer, makeCaffeConvParams, task
    runLayerTasks tasks, makeConvTaskName, compareConvOutput


runPoolTasks = (tasks, useKernelHW = false,
                       useStrideHW = false,
                       usePaddingHW = false) ->
    makeCaffePoolParams = (kernels, strides, paddings) ->
        params = { }
        setupSlidingWindowParameters params, kernels, strides, paddings,
                                     useKernelHW, useStrideHW, usePaddingHW
        return { pooling_param: params }
    makePoolTaskName = (task) ->
        poolParamsStr = stringifyConvParams null, task[2]...,
                        useKernelHW, useStrideHW, usePaddingHW
        return "from [ #{task[0]} ] to [ #{task[1]} ] with #{poolParamsStr}"
    comparePoolOutput = (task) ->
        compareLayerOutput layers.PoolingLayer, makeCaffePoolParams, task
    runLayerTasks tasks, makePoolTaskName, comparePoolOutput


runInnerProductTasks = (tasks) ->
    makeCaffeInnerProductParams = (numOutput, axis) ->
        params = { num_output: numOutput }
        params.axis = axis if axis?
        return { inner_product_param: params }
    compareInnerProductOutput = (task) ->
        compareLayerOutput layers.InnerProductLayer, makeCaffeInnerProductParams, task
    makeInnerProductTaskName = (task) ->
        params = task[2]
        text = "from [ #{task[0]} ] to [ #{task[1]} ] where n = #{params[0]}"
        text += " and axis = #{params[1]}" if params[1]?
        return text
    runLayerTasks tasks, makeInnerProductTaskName, compareInnerProductOutput


runConcatTasks = (tasks) ->
    makeCaffeConcatParams = (axis) ->
        params = { }
        params.axis = axis if axis?
        return { concat_param: params }
    compareConcatOutput = (task) ->
        compareLayerOutput layers.ConcatLayer, makeCaffeConcatParams, task
    makeConcatTaskName = (task) ->
        [inputShapes, outputShape, axis] = task
        text = 'from ['
        for shape in inputShapes
            text += " [ #{shape} ]"
        text += " ] to #{outputShape}"
        text += " where axis = #{axis}" if axis?
        return text
    runLayerTasks tasks, makeConcatTaskName, compareConcatOutput


describe 'Compute 2D Convolution output shape', ->
    # [ input shape, expecting output shape ]
    # null means default parameter value
    shapes1 = (p) -> [ [32, 3, 227, 227], [32, 96, 55, 55], p ]
    shapes2 = (p) -> [ [32, 256, 27, 27], [32, 256, 27, 27], p ]
    shapes3 = (p) -> [ [1, 256, 15, 15], [1, 96, 15, 15], p ]
    # [filters, kernels, strides, paddings]
    tasks = [
        shapes1 [ 96,  [11, 11], [4, 4], [0, 0] ]
        shapes1 [ 96,  [11, 11], [4, 4],   0    ]
        shapes1 [ 96,  [11, 11], [4, 4],  null  ]
        shapes1 [ 96,  [11, 11],    4,   [0, 0] ]
        shapes1 [ 96,  [11, 11],    4,     0    ]
        shapes1 [ 96,  [11, 11],    4,    null  ]
        shapes1 [ 96,     11,    [4, 4], [0, 0] ]
        shapes1 [ 96,     11,    [4, 4],   0    ]
        shapes1 [ 96,     11,    [4, 4],  null  ]
        shapes1 [ 96,     11,       4,   [0, 0] ]
        shapes1 [ 96,     11,       4,     0    ]
        shapes1 [ 96,     11,       4,    null  ]
        shapes2 [ 256, [5, 5],   [1, 1], [2, 2] ]
        shapes2 [ 256, [5, 5],   [1, 1],   2    ]
        shapes2 [ 256, [5, 5],     1,    [2, 2] ]
        shapes2 [ 256, [5, 5],     1,      2    ]
        shapes2 [ 256,    5,     [1, 1], [2, 2] ]
        shapes2 [ 256,    5,     [1, 1],   2    ]
        shapes2 [ 256,    5,       1,    [2, 2] ]
        shapes2 [ 256,    5,       1,      2    ]
        shapes2 [ 256,    5,      null,  [2, 2] ]
        shapes2 [ 256,    5,      null,    2    ]
        shapes2 [ 256, [5, 5],    null,  [2, 2] ]
        shapes2 [ 256, [5, 5],    null,    2    ]
        shapes3 [ 96,  [1, 7],   [1, 1], [0, 3] ]
    ]
    falsetrue = [false, true]
    for useKernelHW in falsetrue
        for useStrideHW in falsetrue
            for usePaddingHW in falsetrue
                runConvTasks tasks, useKernelHW, useStrideHW, usePaddingHW

describe 'Compute 3D Convolution output shape', ->
    # [ input shape, expecting output shape ]
    shapes1 = (p) -> [ [1, 3, 224, 224, 224], [1, 64, 112, 112, 112], p ]
    shapes2 = (p) -> [ [1, 64, 28, 28, 28], [1, 128, 14, 14, 14], p ]
    # [filters, kernels, strides, paddings]
    tasks = [
        shapes1 [ 64, [7, 7, 7], [2, 2, 2], [3, 3, 3] ]
        shapes1 [ 64,     7,         2,         3     ]
        shapes1 [ 64, [2, 7, 7],     2,     [0, 3, 3] ]
        shapes1 [ 64, [7, 2, 7],     2,     [3, 0, 3] ]
        shapes1 [ 64, [7, 7, 2],     2,     [3, 3, 0] ]
        shapes2 [ 128, [7, 7, 2], 2, [3, 3, 0] ]
    ]
    runConvTasks tasks

describe 'Compute Pooling output shape', ->
    # [ input shape, expecting output shape ]
    shapes1 = (p) -> [ [1, 192, 56, 56], [1, 192, 28, 28], p ]
    shapes2 = (p) -> [ [1, 192, 28, 28], [1, 192, 28, 28], p ]
    # [ kernels, strides, paddings ]
    tasks = [
        shapes1 [ [3, 3], [2, 2], [0, 0] ]
        shapes1 [ [3, 3], [2, 2],    0   ]
        shapes1 [ [3, 3], [2, 2],  null  ]
        shapes1 [ [3, 3],    2,   [0, 0] ]
        shapes1 [ [3, 3],    2,      0   ]
        shapes1 [ [3, 3],    2,    null  ]
        shapes1 [   3,    [2, 2], [0, 0] ]
        shapes1 [   3,    [2, 2],    0   ]
        shapes1 [   3,    [2, 2],  null  ]
        shapes1 [   3,       2,   [0, 0] ]
        shapes1 [   3,       2,      0   ]
        shapes1 [   3,       2,    null  ]
        shapes2 [ [3, 3], [1, 1], [1, 1] ]
        shapes2 [ [3, 3], [1, 1],    1   ]
        shapes2 [ [3, 3],    1,   [1, 1] ]
        shapes2 [ [3, 3],    1,      1   ]
        shapes2 [ [3, 3],  null,  [1, 1] ]
        shapes2 [ [3, 3],  null,     1   ]
    ]
    falsetrue = [false, true]
    for useKernelHW in falsetrue
        for useStrideHW in falsetrue
            for usePaddingHW in falsetrue
                runPoolTasks tasks, useKernelHW, useStrideHW, usePaddingHW

describe 'Compute InnerProduct output shape', ->
    # [ input shape, expecting output shape, [ num_outputs, axis ] ]
    tasks = [
        [ [32, 300, 28], [ 128 ], [128, 0] ]
        [ [32, 300, 28, 28], [32, 512], [512] ]
        [ [32, 300, 28, 28], [32, 512], [512, 1] ]
        [ [32, 300, 28, 28, 46], [32, 1024], [1024] ]
        [ [32, 300, 28, 28, 46], [32, 1024], [1024, 1] ]
        [ [32, 300, 28, 28, 46], [32, 300, 1024], [1024, 2] ]
        [ [32, 300, 28, 28, 46], [32, 300, 28, 512], [512, 3] ]
    ]
    runInnerProductTasks tasks

describe 'Compute Concat output shape', ->
    # [ [ input shapes ], expecting output shape, [ axis ] ]
    tasks = [
        [ [[32, 54, 43, 43]], [32, 54, 43, 43] ]
        [ [[32, 54, 43, 43], [32, 21, 43, 43]], [32, 75, 43, 43] ]
        [ [[32, 21, 43, 43], [32, 21, 43, 43]], [64, 21, 43, 43], 0 ]
        [ [[32, 54, 43, 43], [32, 21, 43, 43]], [32, 75, 43, 43], 1 ]
        [ [[32, 21, 43, 43], [32, 21, 20, 43]], [32, 21, 63, 43], 2 ]
        [ [[32, 21, 30, 30], [32, 21, 30, 25]], [32, 21, 30, 55], 3 ]
    ]
    runConcatTasks tasks
