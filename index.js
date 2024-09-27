const express = require('express');
const app = express();
const path = require('path');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const userModel = require('./models/user');
const postModel = require('./models/post');
const bcrypt = require('bcrypt');
const post = require('./models/post');
const crypto=require("crypto");
const multer=require("multer");
// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Ensure views directory is properly set

// Routes
app.get("/", function (req, res) {
    res.render("index");  // Correctly render the index view
});

app.get("/profile", isLoggedIn, async function (req, res) {
    try {
        const user = await userModel.findById(req.user.userid);
        const posts = await postModel.find({ user: req.user.userid }).populate('user'); // Corrected query
        res.render("profile", { user: user, posts: posts });  // Passing posts to EJS
    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading profile");
    }
});

app.get("/like/:id", isLoggedIn, async function (req, res) {
    try {
        const postId = req.params.id;
        const userId = req.user.userid;

        // Find the post and populate the user field
        const post = await postModel.findById(postId).populate('user');

        if (!post) {
            return res.status(404).send("Post not found");
        }

        // Check if the user has already liked the post
        const likeIndex = post.likes.indexOf(userId);
        if (likeIndex === -1) {
            // User has not liked the post yet, add their like
            post.likes.push(userId);
        } else {
            // User has already liked the post, remove their like
            post.likes.splice(likeIndex, 1);
        }

        // Save the updated post
        await post.save();

        // Fetch updated posts and user details for rendering
        const user = await userModel.findById(userId);
        const posts = await postModel.find({ user: userId }).populate('user');

        // Render the profile page with updated data
        res.render("profile", { user: user, posts: posts });

    } catch (error) {
        console.error(error);
        res.status(500).send("Error handling like/unlike");
    }
});

app.get("/edit/:id", isLoggedIn, async function (req, res) {
    try {
        const postId = req.params.id;
        const userId = req.user.userid;

        // Find the post and populate the user field
        const post = await postModel.findById(postId);

        if (!post) {
            return res.status(404).send("Post not found");
        }

        // Render the edit page with the post content
        res.render("edit", { post: post });

    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading edit page");
    }
});


app.post("/edit/:id", isLoggedIn, async function (req, res) {
    try {
        const postId = req.params.id;
        const userId = req.user.userid;
        const { content } = req.body;

        // Find the post and update its content
        const post = await postModel.findById(postId);

        if (!post) {
            return res.status(404).send("Post not found");
        }

        // Update post content
        post.content = content;
        await post.save();

        // Redirect back to the profile page
        res.redirect("/profile");

    } catch (error) {
        console.error(error);
        res.status(500).send("Error updating post");
    }
});


app.get("/allPosts", isLoggedIn, async (req, res) => {
    try {
        // Fetch all posts and populate the user field to get user details
        const allPosts = await postModel.find({}).populate('user');

        // Render the 'allPosts' view and pass the posts data
        res.render('read', { allPosts, user: req.user });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching all posts");
    }
});


app.post("/post", isLoggedIn, async function (req, res) {
    const user = await userModel.findOne({email: req.user.email});
    let {content} =req.body;

    let post=await postModel.create({
        user: user._id,
        content
    })
    user.posts.push(post._id);
    await user.save();
    res.redirect("profile");
});

app.get("/login", function (req, res) {
    res.render("login");  // No need for .ejs in render call
});

app.get("/logout", function (req, res) {
    res.cookie("token", "");  // Clear the token
    res.redirect("/login");
});

// Register route
app.post("/register", async (req, res) => {
    let { username, name, email, age, password } = req.body;
    let existingUser = await userModel.findOne({ email });

    if (existingUser) {
        return res.status(500).send("User Already Registered");
    }

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let user = await userModel.create({
                username,
                name,
                email,
                age,
                password: hash
            });

            let token = jwt.sign({ email: email, userid: user._id }, "shhhh");
            res.cookie("token", token);
            res.redirect("login");
        });
    });
});

// Login route
app.post("/login", async (req, res) => {
    let { email, password } = req.body;
    let user = await userModel.findOne({ email });

    if (!user) {
        return res.status(500).send("Something Went Wrong");
    }

    bcrypt.compare(password, user.password, function (err, result) {
        if (result) {
            let token = jwt.sign({ email: email, userid: user._id }, "shhhh");
            res.cookie("token", token);
            res.redirect("profile");
        } else {
            res.redirect("/login");
        }
    });
});

// Middleware to check if the user is logged in
function isLoggedIn(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.redirect("/login");
    }

    try {
        const data = jwt.verify(token, "shhhh");
        req.user = data;  // Attach user data to req object
        next();
    } catch (error) {
        return res.redirect("/login");
    }
}

//file upload

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/images/uploads')
    },
    filename: function (req, file, cb) {
      crypto.randomBytes(12,function(err,bytes){
        const fn=bytes.toString("hex")+path.extname(file.originalname);
        cb(null, fn);
      })
    }
  })
  
  const upload = multer({ storage: storage })
app.get("/test",(req,res)=>{
    res.render("test");
});

app.post("/upload",upload.single("image"),(req,res)=>{
    console.log(req.file);
});
// Start server
app.listen(3000, function () {
    console.log('Server running on port 3000');
});
