package com.upeu.pago.dto;

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
public class PedidoItemDto {

	private Long productoId;
	private String nombreProducto;
	private Integer cantidad;
	private BigDecimal subtotal;
}
