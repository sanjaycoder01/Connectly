const mongoose = require("mongoose");
const { mongoUri } = require("./env");

const connectDB = async () => {
  mongoose.connection.on("disconnected", () => {
    console.log("MongoDB disconnected");
  });

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");
};

module.exports = connectDB;
