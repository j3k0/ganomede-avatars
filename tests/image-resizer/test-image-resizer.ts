import fs from 'fs';
import path from 'path';
import expect from 'expect.js';
import { ImageResizer } from '../../src/image-resizer';

const imagePath = function (size?: number) {
  const sizePortion = arguments.length === 1 ? `-${size}` : '';
  return path.join(__dirname, `${TEST_IMAGE_NAME}${sizePortion}.png`);
};

var TEST_IMAGE_NAME = 'Yoshi';

describe('ImageResizer', function () {
  describe('new ImageResizer()', function () {
    const instantiate = (resizer: any) => new ImageResizer(resizer);

    it('creates ImageResizer', () => expect(instantiate(ImageResizer.RESIZERS.LWIP)).to.be.an(ImageResizer));

    return it('throws if no resize function is is provided', () => expect(instantiate).to.throwError());
  });

  return describe('#resize()', function () {
    const resizer = new ImageResizer(ImageResizer.RESIZERS.LWIP);
    const image = fs.readFileSync(imagePath());

    return it(`takes in an image Buffer and resizes it to square images \
of sizes defined in ImageResizer.SIZES`, (done: () => any) => resizer.resize(image, (err: any, result?: { [x: string]: any; }) => {
      expect(err).to.be(null);

      // result should be an object:
      //  - keys: sizes defined within ImageResizer.SIZES
      //  - values: Buffers containing square images of that size
      expect(result).to.be.an(Object);
      expect(result).to.only.have.keys(ImageResizer.SIZES.map(String));
      for (let size of Array.from(ImageResizer.SIZES)) {
        expect(result![size]).to.be.a(Buffer);
        fs.writeFileSync(imagePath(size), result![size]);
      }

      return done();
    }));
  });
});
