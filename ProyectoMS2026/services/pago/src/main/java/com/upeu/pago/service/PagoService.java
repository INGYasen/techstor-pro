package com.upeu.pago.service;

import com.upeu.pago.dto.PagoRequest;
import com.upeu.pago.dto.PagoResponse;

import java.util.List;

public interface PagoService {

	PagoResponse create(PagoRequest request);

	List<PagoResponse> findAll();

	PagoResponse findById(Long id);

	PagoResponse findByPedidoId(Long idPedido);

	PagoResponse update(Long id, PagoRequest request);

	void delete(Long id);
}
