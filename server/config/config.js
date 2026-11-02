require("dotenv").config();

module.exports = {
  development: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT || "mysql",
  },
  test: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME_TEST || "database_test",
    host: process.env.DB_HOST || "127.0.0.1",
    dialect: "mysql",
  },
  // Hosted MySQL (Aiven, TiDB Cloud...): DATABASE_URL like
  // mysql://user:pass@host:port/db. DB_SSL=true turns on TLS, and DB_SSL_CA
  // holds the provider's CA certificate (PEM) when it isn't publicly trusted.
  production: {
    use_env_variable: "DATABASE_URL",
    dialect: "mysql",
    logging: false,
    dialectOptions:
      process.env.DB_SSL === "true"
        ? { ssl: process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA } : { rejectUnauthorized: true } }
        : {},
  },
};