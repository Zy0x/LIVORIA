export const corePackage = {
  name: '@livoria/core',
  status: 'foundation',
} as const;

export type CorePackageStatus = typeof corePackage.status;
