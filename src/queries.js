const morgan = require("morgan");
const bcrypt = require("bcrypt");
const util = require("./utility");
const Pool = require("pg").Pool;
const pool = new Pool({
  user: process.env.POOL_USER,
  host: process.env.POOL_HOST,
  database: process.env.POOL_DB,
  password: process.env.POOL_PWD,
  port: process.env.POOL_PORT,
});

// Use pool.query if you only need to run a single query to the db. Use pool.connect() if you need a db transaction. Dont forget to release the client after use!!!

const getUsers = async (query, request = null, response = null) => {
  try {
    const results = await pool.query(query);
    morgan("dev", response);
    if (request === null || response === null) {
      return results.rows;
    } else {
      response.status(200).json(results.rows);
    }
  } catch (e) {
    throw new e();
  }
};

let getAllJobs = async (request, response) => {
  try {
    const results = await pool.query(
      "SELECT jobs.id AS job_id, jobs.start_date, jobs.end_date, jobs.description, users.id AS worker_id, users.name FROM jobs LEFT JOIN workers_jobs ON jobs.id = workers_jobs.job_id LEFT JOIN users ON workers_jobs.worker_id = users.id ORDER BY jobs.start_date DESC"
    );
    response.status(200).json(results.rows);
    morgan("dev", response);
  } catch (e) {
    res.send(e);
  }
};

const CreateUser = async (request, response) => {
  const body = request.body;
  const client = await pool.connect();
  request.body.password = await bcrypt.hash(request.body.password, 10);
  const _usergroup_id = util.getUserGroupNumber(body.usergroup);
  Object.assign(body, { usergroup_id: _usergroup_id });
  try {
    await client.query("BEGIN");
    const queryText =
      "INSERT INTO users(name, username, usergroup_id, password) VALUES($1, $2, $3, $4) RETURNING id";
    const res = await client.query(queryText, [
      body.workername,
      body.username,
      body.usergroup_id,
      body.password,
    ]);
    await client.query("COMMIT");
    await response.status(201).send("User added successfully with ID: " + res.rows[0].id);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

const DeleteUser = async (request, response) => {
  const body = request.body;
  const client = await pool.connect();
  try {
    let res;
    await client.query("BEGIN");
    const queryText = "DELETE FROM users WHERE id=$1 RETURNING *";
    if (Array.isArray(body.id) === true) {
      for (let i = 0; i < body.id.length; i++) {
        res = await client.query(queryText, [body.id[i]]);
      }
    } else {
      res = await client.query(queryText, [body.id]);
    }
    await client.query("COMMIT");
    response.status(200).json({ deletedAmount: res.rowCount }); // returns number of items deleted
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

const CreateJob = async (request, response) => {
  const body = request.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const queryTextJobTable =
      "INSERT INTO jobs(start_date, end_date, description) VALUES ($1, $2, $3) RETURNING id;";
    const res = await client.query(queryTextJobTable, [
      body.startdate,
      body.enddate,
      body.description,
    ]);
    const queryTextWorkerJobTable = "INSERT INTO workers_jobs(job_id, worker_id) VALUES ($1, $2);";
    for (let i = 0; i < body.workerid.length; i++) {
      await client.query(queryTextWorkerJobTable, [res.rows[0].id, body.workerid[i]]);
    }
    await client.query("COMMIT");
    await response.status(201).send("Job added with ID: " + res.rows[0].id);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

const DeleteJob = async (request, response) => {
  const body = request.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const workersJobsQueryText = "DELETE FROM workers_jobs WHERE job_id = $1";
    await client.query(workersJobsQueryText, [body.jobid]);
    const jobsQueryText = "DELETE FROM jobs WHERE id = $1";
    await client.query(jobsQueryText, [body.jobid]);
    await client.query("COMMIT");
    await response.status(201).send("Job deleted successfully");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

const UpdateJob = async (request, response) => {
  const body = request.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const queryUpdateJobInTable =
      "UPDATE jobs SET start_date = $1, end_date = $2, description = $3 WHERE jobs.id = $4;";
    const res = await client.query(queryUpdateJobInTable, [
      body.startdate,
      body.enddate,
      body.description,
      body.jobid,
    ]);
    const queryDeleteWorkersFromTable = "DELETE FROM workers_jobs WHERE job_id = $1;";
    await client.query(queryDeleteWorkersFromTable, [body.jobid]);
    const queryCombineJobWithWorkers =
      "INSERT INTO workers_jobs(job_id, worker_id) VALUES ($1, $2);";
    for (let i = 0; i < body.workerid.length; i++) {
      await client.query(queryCombineJobWithWorkers, [body.jobid, body.workerid[i]]);
    }
    await client.query("COMMIT");
    await response.status(201).send("Job added with ID");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

const PostToken = async (query, refreshtoken) => {
  try {
    await pool.query(query, [refreshtoken]);
  } catch (e) {
    throw e;
  }
};

const UpdateToken = async (query, refreshtoken, id) => {
  try {
    await pool.query(query, [refreshtoken, id]);
  } catch (e) {
    throw e;
  }
};

const DeleteToken = async (request, response, query) => {
  const client = await pool.connect();
  const body = request.body;
  try {
    const res = await client.query(query, [body.id]);
    response.send({ "Deleted rows": res.rowCount });
  } catch (e) {
    throw e;
  }
};

const GetToken = async (query) => {
  try {
    const res = await pool.query(query);
    return res.rows;
  } catch (e) {
    throw e;
  }
};

module.exports = {
  getAllJobs,
  getUsers,
  CreateUser,
  DeleteUser,
  CreateJob,
  DeleteJob,
  UpdateJob,
  PostToken,
  GetToken,
  DeleteToken,
  UpdateToken,
};
