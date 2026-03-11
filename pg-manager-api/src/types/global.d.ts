declare namespace Express {
  interface Request {
    user?: {
      sub: string;
      role: 'owner' | 'tenant';
      propertyIds?: string[];
    };
  }
}
