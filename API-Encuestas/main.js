import express from "express";
import morgan from "morgan";
import cors from "cors";
import session from "express-session";
import bcrypt from "bcrypt";
import passport from "passport";
import GoogleStrategy from "passport-google-oauth20";
import { Sequelize, DataTypes, Model } from "sequelize";

process.loadEnvFile();

const app = express();
const { PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT } = process.env;

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(
  session({
    secret: "helloworld",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    res.redirect("http://localhost:5173/");
  }
);

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  const user = await User.create({ name, email, password, registrationMethod: "local" });
  res.json(user);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: "postgres",
  logging: false,
});

sequelize.authenticate();
sequelize.sync({ force: true });

class User extends Model {}

User.init(
  {
    googleId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    registrationMethod: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "user",
    hooks: {
      beforeCreate: (user) => {
        if (user.password) {
          user.password = bcrypt.hashSync(user.password, 10);
        }

        if (user.googleId) {
          user.registrationMethod = "google";
        } else {
          user.registrationMethod = "local";
        }
      },
    },
  }
);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    function (accessToken, refreshToken, profile, done) {
      User.findOrCreate({
        where: { googleId: profile.id },
        defaults: {
          name: profile.displayName,
          email: profile.emails[0].value,
          registrationMethod: "google",
        },
      })
        .then(([user, created]) => {
          return done(null, user);
        })
        .catch((err) => {
          return done(err);
        });
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});