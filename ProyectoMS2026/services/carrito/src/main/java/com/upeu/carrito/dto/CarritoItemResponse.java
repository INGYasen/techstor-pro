package com.upeu.carrito.dto;

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
public class CarritoItemResponse {

	private Long id;
	private Long productoId;
	private Integer cantidad;
	private String nombreProducto;
	private BigDecimal precioUnitario;
	private String imagenUrl;
	private Integer stockDisponible;
}
