module.exports =
class Renderer
    constructor: (@net, @parent) ->
        @iconify = false
        @layoutDirection = 'tb'
        @generateGraph()

    setupGraph: ->
        @graph = new dagreD3.graphlib.Graph()
        @graph.setDefaultEdgeLabel ( -> {} )
        @graph.setGraph
            rankdir: @layoutDirection
            ranksep: 30, # Vertical node separation
            nodesep: 10, # Horizontal node separation
            edgesep: 20, # Horizontal edge separation
            marginx:  0, # Horizontal graph margin
            marginy:  0  # Vertical graph margin

    generateGraph: ->
        @setupGraph()
        nodes = @net.sortTopologically()
        for node in nodes
            if node.isInGraph
                continue
            layers = [node].concat node.coalesce
            if layers.length>1
                # Rewire the node following the last coalesced node to this one
                lastCoalesed = layers[layers.length-1]
                for child in lastCoalesed.children
                    uberParents = _.clone child.parents
                    uberParents[uberParents.indexOf lastCoalesed] = node
                    child.parents = uberParents
            @insertNode layers

            for parent in node.parents
                @insertLink parent, node
        for source in @graph.sources()
            (@graph.node source).class = 'node-type-source'
        for sink in @graph.sinks()
            (@graph.node sink).class = 'node-type-sink'
        @render()

    insertNode: (layers) ->
        baseNode = layers[0]
        nodeClass = 'node-type-'+baseNode.type.replace(/_/g, '-').toLowerCase()
        nodeLabel = ''
        for layer in layers
            layer.isInGraph = true
            nodeLabel += @generateLabel layer
        nodeDesc =
            labelType   : 'html'
            label       : nodeLabel
            class       : nodeClass
            layers      : layers
            rx          : 5
            ry          : 5
        if @iconify
            _.extend nodeDesc,
                shape: 'circle'
        @graph.setNode baseNode.name, nodeDesc

    generateLabel: (layer) ->
        if not @iconify
            '<div class="node-label">'+layer.name+'</div>'
        else
            ''

    insertLink: (src, dst) ->
        @graph.setEdge src.name, dst.name,
            arrowhead : 'vee'

    renderKey:(key) ->
        key.replace(/_/g, ' ')

    renderValue: (value) ->
        if Array.isArray value
            return value.join(', ')
        return value

    renderSection: (section) ->
        s = ''
        for own key of section
            val = section[key]
            isSection = (typeof val is 'object') and not Array.isArray(val)
            if isSection
                s += '<div class="node-param-section-title node-param-key">'+@renderKey(key)+'</div>'
                s += '<div class="node-param-section">'
                s+= @renderSection val
            else
                s += '<div class="node-param-row">'
                s += '<span class="node-param-key">'+@renderKey(key)+': </span>'
                s += '<span class="node-param-value">'+@renderValue(val)+'</span>'
            s += '</div>'
        return s

    tipForNode: (nodeKey) ->
        node = @graph.node nodeKey
        s = ''
        for layer in node.layers
            s += '<div class="node-info-group">'
            s += '<div class="node-info-header">'
            s += '<span class="node-info-title">'+layer.name+'</span>'
            s += ' &middot; '
            s += '<span class="node-info-type">'+@renderKey(layer.type)+'</span>'
            if layer.annotation?
                s += ' &middot; <span class="node-info-annotation">'+layer.annotation+'</span>'
            s += '</div>'
            s += @renderSection layer.attribs
        return s

    render: ->
        svg = d3.select(@parent)
        svgGroup = svg.append('g')
        graphRender = new dagreD3.render()
        graphRender svgGroup, @graph

        # Size to fit.
        # TODO: Find a more robust way of doing this.
        # getBBox appears to do the right thing on Chrome,
        # but not on Firefox. getBoundingClientRect works on both.
        bbox = svgGroup.node().getBoundingClientRect()
        # On Chrome, the bounding box may be off by a stroke-width.
        margin = 2
        svg.attr('width', Math.ceil(bbox.width)+margin)
        svg.attr('height', Math.ceil(bbox.height)+margin)

        # Configure Tooltips.
        tipPositions =
            tb:
                my: 'left center'
                at: 'right center'
            lr:
                my: 'top center'
                at: 'bottom center'
        that = @
        svgGroup.selectAll("g.node").each (nodeKey) ->
            position = tipPositions[that.layoutDirection]
            position.viewport = $(window)
            $(this).qtip
                content:
                    text: that.tipForNode nodeKey
                position: position
                show:
                    delay: 0
                    effect: false
                hide:
                    effect: false
