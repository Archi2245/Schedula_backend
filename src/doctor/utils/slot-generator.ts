export interface SlotInfo {
  time: string;
  available_spots: number;
  total_spots: number;
  is_fully_booked: boolean;
}

export function generateAvailableSlots(
  startTime: string,
  endTime: string,
  scheduleType: 'stream' | 'wave',
  slotDuration: number, // NEW PARAMETER
  patientsPerSlot: number, // NEW PARAMETER
  existingBookings: Record<string, number> = {}
): SlotInfo[] {
  const slots: SlotInfo[] = [];
  const maxSpots = scheduleType === 'stream' ? 1 : patientsPerSlot; // DYNAMIC

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  let current = startH * 60 + startM;
  const endTotal = endH * 60 + endM;

  while (current < endTotal) {
    const h = Math.floor(current / 60).toString().padStart(2, '0');
    const m = (current % 60).toString().padStart(2, '0');
    const timeSlot = `${h}:${m}`;
    
    const bookedCount = existingBookings[timeSlot] || 0;
    
    slots.push({
      time: timeSlot,
      available_spots: maxSpots - bookedCount,
      total_spots: maxSpots,
      is_fully_booked: bookedCount >= maxSpots
    });
    
    current += slotDuration; // DYNAMIC INTERVAL
  }

  return slots;
}