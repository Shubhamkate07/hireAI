const rateLimit= require('express-rate-limit');

const authLimit= rateLimit(
    {
        windowMs:15 * 60* 1000,
        max: 10,
        message:{
            success:false,
            message:'Too many requests. Try again after 15 minutes.'
        },
        standardHeaders:true,
        legacyHeaders:false
    }
)

module.exports =authLimit;