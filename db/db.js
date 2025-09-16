// db.js - 数据库配置
const mysql = require('mysql2');

const pool = mysql.createPool({
//host: "localhost",
  host: process.env.DB_HOST,
  user: "jia",
  password: "123",
  database: "jdb",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = {
  query: (sql, params) => {
    return new Promise((resolve, reject) => {
      pool.query(sql, params, (err, results, fields) => {
        if (err) return reject(err);
        resolve([results, fields]);
      });
    });
  },
  connect: callback => pool.getConnection(callback)
};