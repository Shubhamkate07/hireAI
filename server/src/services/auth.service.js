const dotenv= require('dotenv')
dotenv.config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken')
const crypto = require("crypto");

const ApiError = require('../utils/ApiError')
const userModel = require('../models/user.model')
const refreshTokenModel= require('../models/refreshToken.model')

const registerUser = async (name, email, password, role = "candidate") => {
   
    if (!name || name.length < 2) {
   throw new ApiError(
      400,
      "Name must be at least 2 characters"
   );
}


        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            throw new ApiError(
                400,
                "Invalid email"
            );
        }

        const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

        if (!passwordRegex.test(password)) {
            throw new ApiError(
                400,
                "Password must contain uppercase lowercase number and be at least 8 characters"
            );
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

     const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

   if (!emailRegex.test(email)) {
      throw new ApiError(
         400,
         "Invalid email format"
      );
   }

   if (!password) {
      throw new ApiError(
         400,
         "Password is required"
      );
   }
   
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
            role:user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN
        }
    );


    const refreshToken = jwt.sign(
      {
        id: user.id
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn:
          process.env.REFRESH_TOKEN_EXPIRES_IN
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
         process.env.REFRESH_TOKEN_SECRET
      );

   const accessToken =
      jwt.sign(
         {
            id: decoded.id
         },
         process.env.JWT_SECRET,
         {
            expiresIn:
             process.env.JWT_EXPIRES_IN
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