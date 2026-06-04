const express= require('express');
const cors= require('cors');
const helmet= require('helmet');
const morgan= require('morgan');

const app= express();
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

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
    console.log(err);
    res.status(err.status || 500).json({
        success:false,
        message:err.message || "Internal Server Error"
    })
    
})

module.exports = app;