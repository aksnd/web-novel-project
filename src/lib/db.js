const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'database-1.ch4sogq04o7r.ap-northeast-2.rds.amazonaws.com',  // MySQL 서버 호스트 (EC2 인스턴스라면 해당 IP 주소)
  user: 'admin',  // MySQL 사용자 이름
  password: 'awsdbfirst',  // MySQL 비밀번호
  database: 'webnovel_db'  // 연결할 데이터베이스 이름
});

module.exports = pool;