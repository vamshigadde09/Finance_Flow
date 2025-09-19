const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

// Ensure we have a JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-123';

const normalizePhone = (phone) => {
  // Remove all non-digit characters and keep only last 10 digits
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-10);
};

const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, email, password, role = "user" } = req.body;

    // Validate required fields
    if (!password) {
      return res.status(400).json({
        message: "Password is required",
      });
    }

    // Normalize phone number
    const normalizedPhone = normalizePhone(phoneNumber);

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ phoneNumber: normalizedPhone }, { email: email.toLowerCase() }],
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
        conflict:
          existingUser.phoneNumber === normalizedPhone ? "phone" : "email",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      firstName,
      lastName,
      phoneNumber: normalizedPhone,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      userGuideCompleted: false,
      avatar: req.body.avatar || `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random`
    });

    await newUser.save();

    // Omit sensitive data from response
    const userResponse = newUser.toObject();
    delete userResponse.__v;
    delete userResponse.password;

    res.status(201).json({
      message: "User registered successfully",
      user: userResponse,
    });
  } catch (err) {
    console.error("Registration error:", err);

    // Handle Mongoose validation errors
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((el) => el.message);
      return res.status(400).json({
        message: "Validation failed",
        errors,
      });
    }

    res.status(500).json({
      message: "Server error during registration",
      error: err.message,
    });
  }
};

const loginUser = async (req, res) => {
  const { phoneNumber, password } = req.body;

  // Validate input exists
  if (!phoneNumber || !password) {
    return res.status(400).json({
      success: false,
      message: "Phone number and password are required",
    });
  }

  // Validate phone number format (10 digits starting with 6-9)
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(phoneNumber)) {
    return res.status(400).json({
      success: false,
      message: "Phone must be 10 digits starting with 6-9",
    });
  }

  try {
    // Find user and include password for verification
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please register first.",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    // Generate JWT token with longer expiration (30 days)
    const tokenPayload = {
      userId: user._id,
      phoneNumber: user.phoneNumber,
      role: user.role || 'user', // Default role if not specified
      userGuideCompleted: user.userGuideCompleted || false,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: '30d' // 30 days expiration
    });

    // Prepare user data for response (excluding sensitive data)
    const userData = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      token: token,
      userGuideCompleted: user.userGuideCompleted || false,
    };

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: userData,
      token: token
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-__v");
    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    // The user object is already attached by auth middleware
    const user = req.user;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

const updateUser = async (req, res) => {
  const { firstName, lastName, phoneNumber, email, avatar } = req.body;
  const userId = req.user._id;

  try {
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check for existing phone or email conflicts
    const phoneExists = await User.findOne({
      phoneNumber,
      _id: { $ne: userId },
    });
    const emailExists = await User.findOne({
      email: email.toLowerCase(),
      _id: { $ne: userId },
    });

    if (phoneExists) {
      return res.status(409).json({
        success: false,
        message: "Phone number is already in use by another user",
      });
    }

    if (emailExists) {
      return res.status(409).json({
        success: false,
        message: "Email is already in use by another user",
      });
    }

    // Update user information
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    user.email = email ? email.toLowerCase() : user.email;
    user.avatar = avatar || user.avatar;

    await user.save();

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      success: false,
      message: "Server error during update",
      error: error.message,
    });
  }
};

const deleteUser = async (req, res) => {
  const userId = req.user._id;

  try {
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Server error during deletion",
      error: error.message,
    });
  }
};

const completeUserGuide = async (req, res) => {
  try {
    const user = req.user; // User object is already attached by auth middleware
    user.userGuideCompleted = true; // Always set to true when completing guide
    await user.save();

    // Remove sensitive data from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.__v;

    res.status(200).json({
      success: true,
      message: "User guide completed successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("Error completing user guide:", error);
    res.status(500).json({
      success: false,
      message: "Server error during completion",
      error: error.message,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getAllUsers,
  getCurrentUser,
  updateUser,
  deleteUser,
  completeUserGuide,
};
