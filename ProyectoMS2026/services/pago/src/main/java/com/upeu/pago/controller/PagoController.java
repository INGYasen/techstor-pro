package com.upeu.pago.controller;

import com.upeu.pago.dto.PagoRequest;
import com.upeu.pago.dto.PagoResponse;
import com.upeu.pago.service.PagoService;
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
@RequestMapping("/api/v1/pagos")
@RequiredArgsConstructor
public class PagoController {

	private final PagoService pagoService;

	@PostMapping
	public ResponseEntity<PagoResponse> create(@Valid @RequestBody PagoRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED).body(pagoService.create(request));
	}

	@GetMapping
	public ResponseEntity<List<PagoResponse>> findAll() {
		return ResponseEntity.ok(pagoService.findAll());
	}

	@GetMapping("/{id}")
	public ResponseEntity<PagoResponse> findById(@PathVariable Long id) {
		return ResponseEntity.ok(pagoService.findById(id));
	}

	@GetMapping("/pedido/{idPedido}")
	public ResponseEntity<PagoResponse> findByPedidoId(@PathVariable Long idPedido) {
		return ResponseEntity.ok(pagoService.findByPedidoId(idPedido));
	}

	@PutMapping("/{id}")
	public ResponseEntity<PagoResponse> update(@PathVariable Long id,
			@Valid @RequestBody PagoRequest request) {
		return ResponseEntity.ok(pagoService.update(id, request));
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<Void> delete(@PathVariable Long id) {
		pagoService.delete(id);
		return ResponseEntity.noContent().build();
	}
}
