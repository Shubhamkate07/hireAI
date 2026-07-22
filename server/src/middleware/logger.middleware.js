const fs = require("fs");
const path = require("path");

const loggerMiddleware = (req, res, next) => {

   const start = Date.now();

   const logDir = path.join(
      __dirname,
      "../logs"
   );

   if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
   }

   res.on("finish", () => {

      const duration =
         Date.now() - start;

      const log =
         `${new Date().toISOString()} | `
         + `${req.method} | `
         + `${req.originalUrl} | `
         + `${res.statusCode} | `
         + `${duration}ms\n`;

      const logPath = path.join(
         logDir,
         "app.log"
      );

      fs.appendFile(
         logPath,
         log,
         (err) => {
            if (err) {
               console.error(err);
            }
         }
      );
   });

   next();
};

module.exports = loggerMiddleware;