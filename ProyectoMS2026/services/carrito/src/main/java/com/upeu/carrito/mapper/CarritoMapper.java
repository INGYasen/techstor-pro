package com.upeu.carrito.mapper;

import com.upeu.carrito.dto.CarritoItemResponse;
import com.upeu.carrito.dto.CarritoResponse;
import com.upeu.carrito.entity.Carrito;
import com.upeu.carrito.entity.CarritoItem;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class CarritoMapper {

	public CarritoResponse toResponse(Carrito carrito) {
		List<CarritoItemResponse> items = carrito.getItems().stream()
				.map(this::toItemResponse)
				.toList();

		return CarritoResponse.builder()
				.id(carrito.getId())
				.userId(carrito.getUserId())
				.items(items)
				.updatedAt(carrito.getUpdatedAt())
				.build();
	}

	public CarritoItemResponse toItemResponse(CarritoItem item) {
		return CarritoItemResponse.builder()
				.id(item.getId())
				.productoId(item.getProductoId())
				.cantidad(item.getCantidad())
				.nombreProducto(item.getNombreProducto())
				.precioUnitario(item.getPrecioUnitario())
				.imagenUrl(item.getImagenUrl())
				.stockDisponible(item.getStockDisponible())
				.build();
	}
}
