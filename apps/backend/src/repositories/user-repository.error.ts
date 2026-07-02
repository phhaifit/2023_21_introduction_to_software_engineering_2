export class DuplicateUserEmailError extends Error {
  readonly code = "DUPLICATE_USER_EMAIL";

  constructor() {
    super("User email already exists.");
    this.name = "DuplicateUserEmailError";
  }
}
