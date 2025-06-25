export class CreateAvailabilityDto {
  date: string; // e.g. "2025-06-24"
  start_time: string; // e.g. "10:00"
  end_time: string; // e.g. "13:00"
  session?: 'morning' | 'evening';
  weekday?: string;
}
