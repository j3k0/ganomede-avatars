import vasync from 'vasync';
// import lwip from '@kant2002/lwip';
// use https://github.com/lovell/sharp
import { log } from './log';

const LwipResizer = (buf: any, size: any, callback: (arg0: any, arg1?: any) => any) => lwip.open(buf, 'png', function (err: any, image: { resize: (arg0: any, arg1: any, arg2: (err: any, resizedImage: any) => any) => any; }) {
  if (err) {
    log.error('LwipResizer: failed to open buf', { err });
    return callback(err);
  }

  return image.resize(size, size, function (err: any, resizedImage: { toBuffer: (arg0: string, arg1: { compression: string; }, arg2: (err: any, resizedBuf: any) => any) => any; }) {
    if (err) {
      log.error('LwipResizer: failed to resize', {
        err,
        size
      }
      );
      return callback(err);
    }

    return resizedImage.toBuffer('png', {
      "compression": "high"
    }, function (err: any, resizedBuf: any) {
      if (err) {
        log.error('LwipResizer: failed to toBuffer() resized image',
          { err });
        return callback(err);
      }

      return callback(null, resizedBuf);
    });
  });
});

export class ImageResizer {
  static SIZES: number[];
  static RESIZERS: { LWIP: (buf: any, size: any, callback: (arg0: any, arg1: undefined) => any) => any; };
  impl: any;
  static initClass() {

    this.SIZES = [64, 128, 256];

    this.RESIZERS =
      { LWIP: LwipResizer };
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
    }
      , function (err: any, results: { operations: {}; }) {
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
