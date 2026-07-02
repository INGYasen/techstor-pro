package com.upeu.pago.controller;

import com.upeu.pago.dto.MercadoPagoConfigResponse;
import com.upeu.pago.dto.MercadoPagoTarjetaRequest;
import com.upeu.pago.dto.MercadoPagoYapeRequest;
import com.upeu.pago.dto.MercadoPagoYapeResponse;
import com.upeu.pago.service.MercadoPagoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pagos/mercadopago")
@RequiredArgsConstructor
public class MercadoPagoController {

	private final MercadoPagoService mercadoPagoService;

	@GetMapping("/config")
	public ResponseEntity<MercadoPagoConfigResponse> obtenerConfiguracion() {
		return ResponseEntity.ok(mercadoPagoService.obtenerConfiguracion());
	}

	@PostMapping("/yape")
	public ResponseEntity<MercadoPagoYapeResponse> cobrarConYape(
			@Valid @RequestBody MercadoPagoYapeRequest request) {
		return ResponseEntity.ok(mercadoPagoService.cobrarConYape(request));
	}

	@PostMapping("/tarjeta")
	public ResponseEntity<MercadoPagoYapeResponse> cobrarConTarjeta(
			@Valid @RequestBody MercadoPagoTarjetaRequest request) {
		return ResponseEntity.ok(mercadoPagoService.cobrarConTarjeta(request));
	}
}
