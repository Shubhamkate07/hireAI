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

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
};