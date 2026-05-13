import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      isTrainingAdmin?: boolean;
      /** Tagged in Training → Roster (supervisor list); can open /supervisor. */
      isTrainingSupervisor?: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    isTrainingAdmin?: boolean;
    isTrainingSupervisor?: boolean;
  }
}
