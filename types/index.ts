import type { Location } from "@prisma/client";

export type LocationWithFinancials = Location & {
  assetCount: number;
  totalInitialValue: number;
  totalCurrentValue: number;
  totalDepreciation: number;
};
