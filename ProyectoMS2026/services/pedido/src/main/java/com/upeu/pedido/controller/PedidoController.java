package com.upeu.pedido.controller;

import com.upeu.pedido.dto.PedidoRequest;
import com.upeu.pedido.dto.PedidoResponse;
import com.upeu.pedido.service.PedidoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/pedidos")
@RequiredArgsConstructor
public class PedidoController {

	private final PedidoService pedidoService;

	@PostMapping
	public ResponseEntity<PedidoResponse> create(@Valid @RequestBody PedidoRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED).body(pedidoService.create(request));
	}

	@GetMapping
	public ResponseEntity<List<PedidoResponse>> findAll() {
		return ResponseEntity.ok(pedidoService.findAll());
	}

	@GetMapping("/{id}")
	public ResponseEntity<PedidoResponse> findById(@PathVariable Long id) {
		return ResponseEntity.ok(pedidoService.findById(id));
	}

	@PutMapping("/{id}")
	public ResponseEntity<PedidoResponse> update(@PathVariable Long id,
			@Valid @RequestBody PedidoRequest request) {
		return ResponseEntity.ok(pedidoService.update(id, request));
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<Void> delete(@PathVariable Long id) {
		pedidoService.delete(id);
		return ResponseEntity.noContent().build();
	}
}
