const jwt    = require('jsonwebtoken');
const config  = require('../config/env.config');
const ApiError = require('../utils/ApiError');
const userModel = require('../models/user.model');

const authMiddleware= async (req,res,next)=>{
    try{

        const token= req.cookies.accessToken;

        if(!token){
            throw new ApiError(
                401,
                "Token Missing"
            )
        }

        const decoded = jwt.verify(token, config.jwt.secret);

        // ── SECURITY: Verify user still exists and is active ────────
        const user = await userModel.findUserById(decoded.id);
        if (!user || !user.is_active) {
            throw new ApiError(
                403,
                "Account deactivated or deleted"
            );
        }

        req.user= decoded;
        next();
    }catch(err){

   if(err instanceof ApiError){
      return next(err);
   }
   if( err.name === "TokenExpiredError"){
      return next(
         new ApiError(
            401,
            "Token expired"
            )
         );
      }

      return next(
         new ApiError(
            401,
            "Invalid token"
         )
      );

    }
}

module.exports = authMiddleware;