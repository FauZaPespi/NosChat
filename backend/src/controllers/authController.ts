import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { generateToken } from '../middleware/auth';
import { logger } from '../config/logger';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, displayName } = req.body;

    // Validation
    if (!username || !email || !password || !displayName) {
      res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        error: 'User already exists'
      });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      displayName
    });

    // Generate token
    const token = generateToken(user._id.toString());

    // Return user without password
    const userObject = user.toObject();
    delete userObject.password;

    res.status(201).json({
      success: true,
      data: {
        user: userObject,
        token
      },
      message: 'User registered successfully'
    });

    logger.info(`New user registered: ${username}`);
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register user'
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
      return;
    }

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
      return;
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
      return;
    }

    // Update user status
    user.status = 'online';
    user.lastSeen = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id.toString());

    // Return user without password
    const userObject = user.toObject();
    delete userObject.password;

    res.json({
      success: true,
      data: {
        user: userObject,
        token
      },
      message: 'Login successful'
    });

    logger.info(`User logged in: ${user.username}`);
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login'
    });
  }
};

export const getMe = async (req: any, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId).select('-password');

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Get me error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user'
    });
  }
};

export const updateProfile = async (req: any, res: Response): Promise<void> => {
  try {
    const { displayName, avatar, status } = req.body;

    const user = await User.findById(req.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    if (displayName) user.displayName = displayName;
    if (avatar) user.avatar = avatar;
    if (status) user.status = status;

    await user.save();

    const userObject = user.toObject();
    delete userObject.password;

    res.json({
      success: true,
      data: userObject,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
};
