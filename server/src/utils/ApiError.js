class ApiErrors extends Error{
    constructor(statusccode, message, errors=[]){
        super(message);
        this.statusccode=statusccode;
        this.errors= errors
    }
}
module.exports= ApiErrors;