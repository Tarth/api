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

const CreateWorker = (request, response) => {
  name = "Birthe";
  pool.query(
    "INSERT INTO public.workers (name) VALUES ($1)",
    [name],
    (error, result) => {
      if (error) {
        throw error;
      }
      response.status(201).send(`User added succesfully`);
    }
  );
};

const DeleteWorker = (request, response) => {
  name = "Birthe";
  pool.query("DELETE FROM public.workers WHERE name=$1", [name], (error) => {
    if (error) {
      throw error;
    }
    response.status(200).send(`User deleted successfully`);
  });
};

module.exports = {
  getAllJobs,
  getUsers,
  CreateWorker,
  DeleteWorker,
};
