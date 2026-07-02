package com.upeu.pago.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "mercadopago")
public class MercadoPagoProperties {

	private boolean enabled = false;
	private String publicKey = "";
	private String accessToken = "";
	private String payerEmail = "test@test.com";

	public boolean isConfigured() {
		return enabled
				&& publicKey != null && !publicKey.isBlank()
				&& accessToken != null && !accessToken.isBlank();
	}
}
