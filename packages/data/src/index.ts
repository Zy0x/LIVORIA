export const dataPackage = {
  name: '@livoria/data',
  status: 'foundation',
} as const;

export type DataPackageStatus = typeof dataPackage.status;
