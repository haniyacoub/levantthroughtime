import type { Map as MLMap } from './maplibre';

/** The main map instance, for features (like stories) that move the camera. */
export const mapRegistry: { main: MLMap | null } = { main: null };
