// db.js - 数据库配置
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: "192.168.30.6",
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
      pool.query(sql, params, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  },
  connect: callback => pool.getConnection(callback)
};