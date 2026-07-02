package com.upeu.carrito.client;

import com.upeu.carrito.dto.ProductoDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "producto")
public interface ProductoClient {

	@GetMapping("/api/v1/productos/{id}")
	ProductoDto findById(@PathVariable("id") Long id);
}
