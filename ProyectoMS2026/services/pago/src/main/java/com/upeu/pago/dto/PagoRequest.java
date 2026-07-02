package com.upeu.pago.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PagoRequest {

	@NotNull(message = "El id del pedido es obligatorio")
	private Long idPedido;

	@NotNull(message = "El monto es obligatorio")
	@DecimalMin(value = "0.01", message = "El monto debe ser mayor que cero")
	private BigDecimal monto;

	@NotBlank(message = "El método de pago es obligatorio")
	@Size(max = 50, message = "El método no debe superar los 50 caracteres")
	private String metodo;

	@NotBlank(message = "El estado es obligatorio")
	@Size(max = 50, message = "El estado no debe superar los 50 caracteres")
	private String estado;

	@Size(max = 100, message = "La referencia no debe superar los 100 caracteres")
	private String referenciaTransaccion;
}
