package com.upeu.pago.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManagerFactory;
import java.net.http.HttpClient;
import java.security.KeyStore;

@Configuration
public class RestClientConfig {

	@Bean
	RestClient mercadoPagoRestClient() throws Exception {
		HttpClient.Builder httpClientBuilder = HttpClient.newBuilder();
		SSLContext sslContext = buildSslContext();
		if (sslContext != null) {
			httpClientBuilder.sslContext(sslContext);
		}
		JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClientBuilder.build());
		return RestClient.builder()
				.requestFactory(requestFactory)
				.build();
	}

	private SSLContext buildSslContext() throws Exception {
		if (!System.getProperty("os.name", "").toLowerCase().contains("win")) {
			return null;
		}
		KeyStore keyStore = KeyStore.getInstance("Windows-ROOT");
		keyStore.load(null, null);
		TrustManagerFactory trustManagerFactory = TrustManagerFactory
				.getInstance(TrustManagerFactory.getDefaultAlgorithm());
		trustManagerFactory.init(keyStore);
		SSLContext sslContext = SSLContext.getInstance("TLS");
		sslContext.init(null, trustManagerFactory.getTrustManagers(), null);
		return sslContext;
	}
}
