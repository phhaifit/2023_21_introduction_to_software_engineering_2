export interface PaymentGateway {
  createPaymentSession(input: {
    gatewayTransactionId: string;
  }): Promise<{ paymentUrl: string }>;
}
