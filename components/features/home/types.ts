export interface HomeFacility {
  code: string;
  slug: string;
  name: string;
  address: string;
  provinceName: string;
  logoUrl: string | null;
  allowOnlinePayment?: boolean;
}

export interface HomeStatsData {
  facilityCount: number;
  specialtyCount?: number;
  doctorCount?: number;
}
