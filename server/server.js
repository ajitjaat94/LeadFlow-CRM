//Importing necessary modules and configurations
import express from 'express'
import dotenv from 'dotenv'
dotenv.config();
import cors from 'cors';
import connectDB from './config/db.js';
import { leadRoutes } from './routes/leadRoutes.js';
import { getLeadRoutes } from './routes/getLeadRoutes.js';
import { updateLeadRoutes } from './routes/updateLeadRoutes.js';
import { deleteLeadsRoutes } from './routes/deleteLeadsRoute.js';
import { getSingleLeadRoutes } from './routes/getSingleLeadRoute.js';
import { getStatusLeadRoutes } from './routes/getStatusLeadRoute.js';

//------------------------------------------------
//Initialize express app
const app = express()
const port = process.env.PORT || 3000
connectDB();
app.use(express.json())
app.use(cors())
//-------------------------------------------------
//Routes
app.use('/api/leads', leadRoutes);
app.use('/api/leads', getLeadRoutes);
app.use('/api/leads', updateLeadRoutes);
app.use('/api/leads', deleteLeadsRoutes);
app.use('/api/leads', getSingleLeadRoutes);
app.use('/api/status', getStatusLeadRoutes);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})