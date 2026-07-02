package com.upeu.pago.dto;

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
public class MercadoPagoYapeResponse {

	private boolean approved;
	private String status;
	private String statusDetail;
	private Long mercadoPagoPaymentId;
	private Long idPedido;
	private Long idPago;
	private String message;
}
