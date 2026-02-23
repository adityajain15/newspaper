import dotenv from 'dotenv'
dotenv.config()

export default {
  development: {
    url:
      process.env.POSTGRES_URL ||
      'postgresql://postgres:postgres@localhost:5432/dockerapp',
    dialect: 'postgres',
    logging: false,
  },
  test: {
    url:
      process.env.POSTGRES_URL ||
      'postgresql://postgres:postgres@localhost:5432/dockerapp',
    dialect: 'postgres',
    logging: false,
  },
  production: {
    url: process.env.POSTGRES_URL,
    dialect: 'postgres',
    logging: false,
  },
}
