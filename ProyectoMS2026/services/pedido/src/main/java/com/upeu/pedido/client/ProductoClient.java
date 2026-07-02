package com.upeu.pedido.client;

import com.upeu.pedido.dto.DescontarStockRequest;
import com.upeu.pedido.dto.ProductoDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "producto")
public interface ProductoClient {

	@GetMapping("/api/v1/productos/{id}")
	ProductoDto findById(@PathVariable("id") Long id);

	@PutMapping("/api/v1/productos/{id}/stock")
	ProductoDto descontarStock(@PathVariable("id") Long id, @RequestBody DescontarStockRequest request);
}
