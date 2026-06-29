import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import logger from '../config/logger';

// Generate JWT tokens
const generateTokens = (userId: string) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '365d' });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '365d' });
  return { token, refreshToken };
};

// Register
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      name,
      role: 'user',
      subscription: {
        plan: 'free',
        status: 'active',
      },
      usage: {
        monthlyStorageLimit: 1024 * 1024 * 1024, // 1GB
        storageUsed: 0,
        monthlyVideosLimit: 5,
        videosGenerated: 0,
      },
      preferences: {
        theme: 'dark',
        language: 'en',
        notifications: true,
      },
    });

    await user.save();

    // Generate tokens
    const { token, refreshToken } = generateTokens(user._id.toString());

    logger.info(`New user registered: ${email}`);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          subscription: user.subscription,
          usage: user.usage,
          preferences: user.preferences,
        },
        token,
        refreshToken,
      },
    });
  } catch (error: any) {
    logger.error('Registration error:', error);
    return next(error);
  }
};

// Login
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Generate tokens
    const { token, refreshToken } = generateTokens(user._id.toString());

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    logger.info(`User logged in: ${email}`);

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          subscription: user.subscription,
          usage: user.usage,
          preferences: user.preferences,
        },
        token,
        refreshToken,
      },
    });
  } catch (error: any) {
    logger.error('Login error:', error);
    return next(error);
  }
};

// Logout
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // In a real implementation, you might want to invalidate the token
    // For now, we'll just return success
    logger.info(`User logged out: ${req.user?.email}`);
    
    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error: any) {
    logger.error('Logout error:', error);
    return next(error);
  }
};

// Refresh token
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
    
    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    // Generate new tokens
    const { token, refreshToken: newRefreshToken } = generateTokens(user._id.toString());

    return res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error: any) {
    logger.error('Token refresh error:', error);
    return next(error);
  }
};

// Update profile
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { name, preferences } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (name) user.name = name;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    await user.save();

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          subscription: user.subscription,
          usage: user.usage,
          preferences: user.preferences,
        },
      },
    });
  } catch (error: any) {
    logger.error('Profile update error:', error);
    return next(error);
  }
};

// Change password
export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;

    await user.save();

    logger.info(`Password changed for user: ${user.email}`);

    return res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    logger.error('Password change error:', error);
    return next(error);
  }
};

// Forgot password (placeholder)
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    // In a real implementation, you would send an email with a reset token
    // For now, we'll just return success
    
    logger.info(`Password reset requested for: ${email}`);

    return res.json({
      success: true,
      message: 'Password reset email sent',
    });
  } catch (error: any) {
    logger.error('Forgot password error:', error);
    return next(error);
  }
};

// Reset password (placeholder)
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // In a real implementation, you would verify the token and update the password
    // For now, we'll just return success
    const { token, newPassword } = req.body;
    
    logger.info(`Password reset attempted with token: ${token.substring(0, 10)}... and new password length: ${newPassword.length}`);

    return res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error: any) {
    logger.error('Reset password error:', error);
    return next(error);
  }
};
