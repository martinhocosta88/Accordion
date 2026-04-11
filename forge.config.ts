import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
// AutoUnpackNativesPlugin requires VC++ toolset for node-pty; re-enable once native build environment is set up
// import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
  },
  // Skip native module rebuild during dev — node-pty requires VC++ toolset not yet installed.
  // Remove rebuildConfig once Desktop development with C++ workload is added to Visual Studio.
  rebuildConfig: {
    onlyModules: [],
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
  ],
  plugins: [
    // new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        {
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
  ],
};

export default config;
