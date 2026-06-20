const pool= require('../config/database')

const saveRefreshToken= async(userId,tokenHash,expiresAt)=>{

    await pool.query(`INSERT INTO refresh_tokens
        (user_id,token_hash,expires_at)
        VALUES (?,?,?) `,
        [userId, tokenHash, expiresAt]
    )
}


const findRefreshToken = async (
  tokenHash
) => {
  const [rows] = await pool.query(
    `SELECT * FROM refresh_tokens
     WHERE token_hash=?`,
    [tokenHash]
  );

  return rows[0];
};

const deleteRefreshToken = async (
  tokenHash
) => {

  const [result] = await pool.query(
    `DELETE FROM refresh_tokens
     WHERE token_hash=?`,
    [tokenHash]
  );

  console.log(result);

  return result;
};

const deleteAllUserTokens = async (
  userId
) => {
  await pool.query(
    `DELETE FROM refresh_tokens
     WHERE user_id=?`,
    [userId]
  );
};

module.exports = {
  saveRefreshToken,
  findRefreshToken,
  deleteRefreshToken,
  deleteAllUserTokens,
};