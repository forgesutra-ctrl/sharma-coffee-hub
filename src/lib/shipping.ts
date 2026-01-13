// Shipping charge calculation based on PIN code region

export type ShippingRegion = 'karnataka' | 'south_india' | 'rest_of_india';

// PIN code to state mapping (first 2-3 digits)
const STATE_PINCODE_MAP: Record<string, string> = {
  // Karnataka: 56-59
  '56': 'Karnataka', '57': 'Karnataka', '58': 'Karnataka', '59': 'Karnataka',
  // Tamil Nadu: 60-64
  '60': 'Tamil Nadu', '61': 'Tamil Nadu', '62': 'Tamil Nadu', '63': 'Tamil Nadu', '64': 'Tamil Nadu',
  // Kerala: 67-69
  '67': 'Kerala', '68': 'Kerala', '69': 'Kerala',
  // Andhra Pradesh: 50-53
  '50': 'Andhra Pradesh', '51': 'Andhra Pradesh', '52': 'Andhra Pradesh', '53': 'Andhra Pradesh',
  // Telangana: 50-51 (overlaps with AP)
  // We'll classify 50-51 as South India regardless
};

const SOUTH_INDIA_STATES = ['Tamil Nadu', 'Kerala', 'Andhra Pradesh', 'Telangana'];
const KARNATAKA = 'Karnataka';

export const SHIPPING_CHARGES: Record<ShippingRegion, number> = {
  karnataka: 50,
  south_india: 60,
  rest_of_india: 100,
};

export function getShippingRegion(pincode: string): ShippingRegion | null {
  if (!pincode || !/^[0-9]{6}$/.test(pincode)) {
    return null;
  }

  const prefix = pincode.substring(0, 2);
  const state = STATE_PINCODE_MAP[prefix];

  if (state === KARNATAKA) {
    return 'karnataka';
  }

  if (state && SOUTH_INDIA_STATES.includes(state)) {
    return 'south_india';
  }

  // All other valid PIN codes are rest of India
  return 'rest_of_india';
}

export function getShippingCharge(pincode: string): number {
  const region = getShippingRegion(pincode);
  if (!region) return 0;
  return SHIPPING_CHARGES[region];
}

export function validatePincode(pincode: string): boolean {
  return /^[0-9]{6}$/.test(pincode);
}

export function getShippingRegionLabel(region: ShippingRegion): string {
  const labels: Record<ShippingRegion, string> = {
    karnataka: 'Karnataka',
    south_india: 'South India',
    rest_of_india: 'Rest of India',
  };
  return labels[region];
}

// COD constants
export const COD_ADVANCE_AMOUNT = 100;
export const COD_HANDLING_FEE = 50;
