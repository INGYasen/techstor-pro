package com.upeu.pago.service.impl;

import com.upeu.pago.client.PedidoClient;
import com.upeu.pago.dto.PagoRequest;
import com.upeu.pago.dto.PagoResponse;
import com.upeu.pago.dto.PedidoDto;
import com.upeu.pago.entity.Pago;
import com.upeu.pago.exception.ResourceNotFoundException;
import com.upeu.pago.mapper.PagoMapper;
import com.upeu.pago.metrics.TechStoreBusinessMetrics;
import com.upeu.pago.metrics.TechStoreSalesMetrics;
import com.upeu.pago.repository.PagoRepository;
import com.upeu.pago.service.PagoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PagoServiceImpl implements PagoService {

	private final PagoRepository pagoRepository;
	private final PagoMapper pagoMapper;
	private final PedidoClient pedidoClient;
	private final TechStoreSalesMetrics salesMetrics;
	private final TechStoreBusinessMetrics businessMetrics;

	@Override
	@Transactional
	public PagoResponse create(PagoRequest request) {
		log.info("Registro de pago para pedido id={}", request.getIdPedido());

		if (pagoRepository.existsByIdPedido(request.getIdPedido())) {
			throw new IllegalArgumentException("Ya existe un pago registrado para el pedido " + request.getIdPedido());
		}

		PedidoDto pedido = validarPedido(request.getIdPedido());
		validarMonto(request.getMonto(), pedido.getTotal());

		Pago pago = pagoMapper.toEntity(request, pedido.getUserId());
		Pago saved = pagoRepository.save(pago);
		if (TechStoreBusinessMetrics.isApproved(saved.getEstado())) {
			salesMetrics.recordApprovedSale(saved);
		}
		businessMetrics.refreshFromDatabase();
		return pagoMapper.toResponse(saved);
	}

	@Override
	@Transactional(readOnly = true)
	public List<PagoResponse> findAll() {
		return pagoRepository.findAll().stream()
				.map(pagoMapper::toResponse)
				.toList();
	}

	@Override
	@Transactional(readOnly = true)
	public PagoResponse findById(Long id) {
		return pagoMapper.toResponse(getPagoById(id));
	}

	@Override
	@Transactional(readOnly = true)
	public PagoResponse findByPedidoId(Long idPedido) {
		return pagoRepository.findByIdPedido(idPedido)
				.map(pagoMapper::toResponse)
				.orElseThrow(() -> new ResourceNotFoundException("Pago para pedido " + idPedido + " no encontrado"));
	}

	@Override
	@Transactional
	public PagoResponse update(Long id, PagoRequest request) {
		Pago pago = getPagoById(id);
		boolean wasApproved = TechStoreBusinessMetrics.isApproved(pago.getEstado());
		PedidoDto pedido = validarPedido(request.getIdPedido());
		validarMonto(request.getMonto(), pedido.getTotal());
		pagoMapper.updateEntityFromRequest(pago, request);
		Pago saved = pagoRepository.save(pago);
		if (!wasApproved && TechStoreBusinessMetrics.isApproved(saved.getEstado())) {
			salesMetrics.recordApprovedSale(saved);
		}
		businessMetrics.refreshFromDatabase();
		return pagoMapper.toResponse(saved);
	}

	@Override
	@Transactional
	public void delete(Long id) {
		getPagoById(id);
		pagoRepository.deleteById(id);
	}

	private PedidoDto validarPedido(Long idPedido) {
		try {
			PedidoDto pedido = pedidoClient.findById(idPedido);
			if (pedido == null) {
				throw new IllegalArgumentException("El pedido " + idPedido + " no existe");
			}
			return pedido;
		} catch (IllegalArgumentException ex) {
			throw ex;
		} catch (Exception ex) {
			log.warn("No se pudo validar el pedido {}: {}", idPedido, ex.getMessage());
			throw new IllegalArgumentException("El pedido " + idPedido + " no existe");
		}
	}

	private void validarMonto(java.math.BigDecimal monto, java.math.BigDecimal totalPedido) {
		if (totalPedido != null && monto.compareTo(totalPedido) != 0) {
			throw new IllegalArgumentException(
					"El monto del pago (" + monto + ") debe coincidir con el total del pedido (" + totalPedido + ")");
		}
	}

	private Pago getPagoById(Long id) {
		return pagoRepository.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException("Pago con id " + id + " no encontrado"));
	}
}
