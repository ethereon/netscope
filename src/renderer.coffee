INPLACE_FUSE = 1
INPLACE_HIDE = 2
INPLACE_NONE = 3

module.exports =
class Renderer
    constructor: (@net, @parent) ->
        @iconify = false
        @inplaceMode = INPLACE_FUSE
        @layoutDirection = 'tb'
        @generateGraph()

    setupGraph: ->
        @graph = new dagreD3.graphlib.Graph()
        @graph.setDefaultEdgeLabel ( -> {} )
        @graph.setGraph
            rankdir: @layoutDirection
            ranksep: 50, # Vertical node separation
            nodesep: 10, # Horizontal node separation
            edgesep: 30, # Horizontal edge separation
            marginx:  0, # Horizontal graph margin
            marginy:  0  # Vertical graph margin

    generateGraph: ->
        @setupGraph()
        # TODO: Topologically sort the nodes.
        # For now, they are topologically sorted by construction.
        # However, for future sources, this may not be the case.
        for node in @net.nodes
            @insertNode node
            for parent in node.parents
                @insertLink parent, node
        for source in @graph.sources()
            (@graph.node source).class = 'node-type-source'
        for sink in @graph.sinks()
            (@graph.node sink).class = 'node-type-sink'
        @render()

    insertNode: (node) ->
        nodeClass = 'node-type-'+node.type.replace(/_/g, '-').toLowerCase()
        nodeDesc =
            labelType : 'html'
            label     : @generateLabel node
            class     : nodeClass
            name      : node.name
            type      : node.type
            attribs   : node.attribs
            rx        : 5
            ry        : 5
        if @iconify
            _.extend nodeDesc,
                shape: 'circle'
        @graph.setNode node.name, nodeDesc

    generateLabel: (node) ->
        if not @iconify
            '<div class="node-label">'+node.name+'</div>'
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
        s += '<div class="node-header">'
        s += '<span class="node-title">'+node.name+'</span>'
        s += ' &middot; '
        s += '<span class="node-type">'+@renderKey(node.type)+'</span>'
        s += '</div>'
        s += @renderSection node.attribs
        return s

    render: ->
        svg = d3.select(@parent)
        svgGroup = svg.append('g')
        graphRender = new dagreD3.render()
        graphRender svgGroup, @graph

        # Size to fit.
        # getBBox appears to do the right thing on Chrome,
        # but not on Firefox. getBoundingClientRect works on both.
        bbox = svgGroup.node().getBoundingClientRect()
        svg.attr('width', bbox.width)
        svg.attr('height', bbox.height)

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
