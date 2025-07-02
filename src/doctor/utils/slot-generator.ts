export interface SlotInfo {
  time: string;
  available_spots: number;
  total_spots: number;
  is_fully_booked: boolean;
  reporting_interval_minutes?: number; // For wave scheduling
  schedule_type: 'stream' | 'wave';
}

/**
 * 🔥 LEGACY FUNCTION: Generate simple time slots (for backward compatibility)
 * This generates basic time slot strings without booking information
 */
export function generateTimeSlots(startTime: string, endTime: string, intervalMinutes: number = 15): string[] {
  const slots: string[] = [];
  
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  let current = startH * 60 + startM;
  const endTotal = endH * 60 + endM;

  while (current < endTotal) {
    const h = Math.floor(current / 60).toString().padStart(2, '0');
    const m = (current % 60).toString().padStart(2, '0');
    const timeSlot = `${h}:${m}`;
    
    slots.push(timeSlot);
    current += intervalMinutes;
  }

  return slots;
}

/**
 * 🔥 FULLY DYNAMIC: Generate slots using doctor's actual configuration
 */
export function generateAvailableSlots(
  startTime: string,
  endTime: string,
  scheduleType: 'stream' | 'wave',
  slotDuration: number,        // Doctor's configured slot duration
  patientsPerSlot: number,     // Doctor's configured patients per slot
  consultingTimePerPatient: number, // Doctor's consulting time per patient
  existingBookings: Record<string, number> = {}
): SlotInfo[] {
  const slots: SlotInfo[] = [];
  
  // Validate configuration makes business sense
  validateSlotConfiguration(scheduleType, slotDuration, patientsPerSlot, consultingTimePerPatient);
  
  const maxSpots = scheduleType === 'stream' ? 1 : patientsPerSlot;
  const reportingInterval = scheduleType === 'stream' 
    ? slotDuration 
    : Math.floor(slotDuration / patientsPerSlot);

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
      is_fully_booked: bookedCount >= maxSpots,
      reporting_interval_minutes: reportingInterval,
      schedule_type: scheduleType
    });
    
    current += slotDuration; // Use doctor's configured slot duration
  }

  return slots;
}

/**
 * 🔥 NEW: Validate that the doctor's slot configuration is feasible
 */
function validateSlotConfiguration(
  scheduleType: 'stream' | 'wave',
  slotDuration: number,
  patientsPerSlot: number,
  consultingTimePerPatient: number
): void {
  if (scheduleType === 'wave') {
    const reportingInterval = Math.floor(slotDuration / patientsPerSlot);
    
    if (reportingInterval < consultingTimePerPatient) {
      throw new Error(
        `Invalid wave configuration: Reporting interval (${reportingInterval} min) < consulting time (${consultingTimePerPatient} min). ` +
        `Need either longer slot_duration (${slotDuration}) or fewer patients_per_slot (${patientsPerSlot}).`
      );
    }
    
    if (reportingInterval < 5) {
      throw new Error(
        `Invalid wave configuration: Reporting interval (${reportingInterval} min) too short. Minimum 5 minutes between patients.`
      );
    }
    
    if (patientsPerSlot < 2) {
      throw new Error('Wave scheduling requires at least 2 patients per slot. Use stream scheduling for 1 patient per slot.');
    }
  }
  
  if (scheduleType === 'stream') {
    if (slotDuration < consultingTimePerPatient) {
      throw new Error(
        `Invalid stream configuration: Slot duration (${slotDuration} min) < consulting time (${consultingTimePerPatient} min).`
      );
    }
  }
  
  // General validations
  if (slotDuration < 5 || slotDuration > 120) {
    throw new Error('Slot duration must be between 5 and 120 minutes.');
  }
  
  if (consultingTimePerPatient < 5 || consultingTimePerPatient > 60) {
    throw new Error('Consulting time per patient must be between 5 and 60 minutes.');
  }
}

/**
 * 🔥 NEW: Calculate reporting times for a wave scheduling slot
 */
export function calculateWaveReportingTimes(
  slotStartTime: string,
  slotDuration: number,
  patientsPerSlot: number,
  currentBookings: number
): { reportingTimes: string[], nextAvailableTime: string | null } {
  const reportingInterval = Math.floor(slotDuration / patientsPerSlot);
  const reportingTimes: string[] = [];
  
  const [startH, startM] = slotStartTime.split(':').map(Number);
  let currentMinutes = startH * 60 + startM;
  
  // Generate all possible reporting times for this slot
  for (let i = 0; i < patientsPerSlot; i++) {
    const h = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
    const m = (currentMinutes % 60).toString().padStart(2, '0');
    reportingTimes.push(`${h}:${m}`);
    currentMinutes += reportingInterval;
  }
  
  // Find next available reporting time
  const nextAvailableTime = currentBookings < patientsPerSlot 
    ? reportingTimes[currentBookings] 
    : null;
  
  return { reportingTimes, nextAvailableTime };
}

/**
 * 🔥 NEW: Get configuration recommendations for doctors
 */
export function getSchedulingRecommendations() {
  return {
    stream: {
      description: "One patient per time slot - immediate service",
      recommended_slot_durations: [10, 15, 20], // minutes
      patients_per_slot: 1,
      use_cases: ["Specialists", "Complex procedures", "New patient consultations"]
    },
    wave: {
      description: "Multiple patients per time block - staggered reporting times", 
      recommended_configs: [
        { slot_duration: 20, patients_per_slot: 2, interval: 10 },
        { slot_duration: 30, patients_per_slot: 3, interval: 10 },
        { slot_duration: 40, patients_per_slot: 4, interval: 10 },
        { slot_duration: 60, patients_per_slot: 6, interval: 10 }
      ],
      use_cases: ["General practice", "Follow-up visits", "Routine check-ups"]
    }
  };
}