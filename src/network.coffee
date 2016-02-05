class Node
    constructor: (@name, @type, @attribs={}) ->
        @parents    = []
        @children   = []

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
