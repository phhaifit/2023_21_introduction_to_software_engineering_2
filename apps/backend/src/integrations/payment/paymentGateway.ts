export interface PaymentGateway {
  createPaymentSession(input: {
    transactionId: string;
    gatewayTransactionId: string;
  }): Promise<{ paymentUrl: string }>;
}
