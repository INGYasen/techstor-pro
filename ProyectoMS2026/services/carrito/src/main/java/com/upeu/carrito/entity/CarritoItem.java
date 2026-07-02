package com.upeu.carrito.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "carrito_items", uniqueConstraints = {
		@UniqueConstraint(name = "uk_carrito_items_producto", columnNames = { "carrito_id", "producto_id" })
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CarritoItem {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "carrito_id", nullable = false)
	private Carrito carrito;

	@Column(name = "producto_id", nullable = false)
	private Long productoId;

	@Column(nullable = false)
	private Integer cantidad;

	@Column(name = "nombre_producto", nullable = false)
	private String nombreProducto;

	@Column(name = "precio_unitario", nullable = false, precision = 12, scale = 2)
	private BigDecimal precioUnitario;

	@Column(name = "imagen_url", length = 500)
	private String imagenUrl;

	@Column(name = "stock_disponible", nullable = false)
	private Integer stockDisponible;
}
