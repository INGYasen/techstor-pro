package com.upeu.pedido.service.impl;

import com.upeu.pedido.client.PagoClient;
import com.upeu.pedido.client.ProductoClient;
import com.upeu.pedido.dto.DescontarStockRequest;
import com.upeu.pedido.dto.PagoRequestDto;
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
import com.upeu.pedido.service.PedidoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PedidoServiceImpl implements PedidoService {

	private final PedidoRepository pedidoRepository;
	private final PedidoItemRepository pedidoItemRepository;
	private final PedidoMapper pedidoMapper;
	private final ProductoClient productoClient;
	private final PagoClient pagoClient;
	private final TransactionTemplate transactionTemplate;
	private final TechStoreBusinessMetrics businessMetrics;

	@Override
	public PedidoResponse create(PedidoRequest request) {
		log.info("Creación de pedido para cliente: {} (userId={})", request.getCliente(), request.getUserId());

		PedidoResponse response = transactionTemplate.execute(status -> guardarPedido(request));
		if (response != null) {
			registrarPagoPendiente(response);
			businessMetrics.refreshFromDatabase();
		}
		return response;
	}

	private PedidoResponse guardarPedido(PedidoRequest request) {
		List<PedidoItem> items = construirItems(request.getItems());
		BigDecimal total = items.stream()
				.map(PedidoItem::getSubtotal)
				.reduce(BigDecimal.ZERO, BigDecimal::add);

		Pedido pedido = pedidoMapper.toEntity(request);
		pedido.setTotal(total);
		pedido.setCreatedAt(LocalDateTime.now());
		Pedido saved = pedidoRepository.save(pedido);

		items.forEach(item -> item.setPedidoId(saved.getId()));
		List<PedidoItem> savedItems = pedidoItemRepository.saveAll(items);

		descontarStockProductos(request.getItems());

		return pedidoMapper.toResponse(saved, savedItems);
	}

	private void registrarPagoPendiente(PedidoResponse pedido) {
		try {
			pagoClient.crearPago(PagoRequestDto.builder()
					.idPedido(pedido.getId())
					.monto(pedido.getTotal())
					.metodo("PENDIENTE")
					.estado("PENDIENTE")
					.build());
			log.info("Pago PENDIENTE registrado para pedido {}", pedido.getId());
		} catch (Exception ex) {
			log.error("No se pudo registrar el pago para el pedido {}: {}", pedido.getId(), ex.getMessage());
		}
	}

	@Override
	@Transactional(readOnly = true)
	public List<PedidoResponse> findAll() {
		return pedidoRepository.findAll().stream()
				.map(pedido -> pedidoMapper.toResponse(pedido, pedidoItemRepository.findByPedidoId(pedido.getId())))
				.toList();
	}

	@Override
	@Transactional(readOnly = true)
	public PedidoResponse findById(Long id) {
		Pedido pedido = getPedidoById(id);
		return pedidoMapper.toResponse(pedido, pedidoItemRepository.findByPedidoId(id));
	}

	@Override
	@Transactional
	public PedidoResponse update(Long id, PedidoRequest request) {
		Pedido pedido = getPedidoById(id);
		pedidoMapper.updateEntityFromRequest(pedido, request);

		pedidoItemRepository.deleteByPedidoId(id);
		List<PedidoItem> items = construirItems(request.getItems());
		BigDecimal total = items.stream()
				.map(PedidoItem::getSubtotal)
				.reduce(BigDecimal.ZERO, BigDecimal::add);
		pedido.setTotal(total);
		items.forEach(item -> item.setPedidoId(id));
		List<PedidoItem> savedItems = pedidoItemRepository.saveAll(items);

		return pedidoMapper.toResponse(pedidoRepository.save(pedido), savedItems);
	}

	@Override
	@Transactional
	public void delete(Long id) {
		getPedidoById(id);
		pedidoItemRepository.deleteByPedidoId(id);
		pedidoRepository.deleteById(id);
	}

	private List<PedidoItem> construirItems(List<PedidoItemRequest> itemRequests) {
		List<PedidoItem> items = new ArrayList<>();
		for (PedidoItemRequest itemRequest : itemRequests) {
			ProductoDto producto = productoClient.findById(itemRequest.getProductoId());
			validarProducto(producto, itemRequest);

			BigDecimal subtotal = producto.getPrecio().multiply(BigDecimal.valueOf(itemRequest.getCantidad()));
			items.add(PedidoItem.builder()
					.productoId(producto.getId())
					.nombreProducto(producto.getNombre())
					.cantidad(itemRequest.getCantidad())
					.precioUnitario(producto.getPrecio())
					.subtotal(subtotal)
					.build());
		}
		return items;
	}

	private void validarProducto(ProductoDto producto, PedidoItemRequest itemRequest) {
		if (producto == null) {
			throw new IllegalArgumentException("Producto no encontrado");
		}
		if (!Boolean.TRUE.equals(producto.getActivo())) {
			throw new IllegalArgumentException("El producto " + producto.getId() + " no está activo");
		}
		if (producto.getStock() < itemRequest.getCantidad()) {
			throw new IllegalArgumentException(
					"Stock insuficiente para el producto " + producto.getId() + ". Disponible: " + producto.getStock());
		}
	}

	private void descontarStockProductos(List<PedidoItemRequest> itemRequests) {
		for (PedidoItemRequest itemRequest : itemRequests) {
			productoClient.descontarStock(itemRequest.getProductoId(),
					DescontarStockRequest.builder().cantidad(itemRequest.getCantidad()).build());
		}
	}

	private Pedido getPedidoById(Long id) {
		return pedidoRepository.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException("Pedido con id " + id + " no encontrado"));
	}
}
