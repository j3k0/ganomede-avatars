vasync = require 'vasync'

LwipResizer = (buf, size, callback) ->
  process.nextTick(callback.bind(null, null, new Buffer(16)))

class ImageResizer
  constructor: (resizer) ->
    if !resizer
      throw new Error('resizer must be a function')

    @impl = resizer

  resize: (buf, callback) ->
    vasync.forEachParallel
      func: @impl.bind(@, buf)
      inputs: ImageResizer.SIZES
    , (err, results) ->
      if (err)
        console.error('Failed to resize', err)
        return callback(err)

      ret = {}
      for size, idx in ImageResizer.SIZES
        ret[size] = results.operations[idx].result

      callback(null, ret)

  @SIZES: [64, 128, 256]

  @RESIZERS =
    LWIP: LwipResizer

module.exports = ImageResizer
