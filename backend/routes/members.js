import express from 'express'
import { pool } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

router.use(authenticateToken)

// Get all members with pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query
    const offset = (page - 1) * limit
    const searchTerm = `%${search}%`

    const [rows] = await pool.query(
      `SELECT * FROM members
       WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?
       LIMIT ? OFFSET ?`,
      [searchTerm, searchTerm, searchTerm, parseInt(limit), parseInt(offset)]
    )

    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS count FROM members
       WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?`,
      [searchTerm, searchTerm, searchTerm]
    )

    const totalCount = countResult[0].count
    const totalPages = Math.ceil(totalCount / limit)

    res.json({
      members: rows,
      totalPages,
      currentPage: parseInt(page),
      totalCount
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Get member by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const [rows] = await pool.query('SELECT * FROM members WHERE id = ?', [id])

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Member not found' })
    }

    res.json(rows[0]) // Return the first (and only) member row
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Update member by ID
router.put('/:id', async (req, res) => {
  const { name, email, phone, membership_status } = req.body
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    await connection.query(
      'UPDATE members SET name = ?, email = ?, phone = ?, membership_status = ? WHERE id = ?',
      [name, email, phone, membership_status, req.params.id]
    )

    await connection.commit()

    res.json({ success: true })
  } catch (err) {
    await connection.rollback()

    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  } finally {
    // Release the connection back to the pool
    connection.release()
  }
})

export default router
