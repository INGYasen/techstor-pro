package com.upeu.pedido.dto;

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
public class PagoSummaryDto {

	private Long idPedido;
	private BigDecimal monto;
	private String estado;
}
