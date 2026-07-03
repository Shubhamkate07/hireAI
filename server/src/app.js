const express= require('express');
const cors= require('cors');
const helmet= require('helmet');
const morgan= require('morgan');
const authRoutes= require('./routes/auth.routes')
const userRoutes =
   require("./routes/user.routes");
const jobRoutes =
   require("./routes/job.routes");

const cookieParser = require("cookie-parser");

const loggerMiddleware =
   require(
      "./middleware/logger.middleware"
   );



const app= express();
app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true
    })
);app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

app.use(loggerMiddleware);

app.use('/api/auth', authRoutes);

app.use(
   "/api/users",
   userRoutes
);

app.use(
   "/api/jobs",
   jobRoutes
);


// server health check api
app.get('/api/health',(req,res)=>{
    res.status(200).json({
        status:"ok",
        timestamp:Date.now()
    })
});

// test api of global error handler
// app.get("/test", (req,res,next)=>{

//     const err = new Error("User not found");
//     err.status = 404;

//     next(err);
// });


// unknown route 
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

app.use((err,req,res,next)=>{

    const statusCode =
        err.statusCode || 500;

    const message =
        err.message || "Internal Server Error";

    return res.status(statusCode).json({

        success:false,

        statusCode,

        message,

        errors: err.errors || []

    });

});

module.exports = app;