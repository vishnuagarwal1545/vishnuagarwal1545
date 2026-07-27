import * as simpleIcons from 'simple-icons';

const SLUG_OVERRIDES = {
  amazonaws: 'siAmazonwebservices',
};

function toExportName(slug) {
  if (SLUG_OVERRIDES[slug]) return SLUG_OVERRIDES[slug];
  return 'si' + slug.charAt(0).toUpperCase() + slug.slice(1);
}

export function iconExists(slug) {
  return typeof simpleIcons[toExportName(slug)]?.path === 'string';
}

export function getIconPath(slug) {
  const icon = simpleIcons[toExportName(slug)];
  if (!icon) throw new Error(`Unknown simple-icons slug: ${slug}`);
  return icon.path;
}
