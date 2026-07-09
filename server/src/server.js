//Importing necessary modules and configurations
import express from 'express'
import dotenv from 'dotenv'
dotenv.config();
import cors from 'cors';
import connectDB from './config/db.js';
import { leadRoutes } from './routes/curd-lead/leadRoutes.js';
import { authRoutes } from './routes/auth/auth.routes.js';

//------------------------------------------------
//Initialize express app
const app = express()
const port = process.env.PORT || 3000
connectDB();
app.use(express.json())
app.use(cors())
//-------------------------------------------------
//Routes
//Auth Routes
app.use('/api/auth', authRoutes);

//Lead Routes
app.use('/api/leads', leadRoutes);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})