const jwt    = require('jsonwebtoken');
const config  = require('../config/env.config');
const ApiError = require('../utils/ApiError');

const authMiddleware=(req,res,next)=>{
    try{

        const token= req.cookies.accessToken;

        if(!token){
            throw new ApiError(
                401,
                "Token Missing"
            )
        }

        const decoded = jwt.verify(token, config.jwt.secret);
        req.user= decoded;
        next();
    }catch(err){

    if(err instanceof ApiError){
      return next(err);
   }


        if(
         err.name ===
         "TokenExpiredError"
      ){
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