const mongoose=require('mongoose');
mongoose.connect("mongodb://127.0.0.1:27017/jobpost");

const UserSchema= mongoose.Schema({
    username: String,
    name: String,
    email: String,
    age: Number,
    password: String,
    posts:[{type: mongoose.SchemaTypes.ObjectId, ref:"posts"}],
});

module.exports= mongoose.model('user', UserSchema);