fs = require 'fs'
path = require 'path'
expect = require 'expect.js'
ImageResizer = require '../../src/image-resizer'

TEST_IMAGE_PATH = path.join(__dirname, 'Yoshi.png')

describe 'ImageResizer', () ->
  describe 'new ImageResizer()', () ->
    instantiate = (resizer) ->
      return new ImageResizer(resizer)

    it 'creates ImageResizer', () ->
      expect(instantiate(ImageResizer.RESIZERS.LWIP)).to.be.an(ImageResizer)

    it 'throws if no resize function is is provided', () ->
      expect(instantiate).to.throwError()

  describe '#resize()', () ->
    resizer = new ImageResizer(ImageResizer.RESIZERS.LWIP)
    image = fs.readFileSync(TEST_IMAGE_PATH)

    it 'takes in image Buffer and resizes it to a bunch of squares', (done) ->
      resizer.resize image, (err, result) ->
        expect(err).to.be(null)

        # result should be an object:
        #  - keys: sizes defined within ImageResizer.SIZES
        #  - values: Buffers containing square images of that size
        expect(result).to.be.an(Object)
        expect(result).to.only.have.keys(ImageResizer.SIZES.map(String))
        for size in ImageResizer.SIZES
          expect(result[size]).to.be.a(Buffer)

        done()
