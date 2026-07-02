package com.upeu.pedido.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PedidoResponse {

	private Long id;
	private Long userId;
	private String cliente;
	private String estado;
	private String observacion;
	private String direccionEnvio;
	private BigDecimal total;
	private LocalDateTime createdAt;
	private List<PedidoItemResponse> items;
}
