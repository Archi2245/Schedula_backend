export function generateTimeSlots(start: string, end: string): string[] {
  const slots: string[] = []; // ✅ explicitly typed as string[]

  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  let current = startH * 60 + startM;
  const endTotal = endH * 60 + endM;

  while (current < endTotal) {
    const h = Math.floor(current / 60).toString().padStart(2, '0');
    const m = (current % 60).toString().padStart(2, '0');
    slots.push(`${h}:${m}`); // ✅ now valid
    current += 15;
  }

  return slots;
}
