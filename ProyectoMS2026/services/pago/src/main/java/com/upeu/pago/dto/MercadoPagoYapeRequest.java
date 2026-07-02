package com.upeu.pago.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MercadoPagoYapeRequest {

	@NotNull(message = "El id del pedido es obligatorio")
	private Long idPedido;

	@NotBlank(message = "El token de Yape es obligatorio")
	private String token;

	private String payerEmail;
}
