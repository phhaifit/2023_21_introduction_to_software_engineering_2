import type { PaymentGateway } from "./paymentGateway.js";

export const mockPaymentGateway: PaymentGateway = {
  async createPaymentSession(input) {
    return {
      paymentUrl: `/app/subscription/mock-payment/${input.transactionId}`
    };
  }
};
