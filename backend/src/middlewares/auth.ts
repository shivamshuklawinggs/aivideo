import { Request, Response, NextFunction } from 'express';
import User, { IUser } from '../models/User';
import logger from '../config/logger';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      userId?: string;
    }
  }
}

const DEFAULT_USER_EMAIL = 'guest@aivideo.local';
let defaultUser: IUser | null = null;

const getDefaultUser = async (): Promise<IUser | null> => {
  try {
    if (defaultUser) return defaultUser;

    let user = await User.findOne({ email: DEFAULT_USER_EMAIL });
    if (!user) {
      const randomPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      user = await User.create({
        email: DEFAULT_USER_EMAIL,
        password: randomPassword,
        name: 'Guest User',
        role: 'admin',
        subscription: { plan: 'enterprise', status: 'active' },
        isActive: true,
      });
    }

    defaultUser = user;
    return user;
  } catch (error) {
    logger.error('Failed to get default guest user:', error);
    return null;
  }
};

export const protect = async (
  _req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  next();
};

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getDefaultUser();
    if (user) {
      req.user = user;
      req.userId = user._id.toString();
    }
    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    next();
  }
};

export const authorize = (..._roles: string[]) => {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    next();
  };
};

export const checkSubscription = (_requiredPlan: string[]) => {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    next();
  };
};
