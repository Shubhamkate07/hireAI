const ApiError = require("../utils/ApiError");

const requestStore = {};

const customRateLimiter = (
   req,
   res,
   next
) => {

   const forwarded = req.headers['x-forwarded-for'];
   const ip = forwarded ? String(forwarded).split(',')[0].trim() : req.ip || '127.0.0.1';

   const currentTime = Date.now();

   const windowTime =
      15 * 60 * 1000;

   if(!requestStore[ip]){
      requestStore[ip] = [];
   }

   requestStore[ip] =
      requestStore[ip].filter(
         time =>
            currentTime - time <
            windowTime
      );

   if(
      requestStore[ip].length >= 10
   ){
      return next(
         new ApiError(
            429,
            "Too many requests. Try again later."
         )
      );
   }

   requestStore[ip].push(
      currentTime
   );

   next();
};

module.exports =
   customRateLimiter;