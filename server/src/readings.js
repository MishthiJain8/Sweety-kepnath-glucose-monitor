import { Router } from 'express';
import { db } from './db.js';
import { requireAuth } from './auth.js';
import { validateReading } from './validation.js';

export const readingsRouter = Router();

readingsRouter.use(requireAuth);

function handleError(error, req, res) {
  if (error.code === '23505') {
    return res.status(409).json({
      error: `You already have an ${req.body.slot} reading for this date.`
    });
  }

  console.error(error);

  return res.status(500).json({
    error: 'Something went wrong while saving the reading.'
  });
}

// View all readings belonging to logged-in user
readingsRouter.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         id,
         TO_CHAR(reading_date, 'YYYY-MM-DD') AS date,
         slot,
         value
       FROM readings
       WHERE user_id = $1
       ORDER BY reading_date DESC,
       CASE slot
         WHEN 'Morning (fasting)' THEN 1
         WHEN 'After breakfast' THEN 2
         WHEN 'After lunch' THEN 3
         WHEN 'After dinner' THEN 4
       END`,
      [req.user.id]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Unable to load readings.'
    });
  }
});

// Add new reading
readingsRouter.post('/', async (req, res) => {
  const error = validateReading(req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  const { date, slot, value } = req.body;

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Serialize writes for this user to enforce the four-per-day limit.
    await client.query(
      'SELECT id FROM users WHERE id = $1 FOR UPDATE',
      [req.user.id]
    );

    const countResult = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM readings
       WHERE user_id = $1 AND reading_date = $2`,
      [req.user.id, date]
    );

    if (countResult.rows[0].total >= 4) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        error: 'You can add only 4 readings per day.'
      });
    }

    const result = await client.query(
      `INSERT INTO readings
         (user_id, reading_date, slot, value)
       VALUES ($1, $2, $3, $4)
       RETURNING
         id,
         TO_CHAR(reading_date, 'YYYY-MM-DD') AS date,
         slot,
         value`,
      [req.user.id, date, slot, value]
    );

    await client.query('COMMIT');

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    return handleError(error, req, res);
  } finally {
    client.release();
  }
});

// Edit an existing reading
readingsRouter.put('/:id', async (req, res) => {
  const error = validateReading(req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  const { date, slot, value } = req.body;

  try {
    const result = await db.query(
      `UPDATE readings
       SET reading_date = $1,
           slot = $2,
           value = $3
       WHERE id = $4 AND user_id = $5
       RETURNING
         id,
         TO_CHAR(reading_date, 'YYYY-MM-DD') AS date,
         slot,
         value`,
      [date, slot, value, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Reading not found.'
      });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return handleError(error, req, res);
  }
});

// Delete a reading
readingsRouter.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM readings
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Reading not found.'
      });
    }

    return res.json({
      message: 'Reading deleted successfully.'
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Unable to delete reading.'
    });
  }
});
