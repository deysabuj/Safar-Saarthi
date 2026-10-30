/**
 * Authentic raw response sample from RedBus Intercity Bus API
 * Corridor: Delhi -> Jaipur
 */
export const RAW_REDBUS_RESPONSE = {
  success: true,
  originCity: 'Delhi',
  destinationCity: 'Jaipur',
  availableBuses: [
    {
      serviceId: 'RB-ZB-44',
      operatorName: 'Zingbus Electric Intercity',
      busType: 'Premium AC Sleeper (2+1)',
      hasCharging: true,
      isSleeper: true,
      departure: {
        location: 'ISBT Kashmiri Gate, Delhi',
        time: '23:15',
        hubCode: 'DEL-ISBT',
      },
      arrival: {
        location: 'Sindhi Camp Central Bus Stand, Jaipur',
        time: '04:45',
        hubCode: 'JAI-SC',
        isNextDay: true,
      },
      totalDurationMinutes: 330,
      pricing: {
        baseFare: 499,
        gstAndOperatorFee: 45,
        totalPayable: 544,
      },
      availableSeatsCount: 22,
      bookingDeepLink: 'https://www.redbus.in/bus-tickets/delhi-to-jaipur',
    },
    {
      serviceId: 'RB-RSRTC-10',
      operatorName: 'RSRTC (Rajasthan State Road Transport)',
      busType: 'Volvo Multi-Axle AC Goldline (2+2)',
      hasCharging: false,
      isSleeper: false,
      departure: {
        location: 'Bikaner House, India Gate, Delhi',
        time: '07:30',
        hubCode: 'DEL-BH',
      },
      arrival: {
        location: 'Narayan Singh Circle, Jaipur',
        time: '13:15',
        hubCode: 'JAI-NSC',
        isNextDay: false,
      },
      totalDurationMinutes: 345,
      pricing: {
        baseFare: 720,
        gstAndOperatorFee: 36,
        totalPayable: 756,
      },
      availableSeatsCount: 16,
      bookingDeepLink: 'https://rsrtconline.rajasthan.gov.in',
    },
  ],
};

/**
 * Authentic raw response sample from RedBus Intercity Bus API
 * Corridor: Delhi -> Varanasi
 */
export const RAW_REDBUS_VARANASI_RESPONSE = {
  success: true,
  originCity: 'Delhi',
  destinationCity: 'Varanasi',
  availableBuses: [
    {
      serviceId: 'RB-UPSRTC-VNS-01',
      operatorName: 'UPSRTC (Uttar Pradesh State Road Transport)',
      busType: 'Janrath 3x2 AC Sleeper',
      hasCharging: true,
      isSleeper: true,
      departure: {
        location: 'ISBT Kashmiri Gate, Delhi',
        time: '18:30',
        hubCode: 'DEL-ISBT',
      },
      arrival: {
        location: 'Varanasi Cantt Bus Stand, Varanasi',
        time: '08:30',
        hubCode: 'VNS-CBS',
        isNextDay: true,
      },
      totalDurationMinutes: 840,
      pricing: {
        baseFare: 1050,
        gstAndOperatorFee: 75,
        totalPayable: 1125,
      },
      availableSeatsCount: 18,
      bookingDeepLink: 'https://www.redbus.in/bus-tickets/delhi-to-varanasi',
    },
    {
      serviceId: 'RB-ZB-VNS-02',
      operatorName: 'Zingbus Electric Intercity',
      busType: 'Premium AC Sleeper (2+1)',
      hasCharging: true,
      isSleeper: true,
      departure: {
        location: 'Akshardham Metro Station, Delhi',
        time: '20:00',
        hubCode: 'DEL-AKSH',
      },
      arrival: {
        location: 'Leartara Chowk, Varanasi',
        time: '09:30',
        hubCode: 'VNS-LRT',
        isNextDay: true,
      },
      totalDurationMinutes: 810,
      pricing: {
        baseFare: 1250,
        gstAndOperatorFee: 90,
        totalPayable: 1340,
      },
      availableSeatsCount: 14,
      bookingDeepLink: 'https://www.redbus.in/bus-tickets/delhi-to-varanasi',
    },
  ],
};

/**
 * Authentic raw response sample from RedBus Intercity Bus API
 * Corridor: Delhi -> Kanpur
 */
export const RAW_REDBUS_KANPUR_RESPONSE = {
  success: true,
  originCity: 'Delhi',
  destinationCity: 'Kanpur',
  availableBuses: [
    {
      serviceId: 'RB-UPSRTC-KNU-01',
      operatorName: 'UPSRTC (Uttar Pradesh State Road Transport)',
      busType: 'Janrath 2x2 AC Seater',
      hasCharging: true,
      isSleeper: false,
      departure: {
        location: 'ISBT Kashmiri Gate, Delhi',
        time: '21:00',
        hubCode: 'DEL-ISBT',
      },
      arrival: {
        location: 'Jhakarkati Bus Stand, Kanpur',
        time: '05:30',
        hubCode: 'CNB-JHAK',
        isNextDay: true,
      },
      totalDurationMinutes: 510,
      pricing: {
        baseFare: 680,
        gstAndOperatorFee: 40,
        totalPayable: 720,
      },
      availableSeatsCount: 22,
      bookingDeepLink: 'https://www.redbus.in/bus-tickets/delhi-to-kanpur',
    },
    {
      serviceId: 'RB-ZB-KNU-02',
      operatorName: 'Zingbus Electric Intercity',
      busType: 'Premium AC Sleeper (2+1)',
      hasCharging: true,
      isSleeper: true,
      departure: {
        location: 'Anand Vihar Metro, Delhi',
        time: '22:00',
        hubCode: 'DEL-ANVT',
      },
      arrival: {
        location: 'Fazalganj Chauraha, Kanpur',
        time: '06:00',
        hubCode: 'CNB-FAZL',
        isNextDay: true,
      },
      totalDurationMinutes: 480,
      pricing: {
        baseFare: 850,
        gstAndOperatorFee: 60,
        totalPayable: 910,
      },
      availableSeatsCount: 16,
      bookingDeepLink: 'https://www.redbus.in/bus-tickets/delhi-to-kanpur',
    },
  ],
};
