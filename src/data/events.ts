import { GymEvent } from '@/types';

export const EVENTS: GymEvent[] = [
  {
    id: 'e1',
    gymId: 'g1',
    gymName: 'IronCore Fitness',
    title: 'Saturday Cardio Bootcamp',
    category: 'Bootcamp',
    description:
      'High-energy 45-minute outdoor-style bootcamp. All levels welcome. Coaches scale every movement to your fitness.',
    date: 'Sat, 14 Jun',
    time: '07:00 AM',
    durationMins: 45,
    capacity: 30,
    reserved: 18,
    price: 0,
    image: '🔥',
    whatToBring: 'Water bottle, towel, training shoes',
  },
  {
    id: 'e2',
    gymId: 'g5',
    gymName: 'Apex Wellness Club',
    title: 'Sunrise Yoga & Breathwork',
    category: 'Yoga',
    description:
      'Start your day grounded. A calming flow followed by guided breathwork in our naturally-lit studio.',
    date: 'Sun, 15 Jun',
    time: '06:30 AM',
    durationMins: 60,
    capacity: 20,
    reserved: 11,
    price: 149,
    image: '🧘',
    whatToBring: 'Yoga mat (or rent ₹20 on site)',
  },
  {
    id: 'e3',
    gymId: 'g3',
    gymName: 'Titan Strength Lab',
    title: 'Deadlift Technique Workshop',
    category: 'Workshop',
    description:
      'Dial in your deadlift with a national-level coach. Video form review included. Limited spots for personal attention.',
    date: 'Sat, 14 Jun',
    time: '05:00 PM',
    durationMins: 90,
    capacity: 12,
    reserved: 9,
    price: 299,
    image: '🏋️',
    whatToBring: 'Lifting shoes, chalk optional',
  },
  {
    id: 'e4',
    gymId: 'g2',
    gymName: 'PulseFit Studio',
    title: 'Free Open House & Tour',
    category: 'Open House',
    description:
      'New to the area? Drop in for a free guided tour, a sample HIIT class, and a smoothie on us.',
    date: 'Fri, 13 Jun',
    time: '06:00 PM',
    durationMins: 60,
    capacity: 40,
    reserved: 22,
    price: 0,
    image: '🎉',
    whatToBring: 'Just yourself!',
  },
];

export function getEvent(id: string): GymEvent | undefined {
  return EVENTS.find((e) => e.id === id);
}
