import express from 'express';
import cors from 'cors';
import './db.js';

import { authRouter } from './auth.js';
import { readingsRouter } from './readings.js';
import { reportsRouter } from './reports.js';

const app = express();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters.');
}

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173'
}));

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/readings', readingsRouter);
app.use('/api/reports', reportsRouter);

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`Sweety API running at http://localhost:${port}`);
});
