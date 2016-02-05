AppController   = require './app.coffee'
CaffeNetwork    = require './caffe/caffe.coffee'
Loader          = require './loader.coffee'

showDocumentation = ->
    window.location.href = 'quickstart.html'

$(document).ready ->
    app = new AppController()
    # Setup Caffe model loader.
    # This can be replaced with any arbitrary parser to support
    # formats other than Caffe.
    loader = new Loader(CaffeNetwork)
    # Helper function for wrapping the load calls.
    makeLoader = (loadingFunc) ->
        (args...) ->
            app.startLoading loadingFunc, args...

    # Register routes
    routes =
       '/gist/:gistID' : makeLoader loader.fromGist
       '/url/(.+)'     : makeLoader loader.fromURL
       '/preset/:name' : makeLoader loader.fromPreset
       '/editor(/?)'   : => app.showEditor loader
       '/doc'          : => showDocumentation()
    router = Router(routes)
    router.init '/doc'
