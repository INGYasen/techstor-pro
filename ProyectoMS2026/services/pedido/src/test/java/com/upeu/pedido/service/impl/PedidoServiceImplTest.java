package com.upeu.pedido.service.impl;

import com.upeu.pedido.client.PagoClient;
import com.upeu.pedido.client.ProductoClient;
import com.upeu.pedido.dto.PedidoItemRequest;
import com.upeu.pedido.dto.PedidoRequest;
import com.upeu.pedido.dto.PedidoResponse;
import com.upeu.pedido.dto.ProductoDto;
import com.upeu.pedido.entity.Pedido;
import com.upeu.pedido.entity.PedidoItem;
import com.upeu.pedido.exception.ResourceNotFoundException;
import com.upeu.pedido.mapper.PedidoMapper;
import com.upeu.pedido.metrics.TechStoreBusinessMetrics;
import com.upeu.pedido.repository.PedidoItemRepository;
import com.upeu.pedido.repository.PedidoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PedidoServiceImplTest {

	@Mock
	private PedidoRepository pedidoRepository;

	@Mock
	private PedidoItemRepository pedidoItemRepository;

	@Mock
	private ProductoClient productoClient;

	@Mock
	private PagoClient pagoClient;

	@Mock
	private TransactionTemplate transactionTemplate;

	@Spy
	private PedidoMapper pedidoMapper = new PedidoMapper();

	@Mock
	private TechStoreBusinessMetrics businessMetrics;

	@InjectMocks
	private PedidoServiceImpl pedidoService;

	@Test
	void shouldCreatePedido() {
		PedidoRequest request = PedidoRequest.builder()
				.userId(1L)
				.cliente("admin")
				.estado("PENDIENTE")
				.observacion("Urgente")
				.direccionEnvio("Lima")
				.items(List.of(PedidoItemRequest.builder().productoId(1L).cantidad(2).build()))
				.build();
		ProductoDto producto = ProductoDto.builder()
				.id(1L)
				.nombre("Laptop")
				.precio(new BigDecimal("1000.00"))
				.stock(10)
				.activo(true)
				.build();
		Pedido saved = Pedido.builder()
				.id(1L)
				.userId(1L)
				.cliente("admin")
				.estado("PENDIENTE")
				.observacion("Urgente")
				.direccionEnvio("Lima")
				.total(new BigDecimal("2000.00"))
				.createdAt(LocalDateTime.now())
				.build();
		PedidoItem item = PedidoItem.builder()
				.id(1L)
				.pedidoId(1L)
				.productoId(1L)
				.nombreProducto("Laptop")
				.cantidad(2)
				.precioUnitario(new BigDecimal("1000.00"))
				.subtotal(new BigDecimal("2000.00"))
				.build();

		when(transactionTemplate.execute(any())).thenAnswer(invocation -> {
			TransactionCallback<?> callback = invocation.getArgument(0);
			when(productoClient.findById(1L)).thenReturn(producto);
			when(pedidoRepository.save(any(Pedido.class))).thenReturn(saved);
			when(pedidoItemRepository.saveAll(any())).thenReturn(List.of(item));
			return callback.doInTransaction(null);
		});

		PedidoResponse response = pedidoService.create(request);

		assertThat(response.getId()).isEqualTo(1L);
		assertThat(response.getCliente()).isEqualTo("admin");
		assertThat(response.getTotal()).isEqualByComparingTo("2000.00");
		verify(pagoClient).crearPago(any());
	}

	@Test
	void shouldThrowWhenPedidoNotFound() {
		when(pedidoRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> pedidoService.findById(99L))
				.isInstanceOf(ResourceNotFoundException.class)
				.hasMessageContaining("99");
	}
}
