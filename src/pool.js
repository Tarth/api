const DbConn = () => {
  const Pool = require("pg").Pool;
  const pool = new Pool({
    user: "wiplanner_admin",
    host: "localhost",
    database: "wiplanner_api",
    password: "S9IpY925NYpuL0dMJCB6",
    port: 5432,
  });
};

module.exports = {
  DbConn,
};
