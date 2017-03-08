module.exports =
class Notifier
    @_errorHandlers   = []
    @_warningHandlers = []

    @onerror: (handler) =>
        @_errorHandlers.push handler

    @onwarning: (handler) =>
        @_warningHandlers.push handler

    @error: (object) =>
        console.log 'Error: ' + object
        for handler in @_errorHandlers
            handler(object)

    @warning: (object) =>
        console.log 'Warning: ' + object
        for handler in @_warningHandlers
            handler(object)
