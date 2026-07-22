const pool =
   require("../config/database");

const createJob =
   async(
      title,
      description,
      company,
      location,
      salaryMin,
      salaryMax,
      jobType,
      postedBy
   )=>{

      const [result] =
         await pool.query(

            `INSERT INTO jobs
            (
               title,
               description,
               company,
               location,
               salary_min,
               salary_max,
               job_type,
               posted_by
            )

            VALUES
            (?,?,?,?,?,?,?,?)`,

            [
               title,
               description,
               company,
               location,
               salaryMin,
               salaryMax,
               jobType,
               postedBy
            ]

         );

      return result.insertId;

};

const findJobById =
   async(id)=>{

      const [rows] =
         await pool.query(

            `SELECT *
             FROM jobs
             WHERE id=?`,

            [id]

         );

      return rows[0];

};

const findAllJobs =
async(
   offset,
   limit,
   filters
)=>{

   let query =
   `
   SELECT *
   FROM jobs
   WHERE 1=1
   `;

   const values = [];

   if(filters.status){

      query +=
      `
      AND status=?
      `;

      values.push(
         filters.status
      );

   }

   if(filters.job_type){

      query +=
      `
      AND job_type=?
      `;

      values.push(
         filters.job_type
      );

   }

   if(filters.location){

      query +=
      `
      AND location=?
      `;

      values.push(
         filters.location
      );

   }

   if(filters.search){

      query +=
      `
      AND
      (
         title LIKE ?
         OR company LIKE ?
      )
      `;

      values.push(
         `%${filters.search}%`
      );

      values.push(
         `%${filters.search}%`
      );

   }

   query +=
   `
   LIMIT ?
   OFFSET ?
   `;

   values.push(
      limit,
      offset
   );

   const [rows] =
   await pool.query(
      query,
      values
   );

   return rows;

};

const getJobCount = async (
   status,
   jobType,
   location,
   search
) => {

   let query = `
      SELECT COUNT(*) AS total
      FROM jobs
      WHERE 1=1
   `;

   const values = [];

   if (status) {
      query += `
         AND status = ?
      `;

      values.push(status);
   }

   if (jobType) {
      query += `
         AND job_type = ?
      `;

      values.push(jobType);
   }

   if (location) {
      query += `
         AND location = ?
      `;

      values.push(location);
   }

   if (search) {
      query += `
         AND (
            title LIKE ?
            OR company LIKE ?
         )
      `;

      const searchValue = `%${search}%`;

      values.push(
         searchValue,
         searchValue
      );
   }

   const [rows] =
      await pool.query(
         query,
         values
      );

   return rows[0].total;

};

// ─── Update Job ───────────────────────────────────────────────────────────────
const updateJob = async (id, title, description, company, location, salaryMin, salaryMax, jobType, status) => {

   await pool.query(
      `UPDATE jobs
       SET title = ?, description = ?, company = ?, location = ?,
           salary_min = ?, salary_max = ?, job_type = ?, status = ?
       WHERE id = ?`,
      [title, description, company, location, salaryMin, salaryMax, jobType, status, id]
   );

   // fetch and return the updated row
   return findJobById(id);

};

const deleteJob =
async(id)=>{

   await pool.query(

      `
      UPDATE jobs
      SET status='closed'
      WHERE id=?
      `,

      [id]

   );

};

// ─── Get all jobs posted by a specific user ───────────────────────────────────
const findJobsByUserId = async (userId) => {

   const [rows] = await pool.query(
      `SELECT * FROM jobs WHERE posted_by = ? ORDER BY created_at DESC`,
      [userId]
   );

   return rows;

};

// ─── Get a recruiter's jobs WITH application count ────────────────────────────
// One SQL query does everything using LEFT JOIN + GROUP BY + COUNT.
//
// WHY LEFT JOIN?
//   A regular JOIN would drop jobs with zero applications.
//   LEFT JOIN keeps every job and sets COUNT = 0 when there are none.
//
// WHY GROUP BY j.id?
//   COUNT(a.id) collapses many application rows into one job row.
//   Without GROUP BY, MySQL would return one row per application.
const findJobsWithApplicationCount = async (recruiterId) => {

   const [rows] = await pool.query(
      `SELECT
          j.id,
          j.title,
          j.company,
          j.location,
          j.job_type,
          j.status,
          j.created_at,
          COUNT(a.id) AS application_count
       FROM jobs j
       LEFT JOIN applications a ON a.job_id = j.id
       WHERE j.posted_by = ?
       GROUP BY j.id
       ORDER BY j.created_at DESC`,
      [recruiterId]
   );

   return rows;

};

module.exports = {
   createJob,
   findJobById,
   findAllJobs,
   getJobCount,
   updateJob,
   deleteJob,
   findJobsByUserId,
   findJobsWithApplicationCount,
};