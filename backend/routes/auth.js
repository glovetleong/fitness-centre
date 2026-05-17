import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../db.js'
import dotenv from 'dotenv'
dotenv.config()

const router = express.Router()

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email])
  const user = rows[0]

  if (!user) return res.status(401).json({ error: 'Invalid credentials' })

  const match = await bcrypt.compare(password, user.password)
  if (!match) return res.status(401).json({ error: 'Invalid credentials' })

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET)
  res.json({ token })
})

export default router