import { nodeResolve } from '@rollup/plugin-node-resolve';
import codegen from 'rollup-plugin-codegen';
import deckyPlugin from "@decky/rollup";
import polyfillNode from 'rollup-plugin-polyfill-node';

// A dev build can provide a temporary manifest directory so its embedded
// Decky API identity matches the plugin.json shipped alongside the bundle.
const manifestRoot = process.env.DECKY_PLUGIN_MANIFEST_DIR || ".";

export default deckyPlugin({
  plugins: [
    polyfillNode(),
    nodeResolve({ browser: true }), //needed because for some reason v15.3.1 node resolve which decky rollup uses does makes codegen fail
    codegen()
  ]
}, manifestRoot);
