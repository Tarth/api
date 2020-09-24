const morgan = require("morgan");
const Pool = require("pg").Pool;
const pool = new Pool({
  user: "wiplanner_admin",
  host: "localhost",
  database: "wiplanner_api",
  password: "S9IpY925NYpuL0dMJCB6",
  port: 5432,
});

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
    "SELECT jobs.id AS job_id, jobs.start_date, jobs.end_date, jobs.description, workers.id AS worker_id, workers.name FROM jobs LEFT JOIN workers_jobs ON jobs.id = workers_jobs.job_id LEFT JOIN workers ON workers_jobs.worker_id = workers.id ORDER BY start_date",
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
    await client.query(queryText, [body.name]);
    await client.query("COMMIT");
    await response.status(201).send("User added successfully");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

// const CreateJobs = async (request, response) => {
//   // note: we don't try/catch this because if connecting throws an exception
//   // we don't need to dispose of the client (it will be undefined)
//   const body = request.body;

//   const client = await pool.connect();
//   try {
//     await client.query("BEGIN");
//     const queryTextJobTable =
//       "INSERT INTO jobs(start_date, end_date, description) VALUES ($1, $2, $3);";
//     await client.query(
//       queryTextJobTable,
//       "2020-08-03 09:15:00",
//       "2020-08-04 09:15:00",
//       "Test"
//     );
//     const queryTextWorkerJobTable =
//       "INSERT INTO workers_jobs(job_id, worker_id) VALUES (lastval(), $4),(lastval(), $5);";
//     await client.query(queryTextWorkerJobTable, 5, 7);
//     await client.query("COMMIT");
//     await response.status(201).send("User added successfully");
//   } catch (e) {
//     await client.query("ROLLBACK");
//     throw e;
//   } finally {
//     client.release();
//   }
// };

const DeleteWorker = async (request, response) => {
  // note: we don't try/catch this because if connecting throws an exception
  // we don't need to dispose of the client (it will be undefined)

  // lav delete på id i stedet for name
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const queryText = "DELETE FROM public.workers WHERE name=$1";
    await client.query(queryText, ["Test"]);
    await client.query("COMMIT");
    response.status(201).send("User removed");
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
};
