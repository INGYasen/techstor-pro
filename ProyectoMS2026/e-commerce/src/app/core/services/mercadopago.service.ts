import { Injectable } from '@angular/core';

interface MercadoPagoYapeInstance {
  create: () => Promise<{ id: string }>;
}

interface MercadoPagoCardTokenResult {
  id: string;
}

interface MercadoPagoInstance {
  yape: (options: { otp: string; phoneNumber: string }) => MercadoPagoYapeInstance;
  createCardToken: (options: {
    cardNumber: string;
    cardholderName: string;
    cardExpirationMonth: string;
    cardExpirationYear: string;
    securityCode: string;
  }) => Promise<MercadoPagoCardTokenResult>;
}

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => MercadoPagoInstance;
  }
}

export interface MercadoPagoTarjetaToken {
  token: string;
  paymentMethodId: string;
}

@Injectable({ providedIn: 'root' })
export class MercadoPagoSdkService {
  private sdkReady: Promise<void> | null = null;
  private mpInstance: MercadoPagoInstance | null = null;
  private activePublicKey: string | null = null;

  private loadSdk(): Promise<void> {
    if (window.MercadoPago) {
      return Promise.resolve();
    }
    if (!this.sdkReady) {
      this.sdkReady = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://sdk.mercadopago.com/js/v2';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('No se pudo cargar el SDK de Mercado Pago'));
        document.head.appendChild(script);
      });
    }
    return this.sdkReady;
  }

  async init(publicKey: string): Promise<void> {
    await this.loadSdk();
    if (!window.MercadoPago) {
      throw new Error('SDK de Mercado Pago no disponible');
    }
    if (!this.mpInstance || this.activePublicKey !== publicKey) {
      this.mpInstance = new window.MercadoPago(publicKey, { locale: 'es-PE' });
      this.activePublicKey = publicKey;
    }
  }

  async crearTokenYape(celular: string, otp: string): Promise<string> {
    if (!this.mpInstance) {
      throw new Error('Mercado Pago no está inicializado');
    }
    const phoneNumber = this.normalizarCelularPeru(celular);
    const otpLimpio = otp.replace(/\D/g, '');
    if (otpLimpio.length !== 6) {
      throw new Error('El código OTP de Yape debe tener 6 dígitos.');
    }

    try {
      const yape = this.mpInstance.yape({ phoneNumber, otp: otpLimpio });
      const token = await yape.create();
      if (!token?.id) {
        throw new Error('No se pudo generar el token de Yape');
      }
      return token.id;
    } catch (err: unknown) {
      throw new Error(this.mensajeErrorYape(err));
    }
  }

  private normalizarCelularPeru(celular: string): string {
    let digits = celular.replace(/\D/g, '');
    if (digits.startsWith('51') && digits.length === 11) {
      digits = digits.slice(2);
    }
    if (digits.length !== 9 || !digits.startsWith('9')) {
      throw new Error('Ingresa un celular peruano válido de 9 dígitos (ej: 967 007 832).');
    }
    return digits;
  }

  private mensajeErrorYape(err: unknown): string {
    if (err instanceof Error && err.message.trim()) {
      const msg = err.message.trim();
      if (/otp|token|expir/i.test(msg)) {
        return 'Código OTP inválido o expirado. Genera uno nuevo en Yape → Compras por internet e intenta de inmediato.';
      }
      if (/phone|celular|number/i.test(msg)) {
        return 'El celular no coincide con tu cuenta Yape. Verifica los 9 dígitos sin el prefijo +51.';
      }
      return msg;
    }
    return 'No se pudo validar Yape. Activa Compras por internet en tu app Yape y usa un código OTP nuevo.';
  }

  async crearTokenTarjeta(params: {
    numero: string;
    titular: string;
    vencimiento: string;
    cvv: string;
  }): Promise<MercadoPagoTarjetaToken> {
    if (!this.mpInstance) {
      throw new Error('Mercado Pago no está inicializado');
    }

    const cardNumber = params.numero.replace(/\D/g, '');
    const [mesRaw, anioRaw] = params.vencimiento.split('/');
    const cardExpirationMonth = (mesRaw ?? '').padStart(2, '0');
    const cardExpirationYear = (anioRaw ?? '').length === 2 ? `20${anioRaw}` : (anioRaw ?? '');
    const securityCode = params.cvv.replace(/\D/g, '');

    const result = await this.mpInstance.createCardToken({
      cardNumber,
      cardholderName: params.titular.trim(),
      cardExpirationMonth,
      cardExpirationYear,
      securityCode,
    });

    if (!result?.id) {
      throw new Error('No se pudo generar el token de la tarjeta');
    }

    return {
      token: result.id,
      paymentMethodId: this.detectarMetodoPago(cardNumber),
    };
  }

  private detectarMetodoPago(cardNumber: string): string {
    if (cardNumber.startsWith('4')) return 'visa';
    if (cardNumber.startsWith('5')) return 'master';
    if (cardNumber.startsWith('3')) return 'amex';
    return 'visa';
  }
}
