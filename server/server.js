const dotenv = require('dotenv');
dotenv.config();
const app= require('./src/app.js');

const PORT = process.env.PORT || 3000; 

app.listen(PORT,()=>{
    console.log(`Server running on Port ${process.env.PORT}`);
    
})