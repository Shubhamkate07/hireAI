const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');

const config             = require('../config/env.config');
const ApiError           = require('../utils/ApiError');
const userModel          = require('../models/user.model');
const refreshTokenModel  = require('../models/refreshToken.model');

const registerUser = async (name, email, password, role = "candidate") => {

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
      7 * 24 * 60 * 60 * 1000
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

   const decoded =
      jwt.verify(
         refreshToken,
         config.jwt.refreshSecret
      );

   // Fetch user to get the current role — if role changed after
   // the refresh token was issued, the new access token reflects it
   const user = await userModel.findUserById(decoded.id);

   if (!user) {
      throw new ApiError(401, "User no longer exists");
   }

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
      accessToken
   };

};

const logoutUser = async (refreshToken)=>{

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