package com.upeu.pedido.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PedidoRequest {

	@NotNull(message = "El userId es obligatorio")
	private Long userId;

	@NotBlank(message = "El cliente es obligatorio")
	@Size(max = 100, message = "El cliente no debe superar los 100 caracteres")
	private String cliente;

	@NotBlank(message = "El estado es obligatorio")
	@Size(max = 50, message = "El estado no debe superar los 50 caracteres")
	private String estado;

	@Size(max = 255, message = "La observación no debe superar los 255 caracteres")
	private String observacion;

	@Size(max = 255, message = "La dirección de envío no debe superar los 255 caracteres")
	private String direccionEnvio;

	@NotEmpty(message = "El pedido debe tener al menos un producto")
	@Valid
	private List<PedidoItemRequest> items;
}
