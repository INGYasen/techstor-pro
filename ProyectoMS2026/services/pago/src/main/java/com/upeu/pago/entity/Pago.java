package com.upeu.pago.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "pagos")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Pago {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "id_pedido", nullable = false, unique = true)
	private Long idPedido;

	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Column(name = "monto", nullable = false, precision = 12, scale = 2)
	private BigDecimal monto;

	@Column(name = "metodo", nullable = false, length = 50)
	private String metodo;

	@Column(name = "estado", nullable = false, length = 50)
	private String estado;

	@Column(name = "referencia_transaccion", length = 100)
	private String referenciaTransaccion;

	@Column(name = "fecha_pago")
	private LocalDateTime fechaPago;
}
