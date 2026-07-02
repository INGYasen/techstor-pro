package com.upeu.pedido.mapper;

import com.upeu.pedido.dto.PedidoItemRequest;
import com.upeu.pedido.dto.PedidoRequest;
import com.upeu.pedido.dto.PedidoResponse;
import com.upeu.pedido.entity.Pedido;
import com.upeu.pedido.entity.PedidoItem;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PedidoMapperTest {

	private final PedidoMapper mapper = new PedidoMapper();

	@Test
	void shouldMapRequestToEntity() {
		PedidoRequest request = PedidoRequest.builder()
				.userId(1L)
				.cliente("admin")
				.estado("PENDIENTE")
				.observacion("Nota")
				.direccionEnvio("Lima")
				.items(List.of(PedidoItemRequest.builder().productoId(1L).cantidad(1).build()))
				.build();

		Pedido entity = mapper.toEntity(request);

		assertThat(entity).isNotNull();
		assertThat(entity.getCliente()).isEqualTo("admin");
		assertThat(entity.getUserId()).isEqualTo(1L);
		assertThat(entity.getEstado()).isEqualTo("PENDIENTE");
	}

	@Test
	void shouldMapEntityToResponse() {
		Pedido entity = Pedido.builder()
				.id(1L)
				.userId(1L)
				.cliente("admin")
				.estado("PENDIENTE")
				.observacion("X")
				.total(new BigDecimal("100.00"))
				.createdAt(LocalDateTime.now())
				.build();
		PedidoItem item = PedidoItem.builder()
				.id(1L)
				.productoId(1L)
				.nombreProducto("Laptop")
				.cantidad(1)
				.precioUnitario(new BigDecimal("100.00"))
				.subtotal(new BigDecimal("100.00"))
				.build();

		PedidoResponse response = mapper.toResponse(entity, List.of(item));

		assertThat(response.getId()).isEqualTo(1L);
		assertThat(response.getCliente()).isEqualTo("admin");
		assertThat(response.getItems()).hasSize(1);
	}
}
