const pool= require('../config/database')

const createUser=async (  name,
  email,
  passwordHash,
  role)=>{
    const [result]= await pool.query(
          `INSERT INTO users
     (name,email,password_hash,role)
     VALUES (?,?,?,?)`,
    [name, email, passwordHash, role]
        )

        return result.insertId
}

const findUserByEmail = async (email) => {
  const [rows] = await pool.query(
    `SELECT * FROM users WHERE email=?`,
    [email]
  );

  return rows[0];
};

const findUserById = async (id) => {
  const [rows] = await pool.query(
    `SELECT * FROM users WHERE id=?`,
    [id]
  );

  return rows[0];
};

const getAllUsers =
   async(
      offset,
      limit,
      recent
   )=>{

      let query =
         `SELECT
            id,
            name,
            email,
            role,
            is_active,
            created_at,
            updated_at
         FROM users`;

      const values = [];

      if(
         recent === "true"
      ){

         query += `
            WHERE created_at >=
            DATE_SUB(
               NOW(),
               INTERVAL 7 DAY
            )
         `;

      }

      query += `
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

const getUserCount =
   async(recent)=>{

      let query =
         `SELECT
            COUNT(*) AS total
         FROM users`;

      if(
         recent === "true"
      ){

         query += `
            WHERE created_at >=
            DATE_SUB(
               NOW(),
               INTERVAL 7 DAY
            )
         `;

      }

      const [rows] =
         await pool.query(
            query
         );

      return rows[0].total;

};


module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  getAllUsers,
  getUserCount
};