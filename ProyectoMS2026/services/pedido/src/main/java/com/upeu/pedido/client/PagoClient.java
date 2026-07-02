package com.upeu.pedido.client;

import com.upeu.pedido.dto.PagoRequestDto;
import com.upeu.pedido.dto.PagoSummaryDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;

@FeignClient(name = "pago")
public interface PagoClient {

	@PostMapping("/api/v1/pagos")
	void crearPago(@RequestBody PagoRequestDto request);

	@GetMapping("/api/v1/pagos")
	List<PagoSummaryDto> listarPagos();
}
