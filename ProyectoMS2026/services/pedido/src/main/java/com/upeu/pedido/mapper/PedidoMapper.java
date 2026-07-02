package com.upeu.pedido.mapper;

import com.upeu.pedido.dto.PedidoItemResponse;
import com.upeu.pedido.dto.PedidoRequest;
import com.upeu.pedido.dto.PedidoResponse;
import com.upeu.pedido.entity.Pedido;
import com.upeu.pedido.entity.PedidoItem;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class PedidoMapper {

	public Pedido toEntity(PedidoRequest request) {
		if (request == null) {
			return null;
		}
		return Pedido.builder()
				.userId(request.getUserId())
				.cliente(request.getCliente())
				.estado(request.getEstado())
				.observacion(request.getObservacion())
				.direccionEnvio(request.getDireccionEnvio())
				.build();
	}

	public PedidoResponse toResponse(Pedido entity, List<PedidoItem> items) {
		if (entity == null) {
			return null;
		}
		return PedidoResponse.builder()
				.id(entity.getId())
				.userId(entity.getUserId())
				.cliente(entity.getCliente())
				.estado(entity.getEstado())
				.observacion(entity.getObservacion())
				.direccionEnvio(entity.getDireccionEnvio())
				.total(entity.getTotal())
				.createdAt(entity.getCreatedAt())
				.items(items == null ? List.of() : items.stream().map(this::toItemResponse).toList())
				.build();
	}

	public PedidoItemResponse toItemResponse(PedidoItem item) {
		return PedidoItemResponse.builder()
				.id(item.getId())
				.productoId(item.getProductoId())
				.nombreProducto(item.getNombreProducto())
				.cantidad(item.getCantidad())
				.precioUnitario(item.getPrecioUnitario())
				.subtotal(item.getSubtotal())
				.build();
	}

	public void updateEntityFromRequest(Pedido entity, PedidoRequest request) {
		entity.setUserId(request.getUserId());
		entity.setCliente(request.getCliente());
		entity.setEstado(request.getEstado());
		entity.setObservacion(request.getObservacion());
		entity.setDireccionEnvio(request.getDireccionEnvio());
	}
}
