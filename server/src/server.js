//Importing necessary modules and configurations
import express from 'express'
import dotenv from 'dotenv'
dotenv.config();
import cors from 'cors';
import connectDB from './config/db.js';
import { leadRoutes } from './routes/curd-lead/leadRoutes.js';
import { authRoutes } from './routes/auth/auth.routes.js';
import { leadFieldRoutes } from './routes/leadField.routes.js';
import { followUpRoutes } from './routes/followUp.routes.js';
import { contactRoutes } from './routes/contact.routes.js';
import { dealRoutes } from './routes/deal.routes.js';
import { teamRoutes } from './routes/team.routes.js';
import { settingsRoutes } from './routes/settings.routes.js';

//------------------------------------------------
//Initialize express app
const app = express()
const port = process.env.PORT || 3000

try {
  await connectDB();
} catch (error) {
  console.error(`MongoDB connection failed: ${error.message}`);
  process.exit(1);
}

app.use(express.json())
app.use(cors())
//-------------------------------------------------
//Routes
//Auth Routes
app.use('/api/auth', authRoutes);

//Lead Routes
app.use('/api/leads', leadRoutes);
app.use('/api/lead-fields', leadFieldRoutes);
app.use('/api/follow-ups', followUpRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/settings', settingsRoutes);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})