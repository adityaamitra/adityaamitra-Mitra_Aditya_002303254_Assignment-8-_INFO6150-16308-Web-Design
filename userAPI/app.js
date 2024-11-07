const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const app = express();


app.use(cors());
app.use(express.json());  
app.use(express.urlencoded({ extended: true }));  

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/userDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));


const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  image: { type: String },
});

const User = mongoose.model('User', userSchema);




app.post('/user/create', async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: 'Please provide fullName, email, and password' });
  }

  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long and include an uppercase letter, a number, and a symbol' });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = new User({ fullName, email, password: hashedPassword });
  await newUser.save();

  res.status(201).json({
    message: 'User created successfully',
    user: {
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
    },
  });
});

app.put('/user/edit', async (req, res) => {
  const { email, fullName, password } = req.body;

  if (!email || !fullName || !password) {
    return res.status(400).json({ message: 'Please provide email, fullName, and password' });
  }

  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long and include an uppercase letter, a number, and a symbol' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  user.fullName = fullName;
  user.password = hashedPassword;
  await user.save();

  res.status(200).json({
    message: 'User updated successfully',
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
    },
  });
});

app.delete('/user/delete', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Please provide an email' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  await User.deleteOne({ email });
  res.status(200).json({ message: 'User deleted successfully' });
});

app.get('/user/getAll', async (req, res) => {
  const users = await User.find({}, 'fullName email');
  if (users.length === 0) {
    return res.status(404).json({ message: 'No users found' });
  }
  res.status(200).json(users);
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },  
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Invalid file format. Only JPEG, PNG, and GIF are allowed.'));
  },
}).single('image');

app.post('/user/uploadImage', upload, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  const filePath = `/images/${req.file.filename}`;
  res.status(200).json({
    message: 'Image uploaded successfully',
    filePath: filePath,
  });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
