const morgan = require("morgan");
const Pool = require("pg").Pool;
const pool = new Pool({
  user: "wiplanner_admin",
  host: "localhost",
  database: "wiplanner_api",
  password: "S9IpY925NYpuL0dMJCB6",
  port: 5432,
});
// const pool = require("./pool.js");

const getUsers = (request, response) => {
  pool.query("SELECT * FROM workers ORDER BY name ASC", (error, results) => {
    if (error) {
      throw error;
    }
    response.status(200).json(results.rows);
    morgan("dev", response);
  });
};

let getAllJobs = (request, response) => {
  pool.query(
    "SELECT jobs.id AS job_id, jobs.start_date, jobs.end_date, jobs.description, workers.id AS worker_id, workers.name FROM jobs LEFT JOIN workers_jobs ON jobs.id = workers_jobs.job_id LEFT JOIN workers ON workers_jobs.worker_id = workers.id ORDER BY jobs.start_date DESC",
    (error, results) => {
      if (error) {
        throw error;
      }
      response.status(200).json(results.rows);
      morgan("dev", response);
    }
  );
};

const CreateWorker = async (request, response) => {
  // note: we don't try/catch this because if connecting throws an exception
  // we don't need to dispose of the client (it will be undefined)
  const body = request.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const queryText = "INSERT INTO workers(name) VALUES($1) RETURNING id";
    const res = await client.query(queryText, [body.name]);
    await client.query("COMMIT");
    await response
      .status(201)
      .send("User added successfully with ID: " + res.rows[0].id);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

const CreateJob = async (request, response) => {
  // note: we don't try/catch this because if connecting throws an exception
  // we don't need to dispose of the client (it will be undefined)
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
    const queryTextWorkerJobTable =
      "INSERT INTO workers_jobs(job_id, worker_id) VALUES ($1, $2);";
    for (let i = 0; i < body.workerId.length; i++) {
      await client.query(queryTextWorkerJobTable, [
        res.rows[0].id,
        body.workerId[i],
      ]);
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

const DeleteWorker = async (request, response) => {
  // note: we don't try/catch this because if connecting throws an exception
  // we don't need to dispose of the client (it will be undefined)

  const workerid = [50, 51];
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const queryText = "DELETE FROM public.workers WHERE id=$1";
    for (let i = 0; i < workerid.length; i++) {
      await client.query(queryText, [workerid[i]]);
    }
    await client.query("COMMIT");
    response.status(201).send("User removed");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

const DeleteJob = async (request, response) => {
  // note: we don't try/catch this because if connecting throws an exception
  // we don't need to dispose of the client (it will be undefined)
  const body = request.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const workersJobsQueryText = "U workers_jobs WHERE job_id = $1";
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
  // note: we don't try/catch this because if connecting throws an exception
  // we don't need to dispose of the client (it will be undefined)
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

module.exports = {
  getAllJobs,
  getUsers,
  CreateWorker,
  DeleteWorker,
  CreateJob,
  DeleteJob,
  UpdateJob,
};
