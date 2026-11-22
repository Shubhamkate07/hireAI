const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');

const config             = require('../config/env.config');
const ApiError           = require('../utils/ApiError');
const userModel          = require('../models/user.model');
const refreshTokenModel  = require('../models/refreshToken.model');

const registerUser = async (name, email, password, role = "candidate") => {

        // ── SECURITY: Never allow self-registration as admin ────────────
        // Admins are created only via the seed script or by an existing admin
        // through PATCH /api/admin/users/:id/role.
        const ALLOWED_SELF_REGISTER_ROLES = ["candidate", "recruiter"];
        if (!ALLOWED_SELF_REGISTER_ROLES.includes(role)) {
            role = "candidate";
        }

        const existingUser = await userModel.findUserByEmail(email);

        if (existingUser) {
            throw new ApiError(
                409,
                "Email already exists"
            );
        }

        const passwordHash =
            await bcrypt.hash(password, 10);

        const userId =
            await userModel.createUser(
                name,
                email,
                passwordHash,
                role
            );

        const user = await userModel.findUserById(userId);

        delete user.password_hash;
        return user;

    
}
   
const loginUser = async (email, password) => {

    const user = await userModel.findUserByEmail(email);

    if (!user) {
        throw new ApiError(
            401,
            "Invalid Credentials"
        );
    }
    const isMatch =await bcrypt.compare(password, user.password_hash);
    if(!isMatch){
        throw new ApiError(
        401,
       "Invalid Credentials"
        )
    }

    // ── SECURITY: Block deactivated users at login ──────────────────
    if (!user.is_active) {
        throw new ApiError(
            403,
            "Your account has been deactivated. Please contact an administrator."
        );
    }

    const accessToken = jwt.sign(
        {
            id: user.id,
            role: user.role
        },
        config.jwt.secret,
        {
            expiresIn: config.jwt.expiresIn
        }
    );


    const refreshToken = jwt.sign(
      {
        id: user.id
      },
      config.jwt.refreshSecret,
      {
        expiresIn: config.jwt.refreshExpiresIn
      }
    );

   const tokenHash =
   crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

  const expiresAt =
    new Date(
      Date.now() +
      config.jwt.refreshMaxAgeMs
    );

  await refreshTokenModel.saveRefreshToken(
    user.id,
    tokenHash,
    expiresAt
  );

  delete user.password_hash;

  return {
    user,
    accessToken,
    refreshToken
  };

}

const refreshAccessToken = async (refreshToken) => {

   if(!refreshToken){
      throw new ApiError(
         401,
         "Refresh token required"
      );
   }

   const tokenHash =
      crypto
         .createHash("sha256")
         .update(refreshToken)
         .digest("hex");

   const storedToken =
      await refreshTokenModel.findRefreshToken(
         tokenHash
      );

   if(!storedToken){
      throw new ApiError(
         401,
         "Invalid refresh token"
      );
   }

   if(
      new Date(storedToken.expires_at)
      < new Date()
   ){

      await refreshTokenModel.deleteRefreshToken(
         tokenHash
      );

      throw new ApiError(
         401,
         "Refresh token expired"
      );

   }

   // jwt.verify throws on bad signature/expiry. Convert that into a clean 401
   // so the client logs out instead of seeing a 500 Internal Server Error.
   let decoded;
   try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
   } catch {
      await refreshTokenModel.deleteRefreshToken(tokenHash);
      throw new ApiError(401, "Invalid refresh token");
   }

   // Fetch user to get the current role — if role changed after
   // the refresh token was issued, the new access token reflects it
   const user = await userModel.findUserById(decoded.id);

   if (!user) {
      throw new ApiError(401, "User no longer exists");
   }

   // ── SECURITY: Block deactivated users from refreshing tokens ────
   if (!user.is_active) {
      await refreshTokenModel.deleteRefreshToken(tokenHash);
      throw new ApiError(403, "Your account has been deactivated");
   }

   // ── Refresh Token Rotation & Expirations Cleanup ─────────────
   // 1. Delete used refresh token (prevents replay attacks)
   await refreshTokenModel.deleteRefreshToken(tokenHash);

   // 2. Background cleanup of expired tokens
   refreshTokenModel.deleteExpiredTokens().catch(() => {});

   // 3. Issue new refresh token
   const newRefreshToken = jwt.sign(
      {
         id: user.id
      },
      config.jwt.refreshSecret,
      {
         expiresIn: config.jwt.refreshExpiresIn
      }
   );

   const newTokenHash = crypto
      .createHash("sha256")
      .update(newRefreshToken)
      .digest("hex");

   const newExpiresAt = new Date(Date.now() + config.jwt.refreshMaxAgeMs);

   await refreshTokenModel.saveRefreshToken(
      user.id,
      newTokenHash,
      newExpiresAt
   );

   const accessToken =
      jwt.sign(
         {
            id: user.id,
            role: user.role
         },
         config.jwt.secret,
         {
            expiresIn: config.jwt.expiresIn
         }
      );

   return {
      accessToken,
      refreshToken: newRefreshToken
   };

};

const logoutUser = async (refreshToken)=>{

   if(!refreshToken){
      return true;
   }

   const tokenHash =
      crypto
         .createHash("sha256")
         .update(refreshToken)
         .digest("hex");

   await refreshTokenModel.deleteRefreshToken(
      tokenHash
   );

   return true;

}


module.exports = {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser
}