(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var AppController, Editor, Notify, Renderer,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  slice = [].slice;

Renderer = require('./renderer.coffee');

Editor = require('./editor.coffee');

Notify = require('./notify.coffee');

module.exports = AppController = (function() {
  function AppController() {
    this.handleWarning = bind(this.handleWarning, this);
    this.handleError = bind(this.handleError, this);
    this.inProgress = false;
    this.$spinner = $('#net-spinner');
    this.$netBox = $('#net-container');
    this.$netError = $('#net-error');
    this.$netWarn = $('#net-warning');
    this.svg = '#net-svg';
    this.setupErrorHandler();
  }

  AppController.prototype.startLoading = function() {
    var args, loader;
    loader = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
    if (this.inProgress) {
      return;
    }
    this.$netError.hide();
    this.$netWarn.hide();
    this.$netBox.hide();
    this.$spinner.show();
    return loader.apply(null, slice.call(args).concat([(function(_this) {
      return function(net) {
        return _this.completeLoading(net);
      };
    })(this)]));
  };

  AppController.prototype.completeLoading = function(net) {
    var renderer;
    this.$spinner.hide();
    $('#net-title').html(net.name.replace(/_/g, ' '));
    this.$netBox.show();
    $(this.svg).empty();
    $('.qtip').remove();
    renderer = new Renderer(net, this.svg);
    return this.inProgress = false;
  };

  AppController.prototype.makeLoader = function(loader) {
    return (function(_this) {
      return function() {
        var args;
        args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        return _this.startLoading.apply(_this, [loader].concat(slice.call(args)));
      };
    })(this);
  };

  AppController.prototype.showEditor = function(loader) {
    if (_.isUndefined(window.CodeMirror)) {
      return $.getScript('assets/js/lib/codemirror.min.js', (function(_this) {
        return function() {
          return _this.netEditor = new Editor(_this.makeLoader(loader.load));
        };
      })(this));
    }
  };

  AppController.prototype.setupErrorHandler = function() {
    window.onerror = this.handleError;
    Notify.onerror(this.handleError);
    return Notify.onwarning(this.handleWarning);
  };

  AppController.prototype.handleError = function(message, filename, lineno, colno, e) {
    var msg;
    msg = message;
    if (((e != null ? e.line : void 0) != null) && ((e != null ? e.column : void 0) != null)) {
      msg = "Line " + e.line + ", Column " + e.column + ": " + e.message;
    }
    this.$spinner.hide();
    $('.msg', this.$netError).html(msg);
    this.$netError.show();
    return this.inProgress = false;
  };

  AppController.prototype.handleWarning = function(message) {
    $('.msg', this.$netWarn).html(message);
    return this.$netWarn.show();
  };

  return AppController;

})();


},{"./editor.coffee":5,"./notify.coffee":9,"./renderer.coffee":10}],2:[function(require,module,exports){
var Blob, BlobTable, CaffeParser, Layers, LayersGenerator, Network, NodesGenerator, Notify, Parser, Utils, computePrecedingShapes, computeShapes, generateLayers, generateNetwork, setNodeOutputShapesAttribute,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  hasProp = {}.hasOwnProperty;

Parser = require('./parser');

Layers = require('./layers.coffee');

Network = require('./../network.coffee');

Utils = require('./../utils/utils.coffee');

Notify = require('./../notify.coffee');

Blob = (function() {
  function Blob(name1) {
    this.name = name1;
    this.addReader = bind(this.addReader, this);
    this.addWriter = bind(this.addWriter, this);
    this.readers = [];
    this.writers = [];
  }

  Blob.prototype.addWriter = function(writerNode) {
    this.writers.push(writerNode);
    if (writerNode.tops == null) {
      writerNode.tops = [];
    }
    return writerNode.tops.push(this);
  };

  Blob.prototype.addReader = function(readerNode) {
    this.readers.push(readerNode);
    if (readerNode.bottoms == null) {
      readerNode.bottoms = [];
    }
    return readerNode.bottoms.push(this);
  };

  Blob.prototype.connectWithNodeAsTop = function(blob, writerNode) {
    return blob.addWriter(writerNode);
  };

  Blob.prototype.connectWithNodeAsBottom = function(blob, readerNode) {
    return blob.addReader(readerNode);
  };

  return Blob;

})();

BlobTable = (function() {
  function BlobTable(layers) {
    this.generateBlobsByNames = bind(this.generateBlobsByNames, this);
    this.getBlobByName = bind(this.getBlobByName, this);
    this.fillInternalTable = bind(this.fillInternalTable, this);
    this.table = {};
    this.fillInternalTable(layers);
  }

  BlobTable.prototype.fillInternalTable = function(layers) {
    var i, layer, len, results;
    results = [];
    for (i = 0, len = layers.length; i < len; i++) {
      layer = layers[i];
      this.generateBlobsByNames(layer.top);
      results.push(this.generateBlobsByNames(layer.bottom));
    }
    return results;
  };

  BlobTable.prototype.getBlobByName = function(blobName) {
    return this.table[blobName];
  };

  BlobTable.prototype.generateBlobsByNames = function(blobNames) {
    var blobName, blobNode, i, len, ref, results;
    if (blobNames == null) {
      return;
    }
    ref = Utils.asArray(blobNames);
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      blobName = ref[i];
      if (!(blobName in this.table)) {
        blobNode = new Blob(blobName);
        results.push(this.table[blobName] = blobNode);
      } else {
        results.push(void 0);
      }
    }
    return results;
  };

  return BlobTable;

})();

NodesGenerator = (function() {
  function NodesGenerator(blobTable1) {
    this.blobTable = blobTable1;
    this.getFirstWriterNode = bind(this.getFirstWriterNode, this);
    this.connectSingleNodeWithBlobs = bind(this.connectSingleNodeWithBlobs, this);
    this.connectNodesWithBlobs = bind(this.connectNodesWithBlobs, this);
    this.connectNonInplaceNodes = bind(this.connectNonInplaceNodes, this);
    this.connectInplaceNodes = bind(this.connectInplaceNodes, this);
    this.connectNodesWithEachOther = bind(this.connectNodesWithEachOther, this);
    this.fillNetwork = bind(this.fillNetwork, this);
  }

  NodesGenerator.prototype.fillNetwork = function(network, layers) {
    this.connectNodesWithBlobs(network, layers);
    this.connectNodesWithEachOther();
    return network;
  };

  NodesGenerator.prototype.connectNodesWithEachOther = function() {
    var blob, inplaceNodes, k, lastInplaceNode, nonInplaceReaders, nonInplaceWriters, ref, results, writerNode;
    ref = this.blobTable.table;
    results = [];
    for (k in ref) {
      if (!hasProp.call(ref, k)) continue;
      blob = ref[k];
      inplaceNodes = _.intersection(blob.writers, blob.readers);
      nonInplaceWriters = _.difference(blob.writers, inplaceNodes);
      nonInplaceReaders = _.difference(blob.readers, inplaceNodes);
      writerNode = this.getFirstWriterNode(blob, nonInplaceWriters);
      if (writerNode != null) {
        lastInplaceNode = this.connectInplaceNodes(writerNode, inplaceNodes);
        results.push(this.connectNonInplaceNodes(lastInplaceNode, nonInplaceReaders));
      } else {
        results.push(void 0);
      }
    }
    return results;
  };

  NodesGenerator.prototype.connectInplaceNodes = function(parentNode, inplaceNodes) {
    var i, inplaceNode, lastParrentNode, len;
    if (parentNode.coalesce == null) {
      parentNode.coalesce = [];
    }
    lastParrentNode = parentNode;
    for (i = 0, len = inplaceNodes.length; i < len; i++) {
      inplaceNode = inplaceNodes[i];
      inplaceNode.annotation = 'InPlace';
      lastParrentNode.addChild(inplaceNode);
      parentNode.coalesce.push(inplaceNode);
      lastParrentNode = inplaceNode;
    }
    return lastParrentNode;
  };

  NodesGenerator.prototype.connectNonInplaceNodes = function(parentNode, nonInplaceNodes) {
    var i, len, node, results;
    results = [];
    for (i = 0, len = nonInplaceNodes.length; i < len; i++) {
      node = nonInplaceNodes[i];
      results.push(parentNode.addChild(node));
    }
    return results;
  };

  NodesGenerator.prototype.connectNodesWithBlobs = function(network, layers) {
    var i, layer, len, node;
    for (i = 0, len = layers.length; i < len; i++) {
      layer = layers[i];
      node = this.createNode(network, layer);
      this.connectSingleNodeWithBlobs(node, Blob.prototype.connectWithNodeAsTop, layer.top);
      this.connectSingleNodeWithBlobs(node, Blob.prototype.connectWithNodeAsBottom, layer.bottom);
    }
    return network;
  };

  NodesGenerator.prototype.connectSingleNodeWithBlobs = function(node, connectorFunction, blobNames) {
    var blob, blobName, i, len, ref, results;
    if (blobNames == null) {
      return;
    }
    ref = Utils.asArray(blobNames);
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      blobName = ref[i];
      blob = this.blobTable.getBlobByName(blobName);
      results.push(connectorFunction(blob, node));
    }
    return results;
  };

  NodesGenerator.prototype.createNode = function(net, layer) {
    var node;
    node = net.createNode(layer.name, layer.type, layer.attribs);
    node.bottoms = [];
    node.tops = [];
    return node;
  };

  NodesGenerator.prototype.getFirstWriterNode = function(blob, nonInplaceWriters) {
    var n;
    if (nonInplaceWriters.length > 1) {
      throw ("Writers number for the '" + blob.name + "' Blob is greater than one.") + ("Non inplace layers with names " + ((function() {
        var i, len, results;
        results = [];
        for (i = 0, len = nonInplaceWriters.length; i < len; i++) {
          n = nonInplaceWriters[i];
          results.push(n.name);
        }
        return results;
      })()) + " ") + "write to the same memory, Caffe topology is incorrect.";
    }
    return nonInplaceWriters[0];
  };

  return NodesGenerator;

})();

LayersGenerator = (function() {
  function LayersGenerator(descriptors1, header1) {
    this.descriptors = descriptors1;
    this.header = header1;
    this.tryConvertHeaderInputToDataLayer = bind(this.tryConvertHeaderInputToDataLayer, this);
    this.tryConvertInputShapeEntryToDataLayer = bind(this.tryConvertInputShapeEntryToDataLayer, this);
    this.tryExtractDescriptorsFromHeader = bind(this.tryExtractDescriptorsFromHeader, this);
    this.generateRegularLayers = bind(this.generateRegularLayers, this);
    this.generate = bind(this.generate, this);
  }

  LayersGenerator.prototype.generate = function(phase) {
    var descriptors, layers;
    descriptors = this.tryExtractDescriptorsFromHeader();
    layers = this.generateRegularLayers(phase);
    return layers;
  };

  LayersGenerator.prototype.generateRegularLayers = function(phase) {
    var entry, headerKeys, i, layer, layerDesc, layers, len, ref;
    if (phase == null) {
      phase = 'train';
    }
    layers = [];
    headerKeys = ['name', 'type', 'top', 'bottom'];
    ref = this.descriptors;
    for (i = 0, len = ref.length; i < len; i++) {
      entry = ref[i];
      layerDesc = entry.layer || entry.layers;
      if (layerDesc != null) {
        layer = {};
        _.extend(layer, _.pick(layerDesc, headerKeys));
        layer.attribs = _.omit(layerDesc, headerKeys);
        layers.push(layer);
      } else {
        console.log('Unidentified entry ignored: ', entry);
      }
    }
    layers = _.filter(layers, function(layer) {
      var layerPhase, ref1;
      layerPhase = (ref1 = layer.attribs.include) != null ? ref1.phase : void 0;
      return !((layerPhase != null) && layerPhase !== phase);
    });
    return layers;
  };

  LayersGenerator.prototype.tryExtractDescriptorsFromHeader = function() {
    var dataLayer;
    dataLayer = this.tryConvertHeaderInputToDataLayer();
    if (dataLayer == null) {
      dataLayer = this.tryConvertInputShapeEntryToDataLayer();
    }
    if (dataLayer != null) {
      this.descriptors.push(dataLayer);
    }
    return this.descriptors;
  };

  LayersGenerator.prototype.tryConvertInputShapeEntryToDataLayer = function() {
    var entry, i, inputName, inputShape, len, ref;
    ref = this.descriptors;
    for (i = 0, len = ref.length; i < len; i++) {
      entry = ref[i];
      inputShape = entry.input_shape;
      if (inputShape != null) {
        break;
      }
    }
    if (inputShape != null) {
      inputName = this.header.input || 'data';
      return this.createDataLayerDescriptor(inputName, inputShape.dim);
    }
  };

  LayersGenerator.prototype.tryConvertHeaderInputToDataLayer = function() {
    var inputDim, layerName, ref, ref1;
    layerName = (ref = this.header) != null ? ref.input : void 0;
    inputDim = (ref1 = this.header) != null ? ref1.input_dim : void 0;
    if ((layerName != null) && (inputDim != null)) {
      return this.createDataLayerDescriptor(layerName, inputDim);
    }
  };

  LayersGenerator.prototype.createDataLayerDescriptor = function(name, shape) {
    var layer;
    layer = {
      name: name,
      type: 'Data',
      top: name,
      input_param: {
        shape: shape
      }
    };
    return {
      layer: layer
    };
  };

  return LayersGenerator;

})();

generateNetwork = function(layers, header) {
  var blobTable, e, generator, network;
  try {
    network = new Network(header.name);
    blobTable = new BlobTable(layers);
    generator = new NodesGenerator(blobTable);
    return generator.fillNetwork(network, layers);
  } catch (error) {
    e = error;
    return Notify.error("Can't build network graph. " + e);
  }
};

generateLayers = function(descriptors, header) {
  var layersGenerator;
  layersGenerator = new LayersGenerator(descriptors, header);
  return layersGenerator.generate();
};

setNodeOutputShapesAttribute = function(node) {
  var blob, i, len, ref, ref1, results, shapeText;
  if (!((node != null ? (ref = node.tops) != null ? ref.length : void 0 : void 0) > 0)) {
    return;
  }
  node.attribs.blob_shapes = {};
  ref1 = node.tops;
  results = [];
  for (i = 0, len = ref1.length; i < len; i++) {
    blob = ref1[i];
    shapeText = '[ ' + blob.shape.join(', ') + ' ]';
    results.push(node.attribs.blob_shapes[blob.name] = shapeText);
  }
  return results;
};

computePrecedingShapes = function(node) {
  var i, len, parent, ref;
  ref = node.parents;
  for (i = 0, len = ref.length; i < len; i++) {
    parent = ref[i];
    if (!parent.areTopShapesInfered) {
      computePrecedingShapes(parent);
      parent.areTopShapesInfered = true;
    }
  }
  Layers.inferTopShapes(node);
  return setNodeOutputShapesAttribute(node);
};

computeShapes = function(net) {
  var e, endNodes, i, len, node, results;
  endNodes = net.findEndNodes();
  try {
    results = [];
    for (i = 0, len = endNodes.length; i < len; i++) {
      node = endNodes[i];
      results.push(computePrecedingShapes(node));
    }
    return results;
  } catch (error) {
    e = error;
    return Notify.warning("Can't infer network data shapes. " + e);
  }
};

module.exports = CaffeParser = (function() {
  function CaffeParser() {}

  CaffeParser.parse = function(txt, phase) {
    var descriptors, header, layers, network, ref;
    ref = Parser.parse(txt), header = ref[0], descriptors = ref[1];
    layers = generateLayers(descriptors, header);
    network = generateNetwork(layers, header);
    computeShapes(network);
    return network;
  };

  return CaffeParser;

})();


},{"./../network.coffee":8,"./../notify.coffee":9,"./../utils/utils.coffee":11,"./layers.coffee":3,"./parser":4}],3:[function(require,module,exports){
var ConvolutionLayerBase, areShapesEqual, extractKernelSizes, extractPaddingSizes, extractStrideSizes, getLayerType, getParameterAsArray, getValueOrDefault, isDataLayer, isLossLayer, isUniformLayer, layers, shapesToString, utils,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

utils = require('../utils/utils.coffee');

areShapesEqual = function(x, y) {
  var i, j, ref;
  if (x.length !== y.length) {
    return false;
  }
  for (i = j = 0, ref = x.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
    if (x[i] !== y[i]) {
      return false;
    }
  }
  return true;
};

getValueOrDefault = function(param, defaultValue) {
  if (param != null) {
    return param;
  } else {
    return defaultValue;
  }
};

extractKernelSizes = function(params) {
  return params.kernel_size || [params.kernel_h, params.kernel_w];
};

extractPaddingSizes = function(params) {
  if (params.pad != null) {
    return params.pad;
  }
  if ((params.pad_h == null) && (params.pad_w == null)) {
    return 0;
  }
  return [getValueOrDefault(params.pad_h, 0), getValueOrDefault(params.pad_w, 0)];
};

extractStrideSizes = function(params) {
  if (params.stride != null) {
    return params.stride;
  }
  if ((params.stride_h == null) && (params.stride_w == null)) {
    return 1;
  }
  return [getValueOrDefault(params.stride_h, 1), getValueOrDefault(params.stride_w, 1)];
};

getParameterAsArray = function(parameter, requiredLength, name) {
  var i;
  if (utils.typeIsArray(parameter)) {
    if (parameter.length !== requiredLength) {
      throw ("Dimensions of the '" + name + "' parameter ") + ("must be equal to " + requiredLength + ".");
    }
    return parameter;
  }
  return (function() {
    var j, ref, results;
    results = [];
    for (i = j = 0, ref = requiredLength; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      results.push(parameter);
    }
    return results;
  })();
};

shapesToString = function(inputShapes) {
  var j, len, shape, text;
  text = '[';
  for (j = 0, len = inputShapes.length; j < len; j++) {
    shape = inputShapes[j];
    text += " [ " + shape + " ]";
  }
  text += ' ]';
  return text;
};

layers = {};

layers.Uniform = this.UniformLayer = (function() {
  function UniformLayer() {}

  UniformLayer.prototype.inferShapes = function(bottoms, tops) {
    var i, j, ref, results;
    if ((tops != null ? tops[0] : void 0) == null) {
      return;
    }
    results = [];
    for (i = j = 0, ref = tops.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      results.push(tops[i].shape = bottoms[i].shape.slice(0));
    }
    return results;
  };

  return UniformLayer;

})();

layers.Loss = this.LossLayer = (function() {
  function LossLayer() {}

  LossLayer.prototype.inferShapes = function(bottoms, tops) {
    if ((tops != null ? tops[0] : void 0) == null) {
      return;
    }
    return tops[0].shape = [1];
  };

  return LossLayer;

})();

layers.Data = this.DataLayer = (function() {
  function DataLayer(attribs) {
    this.tryExtractShapeFromMemoryDataLayer = bind(this.tryExtractShapeFromMemoryDataLayer, this);
    this.tryExtractShapeFromTransformParam = bind(this.tryExtractShapeFromTransformParam, this);
    this.tryExtractShapes = bind(this.tryExtractShapes, this);
    this.checkParameters = bind(this.checkParameters, this);
    this.inferShapes = bind(this.inferShapes, this);
    this.defaultBatchSize = 1;
    this.defaultChannels = 3;
    this.outputShape = this.tryExtractShapes(attribs);
  }

  DataLayer.prototype.inferShapes = function(bottoms, tops) {
    if ((tops != null ? tops[0] : void 0) == null) {
      return;
    }
    this.checkParameters(bottoms, tops);
    tops[0].shape = this.outputShape.slice(0);
    if (tops[1]) {
      return tops[1].shape = this.outputShape.slice(0, 1);
    }
  };

  DataLayer.prototype.checkParameters = function(bottoms, tops) {
    var ref;
    if (this.outputShape == null) {
      throw "Can't extract data shape from Data layer";
    }
    if ((bottoms != null ? bottoms.length : void 0) > 0) {
      throw "Data layer doesn't expect any input.";
    }
    if ((ref = tops != null ? tops.length : void 0) !== 1 && ref !== 2) {
      throw 'Outputs number of Data layer must be equal to one or two.';
    }
  };

  DataLayer.prototype.tryExtractShapes = function(attribs) {
    var ref, ref1, ref2, shape;
    shape = attribs != null ? (ref = attribs.input_param) != null ? (ref1 = ref.shape) != null ? ref1.dim : void 0 : void 0 : void 0;
    if (shape == null) {
      shape = attribs != null ? (ref2 = attribs.input_param) != null ? ref2.shape : void 0 : void 0;
    }
    if (shape == null) {
      shape = attribs != null ? attribs.shape : void 0;
    }
    if (shape == null) {
      shape = this.tryExtractShapeFromTransformParam(attribs);
    }
    if (shape == null) {
      shape = this.tryExtractShapeFromMemoryDataLayer(attribs);
    }
    return shape;
  };

  DataLayer.prototype.tryExtractShapeFromTransformParam = function(attribs) {
    var channels, cropSize, ref;
    cropSize = (ref = attribs.transform_param) != null ? ref.crop_size : void 0;
    if (cropSize != null) {
      channels = this.defaultChannels;
      if (attribs.transform_param.force_gray) {
        channels = 1;
      }
      return [this.defaultBatchSize, channels, cropSize, cropSize];
    }
  };

  DataLayer.prototype.tryExtractShapeFromMemoryDataLayer = function(attribs) {
    var batch_size, channels, height, param, width;
    param = attribs != null ? attribs.memory_data_param : void 0;
    batch_size = param.batch_size || this.defaultBatchSize;
    channels = param.channels || this.defaultChannels;
    height = param.height;
    width = param.width;
    if ((height != null) && (width != null)) {
      return [batch_size, channels, height, width];
    }
  };

  return DataLayer;

})();

ConvolutionLayerBase = (function() {
  function ConvolutionLayerBase(name1, attribs) {
    var params;
    this.name = name1;
    this.checkParameters = bind(this.checkParameters, this);
    this.inferShapesForOneBlobInternal = bind(this.inferShapesForOneBlobInternal, this);
    this.inferShapesForOneBlob = bind(this.inferShapesForOneBlob, this);
    this.inferShapes = bind(this.inferShapes, this);
    params = attribs != null ? attribs.convolution_param : void 0;
    if (params == null) {
      throw this.name + " layer must have convolution_param.";
    }
    this.filters = params.num_output;
    this.padding = extractPaddingSizes(params);
    this.stride = extractStrideSizes(params);
    this.kernel = extractKernelSizes(params);
    this.dilation = getValueOrDefault(params.dilation, 1);
    this.axis = getValueOrDefault(params.axis, 1);
  }

  ConvolutionLayerBase.prototype.inferShapes = function(bottoms, tops) {
    var i, j, ref, results;
    if ((tops != null ? tops[0] : void 0) == null) {
      return;
    }
    this.checkParameters(bottoms, tops);
    results = [];
    for (i = j = 0, ref = tops.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      results.push(this.inferShapesForOneBlob(bottoms[i], tops[i]));
    }
    return results;
  };

  ConvolutionLayerBase.prototype.inferShapesForOneBlob = function(bottom, top) {
    var dilation, inputShape, kernel, outputShape, padding, stride, sucDimLength, succeedingDimensions;
    inputShape = bottom.shape;
    outputShape = inputShape.slice(0);
    succeedingDimensions = inputShape.slice(this.axis + 1);
    sucDimLength = succeedingDimensions.length;
    padding = getParameterAsArray(this.padding, sucDimLength, 'padding');
    kernel = getParameterAsArray(this.kernel, sucDimLength, 'kernel');
    stride = getParameterAsArray(this.stride, sucDimLength, 'stride');
    dilation = getParameterAsArray(this.dilation, sucDimLength, 'dilation');
    this.inferShapesForOneBlobInternal(inputShape, outputShape, padding, kernel, stride, dilation);
    return top.shape = outputShape;
  };

  ConvolutionLayerBase.prototype.inferShapesForOneBlobInternal = function(input, output, padding, kernel, stride, dilation) {
    return void 0;
  };

  ConvolutionLayerBase.prototype.checkParameters = function(bottoms, tops) {
    if (this.filters == null) {
      throw this.name + " layer must have num_output parameter.";
    }
    if ((this.kernel == null) && ((this.kernel[0] == null) || (this.kernel[1] == null))) {
      console.log(this.kernel);
      throw this.name + " kernel sizes must be set.";
    }
    if (bottoms == null) {
      throw this.name + " layer received undefined bottom blobs.";
    }
    if (bottoms.length !== tops.length) {
      throw (this.name + " layer can process number of top blobs which is equal to ") + ("the number of bottom blobs, but received " + tops.length + " top blobs and ") + (bottoms.length + " bottom blobs.");
    }
  };

  return ConvolutionLayerBase;

})();

layers.Convolution = this.ConvolutionLayer = (function(superClass) {
  extend(ConvolutionLayer, superClass);

  function ConvolutionLayer(attribs) {
    this.inferShapesForOneBlobInternal = bind(this.inferShapesForOneBlobInternal, this);
    ConvolutionLayer.__super__.constructor.call(this, 'Convolution', attribs);
  }

  ConvolutionLayer.prototype.inferShapesForOneBlobInternal = function(input, output, padding, kernel, stride, dilation) {
    var i, ii, j, kernelExtent, outDim, ref, ref1, results;
    output[this.axis] = this.filters;
    results = [];
    for (i = j = ref = this.axis + 1, ref1 = input.length; ref <= ref1 ? j < ref1 : j > ref1; i = ref <= ref1 ? ++j : --j) {
      ii = i - this.axis - 1;
      kernelExtent = dilation[ii] * (kernel[ii] - 1) + 1;
      outDim = (input[i] + 2 * padding[ii] - kernelExtent) / stride[ii] + 1;
      results.push(output[i] = Math.floor(outDim));
    }
    return results;
  };

  return ConvolutionLayer;

})(ConvolutionLayerBase);

layers.Deconvolution = this.DeconvolutionLayer = (function(superClass) {
  extend(DeconvolutionLayer, superClass);

  function DeconvolutionLayer(attribs) {
    this.inferShapesForOneBlobInternal = bind(this.inferShapesForOneBlobInternal, this);
    DeconvolutionLayer.__super__.constructor.call(this, 'Deconvolution', attribs);
  }

  DeconvolutionLayer.prototype.inferShapesForOneBlobInternal = function(input, output, padding, kernel, stride, dilation) {
    var i, ii, j, kernelExtent, outDim, ref, ref1, results;
    output[this.axis] = this.filters;
    results = [];
    for (i = j = ref = this.axis + 1, ref1 = input.length; ref <= ref1 ? j < ref1 : j > ref1; i = ref <= ref1 ? ++j : --j) {
      ii = i - this.axis - 1;
      kernelExtent = dilation[ii] * (kernel[ii] - 1) + 1;
      outDim = stride[ii] * (input[i] - 1) + kernelExtent - 2 * padding[ii];
      results.push(output[i] = Math.floor(outDim));
    }
    return results;
  };

  return DeconvolutionLayer;

})(ConvolutionLayerBase);

layers.Pooling = this.PoolingLayer = (function() {
  function PoolingLayer(attribs) {
    this.getKernelSizes = bind(this.getKernelSizes, this);
    this.checkParameters = bind(this.checkParameters, this);
    this.inferShapes = bind(this.inferShapes, this);
    var params;
    this.spatialDimSize = 2;
    params = attribs != null ? attribs.pooling_param : void 0;
    if (params == null) {
      throw 'Pooling layer must have pooling_param.';
    }
    this.padding = extractPaddingSizes(params);
    this.stride = extractStrideSizes(params);
    this.kernel = extractKernelSizes(params);
    this.isGlobalPooling = getValueOrDefault(params.global_pooling, false);
  }

  PoolingLayer.prototype.inferShapes = function(bottoms, tops) {
    var i, ii, inputShape, j, kernel, outDim, outDimRounded, outputShape, padding, ref, stride;
    if ((tops != null ? tops[0] : void 0) == null) {
      return;
    }
    this.checkParameters(bottoms, tops);
    inputShape = bottoms[0].shape;
    outputShape = inputShape.slice(0);
    padding = getParameterAsArray(this.padding, this.spatialDimSize, 'padding');
    stride = getParameterAsArray(this.stride, this.spatialDimSize, 'stride');
    kernel = this.getKernelSizes(inputShape);
    for (i = j = 0, ref = this.spatialDimSize; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      ii = inputShape.length - this.spatialDimSize + i;
      outDim = (inputShape[ii] + 2 * padding[i] - kernel[i]) / stride[i];
      outDimRounded = (Math.floor(Math.ceil(outDim))) + 1;
      if ((outDimRounded - 1) * stride[i] >= inputShape[ii] + padding[i]) {
        outDimRounded--;
      }
      outputShape[ii] = outDimRounded;
    }
    tops[0].shape = outputShape;
    if (tops[1]) {
      return tops[1].shape = outputShape.slice(0);
    }
  };

  PoolingLayer.prototype.checkParameters = function(bottoms, tops) {
    var ref;
    if ((this.kernel == null) && ((this.kernel[0] == null) || (this.kernel[1] == null))) {
      throw 'Pooling layer must have kernel_size parameter.';
    }
    if (bottoms == null) {
      throw 'Pooling layer received undefined bottom blobs.';
    }
    if (bottoms.length !== 1) {
      throw "Pooling layer can process exactly one input, " + ("but received " + bottoms.length + " input shapes.");
    }
    if ((ref = tops.length) !== 1 && ref !== 2) {
      throw "Pooling layer produces single output shape or two equal " + "shapes if the second top shape is specified.";
    }
  };

  PoolingLayer.prototype.getKernelSizes = function(inputShape) {
    var kernel;
    if (this.isGlobalPooling) {
      kernel = inputShape.slice(-this.spatialDimSize);
    } else {
      kernel = getParameterAsArray(this.kernel, this.spatialDimSize, 'kernel');
    }
    return kernel;
  };

  return PoolingLayer;

})();

layers.InnerProduct = this.InnerProductLayer = (function() {
  function InnerProductLayer(attribs) {
    this.checkParameters = bind(this.checkParameters, this);
    this.inferShapes = bind(this.inferShapes, this);
    var params;
    params = attribs != null ? attribs.inner_product_param : void 0;
    if (params == null) {
      throw 'InnerProduct layer must have inner_product_param.';
    }
    this.numOutput = params.num_output;
    this.axis = getValueOrDefault(params.axis, 1);
  }

  InnerProductLayer.prototype.inferShapes = function(bottoms, tops) {
    var inputShape, outputShape;
    if ((tops != null ? tops[0] : void 0) == null) {
      return;
    }
    this.checkParameters(bottoms, tops);
    inputShape = bottoms[0].shape;
    outputShape = inputShape.slice(0, this.axis);
    outputShape[this.axis] = this.numOutput;
    return tops[0].shape = outputShape;
  };

  InnerProductLayer.prototype.checkParameters = function(bottoms, tops) {
    if (this.numOutput == null) {
      throw 'InnerProduct layer must have num_output parameter.';
    }
    if (bottoms == null) {
      throw 'InnerProduct layer received undefined bottom blobs.';
    }
    if (bottoms.length !== 1 || tops.length !== 1) {
      throw "InnerProduct layer can accept and produce exactly one blob, but " + ("received " + bottoms.length + " bottoms blobs and " + tops.length + " top blobs.");
    }
  };

  return InnerProductLayer;

})();

layers.Concat = this.ConcatLayer = (function() {
  function ConcatLayer(attribs) {
    this.checkInputShapeAxes = bind(this.checkInputShapeAxes, this);
    this.checkParameters = bind(this.checkParameters, this);
    this.inferShapes = bind(this.inferShapes, this);
    var axis, params;
    params = attribs != null ? attribs.concat_param : void 0;
    axis = params != null ? params.concat_dim : void 0;
    if (axis == null) {
      axis = params != null ? params.axis : void 0;
    }
    this.axis = getValueOrDefault(axis, 1);
  }

  ConcatLayer.prototype.inferShapes = function(bottoms, tops) {
    var bottom, firstInputShape, j, len, outputShape;
    if ((tops != null ? tops[0] : void 0) == null) {
      return;
    }
    this.checkParameters(bottoms, tops);
    firstInputShape = bottoms[0].shape;
    outputShape = firstInputShape.slice(0);
    outputShape[this.axis] = 0;
    for (j = 0, len = bottoms.length; j < len; j++) {
      bottom = bottoms[j];
      outputShape[this.axis] += bottom.shape[this.axis];
    }
    return tops[0].shape = outputShape;
  };

  ConcatLayer.prototype.checkParameters = function(bottoms, tops) {
    var bottom, firstShape, inputShapes, j, len, results, shape;
    if ((bottoms != null ? bottoms[0] : void 0) == null) {
      throw 'Concat layer must have at least one bottom blob.';
    }
    firstShape = bottoms[0].shape;
    inputShapes = (function() {
      var j, len, results;
      results = [];
      for (j = 0, len = bottoms.length; j < len; j++) {
        bottom = bottoms[j];
        results.push(bottom.shape);
      }
      return results;
    })();
    results = [];
    for (j = 0, len = inputShapes.length; j < len; j++) {
      shape = inputShapes[j];
      if (!this.checkInputShapeAxes(firstShape, shape)) {
        throw "Concat layer received incorrect input shapes: " + ((shapesToString(inputShapes)) + ". ") + "All axes except axis along which concatenation " + "is performing must have the same sizes.";
      } else {
        results.push(void 0);
      }
    }
    return results;
  };

  ConcatLayer.prototype.checkInputShapeAxes = function(firstShape, shape) {
    var i, j, ref;
    if (firstShape.length !== shape.length) {
      return false;
    }
    for (i = j = 0, ref = shape.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      if (i !== this.axis && firstShape[i] !== shape[i]) {
        return false;
      }
    }
    return true;
  };

  return ConcatLayer;

})();

layers.Eltwise = this.EltwiseLayer = (function() {
  function EltwiseLayer() {
    this.checkParameters = bind(this.checkParameters, this);
    this.inferShapes = bind(this.inferShapes, this);
  }

  EltwiseLayer.prototype.inferShapes = function(bottoms, tops) {
    var firstInputShape;
    if ((tops != null ? tops[0] : void 0) == null) {
      return;
    }
    this.checkParameters(bottoms, tops);
    firstInputShape = bottoms[0].shape;
    return tops[0].shape = firstInputShape.slice(0);
  };

  EltwiseLayer.prototype.checkParameters = function(bottoms, tops) {
    var bottom, firstShape, inputShapes, j, len, results, shape;
    if ((bottoms != null ? bottoms[0] : void 0) == null) {
      throw 'Eltwise layer must have at least one input.';
    }
    inputShapes = (function() {
      var j, len, results;
      results = [];
      for (j = 0, len = bottoms.length; j < len; j++) {
        bottom = bottoms[j];
        results.push(bottom.shape);
      }
      return results;
    })();
    firstShape = inputShapes[0];
    results = [];
    for (j = 0, len = inputShapes.length; j < len; j++) {
      shape = inputShapes[j];
      if (!areShapesEqual(firstShape, shape)) {
        throw "Eltwise layer received incorrect input shapes: " + ((shapesToString(inputShapes)) + ". ") + "All axes must have the same sizes.";
      } else {
        results.push(void 0);
      }
    }
    return results;
  };

  return EltwiseLayer;

})();

layers.Crop = this.CropLayer = (function() {
  function CropLayer(attribs) {
    this.checkParameters = bind(this.checkParameters, this);
    this.inferShapes = bind(this.inferShapes, this);
    var params;
    params = attribs.crop_param;
    this.axis = getValueOrDefault(params != null ? params.axis : void 0, 0);
  }

  CropLayer.prototype.inferShapes = function(bottoms, tops) {
    var i, j, outputShape, ref, ref1;
    if ((tops != null ? tops[0] : void 0) == null) {
      return;
    }
    this.checkParameters(bottoms, tops);
    outputShape = bottoms[0].shape.slice(0);
    for (i = j = ref = this.axis, ref1 = outputShape.length; ref <= ref1 ? j < ref1 : j > ref1; i = ref <= ref1 ? ++j : --j) {
      outputShape[i] = bottoms[1].shape[i];
    }
    return tops[0].shape = outputShape;
  };

  CropLayer.prototype.checkParameters = function(bottoms, tops) {
    if ((bottoms != null ? bottoms.length : void 0) !== 2) {
      throw 'Crop layer must have exactly two bottom blobs.';
    }
  };

  return CropLayer;

})();

isLossLayer = function(layerType) {
  return /loss/i.test(layerType);
};

isDataLayer = function(layerType) {
  return (/input/i.test(layerType)) || (/data/i.test(layerType));
};

isUniformLayer = function(lt) {
  return (/relu/i.test(lt)) || (/prelu/i.test(lt)) || (/elu/i.test(lt)) || (/sigmoid/i.test(lt)) || (/tanh/i.test(lt)) || (/abs/i.test(lt)) || (/power/i.test(lt)) || (/exp/i.test(lt)) || (/log/i.test(lt)) || (/bnll/i.test(lt)) || (/threshold/i.test(lt)) || (/bias/i.test(lt)) || (/scale/i.test(lt)) || (/lrn/i.test(lt)) || (/dropout/i.test(lt)) || (/batchnorm/i.test(lt)) || (/mvn/i.test(lt)) || (/softmax/i.test(lt));
};

getLayerType = function(layerTypeName) {
  var layerType, layerTypeNameTitle;
  if (isUniformLayer(layerTypeName)) {
    return layers.Uniform;
  }
  if (isDataLayer(layerTypeName)) {
    return layers.Data;
  }
  if (isLossLayer(layerTypeName)) {
    return layers.Loss;
  }
  layerType = layers[layerTypeName];
  if (layerType == null) {
    layerTypeNameTitle = utils.toTitleCase(layerTypeName);
    layerType = layers[layerTypeNameTitle];
  }
  if (layerType == null) {
    throw "Unsupported layer type: '" + layerTypeName + "'.";
  }
  return layerType;
};

exports.inferTopShapes = function(node) {
  var LayerType, e, layer, top;
  try {
    LayerType = getLayerType(node.type);
    layer = new LayerType(node.attribs);
    layer.inferShapes(node.bottoms, node.tops);
    return (function() {
      var j, len, ref, results;
      ref = node.tops;
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        top = ref[j];
        results.push(top.shape);
      }
      return results;
    })();
  } catch (error) {
    e = error;
    throw ("Can't infer output shape of the '" + node.name + "' ") + ("layer of type '" + node.type + "'. ") + e;
  }
};


},{"../utils/utils.coffee":11}],4:[function(require,module,exports){
module.exports = (function() {
  "use strict";

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function peg$SyntaxError(message, expected, found, location) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.location = location;
    this.name     = "SyntaxError";

    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, peg$SyntaxError);
    }
  }

  peg$subclass(peg$SyntaxError, Error);

  function peg$parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},
        parser  = this,

        peg$FAILED = {},

        peg$startRuleFunctions = { Proto_text: peg$parseProto_text },
        peg$startRuleFunction  = peg$parseProto_text,

        peg$c0 = function(doc) { return doc; },
        peg$c1 = { type: "other", description: "whitespace" },
        peg$c2 = /^[ \t\n\r]/,
        peg$c3 = { type: "class", value: "[ \\t\\n\\r]", description: "[ \\t\\n\\r]" },
        peg$c4 = { type: "other", description: "whitespace or comment" },
        peg$c5 = function(first, v) { return v; },
        peg$c6 = { type: "other", description: "comment" },
        peg$c7 = "#",
        peg$c8 = { type: "literal", value: "#", description: "\"#\"" },
        peg$c9 = { type: "any", description: "any character" },
        peg$c10 = function(first, m) { return m; },
        peg$c11 = function(first, rest) {
              var result = {};
              var kvPairs = [first].concat(rest);
              for (var i = 0; i < kvPairs.length; i++)
              {
                var k = kvPairs[i].key;
                var v = kvPairs[i].value;
                if(k in result)
                {
                  result[k] = [].concat(result[k]);
                  result[k].push(v);
              }
                else
                {
                  result[k] = v;
                }
              }
              return result;
          },
        peg$c12 = ":",
        peg$c13 = { type: "literal", value: ":", description: "\":\"" },
        peg$c14 = function(key, value) {
            return {key: key, value: value};
          },
        peg$c15 = "[",
        peg$c16 = { type: "literal", value: "[", description: "\"[\"" },
        peg$c17 = ",",
        peg$c18 = { type: "literal", value: ",", description: "\",\"" },
        peg$c19 = function(v) { return v; },
        peg$c20 = "]",
        peg$c21 = { type: "literal", value: "]", description: "\"]\"" },
        peg$c22 = function(entries) {
              return entries;
            },
        peg$c23 = "{",
        peg$c24 = { type: "literal", value: "{", description: "\"{\"" },
        peg$c25 = function(key, first, m) { return m; },
        peg$c26 = "}",
        peg$c27 = { type: "literal", value: "}", description: "\"}\"" },
        peg$c28 = function(key, first, rest) {
              var elems = [first].concat(rest);
              var merged = {};
              for (var i = 0; i < elems.length; ++i)
              {
                  for(var k in elems[i])
                  {
                    if(k in merged)
                    {
                      merged[k] = [].concat(merged[k], elems[i][k]);
                    }
                    else
                    {
                      merged[k] = elems[i][k];
                    }

                  }
              }
              var result = {};
              result[key] = merged;
              return result;
            },
        peg$c29 = { type: "other", description: "number" },
        peg$c30 = function() { return parseFloat(text()); },
        peg$c31 = /^[eE]/,
        peg$c32 = { type: "class", value: "[eE]", description: "[eE]" },
        peg$c33 = ".",
        peg$c34 = { type: "literal", value: ".", description: "\".\"" },
        peg$c35 = "0",
        peg$c36 = { type: "literal", value: "0", description: "\"0\"" },
        peg$c37 = /^[1-9]/,
        peg$c38 = { type: "class", value: "[1-9]", description: "[1-9]" },
        peg$c39 = "-",
        peg$c40 = { type: "literal", value: "-", description: "\"-\"" },
        peg$c41 = "+",
        peg$c42 = { type: "literal", value: "+", description: "\"+\"" },
        peg$c43 = "'",
        peg$c44 = { type: "literal", value: "'", description: "\"'\"" },
        peg$c45 = function(chars) { return chars.join(""); },
        peg$c46 = "\"",
        peg$c47 = { type: "literal", value: "\"", description: "\"\\\"\"" },
        peg$c48 = { type: "other", description: "key" },
        peg$c49 = /^[a-zA-Z0-9_\-]/,
        peg$c50 = { type: "class", value: "[a-zA-Z0-9_-]", description: "[a-zA-Z0-9_-]" },
        peg$c51 = function(chars) { return chars.join("").toLowerCase(); },
        peg$c52 = { type: "other", description: "double-quoted string character" },
        peg$c53 = /^[ -!#-[\]-\u10FFFF]/,
        peg$c54 = { type: "class", value: "[\\x20-\\x21\\x23-\\x5B\\x5D-\\u10FFFF]", description: "[\\x20-\\x21\\x23-\\x5B\\x5D-\\u10FFFF]" },
        peg$c55 = { type: "other", description: "single-quoted string character" },
        peg$c56 = /^[ -&(-[\]-\u10FFFF]/,
        peg$c57 = { type: "class", value: "[\\x20-\\x26\\x28-\\x5B\\x5D-\\u10FFFF]", description: "[\\x20-\\x26\\x28-\\x5B\\x5D-\\u10FFFF]" },
        peg$c58 = { type: "other", description: "escaped character sequence" },
        peg$c59 = "\\",
        peg$c60 = { type: "literal", value: "\\", description: "\"\\\\\"" },
        peg$c61 = "/",
        peg$c62 = { type: "literal", value: "/", description: "\"/\"" },
        peg$c63 = "b",
        peg$c64 = { type: "literal", value: "b", description: "\"b\"" },
        peg$c65 = function() { return "\b"; },
        peg$c66 = "f",
        peg$c67 = { type: "literal", value: "f", description: "\"f\"" },
        peg$c68 = function() { return "\f"; },
        peg$c69 = "n",
        peg$c70 = { type: "literal", value: "n", description: "\"n\"" },
        peg$c71 = function() { return "\n"; },
        peg$c72 = "r",
        peg$c73 = { type: "literal", value: "r", description: "\"r\"" },
        peg$c74 = function() { return "\r"; },
        peg$c75 = "t",
        peg$c76 = { type: "literal", value: "t", description: "\"t\"" },
        peg$c77 = function() { return "\t"; },
        peg$c78 = "u",
        peg$c79 = { type: "literal", value: "u", description: "\"u\"" },
        peg$c80 = function(digits) {
                return String.fromCharCode(parseInt(digits, 16));
              },
        peg$c81 = function(sequence) {
            return sequence;
          },
        peg$c82 = /^[0-9]/,
        peg$c83 = { type: "class", value: "[0-9]", description: "[0-9]" },
        peg$c84 = /^[0-9a-f]/i,
        peg$c85 = { type: "class", value: "[0-9a-f]i", description: "[0-9a-f]i" },
        peg$c86 = /^[\n\r\u2028\u2029]/,
        peg$c87 = { type: "class", value: "[\\n\\r\\u2028\\u2029]", description: "[\\n\\r\\u2028\\u2029]" },

        peg$currPos          = 0,
        peg$savedPos         = 0,
        peg$posDetailsCache  = [{ line: 1, column: 1, seenCR: false }],
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }

    function text() {
      return input.substring(peg$savedPos, peg$currPos);
    }

    function location() {
      return peg$computeLocation(peg$savedPos, peg$currPos);
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        input.substring(peg$savedPos, peg$currPos),
        peg$computeLocation(peg$savedPos, peg$currPos)
      );
    }

    function error(message) {
      throw peg$buildException(
        message,
        null,
        input.substring(peg$savedPos, peg$currPos),
        peg$computeLocation(peg$savedPos, peg$currPos)
      );
    }

    function peg$computePosDetails(pos) {
      var details = peg$posDetailsCache[pos],
          p, ch;

      if (details) {
        return details;
      } else {
        p = pos - 1;
        while (!peg$posDetailsCache[p]) {
          p--;
        }

        details = peg$posDetailsCache[p];
        details = {
          line:   details.line,
          column: details.column,
          seenCR: details.seenCR
        };

        while (p < pos) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }

          p++;
        }

        peg$posDetailsCache[pos] = details;
        return details;
      }
    }

    function peg$computeLocation(startPos, endPos) {
      var startPosDetails = peg$computePosDetails(startPos),
          endPosDetails   = peg$computePosDetails(endPos);

      return {
        start: {
          offset: startPos,
          line:   startPosDetails.line,
          column: startPosDetails.column
        },
        end: {
          offset: endPos,
          line:   endPosDetails.line,
          column: endPosDetails.column
        }
      };
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, found, location) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0100-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1000-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new peg$SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        location
      );
    }

    function peg$parseProto_text() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parsewsc();
      if (s1 !== peg$FAILED) {
        s2 = peg$parsedoc();
        if (s2 !== peg$FAILED) {
          s3 = peg$parsewsc();
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c0(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsews() {
      var s0, s1;

      peg$silentFails++;
      s0 = [];
      if (peg$c2.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c3); }
      }
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        if (peg$c2.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c3); }
        }
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c1); }
      }

      return s0;
    }

    function peg$parsewsc() {
      var s0, s1, s2, s3;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = peg$parsews();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsecomment();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parsecomment();
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parsews();
          if (s3 !== peg$FAILED) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c4); }
      }

      return s0;
    }

    function peg$parsedoc() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parsevalue();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parsewsc();
        if (s4 !== peg$FAILED) {
          s5 = peg$parsevalue();
          if (s5 !== peg$FAILED) {
            peg$savedPos = s3;
            s4 = peg$c5(s1, s5);
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parsewsc();
          if (s4 !== peg$FAILED) {
            s5 = peg$parsevalue();
            if (s5 !== peg$FAILED) {
              peg$savedPos = s3;
              s4 = peg$c5(s1, s5);
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsevalue() {
      var s0;

      s0 = peg$parseobject();
      if (s0 === peg$FAILED) {
        s0 = peg$parsepairs();
      }

      return s0;
    }

    function peg$parsecomment() {
      var s0, s1, s2, s3, s4, s5, s6;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = peg$parsews();
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 35) {
          s2 = peg$c7;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c8); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$currPos;
          s5 = peg$currPos;
          peg$silentFails++;
          s6 = peg$parseLineTerminator();
          peg$silentFails--;
          if (s6 === peg$FAILED) {
            s5 = void 0;
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
          if (s5 !== peg$FAILED) {
            if (input.length > peg$currPos) {
              s6 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
            if (s6 !== peg$FAILED) {
              s5 = [s5, s6];
              s4 = s5;
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$currPos;
            s5 = peg$currPos;
            peg$silentFails++;
            s6 = peg$parseLineTerminator();
            peg$silentFails--;
            if (s6 === peg$FAILED) {
              s5 = void 0;
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
            if (s5 !== peg$FAILED) {
              if (input.length > peg$currPos) {
                s6 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c9); }
              }
              if (s6 !== peg$FAILED) {
                s5 = [s5, s6];
                s4 = s5;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          }
          if (s3 !== peg$FAILED) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c6); }
      }

      return s0;
    }

    function peg$parsepairs() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parsepair();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parsewsc();
        if (s4 !== peg$FAILED) {
          s5 = peg$parsepair();
          if (s5 !== peg$FAILED) {
            peg$savedPos = s3;
            s4 = peg$c10(s1, s5);
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parsewsc();
          if (s4 !== peg$FAILED) {
            s5 = peg$parsepair();
            if (s5 !== peg$FAILED) {
              peg$savedPos = s3;
              s4 = peg$c10(s1, s5);
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c11(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsepair() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parsekey();
      if (s1 !== peg$FAILED) {
        s2 = peg$parsews();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 58) {
            s3 = peg$c12;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c13); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parsews();
            if (s4 !== peg$FAILED) {
              s5 = peg$parsestring();
              if (s5 === peg$FAILED) {
                s5 = peg$parsenumber();
                if (s5 === peg$FAILED) {
                  s5 = peg$parsekey();
                  if (s5 === peg$FAILED) {
                    s5 = peg$parselist();
                  }
                }
              }
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c14(s1, s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parselist() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 91) {
        s1 = peg$c15;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c16); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parsews();
        if (s4 !== peg$FAILED) {
          s5 = peg$parsestring();
          if (s5 === peg$FAILED) {
            s5 = peg$parsenumber();
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parsews();
            if (s6 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 44) {
                s7 = peg$c17;
                peg$currPos++;
              } else {
                s7 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c18); }
              }
              if (s7 === peg$FAILED) {
                s7 = null;
              }
              if (s7 !== peg$FAILED) {
                peg$savedPos = s3;
                s4 = peg$c19(s5);
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parsews();
          if (s4 !== peg$FAILED) {
            s5 = peg$parsestring();
            if (s5 === peg$FAILED) {
              s5 = peg$parsenumber();
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parsews();
              if (s6 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 44) {
                  s7 = peg$c17;
                  peg$currPos++;
                } else {
                  s7 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c18); }
                }
                if (s7 === peg$FAILED) {
                  s7 = null;
                }
                if (s7 !== peg$FAILED) {
                  peg$savedPos = s3;
                  s4 = peg$c19(s5);
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parsews();
          if (s3 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 93) {
              s4 = peg$c20;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c21); }
            }
            if (s4 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c22(s2);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseobject() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11;

      s0 = peg$currPos;
      s1 = peg$parsekey();
      if (s1 !== peg$FAILED) {
        s2 = peg$parsews();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 58) {
            s3 = peg$c12;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c13); }
          }
          if (s3 === peg$FAILED) {
            s3 = null;
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parsews();
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 123) {
                s5 = peg$c23;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c24); }
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parsewsc();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parsemember();
                  if (s7 === peg$FAILED) {
                    s7 = null;
                  }
                  if (s7 !== peg$FAILED) {
                    s8 = [];
                    s9 = peg$currPos;
                    s10 = peg$parsewsc();
                    if (s10 !== peg$FAILED) {
                      s11 = peg$parsemember();
                      if (s11 !== peg$FAILED) {
                        peg$savedPos = s9;
                        s10 = peg$c25(s1, s7, s11);
                        s9 = s10;
                      } else {
                        peg$currPos = s9;
                        s9 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s9;
                      s9 = peg$FAILED;
                    }
                    while (s9 !== peg$FAILED) {
                      s8.push(s9);
                      s9 = peg$currPos;
                      s10 = peg$parsewsc();
                      if (s10 !== peg$FAILED) {
                        s11 = peg$parsemember();
                        if (s11 !== peg$FAILED) {
                          peg$savedPos = s9;
                          s10 = peg$c25(s1, s7, s11);
                          s9 = s10;
                        } else {
                          peg$currPos = s9;
                          s9 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s9;
                        s9 = peg$FAILED;
                      }
                    }
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parsewsc();
                      if (s9 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 125) {
                          s10 = peg$c26;
                          peg$currPos++;
                        } else {
                          s10 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c27); }
                        }
                        if (s10 !== peg$FAILED) {
                          s11 = peg$parsewsc();
                          if (s11 !== peg$FAILED) {
                            peg$savedPos = s0;
                            s1 = peg$c28(s1, s7, s8);
                            s0 = s1;
                          } else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsemember() {
      var s0;

      s0 = peg$parsecomment();
      if (s0 === peg$FAILED) {
        s0 = peg$parsepairs();
        if (s0 === peg$FAILED) {
          s0 = peg$parseobject();
        }
      }

      return s0;
    }

    function peg$parsenumber() {
      var s0, s1, s2, s3, s4;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = peg$parseminus();
      if (s1 === peg$FAILED) {
        s1 = null;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseint();
        if (s2 !== peg$FAILED) {
          s3 = peg$parsefrac();
          if (s3 === peg$FAILED) {
            s3 = null;
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parseexp();
            if (s4 === peg$FAILED) {
              s4 = null;
            }
            if (s4 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c30();
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c29); }
      }

      return s0;
    }

    function peg$parseexp() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      if (peg$c31.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c32); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseminus();
        if (s2 === peg$FAILED) {
          s2 = peg$parseplus();
        }
        if (s2 === peg$FAILED) {
          s2 = null;
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parseDigit();
          if (s4 !== peg$FAILED) {
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parseDigit();
            }
          } else {
            s3 = peg$FAILED;
          }
          if (s3 !== peg$FAILED) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsefrac() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 46) {
        s1 = peg$c33;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c34); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parseDigit();
        if (s3 !== peg$FAILED) {
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parseDigit();
          }
        } else {
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseint() {
      var s0, s1, s2, s3;

      if (input.charCodeAt(peg$currPos) === 48) {
        s0 = peg$c35;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c36); }
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (peg$c37.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c38); }
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parseDigit();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parseDigit();
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      }

      return s0;
    }

    function peg$parseminus() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 45) {
        s0 = peg$c39;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c40); }
      }

      return s0;
    }

    function peg$parseplus() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 43) {
        s0 = peg$c41;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c42); }
      }

      return s0;
    }

    function peg$parsestring() {
      var s0;

      s0 = peg$parsesstring();
      if (s0 === peg$FAILED) {
        s0 = peg$parsedstring();
      }

      return s0;
    }

    function peg$parsesstring() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 39) {
        s1 = peg$c43;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c44); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parseschar();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parseschar();
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 39) {
            s3 = peg$c43;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c44); }
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c45(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsedstring() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 34) {
        s1 = peg$c46;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c47); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsedchar();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parsedchar();
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 34) {
            s3 = peg$c46;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c47); }
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c45(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsekey() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      if (peg$c49.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c50); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c49.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c50); }
          }
        }
      } else {
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c51(s1);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c48); }
      }

      return s0;
    }

    function peg$parsedchar() {
      var s0, s1;

      peg$silentFails++;
      if (peg$c53.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c54); }
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseechar();
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c52); }
      }

      return s0;
    }

    function peg$parseschar() {
      var s0, s1;

      peg$silentFails++;
      if (peg$c56.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c57); }
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseechar();
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c55); }
      }

      return s0;
    }

    function peg$parseechar() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

      peg$silentFails++;
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 92) {
        s1 = peg$c59;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c60); }
      }
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 34) {
          s2 = peg$c46;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c47); }
        }
        if (s2 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 39) {
            s2 = peg$c43;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c44); }
          }
          if (s2 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 92) {
              s2 = peg$c59;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c60); }
            }
            if (s2 === peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 47) {
                s2 = peg$c61;
                peg$currPos++;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c62); }
              }
              if (s2 === peg$FAILED) {
                s2 = peg$currPos;
                if (input.charCodeAt(peg$currPos) === 98) {
                  s3 = peg$c63;
                  peg$currPos++;
                } else {
                  s3 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c64); }
                }
                if (s3 !== peg$FAILED) {
                  peg$savedPos = s2;
                  s3 = peg$c65();
                }
                s2 = s3;
                if (s2 === peg$FAILED) {
                  s2 = peg$currPos;
                  if (input.charCodeAt(peg$currPos) === 102) {
                    s3 = peg$c66;
                    peg$currPos++;
                  } else {
                    s3 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c67); }
                  }
                  if (s3 !== peg$FAILED) {
                    peg$savedPos = s2;
                    s3 = peg$c68();
                  }
                  s2 = s3;
                  if (s2 === peg$FAILED) {
                    s2 = peg$currPos;
                    if (input.charCodeAt(peg$currPos) === 110) {
                      s3 = peg$c69;
                      peg$currPos++;
                    } else {
                      s3 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c70); }
                    }
                    if (s3 !== peg$FAILED) {
                      peg$savedPos = s2;
                      s3 = peg$c71();
                    }
                    s2 = s3;
                    if (s2 === peg$FAILED) {
                      s2 = peg$currPos;
                      if (input.charCodeAt(peg$currPos) === 114) {
                        s3 = peg$c72;
                        peg$currPos++;
                      } else {
                        s3 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c73); }
                      }
                      if (s3 !== peg$FAILED) {
                        peg$savedPos = s2;
                        s3 = peg$c74();
                      }
                      s2 = s3;
                      if (s2 === peg$FAILED) {
                        s2 = peg$currPos;
                        if (input.charCodeAt(peg$currPos) === 116) {
                          s3 = peg$c75;
                          peg$currPos++;
                        } else {
                          s3 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c76); }
                        }
                        if (s3 !== peg$FAILED) {
                          peg$savedPos = s2;
                          s3 = peg$c77();
                        }
                        s2 = s3;
                        if (s2 === peg$FAILED) {
                          s2 = peg$currPos;
                          if (input.charCodeAt(peg$currPos) === 117) {
                            s3 = peg$c78;
                            peg$currPos++;
                          } else {
                            s3 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c79); }
                          }
                          if (s3 !== peg$FAILED) {
                            s4 = peg$currPos;
                            s5 = peg$currPos;
                            s6 = peg$parseHexDigit();
                            if (s6 !== peg$FAILED) {
                              s7 = peg$parseHexDigit();
                              if (s7 !== peg$FAILED) {
                                s8 = peg$parseHexDigit();
                                if (s8 !== peg$FAILED) {
                                  s9 = peg$parseHexDigit();
                                  if (s9 !== peg$FAILED) {
                                    s6 = [s6, s7, s8, s9];
                                    s5 = s6;
                                  } else {
                                    peg$currPos = s5;
                                    s5 = peg$FAILED;
                                  }
                                } else {
                                  peg$currPos = s5;
                                  s5 = peg$FAILED;
                                }
                              } else {
                                peg$currPos = s5;
                                s5 = peg$FAILED;
                              }
                            } else {
                              peg$currPos = s5;
                              s5 = peg$FAILED;
                            }
                            if (s5 !== peg$FAILED) {
                              s4 = input.substring(s4, peg$currPos);
                            } else {
                              s4 = s5;
                            }
                            if (s4 !== peg$FAILED) {
                              peg$savedPos = s2;
                              s3 = peg$c80(s4);
                              s2 = s3;
                            } else {
                              peg$currPos = s2;
                              s2 = peg$FAILED;
                            }
                          } else {
                            peg$currPos = s2;
                            s2 = peg$FAILED;
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c81(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c58); }
      }

      return s0;
    }

    function peg$parseDigit() {
      var s0;

      if (peg$c82.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c83); }
      }

      return s0;
    }

    function peg$parseHexDigit() {
      var s0;

      if (peg$c84.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c85); }
      }

      return s0;
    }

    function peg$parseLineTerminator() {
      var s0;

      if (peg$c86.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c87); }
      }

      return s0;
    }

    peg$result = peg$startRuleFunction();

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(
        null,
        peg$maxFailExpected,
        peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
        peg$maxFailPos < input.length
          ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
          : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
      );
    }
  }

  return {
    SyntaxError: peg$SyntaxError,
    parse:       peg$parse
  };
})();

},{}],5:[function(require,module,exports){
var Editor;

module.exports = Editor = (function() {
  function Editor(loader) {
    var $editorBox, editorWidthPercentage;
    this.loader = loader;
    editorWidthPercentage = 30;
    $editorBox = $($.parseHTML('<div class="column"></div>'));
    $editorBox.width(editorWidthPercentage + '%');
    $('#net-column').width((100 - editorWidthPercentage) + '%');
    $('#master-container').prepend($editorBox);
    this.editor = CodeMirror($editorBox[0], {
      value: '# Enter your network definition here.\n# Use Shift+Enter to update the visualization.',
      lineNumbers: true,
      lineWrapping: true
    });
    this.editor.on('keydown', (function(_this) {
      return function(cm, e) {
        return _this.onKeyDown(e);
      };
    })(this));
  }

  Editor.prototype.onKeyDown = function(e) {
    if (e.shiftKey && e.keyCode === 13) {
      e.preventDefault();
      return this.loader(this.editor.getValue());
    }
  };

  return Editor;

})();


},{}],6:[function(require,module,exports){
var Loader,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

module.exports = Loader = (function() {
  function Loader(parser) {
    this.parser = parser;
    this.load = bind(this.load, this);
    this.fromPreset = bind(this.fromPreset, this);
    this.fromURL = bind(this.fromURL, this);
    this.fromGist = bind(this.fromGist, this);
  }

  Loader.prototype.fromGist = function(gistID, callback) {
    var url;
    url = 'https://api.github.com/gists/' + gistID;
    return $.getJSON(url, (function(_this) {
      return function(data) {
        var fileInfo, fileKey, fileSet, filename, isProto, isSolitaryFile, isSolver;
        fileSet = data['files'];
        isSolitaryFile = Object.keys(fileSet).length === 1;
        for (fileKey in fileSet) {
          fileInfo = fileSet[fileKey];
          filename = fileInfo['filename'].toLowerCase();
          isProto = _.endsWith(filename, '.prototxt');
          isSolver = _.startsWith(filename, 'solver');
          if ((isProto && !isSolver) || isSolitaryFile) {
            _this.load(fileInfo['content'], callback);
            return;
          }
        }
        return console.log('No prototxt found in the given GIST.');
      };
    })(this));
  };

  Loader.prototype.fromURL = function(url, callback) {
    return $.ajax({
      url: url,
      success: (function(_this) {
        return function() {
          return _this.load(data, callback);
        };
      })(this)
    });
  };

  Loader.prototype.fromPreset = function(name, callback) {
    return $.get('./presets/' + name + '.prototxt', (function(_this) {
      return function(data) {
        return _this.load(data, callback);
      };
    })(this));
  };

  Loader.prototype.load = function(data, callback) {
    var net;
    net = this.parser.parse(data);
    if (!_.isUndefined(callback)) {
      callback(net);
    }
    return net;
  };

  return Loader;

})();


},{}],7:[function(require,module,exports){
var AppController, CaffeNetwork, Loader, showDocumentation,
  slice = [].slice;

AppController = require('./app.coffee');

CaffeNetwork = require('./caffe/caffe.coffee');

Loader = require('./loader.coffee');

showDocumentation = function() {
  return window.location.href = 'quickstart.html';
};

$(document).ready(function() {
  var app, loader, makeLoader, router, routes;
  app = new AppController();
  loader = new Loader(CaffeNetwork);
  makeLoader = function(loadingFunc) {
    return function() {
      var args;
      args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      return app.startLoading.apply(app, [loadingFunc].concat(slice.call(args)));
    };
  };
  routes = {
    '/gist/:gistID': makeLoader(loader.fromGist),
    '/url/(.+)': makeLoader(loader.fromURL),
    '/preset/:name': makeLoader(loader.fromPreset),
    '/editor(/?)': (function(_this) {
      return function() {
        return app.showEditor(loader);
      };
    })(this),
    '/doc': (function(_this) {
      return function() {
        return showDocumentation();
      };
    })(this)
  };
  router = Router(routes);
  return router.init('/doc');
});


},{"./app.coffee":1,"./caffe/caffe.coffee":2,"./loader.coffee":6}],8:[function(require,module,exports){
var Network, Node,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

Node = (function() {
  function Node(name, type1, attribs1) {
    this.name = name;
    this.type = type1;
    this.attribs = attribs1 != null ? attribs1 : {};
    this.detachChildren = bind(this.detachChildren, this);
    this.detachChild = bind(this.detachChild, this);
    this.addParents = bind(this.addParents, this);
    this.addParent = bind(this.addParent, this);
    this.addChildren = bind(this.addChildren, this);
    this.addChild = bind(this.addChild, this);
    this.hasChildren = bind(this.hasChildren, this);
    this.parents = [];
    this.children = [];
    this.coalesce = [];
  }

  Node.prototype.hasChildren = function() {
    return this.children.length > 0;
  };

  Node.prototype.addChild = function(child) {
    if (indexOf.call(this.children, child) < 0) {
      this.children.push(child);
      if (indexOf.call(child.parents, this) < 0) {
        return child.parents.push(this);
      }
    }
  };

  Node.prototype.addChildren = function(children) {
    return _.forEach(children, (function(_this) {
      return function(c) {
        return _this.addChild(c);
      };
    })(this));
  };

  Node.prototype.addParent = function(parent) {
    return parent.addChild(this);
  };

  Node.prototype.addParents = function(parents) {
    return _.forEach(parents, (function(_this) {
      return function(p) {
        return _this.addParent(p);
      };
    })(this));
  };

  Node.prototype.detachChild = function(child) {
    _.pull(this.children, child);
    return _.pull(child.parents, this);
  };

  Node.prototype.detachChildren = function() {
    var children;
    children = _.clone(this.children);
    _.forEach(children, (function(_this) {
      return function(c) {
        return _this.detachChild(c);
      };
    })(this));
    return children;
  };

  return Node;

})();

module.exports = Network = (function() {
  function Network(name) {
    this.name = name != null ? name : 'Untitled Network';
    this.sortTopologically = bind(this.sortTopologically, this);
    this.findEndNodes = bind(this.findEndNodes, this);
    this.nodes = [];
  }

  Network.prototype.createNode = function(label, type, attribs) {
    var node;
    node = new Node(label, type, attribs);
    this.nodes.push(node);
    return node;
  };

  Network.prototype.findEndNodes = function() {
    var i, len, ref, results, x;
    ref = this.nodes;
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      x = ref[i];
      if (!x.hasChildren()) {
        results.push(x);
      }
    }
    return results;
  };

  Network.prototype.sortTopologically = function() {
    var i, j, len, len1, node, sortedNodes, unsortedNodes, visit;
    sortedNodes = [];
    unsortedNodes = _.clone(this.nodes);
    for (i = 0, len = unsortedNodes.length; i < len; i++) {
      node = unsortedNodes[i];
      node.sort_ = {
        temp: false,
        perm: false
      };
    }
    visit = function(node) {
      var child, j, len1, ref;
      if (node.sort_.temp === true) {
        throw 'Graph is not a DAG. Complicit node: ' + node.name;
      }
      if (node.sort_.perm) {
        return;
      }
      node.sort_.temp = true;
      ref = node.children;
      for (j = 0, len1 = ref.length; j < len1; j++) {
        child = ref[j];
        visit(child);
      }
      node.sort_.perm = true;
      node.sort_.temp = false;
      return sortedNodes.unshift(node);
    };
    while (unsortedNodes.length !== 0) {
      visit(unsortedNodes.pop());
    }
    for (j = 0, len1 = sortedNodes.length; j < len1; j++) {
      node = sortedNodes[j];
      delete node.sort_;
    }
    return sortedNodes;
  };

  return Network;

})();


},{}],9:[function(require,module,exports){
var Notifier;

module.exports = Notifier = (function() {
  function Notifier() {}

  Notifier._errorHandlers = [];

  Notifier._warningHandlers = [];

  Notifier.onerror = function(handler) {
    return Notifier._errorHandlers.push(handler);
  };

  Notifier.onwarning = function(handler) {
    return Notifier._warningHandlers.push(handler);
  };

  Notifier.error = function(object) {
    var handler, i, len, ref, results;
    console.log('Error: ' + object);
    ref = Notifier._errorHandlers;
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      handler = ref[i];
      results.push(handler(object));
    }
    return results;
  };

  Notifier.warning = function(object) {
    var handler, i, len, ref, results;
    console.log('Warning: ' + object);
    ref = Notifier._warningHandlers;
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      handler = ref[i];
      results.push(handler(object));
    }
    return results;
  };

  return Notifier;

})();


},{}],10:[function(require,module,exports){
var Renderer,
  hasProp = {}.hasOwnProperty;

module.exports = Renderer = (function() {
  function Renderer(net, parent1) {
    this.net = net;
    this.parent = parent1;
    this.iconify = false;
    this.layoutDirection = 'tb';
    this.generateGraph();
  }

  Renderer.prototype.setupGraph = function() {
    this.graph = new dagreD3.graphlib.Graph();
    this.graph.setDefaultEdgeLabel((function() {
      return {};
    }));
    return this.graph.setGraph({
      rankdir: this.layoutDirection,
      ranksep: 30,
      nodesep: 10,
      edgesep: 20,
      marginx: 0,
      marginy: 0
    });
  };

  Renderer.prototype.generateGraph = function() {
    var child, i, j, k, l, lastCoalesed, layers, len, len1, len2, len3, len4, m, node, nodes, parent, ref, ref1, ref2, ref3, sink, source, uberParents;
    this.setupGraph();
    nodes = this.net.sortTopologically();
    for (i = 0, len = nodes.length; i < len; i++) {
      node = nodes[i];
      if (node.isInGraph) {
        continue;
      }
      layers = [node].concat(node.coalesce);
      if (layers.length > 1) {
        lastCoalesed = layers[layers.length - 1];
        ref = lastCoalesed.children;
        for (j = 0, len1 = ref.length; j < len1; j++) {
          child = ref[j];
          uberParents = _.clone(child.parents);
          uberParents[uberParents.indexOf(lastCoalesed)] = node;
          child.parents = uberParents;
        }
      }
      this.insertNode(layers);
      ref1 = node.parents;
      for (k = 0, len2 = ref1.length; k < len2; k++) {
        parent = ref1[k];
        this.insertLink(parent, node);
      }
    }
    ref2 = this.graph.sources();
    for (l = 0, len3 = ref2.length; l < len3; l++) {
      source = ref2[l];
      (this.graph.node(source))["class"] = 'node-type-source';
    }
    ref3 = this.graph.sinks();
    for (m = 0, len4 = ref3.length; m < len4; m++) {
      sink = ref3[m];
      (this.graph.node(sink))["class"] = 'node-type-sink';
    }
    return this.render();
  };

  Renderer.prototype.insertNode = function(layers) {
    var baseNode, i, layer, len, nodeClass, nodeDesc, nodeLabel;
    baseNode = layers[0];
    nodeClass = 'node-type-' + baseNode.type.replace(/_/g, '-').toLowerCase();
    nodeLabel = '';
    for (i = 0, len = layers.length; i < len; i++) {
      layer = layers[i];
      layer.isInGraph = true;
      nodeLabel += this.generateLabel(layer);
    }
    nodeDesc = {
      labelType: 'html',
      label: nodeLabel,
      "class": nodeClass,
      layers: layers,
      rx: 5,
      ry: 5
    };
    if (this.iconify) {
      _.extend(nodeDesc, {
        shape: 'circle'
      });
    }
    return this.graph.setNode(baseNode.name, nodeDesc);
  };

  Renderer.prototype.generateLabel = function(layer) {
    if (!this.iconify) {
      return '<div class="node-label">' + layer.name + '</div>';
    } else {
      return '';
    }
  };

  Renderer.prototype.insertLink = function(src, dst) {
    return this.graph.setEdge(src.name, dst.name, {
      arrowhead: 'vee'
    });
  };

  Renderer.prototype.renderKey = function(key) {
    return key.replace(/_/g, ' ');
  };

  Renderer.prototype.renderValue = function(value) {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return value;
  };

  Renderer.prototype.renderSection = function(section) {
    var i, isScalarArray, isSection, key, len, ref, s, subSection, val;
    s = '';
    for (key in section) {
      if (!hasProp.call(section, key)) continue;
      val = section[key];
      isScalarArray = Array.isArray(val) && ((val.length === 0) || (typeof val[0] !== 'object'));
      isSection = (typeof val === 'object') && !isScalarArray;
      if (isSection) {
        s += '<div class="node-param-section-title node-param-key">' + this.renderKey(key) + '</div>';
        s += '<div class="node-param-section">';
        ref = [].concat(val);
        for (i = 0, len = ref.length; i < len; i++) {
          subSection = ref[i];
          s += this.renderSection(subSection);
        }
      } else {
        s += '<div class="node-param-row">';
        s += '<span class="node-param-key">' + this.renderKey(key) + ': </span>';
        s += '<span class="node-param-value">' + this.renderValue(val) + '</span>';
      }
      s += '</div>';
    }
    return s;
  };

  Renderer.prototype.tipForNode = function(nodeKey) {
    var i, layer, len, node, ref, s;
    node = this.graph.node(nodeKey);
    s = '';
    ref = node.layers;
    for (i = 0, len = ref.length; i < len; i++) {
      layer = ref[i];
      s += '<div class="node-info-group">';
      s += '<div class="node-info-header">';
      s += '<span class="node-info-title">' + layer.name + '</span>';
      s += ' &middot; ';
      s += '<span class="node-info-type">' + this.renderKey(layer.type) + '</span>';
      if (layer.annotation != null) {
        s += ' &middot; <span class="node-info-annotation">' + layer.annotation + '</span>';
      }
      s += '</div>';
      s += this.renderSection(layer.attribs);
    }
    return s;
  };

  Renderer.prototype.render = function() {
    var bbox, graphRender, margin, svg, svgGroup, that, tipPositions;
    svg = d3.select(this.parent);
    svgGroup = svg.append('g');
    graphRender = new dagreD3.render();
    graphRender(svgGroup, this.graph);
    bbox = svgGroup.node().getBBox();
    svgGroup.attr('transform', 'translate(' + Math.ceil(-bbox.x) + ')');
    margin = 5;
    svg.attr('width', Math.ceil(bbox.width + 2 * margin));
    svg.attr('height', Math.ceil(bbox.height + 2 * margin));
    tipPositions = {
      tb: {
        my: 'left center',
        at: 'right center'
      },
      lr: {
        my: 'top center',
        at: 'bottom center'
      }
    };
    that = this;
    return svgGroup.selectAll("g.node").each(function(nodeKey) {
      var position;
      position = tipPositions[that.layoutDirection];
      position.viewport = $(window);
      return $(this).qtip({
        content: {
          text: that.tipForNode(nodeKey)
        },
        position: position,
        show: {
          delay: 0,
          effect: false
        },
        hide: {
          effect: false
        }
      });
    });
  };

  return Renderer;

})();


},{}],11:[function(require,module,exports){
var toTitleCaseSaveSpaces, typeIsArray;

exports.typeIsArray = typeIsArray = function(value) {
  return value && typeof value === 'object' && value instanceof Array && typeof value.length === 'number' && typeof value.splice === 'function' && !(value.propertyIsEnumerable('length'));
};

exports.asArray = function(valueOrArray) {
  if (typeIsArray(valueOrArray)) {
    return valueOrArray;
  }
  return [valueOrArray];
};

exports.asScalar = function(valueOrArray) {
  if (!typeIsArray(valueOrArray)) {
    return valueOrArray;
  }
  if (valueOrArray.length === 1) {
    return valueOrArray[0];
  }
  return valueOrArray;
};

exports.toTitleCaseSaveSpaces = toTitleCaseSaveSpaces = function(str) {
  return str[0].toUpperCase() + str.slice(1, +(str.length - 1) + 1 || 9e9).toLowerCase();
};

exports.toTitleCase = function(str) {
  var i, len, part, partialNames, result;
  partialNames = str.split(/[\ _]/);
  result = '';
  for (i = 0, len = partialNames.length; i < len; i++) {
    part = partialNames[i];
    result += toTitleCaseSaveSpaces(part);
  }
  return result;
};


},{}]},{},[7]);
