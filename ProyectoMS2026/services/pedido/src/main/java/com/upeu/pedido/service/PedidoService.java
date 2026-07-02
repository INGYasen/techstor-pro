package com.upeu.pedido.service;

import com.upeu.pedido.dto.PedidoRequest;
import com.upeu.pedido.dto.PedidoResponse;

import java.util.List;

public interface PedidoService {

	PedidoResponse create(PedidoRequest request);

	List<PedidoResponse> findAll();

	PedidoResponse findById(Long id);

	PedidoResponse update(Long id, PedidoRequest request);

	void delete(Long id);
}
