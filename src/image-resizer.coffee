vasync = require 'vasync'
lwip = require '@kant2002/lwip'
log = require './log'

LwipResizer = (buf, size, callback) ->
  lwip.open buf, 'png', (err, image) ->
    if (err)
      log.error 'LwipResizer: failed to open buf', {err: err}
      return callback(err)

    image.resize size, size, (err, resizedImage) ->
      if (err)
        log.error 'LwipResizer: failed to resize',
          err: err
          size: size
        return callback(err)

      resizedImage.toBuffer 'png', {
        "compression": "high"
      }, (err, resizedBuf) ->
        if (err)
          log.error 'LwipResizer: failed to toBuffer() resized image',
            err: err
          return callback(err)

        callback(null, resizedBuf)

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
        log.error 'Failed to resize',
          err: err
        return callback(err)

      ret = {}
      for size, idx in ImageResizer.SIZES
        ret[size] = results.operations[idx].result

      callback(null, ret)

  @SIZES: [64, 128, 256]

  @RESIZERS =
    LWIP: LwipResizer

module.exports = ImageResizer
