/**
 * Centralized City and Location Catalog for Safar Saarthi
 * Single source of truth for city names, airport IATA codes, railway station codes,
 * and bus terminals across backend, frontend, and test suites.
 */

export interface LocationHub {
  code: string;
  name: string;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface CityLocation {
  id: string;
  name: string;
  state: string;
  displayLabel: string;
  aliases: string[];
  airport: LocationHub;
  railway: LocationHub;
  busTerminal: LocationHub;
  coordinates: LocationCoordinates;
  popularCorridor?: boolean;
}

export const CITY_LOCATIONS: CityLocation[] = [
  {
    id: 'delhi',
    name: 'New Delhi',
    state: 'National Capital Territory of Delhi',
    displayLabel: 'New Delhi (DEL)',
    aliases: ['delhi', 'new delhi', 'del', 'ndls', 'dli', 'nzm', 'anvt', 'ncr', 'capital'],
    airport: {
      code: 'DEL',
      name: 'Indira Gandhi International Airport (DEL)',
    },
    railway: {
      code: 'NDLS',
      name: 'New Delhi Railway Station (NDLS)',
    },
    busTerminal: {
      code: 'DEL-ISBT',
      name: 'ISBT Kashmiri Gate / Anand Vihar',
    },
    coordinates: {
      latitude: 28.6139,
      longitude: 77.209,
    },
    popularCorridor: true,
  },
  {
    id: 'kanpur',
    name: 'Kanpur',
    state: 'Uttar Pradesh',
    displayLabel: 'Kanpur (CNB)',
    aliases: ['kanpur', 'cawnpore', 'cnb', 'knu', 'kanpur central', 'chakeri', 'ganga', 'up'],
    airport: {
      code: 'KNU',
      name: 'Kanpur Chakeri Airport (KNU)',
    },
    railway: {
      code: 'CNB',
      name: 'Kanpur Central Railway Station (CNB)',
    },
    busTerminal: {
      code: 'CNB-JHAK',
      name: 'Jhakarkati Intercity Bus Stand, Kanpur',
    },
    coordinates: {
      latitude: 26.4499,
      longitude: 80.3319,
    },
    popularCorridor: true,
  },
  {
    id: 'varanasi',
    name: 'Varanasi',
    state: 'Uttar Pradesh',
    displayLabel: 'Varanasi (VNS)',
    aliases: ['varanasi', 'banaras', 'benares', 'kashi', 'vns', 'bsb', 'ghats', 'ganga'],
    airport: {
      code: 'VNS',
      name: 'Lal Bahadur Shastri International Airport (VNS)',
    },
    railway: {
      code: 'BSB',
      name: 'Varanasi Junction (BSB)',
    },
    busTerminal: {
      code: 'VNS-CBS',
      name: 'Varanasi Cantt Bus Stand',
    },
    coordinates: {
      latitude: 25.3176,
      longitude: 82.9739,
    },
    popularCorridor: true,
  },
  {
    id: 'jaipur',
    name: 'Jaipur',
    state: 'Rajasthan',
    displayLabel: 'Jaipur (JAI)',
    aliases: ['jaipur', 'pink city', 'jai', 'jp', 'rajasthan', 'amer', 'sanganer'],
    airport: {
      code: 'JAI',
      name: 'Jaipur International Airport (JAI)',
    },
    railway: {
      code: 'JP',
      name: 'Jaipur Junction (JP)',
    },
    busTerminal: {
      code: 'JAI-SC',
      name: 'Sindhi Camp Central Bus Stand',
    },
    coordinates: {
      latitude: 26.9124,
      longitude: 75.7873,
    },
    popularCorridor: true,
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    state: 'Maharashtra',
    displayLabel: 'Mumbai (BOM)',
    aliases: ['mumbai', 'bombay', 'bom', 'csmt', 'mmct', 'bdts', 'maharashtra'],
    airport: {
      code: 'BOM',
      name: 'Chhatrapati Shivaji Maharaj International Airport (BOM)',
    },
    railway: {
      code: 'CSMT',
      name: 'Chhatrapati Shivaji Maharaj Terminus (CSMT)',
    },
    busTerminal: {
      code: 'BOM-CEN',
      name: 'Mumbai Central Bus Depot',
    },
    coordinates: {
      latitude: 19.076,
      longitude: 72.8777,
    },
    popularCorridor: true,
  },
  {
    id: 'lucknow',
    name: 'Lucknow',
    state: 'Uttar Pradesh',
    displayLabel: 'Lucknow (LKO)',
    aliases: ['lucknow', 'lko', 'ljn', 'city of nawabs', 'alambagh', 'charbagh'],
    airport: {
      code: 'LKO',
      name: 'Chaudhary Charan Singh International Airport (LKO)',
    },
    railway: {
      code: 'LKO',
      name: 'Lucknow Charbagh Railway Station (LKO)',
    },
    busTerminal: {
      code: 'LKO-ALAM',
      name: 'Alambagh Inter State Bus Terminal (ISBT)',
    },
    coordinates: {
      latitude: 26.8467,
      longitude: 80.9462,
    },
    popularCorridor: true,
  },
  {
    id: 'agra',
    name: 'Agra',
    state: 'Uttar Pradesh',
    displayLabel: 'Agra (AGC)',
    aliases: ['agra', 'agr', 'agc', 'af', 'taj mahal', 'taj'],
    airport: {
      code: 'AGR',
      name: 'Agra Kheria Airport (AGR)',
    },
    railway: {
      code: 'AGC',
      name: 'Agra Cantt Railway Station (AGC)',
    },
    busTerminal: {
      code: 'AGR-ISBT',
      name: 'Agra ISBT Transport Nagar',
    },
    coordinates: {
      latitude: 27.1767,
      longitude: 78.0081,
    },
    popularCorridor: true,
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru',
    state: 'Karnataka',
    displayLabel: 'Bengaluru (BLR)',
    aliases: ['bengaluru', 'bangalore', 'blr', 'sbc', 'ypr', 'silicon valley', 'karnataka'],
    airport: {
      code: 'BLR',
      name: 'Kempegowda International Airport (BLR)',
    },
    railway: {
      code: 'SBC',
      name: 'KSR Bengaluru City Junction (SBC)',
    },
    busTerminal: {
      code: 'BLR-MAJ',
      name: 'Kempegowda Bus Station (Majestic)',
    },
    coordinates: {
      latitude: 12.9716,
      longitude: 77.5946,
    },
    popularCorridor: true,
  },
  {
    id: 'goa',
    name: 'Goa',
    state: 'Goa',
    displayLabel: 'Goa (GOI)',
    aliases: ['goa', 'panaji', 'madgaon', 'margao', 'goi', 'gox', 'mao', 'dabolim'],
    airport: {
      code: 'GOI',
      name: 'Dabolim Airport / Manohar Mopa (GOI)',
    },
    railway: {
      code: 'MAO',
      name: 'Madgaon Junction (MAO)',
    },
    busTerminal: {
      code: 'GOA-KTC',
      name: 'Kadamba KTC Bus Stand Panaji',
    },
    coordinates: {
      latitude: 15.2993,
      longitude: 74.124,
    },
    popularCorridor: true,
  },
  {
    id: 'kolkata',
    name: 'Kolkata',
    state: 'West Bengal',
    displayLabel: 'Kolkata (CCU)',
    aliases: ['kolkata', 'calcutta', 'ccu', 'hwh', 'sdah', 'howrah', 'west bengal'],
    airport: {
      code: 'CCU',
      name: 'Netaji Subhash Chandra Bose International Airport (CCU)',
    },
    railway: {
      code: 'HWH',
      name: 'Howrah Junction (HWH)',
    },
    busTerminal: {
      code: 'CCU-ESPL',
      name: 'Esplanade Bus Terminus, Kolkata',
    },
    coordinates: {
      latitude: 22.5726,
      longitude: 88.3639,
    },
  },
  {
    id: 'chennai',
    name: 'Chennai',
    state: 'Tamil Nadu',
    displayLabel: 'Chennai (MAA)',
    aliases: ['chennai', 'madras', 'maa', 'mas', 'ms', 'tamil nadu'],
    airport: {
      code: 'MAA',
      name: 'Chennai International Airport (MAA)',
    },
    railway: {
      code: 'MAS',
      name: 'Chennai Central (MAS)',
    },
    busTerminal: {
      code: 'MAA-CMBT',
      name: 'Chennai Mofussil Bus Terminus (CMBT)',
    },
    coordinates: {
      latitude: 13.0827,
      longitude: 80.2707,
    },
  },
  {
    id: 'hyderabad',
    name: 'Hyderabad',
    state: 'Telangana',
    displayLabel: 'Hyderabad (HYD)',
    aliases: ['hyderabad', 'secunderabad', 'hyd', 'hyb', 'sc', 'telangana'],
    airport: {
      code: 'HYD',
      name: 'Rajiv Gandhi International Airport (HYD)',
    },
    railway: {
      code: 'HYB',
      name: 'Hyderabad Deccan / Secunderabad (HYB)',
    },
    busTerminal: {
      code: 'HYD-MGBS',
      name: 'Mahatma Gandhi Bus Station (MGBS)',
    },
    coordinates: {
      latitude: 17.385,
      longitude: 78.4867,
    },
  },
  {
    id: 'pune',
    name: 'Pune',
    state: 'Maharashtra',
    displayLabel: 'Pune (PNQ)',
    aliases: ['pune', 'pnq', 'poona', 'shivajinagar'],
    airport: {
      code: 'PNQ',
      name: 'Pune International Airport (PNQ)',
    },
    railway: {
      code: 'PUNE',
      name: 'Pune Junction (PUNE)',
    },
    busTerminal: {
      code: 'PUNE-SWAR',
      name: 'Swargate / Shivajinagar Bus Stand',
    },
    coordinates: {
      latitude: 18.5204,
      longitude: 73.8567,
    },
  },
  {
    id: 'ahmedabad',
    name: 'Ahmedabad',
    state: 'Gujarat',
    displayLabel: 'Ahmedabad (AMD)',
    aliases: ['ahmedabad', 'amdavad', 'amd', 'adi', 'kalupur', 'gujarat'],
    airport: {
      code: 'AMD',
      name: 'Sardar Vallabhbhai Patel International Airport (AMD)',
    },
    railway: {
      code: 'ADI',
      name: 'Ahmedabad Junction (ADI)',
    },
    busTerminal: {
      code: 'AMD-GITA',
      name: 'Gita Mandir Central Bus Stand',
    },
    coordinates: {
      latitude: 23.0225,
      longitude: 72.5714,
    },
  },
  {
    id: 'chandigarh',
    name: 'Chandigarh',
    state: 'Chandigarh / Punjab / Haryana',
    displayLabel: 'Chandigarh (IXC)',
    aliases: ['chandigarh', 'ixc', 'cdg', 'tricity', 'mohali'],
    airport: {
      code: 'IXC',
      name: 'Shaheed Bhagat Singh International Airport (IXC)',
    },
    railway: {
      code: 'CDG',
      name: 'Chandigarh Junction (CDG)',
    },
    busTerminal: {
      code: 'CDG-ISBT',
      name: 'ISBT Sector 43 Chandigarh',
    },
    coordinates: {
      latitude: 30.7333,
      longitude: 76.7794,
    },
  },
  {
    id: 'amritsar',
    name: 'Amritsar',
    state: 'Punjab',
    displayLabel: 'Amritsar (ATQ)',
    aliases: ['amritsar', 'atq', 'asr', 'golden temple', 'punjab'],
    airport: {
      code: 'ATQ',
      name: 'Sri Guru Ram Dass Jee International Airport (ATQ)',
    },
    railway: {
      code: 'ASR',
      name: 'Amritsar Junction (ASR)',
    },
    busTerminal: {
      code: 'ASR-ISBT',
      name: 'Amritsar Central Bus Stand',
    },
    coordinates: {
      latitude: 31.634,
      longitude: 74.8723,
    },
  },
  {
    id: 'bhopal',
    name: 'Bhopal',
    state: 'Madhya Pradesh',
    displayLabel: 'Bhopal (BHO)',
    aliases: ['bhopal', 'bho', 'bpl', 'rkmp', 'habibganj', 'mp'],
    airport: {
      code: 'BHO',
      name: 'Raja Bhoj Airport (BHO)',
    },
    railway: {
      code: 'BPL',
      name: 'Bhopal Junction / Rani Kamlapati (BPL)',
    },
    busTerminal: {
      code: 'BPL-ISBT',
      name: 'Kushabhau Thakre ISBT Bhopal',
    },
    coordinates: {
      latitude: 23.2599,
      longitude: 77.4126,
    },
  },
  {
    id: 'patna',
    name: 'Patna',
    state: 'Bihar',
    displayLabel: 'Patna (PAT)',
    aliases: ['patna', 'pat', 'pnbe', 'patliputra', 'bihar'],
    airport: {
      code: 'PAT',
      name: 'Jay Prakash Narayan Airport (PAT)',
    },
    railway: {
      code: 'PNBE',
      name: 'Patna Junction (PNBE)',
    },
    busTerminal: {
      code: 'PAT-BSPTC',
      name: 'Bairiya ISBT Patna',
    },
    coordinates: {
      latitude: 25.5941,
      longitude: 85.1376,
    },
  },
  {
    id: 'dehradun',
    name: 'Dehradun',
    state: 'Uttarakhand',
    displayLabel: 'Dehradun (DED)',
    aliases: ['dehradun', 'ded', 'ddn', 'mussoorie', 'uttarakhand', 'doon'],
    airport: {
      code: 'DED',
      name: 'Jolly Grant Airport (DED)',
    },
    railway: {
      code: 'DDN',
      name: 'Dehradun Railway Station (DDN)',
    },
    busTerminal: {
      code: 'DDN-ISBT',
      name: 'ISBT Dehradun',
    },
    coordinates: {
      latitude: 30.3165,
      longitude: 78.0322,
    },
  },
  {
    id: 'udaipur',
    name: 'Udaipur',
    state: 'Rajasthan',
    displayLabel: 'Udaipur (UDR)',
    aliases: ['udaipur', 'udr', 'udz', 'city of lakes', 'mewar'],
    airport: {
      code: 'UDR',
      name: 'Maharana Pratap Airport (UDR)',
    },
    railway: {
      code: 'UDZ',
      name: 'Udaipur City Railway Station (UDZ)',
    },
    busTerminal: {
      code: 'UDR-BUS',
      name: 'Udaipur Central Bus Stand',
    },
    coordinates: {
      latitude: 24.5854,
      longitude: 73.7125,
    },
  },
];

/**
 * Searches city catalog with case-insensitive partial match across name, state, codes, and aliases.
 */
export function searchLocations(query: string, limit: number = 8): CityLocation[] {
  if (!query || !query.trim()) {
    return CITY_LOCATIONS.slice(0, limit);
  }

  const clean = query.trim().toLowerCase();

  const matches = CITY_LOCATIONS.filter((loc) => {
    if (loc.name.toLowerCase().includes(clean)) return true;
    if (loc.state.toLowerCase().includes(clean)) return true;
    if (loc.displayLabel.toLowerCase().includes(clean)) return true;
    if (loc.airport.code.toLowerCase().includes(clean)) return true;
    if (loc.railway.code.toLowerCase().includes(clean)) return true;
    return loc.aliases.some((alias) => alias.toLowerCase().includes(clean));
  });

  // Sort: Exact name start matches first, then alias matches
  matches.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(clean);
    const bStarts = b.name.toLowerCase().startsWith(clean);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return 0;
  });

  return matches.slice(0, limit);
}

/**
 * Resolves any user-entered string or code to a registered CityLocation.
 */
export function resolveLocation(input: string): CityLocation | null {
  if (!input || !input.trim()) return null;

  const raw = input.trim();
  const lower = raw.toLowerCase();

  // 1. Direct code match in parentheses, e.g. "Kanpur (CNB)" or "New Delhi (DEL)"
  const codeMatch = raw.match(/\(([A-Z0-9]{3,4})\)/i);
  if (codeMatch) {
    const code = codeMatch[1].toUpperCase();
    const found = CITY_LOCATIONS.find(
      (loc) =>
        loc.airport.code.toUpperCase() === code ||
        loc.railway.code.toUpperCase() === code ||
        loc.id.toUpperCase() === code
    );
    if (found) return found;
  }

  // 2. Direct exact 3-letter IATA / Station code match
  if (/^[A-Z]{3,4}$/i.test(raw)) {
    const code = raw.toUpperCase();
    const found = CITY_LOCATIONS.find(
      (loc) =>
        loc.airport.code.toUpperCase() === code ||
        loc.railway.code.toUpperCase() === code ||
        loc.id.toUpperCase() === code
    );
    if (found) return found;
  }

  // 3. Exact city name match
  const exactName = CITY_LOCATIONS.find((loc) => loc.name.toLowerCase() === lower);
  if (exactName) return exactName;

  // 4. Exact alias match
  const exactAlias = CITY_LOCATIONS.find((loc) =>
    loc.aliases.some((a) => a.toLowerCase() === lower)
  );
  if (exactAlias) return exactAlias;

  // 5. Partial substring match
  const partial = CITY_LOCATIONS.find(
    (loc) =>
      lower.includes(loc.name.toLowerCase()) ||
      loc.name.toLowerCase().includes(lower) ||
      loc.aliases.some((a) => lower.includes(a.toLowerCase()))
  );
  if (partial) return partial;

  return null;
}

/**
 * Validates whether the given string maps to a valid city in the catalog.
 */
export function isValidCityInput(input: string): boolean {
  return resolveLocation(input) !== null;
}

/**
 * Resolves city by unique id.
 */
export function findCityById(id: string): CityLocation | null {
  return CITY_LOCATIONS.find((loc) => loc.id.toLowerCase() === id.toLowerCase()) || null;
}
