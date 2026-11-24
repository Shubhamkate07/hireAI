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
      recent,
      search,
      role
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

      const conditions = [];
      const values = [];

      if(
         recent === "true"
      ){
         conditions.push(`created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`);
      }

      if (role && role !== 'all') {
         conditions.push(`role = ?`);
         values.push(role);
      }

      if (search && search.trim() !== '') {
         conditions.push(`(name LIKE ? OR email LIKE ?)`);
         values.push(`%${search.trim()}%`, `%${search.trim()}%`);
      }

      if (conditions.length > 0) {
         query += ` WHERE ` + conditions.join(' AND ');
      }

      query += `
         ORDER BY created_at DESC
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
   async(recent, search, role)=>{

      let query =
         `SELECT
            COUNT(*) AS total
         FROM users`;

      const conditions = [];
      const values = [];

      if(
         recent === "true"
      ){
         conditions.push(`created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`);
      }

      if (role && role !== 'all') {
         conditions.push(`role = ?`);
         values.push(role);
      }

      if (search && search.trim() !== '') {
         conditions.push(`(name LIKE ? OR email LIKE ?)`);
         values.push(`%${search.trim()}%`, `%${search.trim()}%`);
      }

      if (conditions.length > 0) {
         query += ` WHERE ` + conditions.join(' AND ');
      }

      const [rows] =
         await pool.query(
            query,
            values
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