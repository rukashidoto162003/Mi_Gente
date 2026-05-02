/*Flow:
Schema (class) → create schema object
Pass it to model()
Get a Model to interact with DB */
import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  token: { type: String },
});
/*The Schema class:
stores field definitions
applies validation rules
prepares data structure for MongoDB*/
/*Basically Schema is a blueprint of your data*/

const User = mongoose.model("User", userSchema);
/*Model is a tool to work with the database*/

export { User };
/*"User" is the model name so "users" is the collection name*/
/*MongoDB creates collections automatically on first insert*/

/*Schema defines the structure and validation of documents, while Model is a wrapper around the schema that provides methods to interact with the database. */
