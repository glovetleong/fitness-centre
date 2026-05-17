/**
 * DB migration for Kubernetes (uses env vars from Secret).
 * Run once: kubectl apply -f deploy/k8s/migrate-job.yaml
 */
import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'
import { faker } from '@faker-js/faker'

const config = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
}

async function migrate() {
  const rdsManaged = process.env.RDS_MANAGED === 'true'

  const connection = await mysql.createConnection(
    rdsManaged
      ? { ...config, database: config.database }
      : {
          host: config.host,
          user: config.user,
          password: config.password,
          multipleStatements: true,
        }
  )

  if (!rdsManaged) {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\``)
    await connection.query(`USE \`${config.database}\``)
  }

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

  const email = 'admin@example.com'
  const hashedPassword = await bcrypt.hash('admin123', 10)

  await connection.query(
    `INSERT IGNORE INTO users (email, password) VALUES (?, ?)`,
    [email, hashedPassword]
  )

  const [rows] = await connection.query('SELECT COUNT(*) AS c FROM members')
  if (rows[0].c === 0) {
    const members = []
    for (let i = 0; i < 200; i++) {
      members.push([
        faker.person.fullName(),
        faker.internet.email(),
        '60' + faker.string.numeric(9),
        Math.random() > 0.5 ? 'Active' : 'Inactive',
      ])
    }
    await connection.query(
      `INSERT INTO members (name, email, phone, membership_status) VALUES ?`,
      [members]
    )
  }

  console.log('Migration complete.')
  await connection.end()
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
