import { Router } from 'express';
import { db } from './db.js';
import { requireAuth } from './auth.js';
import { today, validDate } from './validation.js';

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

export function reportRange(type, date) {
  const [year, month] = date.split('-').map(Number);

  if (type === 'daily') {
    return { start: date, end: date };
  }

  if (type === 'mtd') {
    return {
      start: `${year}-${String(month).padStart(2, '0')}-01`,
      end: date
    };
  }

  if (type === 'monthly') {
    const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const firstOfPrevious = new Date(Date.UTC(year, month - 2, 1));
    const lastOfPrevious = new Date(
      firstOfMonth.getTime() - 86400000
    );

    return {
      start: firstOfPrevious.toISOString().slice(0, 10),
      end: lastOfPrevious.toISOString().slice(0, 10)
    };
  }

  return null;
}

export function calculateStats(readings) {
  if (readings.length === 0) {
    return {
      highest: null,
      lowest: null,
      average: null,
      count: 0
    };
  }

  const values = readings.map(r => Number(r.value));

  const sum = values.reduce((total, value) => total + value, 0);

  return {
    highest: Math.max(...values),
    lowest: Math.min(...values),
    average: Math.round((sum / values.length) * 10) / 10,
    count: values.length
  };
}

reportsRouter.get('/', async (req, res) => {
  const type = req.query.type || 'daily';
  const date = req.query.date || today();

  if (!validDate(date) || date > today()) {
    return res.status(400).json({
      error: 'Please select a valid date that is not in the future.'
    });
  }

  const range = reportRange(type, date);

  if (!range) {
    return res.status(400).json({
      error: 'Invalid report type.'
    });
  }

  try {
    const result = await db.query(
      `SELECT
         TO_CHAR(reading_date, 'YYYY-MM-DD') AS date,
         slot,
         value
       FROM readings
       WHERE user_id = $1
         AND reading_date BETWEEN $2 AND $3
       ORDER BY reading_date,
       CASE slot
         WHEN 'Morning (fasting)' THEN 1
         WHEN 'After breakfast' THEN 2
         WHEN 'After lunch' THEN 3
         WHEN 'After dinner' THEN 4
       END`,
      [req.user.id, range.start, range.end]
    );

    return res.json({
      type,
      ...range,
      ...calculateStats(result.rows),
      readings: type === 'daily' ? result.rows : []
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Unable to generate report.'
    });
  }
});
