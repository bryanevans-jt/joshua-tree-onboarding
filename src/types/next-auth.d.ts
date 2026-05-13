import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      isTrainingAdmin?: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    isTrainingAdmin?: boolean;
  }
}
