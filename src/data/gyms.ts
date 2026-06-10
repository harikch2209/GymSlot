import { Gym, Slot } from '@/types';

function makeSlots(basePrice: number): Slot[] {
  const times = ['06:00', '07:00', '08:00', '11:00', '13:00', '17:00', '18:30', '19:30', '20:30'];
  return times.map((time, i) => {
    const peak = time >= '17:00' || time <= '08:00';
    const duration: 30 | 60 = i % 3 === 0 ? 30 : 60;
    const price = peak ? basePrice + 50 : basePrice;
    const capacity = 12;
    // Vary booked count to demo remaining capacity + a "Full" slot.
    const booked = i === 5 ? capacity : (i * 2) % (capacity + 1);
    return {
      id: `${time}-${duration}`,
      time,
      duration,
      price: duration === 30 ? Math.round(price * 0.7) : price,
      capacity,
      booked,
      peak,
    };
  });
}

export const GYMS: Gym[] = [
  {
    id: 'g1',
    name: 'IronCore Fitness',
    area: 'Indiranagar',
    distanceKm: 1.2,
    rating: 4.6,
    reviews: 318,
    priceFrom: 119,
    crowd: 'Low',
    crowdUpdatedMinsAgo: 3,
    amenities: ['Cardio', 'Weights', 'Shower', 'AC', 'Locker'],
    image: '🏋️',
    about:
      'Fully-equipped strength & conditioning gym with free weights, machines, and a dedicated functional zone. Pay-per-slot friendly during off-peak hours.',
    timings: '5:00 AM – 11:00 PM',
    slots: makeSlots(199),
  },
  {
    id: 'g2',
    name: 'PulseFit Studio',
    area: 'Koramangala',
    distanceKm: 2.4,
    rating: 4.4,
    reviews: 204,
    priceFrom: 99,
    crowd: 'Moderate',
    crowdUpdatedMinsAgo: 8,
    amenities: ['Cardio', 'AC', 'Shower', 'Parking'],
    image: '💪',
    about:
      'Boutique cardio + HIIT studio. Great for quick 30-minute sessions. Clean, air-conditioned, and rarely packed mid-day.',
    timings: '6:00 AM – 10:00 PM',
    slots: makeSlots(149),
  },
  {
    id: 'g3',
    name: 'Titan Strength Lab',
    area: 'HSR Layout',
    distanceKm: 3.1,
    rating: 4.8,
    reviews: 512,
    priceFrom: 149,
    crowd: 'High',
    crowdUpdatedMinsAgo: 2,
    amenities: ['Weights', 'CrossFit', 'Shower', 'Parking', 'Locker'],
    image: '🦾',
    about:
      'Powerlifting & CrossFit focused box. Calibrated plates, platforms, and rigs. Popular in the evenings — book off-peak for an empty floor.',
    timings: '5:30 AM – 11:00 PM',
    slots: makeSlots(179),
  },
  {
    id: 'g4',
    name: 'FlexZone Community Gym',
    area: 'Whitefield',
    distanceKm: 5.8,
    rating: 4.1,
    reviews: 96,
    priceFrom: 79,
    crowd: 'Unknown',
    crowdUpdatedMinsAgo: 75,
    amenities: ['Cardio', 'Weights', 'Parking'],
    image: '🏃',
    about:
      'Friendly neighbourhood community gym with budget-friendly slots. The most affordable pay-per-use option nearby.',
    timings: '6:00 AM – 10:00 PM',
    slots: makeSlots(99),
  },
  {
    id: 'g5',
    name: 'Apex Wellness Club',
    area: 'JP Nagar',
    distanceKm: 4.2,
    rating: 4.5,
    reviews: 271,
    priceFrom: 129,
    crowd: 'Low',
    crowdUpdatedMinsAgo: 12,
    amenities: ['Cardio', 'Weights', 'Shower', 'AC', 'Parking', 'Locker'],
    image: '🧘',
    about:
      'Premium wellness club with a spacious floor, sauna, and group class studio. Spotlessly maintained.',
    timings: '5:00 AM – 11:30 PM',
    slots: makeSlots(169),
  },
];

export function getGym(id: string): Gym | undefined {
  return GYMS.find((g) => g.id === id);
}
