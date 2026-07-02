package com.upeu.pago.client;

import com.upeu.pago.dto.PedidoDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "pedido")
public interface PedidoClient {

	@GetMapping("/api/v1/pedidos/{id}")
	PedidoDto findById(@PathVariable("id") Long id);
}
