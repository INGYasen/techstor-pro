package com.upeu.pago.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

	@Bean
	public OpenAPI pagoOpenApi() {
		return new OpenAPI()
				.info(new Info()
						.title("pago API")
						.description("API REST del microservicio de pagos. Versión actual: v1")
						.version("1.0.0")
						.contact(new Contact()
								.name("Equipo pago")
								.email("pago@upeu.edu.pe"))
						.license(new License()
								.name("Internal Use Only")
								.url("https://upeu.edu.pe")));
	}
}
