package com.upeu.pedido.entity;

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
@Table(name = "pedidos")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Pedido {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Column(name = "cliente", nullable = false, length = 100)
	private String cliente;

	@Column(name = "estado", nullable = false, length = 50)
	private String estado;

	@Column(name = "observacion", length = 255)
	private String observacion;

	@Column(name = "direccion_envio", length = 255)
	private String direccionEnvio;

	@Column(name = "total", nullable = false, precision = 12, scale = 2)
	private BigDecimal total;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}
