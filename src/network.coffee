class Node
    constructor: (@name, @type, @attribs={}) ->
        @parents = []
        @children = []
        # Nodes to be coalesced (by the renderer) with the current one.
        # For instance, this can be used for grouping in-place operations.
        # Note that this assumes the nodes to be coalesced and the current
        # node form a simple chain structure.
        @coalesce = []

    addChild: (child) =>
        if child not in @children
            @children.push child
            if @ not in child.parents
                child.parents.push @

    addChildren: (children) =>
        _.forEach children, (c) => @addChild c

    addParent: (parent) =>
        parent.addChild @

    addParents: (parents) =>
        _.forEach parents, (p) => @addParent p

    detachChild: (child) =>
        _.pull @children, child
        _.pull child.parents, @

    detachChildren: =>
        children = _.clone @children
        _.forEach children, (c) => @detachChild c
        return children

module.exports =
class Network
    constructor: (@name='Untitled Network') ->
        @nodes = []

    createNode: (label, type, attribs) ->
        node = new Node label, type, attribs
        @nodes.push node
        return node

    sortTopologically: =>
        sortedNodes = []
        unsortedNodes = _.clone @nodes
        for node in unsortedNodes
            node.sort_ = {temp:false, perm: false}
        visit = (node) ->
            if node.sort_.temp==true
                throw 'Graph is not a DAG. Complicit node: ' + node.name
            if node.sort_.perm
                return
            node.sort_.temp = true
            for child in node.children
                visit child
            node.sort_.perm = true
            node.sort_.temp = false
            sortedNodes.unshift node
        while unsortedNodes.length!=0
            visit unsortedNodes.pop()
        for node in sortedNodes
            delete node.sort_
        return sortedNodes
