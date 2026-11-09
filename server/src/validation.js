export const SLOTS = [
  'Morning (fasting)',
  'After breakfast',
  'After lunch',
  'After dinner'
];

export function today() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-');
}

export function validDate(date) {
  if (typeof date !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const parsed = new Date(date + 'T00:00:00Z');

  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date;
}

export function validateReading(body) {
  if (!body || body.value === '' || body.value == null) {
    return 'Please enter a glucose value.';
  }

  if (
    !Number.isInteger(body.value) ||
    body.value < 40 ||
    body.value > 600
  ) {
    return 'Value must be between 40 and 600 mg/dl.';
  }

  if (!validDate(body.date)) {
    return 'Please enter a valid date.';
  }

  if (body.date > today()) {
    return 'Date cannot be in the future.';
  }

  if (!SLOTS.includes(body.slot)) {
    return 'Please select a valid time slot.';
  }

  return null;
}
