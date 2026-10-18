/**
 * MapLibre 6 runs its tile work in an ES-module web worker. Vite moves files
 * around, so we bundle the worker explicitly and tell MapLibre where it is.
 */
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(new URL(workerUrl, window.location.href).href);

export * from 'maplibre-gl';
