package com.upeu.carrito.controller;

import com.upeu.carrito.dto.CarritoItemQuantityRequest;
import com.upeu.carrito.dto.CarritoItemRequest;
import com.upeu.carrito.dto.CarritoResponse;
import com.upeu.carrito.service.CarritoService;
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
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/carritos")
@RequiredArgsConstructor
public class CarritoController {

	private static final String USER_ID_HEADER = "X-User-Id";

	private final CarritoService carritoService;

	@GetMapping("/me")
	public ResponseEntity<CarritoResponse> obtenerMiCarrito(
			@RequestHeader(USER_ID_HEADER) Long userId) {
		return ResponseEntity.ok(carritoService.obtenerCarrito(userId));
	}

	@PostMapping("/items")
	public ResponseEntity<CarritoResponse> agregarItem(
			@RequestHeader(USER_ID_HEADER) Long userId,
			@Valid @RequestBody CarritoItemRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED).body(carritoService.agregarItem(userId, request));
	}

	@PutMapping("/items/{productoId}")
	public ResponseEntity<CarritoResponse> actualizarCantidad(
			@RequestHeader(USER_ID_HEADER) Long userId,
			@PathVariable Long productoId,
			@Valid @RequestBody CarritoItemQuantityRequest request) {
		return ResponseEntity.ok(carritoService.actualizarCantidad(userId, productoId, request));
	}

	@DeleteMapping("/items/{productoId}")
	public ResponseEntity<CarritoResponse> eliminarItem(
			@RequestHeader(USER_ID_HEADER) Long userId,
			@PathVariable Long productoId) {
		return ResponseEntity.ok(carritoService.eliminarItem(userId, productoId));
	}

	@DeleteMapping
	public ResponseEntity<Void> vaciarCarrito(@RequestHeader(USER_ID_HEADER) Long userId) {
		carritoService.vaciarCarrito(userId);
		return ResponseEntity.noContent().build();
	}
}
