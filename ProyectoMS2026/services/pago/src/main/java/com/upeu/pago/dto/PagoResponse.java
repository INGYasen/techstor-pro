package com.upeu.pago.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PagoResponse {

	private Long id;
	private Long idPedido;
	private Long userId;
	private BigDecimal monto;
	private String metodo;
	private String estado;
	private String referenciaTransaccion;
	private LocalDateTime fechaPago;
}
