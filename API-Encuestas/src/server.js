import express from "express";
import morgan from "morgan";
import cors from "cors";
import passport from "passport";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

class Server {
  constructor(
    userRoutes,
    googleAuthRoutes,
    errorHandling,
    database,
    swaggerConfig
  ) {
    this.app = express();
    this.port = process.env.PORT;
    this.corsOptions = {
      origin: process.env.CORS_ORIGIN,
      credentials: true,
    };
    this.specs = null;
    this.database = database;
    this.userRoutes = userRoutes;
    this.googleAuthRoutes = googleAuthRoutes;
    this.errorHandling = errorHandling;
    this.swaggerConfig = swaggerConfig;
    this.configureMiddleware();
    this.configureSwagger();
    this.routes();
  }

  configureMiddleware() {
    this.app.use(morgan("dev"));
    this.app.use(cors(this.corsOptions));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: false }));
    this.app.use(passport.initialize());
    this.app.use(cookieParser());
  }

  configureSwagger() {
    this.specs = swaggerJsdoc(this.swaggerConfig);
    this.app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(this.specs));
  }

  routes() {
    this.app.use(this.userRoutes);
    this.app.use(this.googleAuthRoutes);
    this.app.use(this.errorHandling());
  }

  async start() {
    console.time("Ready in");
    this.app.listen(this.port, () => {
      console.log(`Server running on http://localhost:${this.port}`);
    });

    await this.database.authenticate();
    await this.database.sync();
    console.timeEnd("Ready in");
  }
}

export default Server;
