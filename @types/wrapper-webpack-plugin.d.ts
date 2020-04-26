import { Plugin } from 'webpack';

declare class WrapperWebpackPlugin extends Plugin {
  constructor(args: {
    header?: string | ((fileName: string, chunkHash: string) => string)
    footer?: string | ((fileName: string, chunkHash: string) => string)
    test?: string | RegExp
    afterOptimizations?: boolean
  });
}

export = WrapperWebpackPlugin;
