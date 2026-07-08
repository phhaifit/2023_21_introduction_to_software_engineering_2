import { describe, expect, it } from "vitest";

import {
  LOGIN_VALIDATION_MESSAGES,
  REGISTER_VALIDATION_MESSAGES,
  validateLoginField,
  validateRegisterField
} from "./auth-validator";

describe("authentication field validation", () => {
  it("validates register email on blur", () => {
    expect(validateRegisterField("email", { email: "", password: "", confirmPassword: "" }))
      .toBe(REGISTER_VALIDATION_MESSAGES.emailRequired);
    expect(validateRegisterField("email", { email: "not-an-email", password: "", confirmPassword: "" }))
      .toBe(REGISTER_VALIDATION_MESSAGES.emailInvalid);
    expect(validateRegisterField("email", { email: "new.user@example.com", password: "", confirmPassword: "" }))
      .toBeUndefined();
  });

  it("validates register passwords on blur", () => {
    expect(validateRegisterField("password", { email: "", password: "", confirmPassword: "" }))
      .toBe(REGISTER_VALIDATION_MESSAGES.passwordRequired);
    expect(validateRegisterField("password", { email: "", password: "weakpass", confirmPassword: "" }))
      .toBe(REGISTER_VALIDATION_MESSAGES.passwordWeak);
    expect(validateRegisterField("confirmPassword", {
      email: "",
      password: "Strong123",
      confirmPassword: ""
    })).toBe(REGISTER_VALIDATION_MESSAGES.confirmPasswordRequired);
    expect(validateRegisterField("confirmPassword", {
      email: "",
      password: "Strong123",
      confirmPassword: "Strong124"
    })).toBe(REGISTER_VALIDATION_MESSAGES.confirmPasswordMismatch);
  });

  it("validates login fields on blur", () => {
    expect(validateLoginField("email", { email: "", password: "" }))
      .toBe(LOGIN_VALIDATION_MESSAGES.emailRequired);
    expect(validateLoginField("email", { email: "bad-email", password: "" }))
      .toBe(LOGIN_VALIDATION_MESSAGES.emailInvalid);
    expect(validateLoginField("password", { email: "", password: "" }))
      .toBe(LOGIN_VALIDATION_MESSAGES.passwordRequired);
  });
});
