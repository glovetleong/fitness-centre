import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import memberRoutes from './routes/members.js'

dotenv.config()
const app = express()

const corsOrigin = process.env.CORS_ORIGIN || '*'

app.use(cors({
  origin: corsOrigin,
  credentials: true
}))

app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/members', memberRoutes)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`)
})
