import { USER_STATUSES } from "@ai-agent-platform/shared";
import type { LoginInput, PublicUser, UserStatus } from "@ai-agent-platform/shared";

// Non-production test fixtures only.
// Do not import into production authentication flows.
export interface AuthenticationTestFixture {
  credentials: LoginInput;
  expectedPublicUser: PublicUser;
  expectedStatus: UserStatus;
}

export interface AuthenticationTestFixtures {
  activeUser: AuthenticationTestFixture;
  disabledUser: AuthenticationTestFixture;
  lockedUser: AuthenticationTestFixture;
}

export function createAuthenticationTestFixtures(): AuthenticationTestFixtures {
  return {
    activeUser: {
      credentials: {
        email: "active.user@example.com",
        password: "TestPassword123!"
      },
      expectedPublicUser: {
        id: "auth-test-user-active",
        email: "active.user@example.com",
        displayName: "Active Test User",
        status: USER_STATUSES.ACTIVE
      },
      expectedStatus: USER_STATUSES.ACTIVE
    },
    disabledUser: {
      credentials: {
        email: "disabled.user@example.com",
        password: "TestPassword123!"
      },
      expectedPublicUser: {
        id: "auth-test-user-disabled",
        email: "disabled.user@example.com",
        displayName: "Disabled Test User",
        status: USER_STATUSES.DISABLED
      },
      expectedStatus: USER_STATUSES.DISABLED
    },
    lockedUser: {
      credentials: {
        email: "locked.user@example.com",
        password: "TestPassword123!"
      },
      expectedPublicUser: {
        id: "auth-test-user-locked",
        email: "locked.user@example.com",
        displayName: "Locked Test User",
        status: USER_STATUSES.LOCKED
      },
      expectedStatus: USER_STATUSES.LOCKED
    }
  };
}
