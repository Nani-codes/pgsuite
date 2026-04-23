declare namespace Express {
  interface Request {
    user?: {
      sub: string;
      role: 'owner' | 'tenant' | 'explorer';
      propertyIds?: string[];
    };
  }
}
