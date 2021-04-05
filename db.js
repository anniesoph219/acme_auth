/* eslint-disable quotes */
const Sequelize = require("sequelize");
const bcrypt = require("bcrypt");
const { STRING } = Sequelize;
const config = {
  logging: false,
};
const jwt = require("jsonwebtoken");

const SECRET_KEY = process.env.JWT;

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost/acme_db",
  config
);

const User = conn.define("user", {
  username: STRING,
  password: STRING,
});

const Note = conn.define("note", {
  text: {
    type: Sequelize.STRING,
  },
});

User.beforeCreate((user, options) => {
  return bcrypt
    .hash(user.password, 10)
    .then((hash) => {
      user.password = hash;
    })
    .catch((err) => {
      throw new Error();
    });
});

/*
  bcrypt.hash(user.password, 10, async (error, hash)=>{
    try {
      await user.password = hash;
    } catch (error) {
      console.log("Error in before create hook: ", error);
    }
  });*/

User.byToken = async (token) => {
  try {
    const verifyGood = jwt.verify(token, SECRET_KEY);
    if (verifyGood) {
      const user = await User.findByPk(verifyGood.userId);
      return user;
    }
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  }
};

User.authenticate = async ({ username, password }) => {
  try {
    const hashedUser = await User.findOne({
      where: {
        username,
      },
    });
    const correct = await bcrypt.compare(password, hashedUser.password);
    if (correct) {
      const token = jwt.sign({ userId: hashedUser.id }, SECRET_KEY);
      console.log("Token value:", token);
      return token;
    } else {
      console.log("Bad Credentials:", err);
    }
  } catch (error) {
    error.status = 401;
    throw error;
  }
};

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: "lucy", password: "lucy_pw" },
    { username: "moe", password: "moe_pw" },
    { username: "larry", password: "larry_pw" },
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );
  const notes = [{ text: "hello" }, { text: "world" }, { text: "goodbye" }];
  const [one, two, three] = await Promise.all(
    notes.map((note) => Note.create(note))
  );
  await lucy.setNotes(one);
  await moe.setNotes([two, three]);
  return {
    users: {
      lucy,
      moe,
      larry,
    },
  };
};

Note.belongsTo(User);
User.hasMany(Note);

module.exports = {
  syncAndSeed,
  models: {
    User,
  },
};
