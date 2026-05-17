import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'
import { faker } from '@faker-js/faker'

async function migrate() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: ''
  })

  await connection.query(`CREATE DATABASE IF NOT EXISTS fitness_centre`)
  await connection.query(`USE fitness_centre`)

  await connection.query(`
    CREATE TABLE IF NOT EXISTS members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(100),
      phone VARCHAR(20),
      membership_status ENUM('Active', 'Inactive'),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(100) UNIQUE,
      password VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Seed default user
  const email = 'admin@example.com'
  const plainPassword = 'admin123'
  const hashedPassword = await bcrypt.hash(plainPassword, 10)

  await connection.query(`
    INSERT IGNORE INTO users (email, password)
    VALUES (?, ?)
  `, [email, hashedPassword])

  // Seed 200 members
  const members = []
  for (let i = 0; i < 200; i++) {
    members.push([
      faker.person.fullName(),
      faker.internet.email(),
      '60' + faker.string.numeric(9),
      Math.random() > 0.5 ? 'Active' : 'Inactive'
    ])
  }

  await connection.query(`
    INSERT INTO members (name, email, phone, membership_status)
    VALUES ?
  `, [members])

  console.log('✅ Migration and seeding complete.')
  await connection.end()
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err)
})
