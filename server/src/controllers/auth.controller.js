const register = (req,res)=>{
    res.json({
        message:"Register API"
    });
};

const login = (req,res)=>{
    res.json({
        message:"Login API"
    });
};

const refreshToken = (req,res)=>{
    res.json({
        message:"Refresh Token API"
    });
};

const logout = (req,res)=>{
    res.json({
        message:"Logout API"
    });
};

module.exports = {
    register,
    login,
    refreshToken,
    logout
};