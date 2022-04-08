import vasync from 'vasync';
import sharp from 'sharp';
// import lwip from '@kant2002/lwip';
// use https://github.com/lovell/sharp
import { log } from './log';

const SharpResizer = (buf: any, size: number, callback: (arg0: any, arg1?: any) => any) => {

  sharp(buf)
    .resize(size, size)
    .toBuffer()
    .then((outputBuffer) => {
      callback(null, outputBuffer);
    })
    .catch(err => {
      log.warn('SharpResizer: failed to resize', { err, size });
      callback(err);
    });
};

export class ImageResizer {
  static SIZES: number[];
  static RESIZERS: { SHARP: (buf: any, size: number, callback: (arg0: any, arg1: undefined) => any) => any; };
  impl: any;
  static initClass() {

    this.SIZES = [64, 128, 256];

    this.RESIZERS =
      { SHARP: SharpResizer };
  }
  constructor(resizer: any) {
    if (!resizer) {
      throw new Error('resizer must be a function');
    }

    this.impl = resizer;
  }

  resize(buf: any, callback: (arg0: any, arg1?: {}) => any) {
    return vasync.forEachParallel({
      func: this.impl.bind(this, buf),
      inputs: ImageResizer.SIZES
    }, function (err: any, results: { operations: {}; }) {
      if (err) {
        log.error('Failed to resize',
          { err });
        return callback(err);
      }

      const ret = {};
      for (let idx = 0; idx < ImageResizer.SIZES.length; idx++) {
        const size = ImageResizer.SIZES[idx];
        ret[size] = results.operations[idx].result;
      }

      return callback(null, ret);
    });
  }
}
ImageResizer.initClass();
